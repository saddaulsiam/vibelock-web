import { describe, expect, test, vi, beforeEach } from "vitest";
import { saveProductAction } from "@/lib/admin/catalog/product-actions";
import prisma from "@/lib/prisma/client";

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    $transaction: vi.fn(),
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/media/cloudinary", () => ({
  isCloudinaryConfigured: () => false,
  uploadToCloudinary: vi.fn(),
}));

describe("Admin Product Catalog Pre-Validation & Boundary Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createValidProductFormData() {
    const formData = new FormData();
    formData.append("name", "Premium Panjabi");
    formData.append("description", "A handcrafted traditional panjabi.");
    formData.append("status", "DRAFT");
    formData.append("categoryIds", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    formData.append(
      "variantsJson",
      JSON.stringify([
        {
          sku: "PANJABI-M",
          size: "M",
          color: "White",
          costPrice: "1200.00",
          sellingPrice: "2200.00",
          stock: "10",
        },
      ])
    );
    return formData;
  }

  test("rejects more than 30 category IDs via early pre-validation guard", async () => {
    const formData = createValidProductFormData();
    formData.delete("categoryIds");
    for (let i = 0; i < 31; i++) {
      formData.append("categoryIds", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    }

    const result = await saveProductAction({ error: null }, formData);
    expect(result.error).toMatch(/at most 30 categories/i);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects variantsJson string exceeding 50,000 characters via early guard", async () => {
    const formData = createValidProductFormData();
    formData.set("variantsJson", " ".repeat(50001));

    const result = await saveProductAction({ error: null }, formData);
    expect(result.error).toMatch(/variant data exceeds maximum allowed size/i);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects more than 100 variants via early pre-validation guard", async () => {
    const formData = createValidProductFormData();
    const oversizedVariants = Array.from({ length: 101 }, (_, i) => ({
      sku: `SKU-${i}`,
      size: "M",
      color: "Blue",
      costPrice: "100.00",
      sellingPrice: "200.00",
    }));
    formData.set("variantsJson", JSON.stringify(oversizedVariants));

    const result = await saveProductAction({ error: null }, formData);
    expect(result.error).toMatch(/at most 100 variants/i);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects more than 20 image URLs via early pre-validation guard", async () => {
    const formData = createValidProductFormData();
    for (let i = 0; i < 21; i++) {
      formData.append("imageUrls", `https://res.cloudinary.com/vibelock/image-${i}.webp`);
    }

    const result = await saveProductAction({ error: null }, formData);
    expect(result.error).toMatch(/at most 20 image urls/i);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});
