import { describe, test, expect, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { createTestProduct, createTestVariant, createTestInventory } from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const mockCookies = new Map();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string, options: unknown) => mockCookies.set(key, { value, options }),
    delete: (key: string) => mockCookies.delete(key),
  }))
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession))
}));

// Mock shipping pricing so it's deterministic and isolated
vi.mock("../../src/lib/shipping/pricing", () => ({
  calculateShippingCharge: vi.fn(() => 50)
}));

describe("Phase 3F - Checkout", () => {
  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
  });

  const validCheckoutData = {
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "01711111111", // Standard BD format for validation if used
    shippingStreet: "123 Main St",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1200",
    shippingCountry: "BD",
    paymentMethod: "COD" as const,
  };

  test("3F.1 Authentication requirement", async () => {
    mockSession = null;
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
  });

  test("3F.2 Checkout validation & Empty Cart", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    // Empty cart
    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(false);
    expect(res.error).toBe("Your cart is empty");

    // Invalid input
    const invalidRes = await createOrderAction({ ...validCheckoutData, paymentMethod: "INVALID" as unknown as "COD" }, crypto.randomUUID());
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toContain("Invalid");
  });

  test("3F.4 Server-side pricing & 3F.6 Atomic Order & 3F.8 Cart clearing & COD", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const prod = await createTestProduct();
    const variant = await createTestVariant({ 
      productId: prod.id,
      sellingPrice: new Prisma.Decimal("100"),
      discountPrice: new Prisma.Decimal("90"),
      costPrice: new Prisma.Decimal("50")
    });
    await createTestInventory(variant.id, 10);

    await addToCart(variant.id, 2);

    const idempotencyKey = crypto.randomUUID();
    const res = await createOrderAction(validCheckoutData, idempotencyKey);
    
    expect(res.success).toBe(true);
    expect(res.orderNumber).toBeDefined();

    // Verify DB state
    const order = await prisma.order.findUnique({
      where: { orderNumber: res.orderNumber as string },
      include: { items: true }
    });

    expect(order).toBeDefined();
    expect(order?.total.toNumber()).toBe(230); // 90 * 2 = 180 + 50 shipping
    expect(order?.paymentMethod).toBe("COD");
    expect(order?.paymentStatus).toBe("PENDING");

    expect(order?.items.length).toBe(1);
    expect(order?.items[0].unitPrice.toNumber()).toBe(90);
    expect(order?.items[0].lineTotal.toNumber()).toBe(180);

    // Cart clearing
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    });
    expect(cart?.items.length).toBe(0); // Cart should be cleared
  });

  test("3F.5 Inventory revalidation", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 5);

    // User adds 5 to cart
    await addToCart(variant.id, 5);

    // Another process consumes 2
    await prisma.inventoryTransaction.create({
      data: { variantId: variant.id, quantity: -2, type: "SALE", referenceId: `REF-${Date.now()}` }
    });

    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(false);
    expect(res.error).toContain("Some items no longer have enough stock");
  });

  test("3F.9 Idempotency & Concurrent duplicate checkout", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const prod = await createTestProduct();
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 5);

    await addToCart(variant.id, 1);

    const idempotencyKey = crypto.randomUUID();
    
    // Concurrent request
    await Promise.all([
      createOrderAction(validCheckoutData, idempotencyKey),
      createOrderAction(validCheckoutData, idempotencyKey)
    ]);
    
    // Wait, the action uses a transaction that might cause Prisma unique constraint violations on concurrent inserts
    // We expect both to succeed (one creates, one reads) OR one to fail safely with "Unauthorized" or an error, 
    // but we expect exactly 1 order in DB.
    
    const orders = await prisma.order.findMany({ where: { checkoutIdempotencyKey: idempotencyKey } });
    expect(orders.length).toBe(1);
    
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    });
    expect(cart?.items.length).toBe(0);
  });

  test("3F.10 Error/Transaction safety (Atomicity)", async () => {
    const user = await createTestUser();
    mockSession = { user: { id: user.id } };

    const prod = await createTestProduct();
    // Simulate error during order creation (e.g. invalid status product)
    const variant = await createTestVariant({ productId: prod.id });
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);

    // Break the product status directly in DB to cause the internal transaction to fail
    await prisma.product.update({ where: { id: prod.id }, data: { status: "DRAFT" } });

    const res = await createOrderAction(validCheckoutData, crypto.randomUUID());
    expect(res.success).toBe(false);

    // Ensure order was NOT partially created
    const orders = await prisma.order.findMany({ where: { userId: user.id } });
    expect(orders.length).toBe(0);

    // Ensure cart was NOT cleared
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    });
    expect(cart?.items.length).toBe(1);
  });
});
