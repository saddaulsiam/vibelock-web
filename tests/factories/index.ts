import prisma from "../../src/lib/prisma/client";
import { Prisma } from "@prisma/client";

export async function createTestCategory(
  overrides: Partial<Prisma.CategoryUncheckedCreateInput> = {}
) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.category.create({
    data: {
      name: `Cat-${ts}`,
      slug: `cat-${ts}`,
      ...overrides,
    },
  });
}

export async function createTestProduct(
  overrides: Partial<Prisma.ProductUncheckedCreateInput> = {}
) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.product.create({
    data: {
      name: `Product-${ts}`,
      slug: `product-${ts}`,
      status: "PUBLISHED",
      ...overrides,
    },
  });
}

export async function createTestVariant(
  overrides: Partial<Prisma.ProductVariantUncheckedCreateInput> & { productId: string }
) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.productVariant.create({
    data: {
      sku: `SKU-${ts}`,
      size: "M",
      costPrice: new Prisma.Decimal("10.00"),
      sellingPrice: new Prisma.Decimal("20.00"),
      ...overrides,
    },
  });
}

export async function createTestInventory(variantId: string, quantity: number) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.inventoryTransaction.create({
    data: {
      variantId,
      quantity,
      type: "RESTOCK",
      referenceId: `REF-${ts}`,
    },
  });
}

export async function createTestCoupon(overrides: Partial<Prisma.CouponUncheckedCreateInput> = {}) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.coupon.create({
    data: {
      code: `COUPON-${ts}`,
      discountType: "FIXED",
      discountValue: new Prisma.Decimal("10.00"),
      isActive: true,
      ...overrides,
    },
  });
}

export async function createTestShippingZone(
  overrides: Partial<Prisma.ShippingZoneUncheckedCreateInput> = {}
) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.shippingZone.create({
    data: {
      name: `Zone-${ts}`,
      countries: ["BD"],
      ...overrides,
    },
  });
}

export async function createTestShippingMethod(
  overrides: Partial<Prisma.ShippingMethodUncheckedCreateInput> & { zoneId: string }
) {
  const ts = Date.now().toString() + Math.floor(Math.random() * 1000);
  return prisma.shippingMethod.create({
    data: {
      name: `Method-${ts}`,
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
      ...overrides,
    },
  });
}
