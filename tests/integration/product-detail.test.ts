import { expect, test, describe, beforeAll, afterAll } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { getProductBySlug } from "../../src/lib/catalog/queries";
import { createTestProduct, createTestVariant } from "../factories";
import { Prisma } from "@prisma/client";

describe("Phase 3D - Product Detail", () => {
  beforeAll(async () => {});
  afterAll(async () => {});

  test("Published product detail", async () => {
    const prod = await createTestProduct({ status: "PUBLISHED" });
    await createTestVariant({ productId: prod.id, size: "M" });

    const detail = await getProductBySlug(prod.slug);
    expect(detail).toBeDefined();
    expect(detail?.id).toBe(prod.id);
  });

  test("Unpublished product detail", async () => {
    const draft = await createTestProduct({ status: "DRAFT" });
    await createTestVariant({ productId: draft.id, size: "M" });

    const detail = await getProductBySlug(draft.slug);
    expect(detail).toBeNull();
  });

  test("Missing product", async () => {
    const detail = await getProductBySlug("non-existent-slug");
    expect(detail).toBeNull();
  });

  test("Pricing logic & Data Leak Test", async () => {
    const prod = await createTestProduct({ status: "PUBLISHED" });
    await createTestVariant({ 
      productId: prod.id, 
      size: "M", 
      costPrice: new Prisma.Decimal("10.00"), 
      sellingPrice: new Prisma.Decimal("20.00"), 
      discountPrice: new Prisma.Decimal("15.00") 
    });

    const detail = await getProductBySlug(prod.slug);
    expect(detail).toBeDefined();
    
    // Check effective pricing
    expect(detail?.variants[0].effectivePrice).toBe(15.00);

    // Ensure no data leakage
    expect(detail).not.toHaveProperty("costPrice");
    expect(detail?.variants[0]).not.toHaveProperty("costPrice");
    expect(detail?.variants[0]).not.toHaveProperty("inventoryTransactions");
  });

  test("Variant availability & impossible combinations", async () => {
    const prod = await createTestProduct({ status: "PUBLISHED" });
    
    // Variant 1: M / Black
    const v1 = await createTestVariant({ productId: prod.id, size: "M", color: "Black" });
    // Variant 2: L / White
    const v2 = await createTestVariant({ productId: prod.id, size: "L", color: "White" });

    // Stock for V1
    await prisma.inventoryTransaction.create({
      data: { variantId: v1.id, quantity: 5, type: "RESTOCK", referenceId: `REF-${Date.now()}-1` }
    });

    const detail = await getProductBySlug(prod.slug);
    expect(detail).toBeDefined();
    
    const catV1 = detail?.variants.find(v => v.id === v1.id);
    const catV2 = detail?.variants.find(v => v.id === v2.id);

    expect(catV1?.available).toBe(true);
    expect(catV2?.available).toBe(false);
  });
});
