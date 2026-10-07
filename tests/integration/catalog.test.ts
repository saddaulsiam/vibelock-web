import { expect, test, describe, beforeAll, afterAll } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { getPublishedProducts } from "../../src/lib/catalog/queries";
import { createTestProduct, createTestVariant, createTestCategory, createTestInventory } from "../factories";
import { Prisma } from "@prisma/client";

describe("Phase 3B - Catalog", () => {
  // Clean up before and after
  beforeAll(async () => {});
  afterAll(async () => {});

  test("Published product filtering", async () => {
    const pub = await createTestProduct({ status: "PUBLISHED" });
    const draft = await createTestProduct({ status: "DRAFT" });
    const arch = await createTestProduct({ status: "ARCHIVED" });
    
    await createTestVariant({ productId: pub.id, sellingPrice: new Prisma.Decimal("10.00"), size: "M" });
    await createTestVariant({ productId: draft.id, sellingPrice: new Prisma.Decimal("10.00"), size: "M" });
    await createTestVariant({ productId: arch.id, sellingPrice: new Prisma.Decimal("10.00"), size: "M" });

    const products = await getPublishedProducts();
    
    expect(products.some(p => p.id === pub.id)).toBe(true);
    expect(products.some(p => p.id === draft.id)).toBe(false);
    expect(products.some(p => p.id === arch.id)).toBe(false);
  });

  test("Category behavior", async () => {
    const cat = await createTestCategory();
    const p1 = await createTestProduct({ status: "PUBLISHED" });
    const p2 = await createTestProduct({ status: "PUBLISHED" });
    
    // Connect p1 to cat
    await prisma.product.update({
      where: { id: p1.id },
      data: { categories: { connect: { id: cat.id } } }
    });

    await createTestVariant({ productId: p1.id, size: "M", sellingPrice: new Prisma.Decimal("10") });
    await createTestVariant({ productId: p2.id, size: "M", sellingPrice: new Prisma.Decimal("10") });

    const byCategory = await getPublishedProducts({ categorySlug: cat.slug });
    
    expect(byCategory.some(p => p.id === p1.id)).toBe(true);
    expect(byCategory.some(p => p.id === p2.id)).toBe(false);
  });

  test("Effective price calculations", async () => {
    const prod = await createTestProduct();
    // 1. discount < selling
    await createTestVariant({ 
      productId: prod.id, size: "S", 
      sellingPrice: new Prisma.Decimal("1500"), discountPrice: new Prisma.Decimal("1200") 
    });
    // 2. discount = null
    await createTestVariant({ 
      productId: prod.id, size: "M", 
      sellingPrice: new Prisma.Decimal("1500"), discountPrice: null 
    });
    // 3. discount > selling
    await createTestVariant({ 
      productId: prod.id, size: "L", 
      sellingPrice: new Prisma.Decimal("1500"), discountPrice: new Prisma.Decimal("2000") 
    });

    const products = await getPublishedProducts();
    const product = products.find(p => p.id === prod.id);
    expect(product).toBeDefined();

    // Check minPrice and maxPrice on ProductSummary
    expect(product?.minPrice).toBe(1200);
    expect(product?.maxPrice).toBe(1500);
  });

  test("Inventory availability through catalog", async () => {
    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id, size: "M", sellingPrice: new Prisma.Decimal("100") });

    // Create a real user and cart for reservations
    const { createTestUser, createTestCart } = await import("../factories/user");
    const user = await createTestUser();
    const cart = await createTestCart(user.id);
    const user2 = await createTestUser();
    const cart2 = await createTestCart(user2.id);

    // Physical stock = 10
    await createTestInventory(variant.id, 10);
    
    // Active reservation = 2
    await prisma.inventoryReservation.create({
      data: {
        variantId: variant.id, quantity: 2, status: "RESERVED", cartId: cart.id, expiresAt: new Date(Date.now() + 100000)
      }
    });

    // Expired reservation = 3
    await prisma.inventoryReservation.create({
      data: {
        variantId: variant.id, quantity: 3, status: "RESERVED", cartId: cart2.id, expiresAt: new Date(Date.now() - 100000)
      }
    });

    const products = await getPublishedProducts();
    const catalogProduct = products.find(p => p.id === prod.id);

    // 10 - 2 = 8, so it is available
    expect(catalogProduct?.available).toBe(true);
  });

  test("Internal fields are not leaked", async () => {
    const prod = await createTestProduct();
    await createTestVariant({ productId: prod.id, size: "M", sellingPrice: new Prisma.Decimal("100") });

    const products = await getPublishedProducts();
    const catalogProduct = products.find(p => p.id === prod.id);
    
    expect(catalogProduct).toBeDefined();
    
    // Check that internal fields do not exist on the object
    expect(catalogProduct).not.toHaveProperty("costPrice");
  });
});
