import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "../../src/lib/prisma/client";
import {
  createTestProduct,
  createTestVariant,
  createTestInventory,
  createTestCoupon,
  createTestShippingZone,
  createTestShippingMethod,
} from "../factories";
import { createTestUser } from "../factories/user";
import { addToCart } from "../../src/lib/cart/mutations";
import { createOrderAction, getShippingMethodsAction } from "../../src/lib/checkout/actions";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const mockCookies = new Map<string, { value: string }>();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string) => mockCookies.set(key, { value }),
    delete: (key: string) => mockCookies.delete(key),
  })),
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

describe("Database-Configured Shipping Zones and Methods in Checkout", () => {
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdVariantIds: string[] = [];
  const createdZoneIds: string[] = [];
  const createdCouponIds: string[] = [];

  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (createdOrderIds.length) {
        await tx.inventoryReservation.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await tx.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdVariantIds.length) {
        await tx.inventoryTransaction.deleteMany({ where: { variantId: { in: createdVariantIds } } });
        await tx.cartItem.deleteMany({ where: { variantId: { in: createdVariantIds } } });
        await tx.productVariant.deleteMany({ where: { id: { in: createdVariantIds } } });
      }
      if (createdProductIds.length) {
        await tx.product.deleteMany({ where: { id: { in: createdProductIds } } });
      }
      if (createdZoneIds.length) {
        await tx.shippingMethod.deleteMany({ where: { zoneId: { in: createdZoneIds } } });
        await tx.shippingZone.deleteMany({ where: { id: { in: createdZoneIds } } });
      }
      if (createdCouponIds.length) {
        await tx.coupon.deleteMany({ where: { id: { in: createdCouponIds } } });
      }
      if (createdUserIds.length) {
        await tx.cart.deleteMany({ where: { userId: { in: createdUserIds } } });
        await tx.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    });

    createdUserIds.length = 0;
    createdOrderIds.length = 0;
    createdProductIds.length = 0;
    createdVariantIds.length = 0;
    createdZoneIds.length = 0;
    createdCouponIds.length = 0;
  });

  async function setupTestUserAndCart(price = "100.00", quantity = 1) {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    mockSession = { user: { id: user.id, email: user.email } };

    const product = await createTestProduct();
    createdProductIds.push(product.id);

    const variant = await createTestVariant({
      productId: product.id,
      sellingPrice: new Prisma.Decimal(price),
    });
    createdVariantIds.push(variant.id);

    await createTestInventory(variant.id, 10);
    await addToCart(variant.id, quantity);

    return { user, variant };
  }

  test("Retrieves active shipping methods eligible for delivery address via getShippingMethodsAction", async () => {
    await setupTestUserAndCart();

    const dhakaZone = await createTestShippingZone({
      name: "Dhaka Metro",
      countries: ["BD"],
    });
    createdZoneIds.push(dhakaZone.id);

    const activeMethod = await createTestShippingMethod({
      zoneId: dhakaZone.id,
      name: "Dhaka Express",
      cost: new Prisma.Decimal("75.00"),
      isActive: true,
    });

    const inactiveMethod = await createTestShippingMethod({
      zoneId: dhakaZone.id,
      name: "Dhaka Inactive Courier",
      cost: new Prisma.Decimal("40.00"),
      isActive: false,
    });

    const res = await getShippingMethodsAction({
      country: "Bangladesh",
      city: "Dhaka",
    });

    expect(res.success).toBe(true);
    expect(res.methods).toBeDefined();
    const methodIds = res.methods!.map((m) => m.id);
    expect(methodIds).toContain(activeMethod.id);
    expect(methodIds).not.toContain(inactiveMethod.id);
  });

  test("Creates order with active database-configured shipping method and persists exact fee and method name", async () => {
    const { user } = await setupTestUserAndCart("200.00", 1);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Standard",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Super Fast Cargo",
      cost: new Prisma.Decimal("85.50"),
      isActive: true,
    });

    const result = await createOrderAction(
      {
        customerName: "Shipping QA Customer",
        customerEmail: user.email,
        customerPhone: "01700000000",
        shippingStreet: "123 Test Avenue",
        shippingCity: "Dhaka",
        shippingState: "Dhaka",
        shippingCountry: "BD",
        shippingZip: "1205",
        paymentMethod: "COD",
        shippingMethodId: method.id,
      },
      crypto.randomUUID()
    );

    expect(result.success).toBe(true);
    expect(result.orderNumber).toBeDefined();

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber! },
    });
    createdOrderIds.push(order.id);

    expect(order.shippingMethodId).toBe(method.id);
    expect(order.shippingMethodName).toBe("Super Fast Cargo");
    expect(order.shippingCost.equals(new Prisma.Decimal("85.50"))).toBe(true);
    expect(order.subtotal.equals(new Prisma.Decimal("200.00"))).toBe(true);
    expect(order.total.equals(new Prisma.Decimal("285.50"))).toBe(true);
  });

  test("Rejects checkout when customer selects an inactive shipping method", async () => {
    const { user } = await setupTestUserAndCart();

    const zone = await createTestShippingZone({
      name: "Dhaka Metro",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const inactiveMethod = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Deactivated Delivery",
      cost: new Prisma.Decimal("30.00"),
      isActive: false,
    });

    const result = await createOrderAction(
      {
        customerName: "Shipping QA Customer",
        customerEmail: user.email,
        customerPhone: "01700000000",
        shippingStreet: "123 Test Avenue",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        paymentMethod: "COD",
        shippingMethodId: inactiveMethod.id,
      },
      crypto.randomUUID()
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer active/i);
  });

  test("Rejects checkout when selected shipping method is not eligible for delivery address", async () => {
    const { user } = await setupTestUserAndCart();

    // Zone configured exclusively for Outside Dhaka
    const outsideZone = await createTestShippingZone({
      name: "Out Side Dhaka Courier",
      countries: ["BD"],
    });
    createdZoneIds.push(outsideZone.id);

    const outsideMethod = await createTestShippingMethod({
      zoneId: outsideZone.id,
      name: "Inter-District Courier",
      cost: new Prisma.Decimal("150.00"),
      isActive: true,
    });

    // Customer gives a Dhaka city address but submits outside-Dhaka method
    const result = await createOrderAction(
      {
        customerName: "Shipping QA Customer",
        customerEmail: user.email,
        customerPhone: "01700000000",
        shippingStreet: "123 Test Avenue",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        paymentMethod: "COD",
        shippingMethodId: outsideMethod.id,
      },
      crypto.randomUUID()
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available for your delivery address/i);
  });

  test("Rejects checkout safely when delivery address matches no configured zone (no fallback)", async () => {
    const { user } = await setupTestUserAndCart();

    // Foreign address that has no active shipping zone configured
    const result = await createOrderAction(
      {
        customerName: "International User",
        customerEmail: user.email,
        customerPhone: "01700000000",
        shippingStreet: "10 Rue de Paris",
        shippingCity: "Paris",
        shippingCountry: "FR",
        paymentMethod: "COD",
      },
      crypto.randomUUID()
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no shipping method is available/i);
  });

  test("Ignores client-tampered shipping cost and enforces server-side database fee", async () => {
    const { user } = await setupTestUserAndCart("350.00", 1);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Verified",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Standard Verified",
      cost: new Prisma.Decimal("90.00"),
      isActive: true,
    });

    // Malicious payload attempts to inject negative or zero shipping fee
    const tamperedPayload = {
      customerName: "Tamper Attacker",
      customerEmail: user.email,
      customerPhone: "01700000000",
      shippingStreet: "123 Defense Rd",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: method.id,
      shippingCost: 0,
      shippingAmount: -100,
    };

    const result = await createOrderAction(tamperedPayload, crypto.randomUUID());
    expect(result.success).toBe(true);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber! },
    });
    createdOrderIds.push(order.id);

    // Persisted fee MUST be 90.00 from database, NOT 0 or -100
    expect(order.shippingCost.equals(new Prisma.Decimal("90.00"))).toBe(true);
    expect(order.total.equals(new Prisma.Decimal("440.00"))).toBe(true);
  });

  test("Accurately calculates total with both coupon discount and database shipping fee", async () => {
    const { user } = await setupTestUserAndCart("500.00", 1);

    const coupon = await createTestCoupon({
      discountType: "FIXED",
      discountValue: new Prisma.Decimal("50.00"),
      isActive: true,
    });
    createdCouponIds.push(coupon.id);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Coupon Test",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Express Delivery",
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
    });

    const result = await createOrderAction(
      {
        customerName: "Coupon Buyer",
        customerEmail: user.email,
        customerPhone: "01700000000",
        shippingStreet: "123 Market Rd",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        paymentMethod: "COD",
        shippingMethodId: method.id,
        couponCode: coupon.code,
      },
      crypto.randomUUID()
    );

    expect(result.success).toBe(true);
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber! },
    });
    createdOrderIds.push(order.id);

    // Subtotal: 500, Discount: 50, Shipping: 60 -> Total: 510
    expect(order.subtotal.equals(new Prisma.Decimal("500.00"))).toBe(true);
    expect(order.discount.equals(new Prisma.Decimal("50.00"))).toBe(true);
    expect(order.shippingCost.equals(new Prisma.Decimal("60.00"))).toBe(true);
    expect(order.total.equals(new Prisma.Decimal("510.00"))).toBe(true);
    expect(order.paymentStatus).toBe("PENDING");
  });

  test("Preserves checkout idempotency when submitting twice with shipping method", async () => {
    const { user } = await setupTestUserAndCart("150.00", 1);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Idempotent",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Standard Ground",
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
    });

    const idempotencyKey = crypto.randomUUID();
    const payload = {
      customerName: "Idempotent User",
      customerEmail: user.email,
      customerPhone: "01700000000",
      shippingStreet: "45 Idempotent Ave",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: method.id,
    };

    const firstResult = await createOrderAction(payload, idempotencyKey);
    expect(firstResult.success).toBe(true);

    const secondResult = await createOrderAction(payload, idempotencyKey);
    expect(secondResult.success).toBe(true);
    expect(secondResult.orderNumber).toBe(firstResult.orderNumber);

    const count = await prisma.order.count({
      where: { checkoutIdempotencyKey: idempotencyKey },
    });
    expect(count).toBe(1);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: firstResult.orderNumber! },
    });
    createdOrderIds.push(order.id);
    expect(order.shippingCost.equals(new Prisma.Decimal("60.00"))).toBe(true);
  });

  test("Rejects checkout when shipping method is omitted or empty (missing shipping selection)", async () => {
    const { user, variant } = await setupTestUserAndCart("100.00", 1);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Standard",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    await createTestShippingMethod({
      zoneId: zone.id,
      name: "Standard Delivery",
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
    });

    const ordersCountBefore = await prisma.order.count();
    const inventoryBefore = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id },
    });

    const payload = {
      customerName: "No Method User",
      customerEmail: user.email,
      customerPhone: "01711112222",
      shippingStreet: "123 Street",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: undefined, // Missing shipping selection
    };

    const result = await createOrderAction(payload, crypto.randomUUID());
    expect(result.success).toBe(false);
    expect(result.error).toBe("Please select a shipping method before placing your order.");

    // Atomicity check: no order created, inventory untouched, cart intact
    const ordersCountAfter = await prisma.order.count();
    expect(ordersCountAfter).toBe(ordersCountBefore);

    const inventoryAfter = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id },
    });
    expect(inventoryAfter).toHaveLength(inventoryBefore.length);

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(1);
  });

  test("Rejects checkout when selected shipping method ID does not exist in the database", async () => {
    const { user } = await setupTestUserAndCart("200.00", 1);

    const nonExistentMethodId = crypto.randomUUID();
    const payload = {
      customerName: "Invalid Method User",
      customerEmail: user.email,
      customerPhone: "01711112222",
      shippingStreet: "123 Street",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: nonExistentMethodId,
    };

    const result = await createOrderAction(payload, crypto.randomUUID());
    expect(result.success).toBe(false);
    expect(result.error).toBe("Selected shipping method does not exist.");

    const orderCount = await prisma.order.count({
      where: { customerEmail: user.email },
    });
    expect(orderCount).toBe(0);
  });

  test("Rejects checkout and preserves consistency when variant has insufficient stock", async () => {
    const { user, variant } = await setupTestUserAndCart("150.00", 1);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Out-Of-Stock",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Standard Delivery",
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
    });

    // Artificially deplete stock right before checkout
    await prisma.inventoryTransaction.create({
      data: {
        variantId: variant.id,
        type: "ADJUSTMENT",
        quantity: -10, // Deplete all available stock
        referenceId: "stock-depletion-test",
      },
    });

    const payload = {
      customerName: "Stock Test User",
      customerEmail: user.email,
      customerPhone: "01711112222",
      shippingStreet: "123 Street",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: method.id,
    };

    const result = await createOrderAction(payload, crypto.randomUUID());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/some items no longer have enough stock/i);

    // Atomicity check: no partial order created, no SALE transactions created
    const orderCount = await prisma.order.count({
      where: { customerEmail: user.email },
    });
    expect(orderCount).toBe(0);

    const saleTxCount = await prisma.inventoryTransaction.count({
      where: { variantId: variant.id, type: "SALE" },
    });
    expect(saleTxCount).toBe(0);
  });

  test("Successfully creates COD order with verified inventory deduction and cart clearance", async () => {
    const { user, variant } = await setupTestUserAndCart("300.00", 2);

    const zone = await createTestShippingZone({
      name: "Inside Dhaka Successful COD",
      countries: ["BD"],
    });
    createdZoneIds.push(zone.id);

    const method = await createTestShippingMethod({
      zoneId: zone.id,
      name: "Standard Delivery",
      cost: new Prisma.Decimal("60.00"),
      isActive: true,
    });

    const initialStock = 10;
    const purchasedQuantity = 2;

    const payload = {
      customerName: "Happy Customer",
      customerEmail: user.email,
      customerPhone: "01711112222",
      shippingStreet: "123 Success Way",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      paymentMethod: "COD" as const,
      shippingMethodId: method.id,
    };

    const result = await createOrderAction(payload, crypto.randomUUID());
    expect(result.success).toBe(true);
    expect(result.orderNumber).toBeDefined();

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber! },
      include: { items: true },
    });
    createdOrderIds.push(order.id);

    // Verify order fields
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.paymentMethod).toBe("COD");
    expect(order.shippingMethodName).toBe("Standard Delivery");
    expect(order.shippingMethodId).toBe(method.id);
    expect(order.shippingCost.equals(new Prisma.Decimal("60.00"))).toBe(true);
    expect(order.subtotal.equals(new Prisma.Decimal("600.00"))).toBe(true);
    expect(order.total.equals(new Prisma.Decimal("660.00"))).toBe(true);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(purchasedQuantity);

    // Verify inventory SALE transaction
    const saleTx = await prisma.inventoryTransaction.findFirst({
      where: {
        variantId: variant.id,
        referenceId: order.id,
        type: "SALE",
      },
    });
    expect(saleTx).not.toBeNull();
    expect(saleTx!.quantity).toBe(-purchasedQuantity);

    // Verify available stock decreased by purchased quantity
    const remainingTransactions = await prisma.inventoryTransaction.findMany({
      where: { variantId: variant.id },
    });
    const currentTotalStock = remainingTransactions.reduce((acc, t) => acc + t.quantity, 0);
    expect(currentTotalStock).toBe(initialStock - purchasedQuantity);

    // Verify cart cleared
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(0);
  });
});
