import { describe, test, expect, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import {
  createTestProduct,
  createTestVariant,
  createTestInventory,
  createTestCoupon,
} from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction, validateCouponAction } from "../../src/lib/checkout/actions";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { AsyncLocalStorage } from "async_hooks";

const mockCookies = new Map();
let mockSession: unknown = null;
const userStorage = new AsyncLocalStorage<{ id: string }>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string, options: unknown) => mockCookies.set(key, { value, options }),
    delete: (key: string) => mockCookies.delete(key),
  }))
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(async () => {
    const store = userStorage.getStore();
    if (store) return { user: store };
    return mockSession;
  })
}));

// Mock fallback shipping pricing so legacy tests remain deterministic and isolated
vi.mock("../../src/lib/shipping/pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/shipping/pricing")>();
  return {
    ...actual,
    calculateShippingCharge: vi.fn(() => 50),
  };
});

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

  describe("Coupon Redemption", () => {
    test("validateCouponAction provides preview and validates eligibility", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("100"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 2); // Subtotal = 200

      const fixedCoupon = await createTestCoupon({
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("25"),
        minOrderValue: new Prisma.Decimal("150"),
      });

      // Valid preview
      const previewRes = await validateCouponAction(fixedCoupon.code);
      expect(previewRes.success).toBe(true);
      expect(previewRes.coupon?.discountAmount).toBe(25);
      expect(previewRes.coupon?.code).toBe(fixedCoupon.code);

      // Non-existent code
      const invalidRes = await validateCouponAction("DOESNOTEXIST");
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toBe("Invalid coupon code.");

      // Inactive coupon
      const inactiveCoupon = await createTestCoupon({ isActive: false });
      const inactiveRes = await validateCouponAction(inactiveCoupon.code);
      expect(inactiveRes.success).toBe(false);
      expect(inactiveRes.error).toBe("This coupon is not active.");

      // Expired coupon
      const expiredCoupon = await createTestCoupon({
        endDate: new Date(Date.now() - 3600000),
      });
      const expiredRes = await validateCouponAction(expiredCoupon.code);
      expect(expiredRes.success).toBe(false);
      expect(expiredRes.error).toBe("This coupon has expired.");

      // Minimum order not met
      const highMinCoupon = await createTestCoupon({
        minOrderValue: new Prisma.Decimal("500"),
      });
      const highMinRes = await validateCouponAction(highMinCoupon.code);
      expect(highMinRes.success).toBe(false);
      expect(highMinRes.error).toContain("Minimum order value");
    });

    test("Customer redeems valid FIXED coupon: discount and totals applied accurately", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("150"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 2); // Subtotal: 300

      const coupon = await createTestCoupon({
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("40"),
        usageLimit: 10,
        usageCount: 0,
      });

      const res = await createOrderAction(
        { ...validCheckoutData, couponCode: coupon.code },
        crypto.randomUUID()
      );

      expect(res.success).toBe(true);
      expect(res.orderNumber).toBeDefined();

      const order = await prisma.order.findUnique({
        where: { orderNumber: res.orderNumber as string },
        include: { history: true },
      });

      expect(order).toBeDefined();
      expect(order?.subtotal.toNumber()).toBe(300);
      expect(order?.discount.toNumber()).toBe(40);
      expect(order?.shippingCost.toNumber()).toBe(50);
      expect(order?.total.toNumber()).toBe(310); // 300 - 40 + 50 = 310

      // Order history note and audit log
      expect(order?.history.some((h) => h.notes?.includes(coupon.code))).toBe(true);
      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: order?.id, action: "COUPON_REDEEMED" },
      });
      expect(auditLog).toBeDefined();

      // Usage count incremented
      const updatedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(updatedCoupon?.usageCount).toBe(1);
    });

    test("Customer redeems valid PERCENTAGE coupon", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("200"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 1); // Subtotal: 200

      const coupon = await createTestCoupon({
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("15"), // 15% of 200 = 30
      });

      const res = await createOrderAction(
        { ...validCheckoutData, couponCode: coupon.code },
        crypto.randomUUID()
      );

      expect(res.success).toBe(true);
      const order = await prisma.order.findUnique({
        where: { orderNumber: res.orderNumber as string },
      });

      expect(order?.subtotal.toNumber()).toBe(200);
      expect(order?.discount.toNumber()).toBe(30);
      expect(order?.total.toNumber()).toBe(220); // 200 - 30 + 50
    });

    test("Ineligible coupon cases are rejected safely without creating order", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("100"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 1); // Subtotal: 100

      // 1. Non-existent coupon
      const resInvalid = await createOrderAction(
        { ...validCheckoutData, couponCode: "DOESNT_EXIST" },
        crypto.randomUUID()
      );
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.error).toBe("Invalid coupon code.");

      // 2. Inactive coupon
      const inactive = await createTestCoupon({ isActive: false });
      const resInactive = await createOrderAction(
        { ...validCheckoutData, couponCode: inactive.code },
        crypto.randomUUID()
      );
      expect(resInactive.success).toBe(false);
      expect(resInactive.error).toBe("This coupon is not active.");

      // 3. Expired coupon
      const expired = await createTestCoupon({ endDate: new Date(Date.now() - 3600000) });
      const resExpired = await createOrderAction(
        { ...validCheckoutData, couponCode: expired.code },
        crypto.randomUUID()
      );
      expect(resExpired.success).toBe(false);
      expect(resExpired.error).toBe("This coupon has expired.");

      // 4. Future coupon
      const future = await createTestCoupon({ startDate: new Date(Date.now() + 3600000) });
      const resFuture = await createOrderAction(
        { ...validCheckoutData, couponCode: future.code },
        crypto.randomUUID()
      );
      expect(resFuture.success).toBe(false);
      expect(resFuture.error).toBe("This coupon is not active yet.");

      // 5. Minimum order value not met
      const minOrder = await createTestCoupon({ minOrderValue: new Prisma.Decimal("250") });
      const resMin = await createOrderAction(
        { ...validCheckoutData, couponCode: minOrder.code },
        crypto.randomUUID()
      );
      expect(resMin.success).toBe(false);
      expect(resMin.error).toContain("Minimum order value");

      // 6. Usage limit reached
      const overLimit = await createTestCoupon({ usageLimit: 2, usageCount: 2 });
      const resOver = await createOrderAction(
        { ...validCheckoutData, couponCode: overLimit.code },
        crypto.randomUUID()
      );
      expect(resOver.success).toBe(false);
      expect(resOver.error).toBe("This coupon has reached its usage limit.");

      // Ensure no orders were created
      const orders = await prisma.order.findMany({ where: { userId: user.id } });
      expect(orders.length).toBe(0);
    });

    test("Tampered discount amount payload is strictly ignored and recalculated server-side", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("100"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 1); // Subtotal: 100

      const coupon = await createTestCoupon({
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("10"), // Real discount is 10
      });

      // Malicious payload passes a fake client discount of 999
      const tamperedPayload = {
        ...validCheckoutData,
        couponCode: coupon.code,
        discount: 999,
        discountAmount: 999,
      };

      const res = await createOrderAction(tamperedPayload, crypto.randomUUID());
      expect(res.success).toBe(true);

      const order = await prisma.order.findUnique({
        where: { orderNumber: res.orderNumber as string },
      });

      // The server strictly applied 10 discount, completely ignoring the 999
      expect(order?.discount.toNumber()).toBe(10);
      expect(order?.total.toNumber()).toBe(140); // 100 - 10 + 50
    });

    test("Duplicate checkout submission with same idempotency key does not increment usageCount twice", async () => {
      const user = await createTestUser();
      mockSession = { user: { id: user.id } };

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("100"),
      });
      await createTestInventory(variant.id, 5);
      await addToCart(variant.id, 1);

      const coupon = await createTestCoupon({
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("15"),
        usageLimit: 5,
        usageCount: 0,
      });

      const idempotencyKey = crypto.randomUUID();

      // First submission
      const res1 = await createOrderAction(
        { ...validCheckoutData, couponCode: coupon.code },
        idempotencyKey
      );
      expect(res1.success).toBe(true);

      const couponAfter1 = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(couponAfter1?.usageCount).toBe(1);

      // Retry submission with the same idempotency key
      const res2 = await createOrderAction(
        { ...validCheckoutData, couponCode: coupon.code },
        idempotencyKey
      );
      expect(res2.success).toBe(true);
      expect(res2.orderNumber).toBe(res1.orderNumber);

      const couponAfter2 = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(couponAfter2?.usageCount).toBe(1); // Still 1, NOT 2!
    });

    test("Concurrent redemption safely enforces usage limit", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const prod = await createTestProduct();
      const variant = await createTestVariant({
        productId: prod.id,
        sellingPrice: new Prisma.Decimal("100"),
      });
      await createTestInventory(variant.id, 10);

      // Populate user1 cart
      await userStorage.run({ id: user1.id }, async () => {
        await addToCart(variant.id, 1);
      });

      // Populate user2 cart
      await userStorage.run({ id: user2.id }, async () => {
        await addToCart(variant.id, 1);
      });

      // Coupon has ONLY 1 usage left
      const singleUseCoupon = await createTestCoupon({
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("20"),
        usageLimit: 1,
        usageCount: 0,
      });

      // Both users execute checkout concurrently competing for the single use coupon
      const [res1, res2] = await Promise.all([
        userStorage.run({ id: user1.id }, () =>
          createOrderAction(
            { ...validCheckoutData, couponCode: singleUseCoupon.code },
            crypto.randomUUID()
          )
        ),
        userStorage.run({ id: user2.id }, () =>
          createOrderAction(
            { ...validCheckoutData, couponCode: singleUseCoupon.code },
            crypto.randomUUID()
          )
        ),
      ]);

      const successCount = [res1, res2].filter((r) => r.success).length;
      const failureCount = [res1, res2].filter(
        (r) => !r.success && r.error === "This coupon has reached its usage limit."
      ).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      const finalCoupon = await prisma.coupon.findUnique({ where: { id: singleUseCoupon.id } });
      expect(finalCoupon?.usageCount).toBe(1);
    });
  });
});

