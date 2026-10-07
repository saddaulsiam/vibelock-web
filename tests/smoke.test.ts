import { expect, test } from "vitest";
import prisma from "../src/lib/prisma/client";

test("Database connection and Prisma query", async () => {
  const result = await prisma.$queryRaw`SELECT 1 as result`;
  expect(result).toBeDefined();
});

test("Extended smoke test: Core domain models", async () => {
  const ts = Date.now().toString();

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      email: `smoke-${ts}@test.local`,
      name: "Smoke Test User",
      role: "CUSTOMER",
    }
  });
  expect(user.id).toBeDefined();

  // 2. Create Category
  const category = await prisma.category.create({
    data: {
      name: `Smoke Category ${ts}`,
      slug: `smoke-category-${ts}`,
    }
  });

  // 3. Create Product & Variant
  const product = await prisma.product.create({
    data: {
      name: `Smoke Product ${ts}`,
      slug: `smoke-product-${ts}`,
      status: "PUBLISHED",
      categories: { connect: { id: category.id } },
      variants: {
        create: {
          sku: `SMOKE-${ts}`,
          size: "M",
          color: "BLACK",
          costPrice: 500,
          sellingPrice: 1000
        }
      }
    },
    include: { variants: true }
  });
  const variant = product.variants[0];

  // 4. Create InventoryTransaction
  const inv = await prisma.inventoryTransaction.create({
    data: {
      variantId: variant.id,
      quantity: 50,
      type: "RESTOCK",
      referenceId: `REF-${ts}`,
      notes: "Smoke test stock"
    }
  });

  // 5. Create Cart
  const cart = await prisma.cart.create({
    data: {
      userId: user.id,
      items: {
        create: {
          variantId: variant.id,
          quantity: 2
        }
      }
    }
  });

  // 6. Create Order
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${ts}`,
      customerEmail: user.email,
      userId: user.id,
      status: "PENDING",
      taxRate: 0,
      taxIncluded: false,
      shippingCost: 100,
      subtotal: 2000,
      taxAmount: 0,
      discount: 0,
      total: 2100,
      shippingStreet: "123 Test St",
      shippingCity: "Dhaka",
      shippingCountry: "Bangladesh",
      shippingMethodName: "Standard",
      items: {
        create: {
          productName: product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          unitPrice: 1000,
          costPrice: 500,
          appliedDiscount: 0,
          taxRate: 0,
          taxIncluded: false,
          lineSubtotal: 2000,
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: 2000,
          quantity: 2
        }
      }
    }
  });
  expect(order.id).toBeDefined();

  // CLEANUP
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.delete({ where: { id: cart.id } });
  await prisma.inventoryTransaction.delete({ where: { id: inv.id } });
  await prisma.productVariant.delete({ where: { id: variant.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
