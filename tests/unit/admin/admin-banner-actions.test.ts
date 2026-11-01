import { describe, expect, test, vi, beforeEach } from "vitest";
import { saveBannerAction, toggleBannerAction, deleteBannerAction } from "@/lib/admin/banners";
import prisma from "@/lib/prisma/client";

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    banner: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe("Admin Banner Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveBannerAction", () => {
    test("rejects non-Cloudinary desktop image URLs", async () => {
      const formData = new FormData();
      formData.append("title", "Summer Campaign");
      formData.append("imageUrl", "https://untrusted-cdn.com/image.jpg");
      formData.append("placement", "BOTH");
      formData.append("sortOrder", "0");

      const result = await saveBannerAction({ error: null }, formData);
      expect(result.error).toBe("Use a secure Cloudinary image URL.");
      expect(prisma.banner.create).not.toHaveBeenCalled();
    });

    test("creates new banner with valid fields", async () => {
      const formData = new FormData();
      formData.append("title", "Valid Streetwear Drop");
      formData.append("imageUrl", "https://res.cloudinary.com/vibelock/image/upload/desktop.webp");
      formData.append(
        "mobileImageUrl",
        "https://res.cloudinary.com/vibelock/image/upload/mobile.webp"
      );
      formData.append("linkUrl", "/products?category=t-shirts");
      formData.append("placement", "CATEGORY");
      formData.append("sortOrder", "5");
      formData.append("isActive", "on");

      (prisma.banner.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-banner-id" });

      const result = await saveBannerAction({ error: null }, formData);
      expect(result.error).toBeNull();
      expect(result.message).toBe("Banner created successfully.");
      expect(prisma.banner.create).toHaveBeenCalledWith({
        data: {
          title: "Valid Streetwear Drop",
          imageUrl: "https://res.cloudinary.com/vibelock/image/upload/desktop.webp",
          mobileImageUrl: "https://res.cloudinary.com/vibelock/image/upload/mobile.webp",
          linkUrl: "/products?category=t-shirts",
          placement: "CATEGORY",
          sortOrder: 5,
          isActive: true,
          categories: { connect: [] },
        },
      });
    });

    test("updates existing banner when id is provided", async () => {
      const bannerId = "11111111-1111-4111-8111-111111111111";
      const formData = new FormData();
      formData.append("id", bannerId);
      formData.append("title", "Updated Title");
      formData.append("imageUrl", "https://res.cloudinary.com/vibelock/image/upload/desktop.webp");
      formData.append("placement", "BOTH");
      formData.append("sortOrder", "1");

      (prisma.banner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: bannerId });
      (prisma.banner.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: bannerId });

      const result = await saveBannerAction({ error: null }, formData);
      expect(result.error).toBeNull();
      expect(result.message).toBe("Banner updated successfully.");
      expect(prisma.banner.update).toHaveBeenCalledWith({
        where: { id: bannerId },
        data: expect.objectContaining({
          title: "Updated Title",
          sortOrder: 1,
        }),
      });
    });
  });

  describe("toggleBannerAction", () => {
    test("activates and deactivates banner by ID", async () => {
      const bannerId = "22222222-2222-4222-8222-222222222222";
      const formData = new FormData();
      formData.append("id", bannerId);
      formData.append("active", "false");

      (prisma.banner.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: bannerId,
        isActive: false,
      });

      await toggleBannerAction(formData);
      expect(prisma.banner.update).toHaveBeenCalledWith({
        where: { id: bannerId },
        data: { isActive: false },
      });
    });

    test("rejects invalid UUIDs", async () => {
      const formData = new FormData();
      formData.append("id", "invalid-id");
      formData.append("active", "true");

      await expect(toggleBannerAction(formData)).rejects.toThrow("Invalid banner ID.");
    });
  });

  describe("deleteBannerAction", () => {
    test("deletes banner by ID", async () => {
      const bannerId = "33333333-3333-4333-8333-333333333333";
      const formData = new FormData();
      formData.append("id", bannerId);

      (prisma.banner.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: bannerId });

      await deleteBannerAction(formData);
      expect(prisma.banner.delete).toHaveBeenCalledWith({
        where: { id: bannerId },
      });
    });
  });
});
