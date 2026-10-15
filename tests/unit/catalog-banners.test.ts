import { describe, expect, test, vi, beforeEach } from "vitest";
import { getCategoryPromoBanner, getSearchPromoBanner } from "@/lib/catalog/banners";
import prisma from "@/lib/prisma/client";

vi.mock("@/lib/prisma/client", () => ({
  default: {
    banner: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Storefront Banner Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getCategoryPromoBanner queries active banners with category or both placement", async () => {
    const mockBanner = {
      id: "cat-banner-1",
      title: "Shirts Campaign",
      imageUrl: "https://res.cloudinary.com/test/image.webp",
      mobileImageUrl: null,
      linkUrl: null,
    };

    (prisma.banner.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBanner);

    const result = await getCategoryPromoBanner("shirts");
    expect(result).toEqual(mockBanner);
    expect(prisma.banner.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          placement: { in: ["CATEGORY", "BOTH"] },
        }),
      })
    );
  });

  test("getSearchPromoBanner queries active banners with search or both placement", async () => {
    const mockBanner = {
      id: "search-banner-1",
      title: "All Products Promo",
      imageUrl: "https://res.cloudinary.com/test/search.webp",
      mobileImageUrl: null,
      linkUrl: "/products",
    };

    (prisma.banner.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockBanner);

    const result = await getSearchPromoBanner(["pants"]);
    expect(result).toEqual(mockBanner);
    expect(prisma.banner.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          placement: { in: ["SEARCH", "BOTH"] },
        }),
      })
    );
  });

  test("returns null when no active banner is found", async () => {
    (prisma.banner.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getCategoryPromoBanner("accessories");
    expect(result).toBeNull();
  });
});
