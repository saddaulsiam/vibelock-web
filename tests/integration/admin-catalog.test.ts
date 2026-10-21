import { expect, test, describe, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import {
  saveCategoryAction,
  deleteCategoryAction,
  saveProductAction,
  toggleProductPublishedAction,
  deleteProductAction,
} from "../../src/lib/admin/catalog-actions";
import { createTestProduct, createTestCategory } from "../factories";
import { Prisma } from "@prisma/client";

const mockSession = { user: { id: "admin-test-id", role: "ADMIN", email: "admin@test.com" } };
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

describe("Admin Catalog Management", () => {
  describe("Categories", () => {
    test("should create a category", async () => {
      const slug = `new-category-${Date.now()}`;
      const formData = new FormData();
      formData.append("name", "New Category");
      formData.append("slug", slug);
      formData.append("description", "A test category");

      const result = await saveCategoryAction({ error: null }, formData);
      expect(result.error).toBeNull();

      const category = await prisma.category.findUnique({ where: { slug } });
      expect(category).toBeDefined();
      expect(category?.name).toBe("New Category");
    });

    test("should fail to create category with duplicate slug", async () => {
      const slug = `duplicate-slug-${Date.now()}`;
      await prisma.category.create({ data: { name: "Existing", slug } });

      const formData = new FormData();
      formData.append("name", "New Cat");
      formData.append("slug", slug);

      const result = await saveCategoryAction({ error: null }, formData);
      expect(result.error).toContain("already in use");
    });

    test("should prevent circular category hierarchy", async () => {
      const cat = await createTestCategory();

      const formData = new FormData();
      formData.append("id", cat.id);
      formData.append("name", "Self Parent");
      formData.append("parentId", cat.id);

      const result = await saveCategoryAction({ error: null }, formData);
      expect(result.error).toBe("A category cannot be its own parent.");
    });

    test("should delete a category that has no children or products", async () => {
      const cat = await createTestCategory();
      const formData = new FormData();
      formData.append("id", cat.id);

      const result = await deleteCategoryAction({ error: null }, formData);
      expect(result.error).toBeNull();

      const deleted = await prisma.category.findUnique({ where: { id: cat.id } });
      expect(deleted).toBeNull();
    });

    test("should block deletion of category with products", async () => {
      const cat = await createTestCategory();
      const prod = await createTestProduct();
      await prisma.product.update({
        where: { id: prod.id },
        data: { categories: { connect: { id: cat.id } } },
      });

      const formData = new FormData();
      formData.append("id", cat.id);

      const result = await deleteCategoryAction({ error: null }, formData);
      expect(result.error).toContain("has products or child categories");
    });
  });

  describe("Products", () => {
    test("should create a product and a default variant", async () => {
      const slug = `test-prod-${Date.now()}`;
      const formData = new FormData();
      formData.append("name", "Test Product");
      formData.append("slug", slug);
      formData.append(
        "variantsJson",
        JSON.stringify([
          {
            sku: "",
            size: "M",
            color: "Black",
            costPrice: "500",
            sellingPrice: "1000",
            discountPrice: "",
          },
        ])
      );
      formData.append(
        "imageUrls",
        "https://images.example.test/front.webp\nhttps://images.example.test/back.webp"
      );
      formData.append("status", "PUBLISHED");

      const result = await saveProductAction({ error: null }, formData);
      expect(result.error).toBeNull();

      const product = await prisma.product.findUnique({
        where: { slug },
        include: { variants: true },
      });

      expect(product).toBeDefined();
      expect(product?.variants).toHaveLength(1);
      expect(product?.variants[0].sellingPrice).toEqual(new Prisma.Decimal("1000"));
      expect(product?.variants[0].sku).toMatch(/^VL-TEST-PROD-.+/);
      expect(product?.variants[0].size).toBe("M");
      expect(product?.variants[0].color).toBe("Black");
      const images = await prisma.productImage.findMany({
        where: { productId: product!.id },
        orderBy: { createdAt: "asc" },
      });
      expect(images).toHaveLength(2);
      expect(images.filter((image) => image.isPrimary)).toHaveLength(1);
      expect(images.find((image) => image.isPrimary)?.url).toBe(
        "https://images.example.test/front.webp"
      );
    });

    test("should update pricing across all variants", async () => {
      const prod = await createTestProduct();
      const ts = Date.now();
      await prisma.productVariant.create({
        data: {
          productId: prod.id,
          sku: `VAR-1-${ts}`,
          costPrice: new Prisma.Decimal("100"),
          sellingPrice: new Prisma.Decimal("200"),
        },
      });
      await prisma.productVariant.create({
        data: {
          productId: prod.id,
          sku: `VAR-2-${ts}`,
          costPrice: new Prisma.Decimal("100"),
          sellingPrice: new Prisma.Decimal("200"),
        },
      });

      const currentVariants = await prisma.productVariant.findMany({
        where: { productId: prod.id },
      });
      const formData = new FormData();
      formData.append("id", prod.id);
      formData.append("name", prod.name);
      formData.append(
        "variantsJson",
        JSON.stringify(
          currentVariants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size ?? "",
            color: variant.color ?? "",
            costPrice: "150",
            sellingPrice: "300",
            discountPrice: "",
          }))
        )
      );
      formData.append("status", "PUBLISHED");

      const result = await saveProductAction({ error: null }, formData);
      expect(result.error).toBeNull();

      const variants = await prisma.productVariant.findMany({ where: { productId: prod.id } });
      expect(variants).toHaveLength(2);
      variants.forEach((v) => {
        expect(v.sellingPrice).toEqual(new Prisma.Decimal("300"));
        expect(v.costPrice).toEqual(new Prisma.Decimal("150"));
      });
    });

    test("should toggle publication status", async () => {
      const prod = await createTestProduct({ status: "DRAFT" });
      const formData = new FormData();
      formData.append("id", prod.id);

      const result = await toggleProductPublishedAction({ error: null }, formData);
      expect(result.error).toBeNull();

      const updated = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(updated?.status).toBe("PUBLISHED");
    });

    test("should fail if discount price is higher than selling price", async () => {
      const formData = new FormData();
      formData.append("name", "Bad Price Product");
      formData.append(
        "variantsJson",
        JSON.stringify([
          {
            sku: "",
            size: "",
            color: "",
            sellingPrice: "100",
            discountPrice: "200",
            costPrice: "50",
          },
        ])
      );
      formData.append("status", "DRAFT");

      const result = await saveProductAction({ error: null }, formData);
      expect(result.error).toBe("Discount price must be lower than the variant selling price.");
    });

    test("should block deletion of product with inventory history", async () => {
      const prod = await createTestProduct();
      const ts = Date.now();
      const variant = await prisma.productVariant.create({
        data: {
          productId: prod.id,
          sku: `INV-TEST-${ts}`,
          costPrice: new Prisma.Decimal("10"),
          sellingPrice: new Prisma.Decimal("20"),
        },
      });
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          type: "RESTOCK",
          quantity: 10,
        },
      });

      const formData = new FormData();
      formData.append("id", prod.id);

      const result = await deleteProductAction({ error: null }, formData);
      expect(result.error).toContain("has reviews, cart items, or inventory history");
    });
  });
});
