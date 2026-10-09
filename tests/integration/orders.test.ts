import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { addToCart } from "../../src/lib/cart/mutations";
import { getCustomerOrder, getCustomerOrders } from "../../src/lib/orders/queries";
import { cancelOrderAction } from "../../src/lib/orders/actions";
import {
  updateOrderPaymentStatusAction,
  updateOrderStatusAction,
} from "../../src/lib/admin/order-actions";
import { PaymentService } from "../../src/lib/payment/service";
import { createTestInventory, createTestProduct, createTestVariant } from "../factories";
import { createTestUser } from "../factories/user";
import crypto from "crypto";

const mockCookies = new Map<string, unknown>();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string, options: unknown) => mockCookies.set(key, { value, options }),
    delete: (key: string) => mockCookies.delete(key),
  })),
}));

vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("../../src/lib/config/env", () => ({
  env: {
    SSLCOMMERZ_STORE_ID: "test_store",
    SSLCOMMERZ_STORE_PASSWORD: "test_password",
    SSLCOMMERZ_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  },
}));

const originalFetch = global.fetch;
const testUserIds: string[] = [];
const testProductIds: string[] = [];
const testVariantIds: string[] = [];
const testOrderIds: string[] = [];

const checkoutData = {
  customerName: "Order Test Customer",
  customerEmail: "order-test@example.com",
  customerPhone: "01711111111",
  shippingStreet: "123 Order Street",
  shippingCity: "Dhaka",
  shippingState: "Dhaka",
  shippingZip: "1200",
  shippingCountry: "BD",
  paymentMethod: "COD" as const,
};

type TestUser = Awaited<ReturnType<typeof createTestUser>>;

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function makeUser(): Promise<TestUser> {
  const user = await createTestUser({
    email: `orders-${crypto.randomUUID()}@example.com`,
    name: "Order Regression User",
  });
  testUserIds.push(user.id);
  return user;
}

function mockSuccessfulGatewayInitialization() {
  (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
    json: async () => ({
      status: "SUCCESS",
      GatewayPageURL: "https://sandbox.sslcommerz.com/pay",
    }),
  });
}

async function createCustomerOrder(
  user: TestUser,
  options: {
    paymentMethod?: "COD" | "ONLINE";
    items?: Array<{
      productName?: string;
      sellingPrice: string;
      discountPrice?: string;
      quantity: number;
      sku?: string;
      size?: string;
      color?: string;
    }>;
  } = {}
) {
  mockSession = { user: { id: user.id } };
  const items = options.items ?? [{ sellingPrice: "100.00", quantity: 1 }];
  const variants = [];

  for (const item of items) {
    const product = await createTestProduct(
      item.productName ? { name: item.productName } : undefined
    );
    testProductIds.push(product.id);
    const variant = await createTestVariant({
      productId: product.id,
      sellingPrice: new Prisma.Decimal(item.sellingPrice),
      discountPrice: item.discountPrice ? new Prisma.Decimal(item.discountPrice) : null,
      ...(item.sku ? { sku: item.sku } : {}),
      ...(item.size ? { size: item.size } : {}),
      ...(item.color ? { color: item.color } : {}),
    });
    testVariantIds.push(variant.id);
    await createTestInventory(variant.id, item.quantity + 5);
    await addToCart(variant.id, item.quantity);
    variants.push({ product, variant, item });
  }

  const paymentMethod = options.paymentMethod ?? "COD";
  if (paymentMethod === "ONLINE") mockSuccessfulGatewayInitialization();
  const result = await createOrderAction({ ...checkoutData, paymentMethod }, crypto.randomUUID());
  if (!result.success || !result.orderNumber) {
    throw new Error(`Test order creation failed: ${result.error ?? "missing order number"}`);
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: result.orderNumber },
    include: {
      items: true,
      payments: true,
      inventoryReservations: true,
    },
  });
  testOrderIds.push(order.id);
  return { order, variants };
}

async function validateOnlinePayment(orderId: string, amount: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: true },
  });
  const payment = order.payments[0];
  (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
    json: async () => ({
      status: "VALID",
      amount,
      bank_tran_id: crypto.randomUUID(),
      tran_id: payment.merchantReferenceId,
      currency: "BDT",
    }),
  });
  await new PaymentService().verifyCallback("SSLCOMMERZ", {
    tran_id: payment.merchantReferenceId,
    val_id: crypto.randomUUID(),
  });
}

describe("Phase 3I - Orders & Customer Order History", () => {
  beforeEach(() => {
    mockCookies.clear();
    mockSession = null;
    global.fetch = vi.fn();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();

    await prisma.$transaction(async (tx) => {
      if (testOrderIds.length) {
        await tx.auditLog.deleteMany({ where: { entityId: { in: testOrderIds } } });
        await tx.refund.deleteMany({ where: { payment: { orderId: { in: testOrderIds } } } });
        await tx.payment.deleteMany({ where: { orderId: { in: testOrderIds } } });
        await tx.shipment.deleteMany({ where: { orderId: { in: testOrderIds } } });
        await tx.inventoryReservation.deleteMany({ where: { orderId: { in: testOrderIds } } });
        await tx.order.deleteMany({ where: { id: { in: testOrderIds } } });
        await tx.inventoryTransaction.deleteMany({ where: { referenceId: { in: testOrderIds } } });
      }
      if (testVariantIds.length) {
        await tx.inventoryReservation.deleteMany({ where: { variantId: { in: testVariantIds } } });
        await tx.inventoryTransaction.deleteMany({ where: { variantId: { in: testVariantIds } } });
        await tx.cartItem.deleteMany({ where: { variantId: { in: testVariantIds } } });
        await tx.productVariant.deleteMany({ where: { id: { in: testVariantIds } } });
      }
      if (testProductIds.length) {
        await tx.product.deleteMany({ where: { id: { in: testProductIds } } });
      }
      if (testUserIds.length) {
        await tx.cart.deleteMany({ where: { userId: { in: testUserIds } } });
        await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
      }
    });

    testOrderIds.length = 0;
    testVariantIds.length = 0;
    testProductIds.length = 0;
    testUserIds.length = 0;
  });

  test("history is owner-scoped, stable, paginated, and handles empty or invalid pages", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const userAOrders: string[] = [];

    for (let index = 0; index < 11; index += 1) {
      const created = await createCustomerOrder(userA, {
        items: [{ sellingPrice: `${100 + index}.00`, quantity: 1 }],
      });

      userAOrders.push(created.order.orderNumber);
    }
    const userBOrder = await createCustomerOrder(userB);

    mockSession = { user: { id: userA.id } };
    const defaultPage = await getCustomerOrders();
    expect(defaultPage.total).toBe(11);
    expect(defaultPage.orders).toHaveLength(10);
    expect(defaultPage.orders.every((order) => userAOrders.includes(order.orderNumber))).toBe(true);
    expect(
      defaultPage.orders.some((order) => order.orderNumber === userBOrder.order.orderNumber)
    ).toBe(false);

    const firstPage = await getCustomerOrders(1, 4);
    const secondPage = await getCustomerOrders(2, 4);
    const thirdPage = await getCustomerOrders(3, 4);
    expect(firstPage.orders).toHaveLength(4);
    expect(secondPage.orders).toHaveLength(4);
    expect(thirdPage.orders).toHaveLength(3);
    expect(
      new Set([...firstPage.orders, ...secondPage.orders, ...thirdPage.orders].map((o) => o.id))
        .size
    ).toBe(11);
    expect((await getCustomerOrders(4, 4)).orders).toEqual([]);

    const repeatedFirstPage = await getCustomerOrders(1, 4);
    expect(repeatedFirstPage.orders.map((order) => order.id)).toEqual(
      firstPage.orders.map((order) => order.id)
    );
    for (let index = 1; index < firstPage.orders.length; index += 1) {
      const previous = firstPage.orders[index - 1];
      const current = firstPage.orders[index];
      expect(previous.createdAt.getTime()).toBeGreaterThanOrEqual(current.createdAt.getTime());
      if (previous.createdAt.getTime() === current.createdAt.getTime()) {
        expect(previous.id >= current.id).toBe(true);
      }
    }

    expect((await getCustomerOrders(0, 4)).orders.map((order) => order.id)).toEqual(
      firstPage.orders.map((order) => order.id)
    );
    expect((await getCustomerOrders(Number.NaN, 4)).orders.map((order) => order.id)).toEqual(
      firstPage.orders.map((order) => order.id)
    );
    expect((await getCustomerOrders(1, 0)).orders).toHaveLength(10);

    mockSession = { user: { id: userB.id } };
    const userBHistory = await getCustomerOrders();
    expect(userBHistory.total).toBe(1);
    expect(userBHistory.orders.map((order) => order.orderNumber)).toEqual([
      userBOrder.order.orderNumber,
    ]);

    const emptyUser = await makeUser();
    mockSession = { user: { id: emptyUser.id } };
    expect(await getCustomerOrders()).toEqual({ orders: [], total: 0 });
  });

  test("admin order status transitions are forward-only and audited", async () => {
    const user = await makeUser();
    const { order } = await createCustomerOrder(user);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const valid = await updateOrderStatusAction(
      { error: null },
      formData({ id: order.id, status: "PROCESSING", notes: "Packed" })
    );
    expect(valid).toEqual({ error: null, message: "Order updated successfully." });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROCESSING");
    expect(await prisma.orderHistory.count({ where: { orderId: order.id, status: "PROCESSING" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id, action: "ORDER_STATUS_CHANGED" } })).toBe(1);

    const invalid = await updateOrderStatusAction(
      { error: null },
      formData({ id: order.id, status: "PENDING" })
    );
    expect(invalid.error).toBe("Order cannot transition from PROCESSING to PENDING.");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROCESSING");
    expect(await prisma.orderHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  test("delivered and cancelled orders cannot be changed", async () => {
    const user = await makeUser();
    const delivered = await createCustomerOrder(user);
    const cancelled = await createCustomerOrder(user);
    await prisma.order.update({ where: { id: delivered.order.id }, data: { status: "DELIVERED" } });
    await prisma.order.update({ where: { id: cancelled.order.id }, data: { status: "CANCELLED" } });
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    for (const [id, status, message] of [
      [delivered.order.id, "PROCESSING", "Delivered orders cannot be changed."],
      [cancelled.order.id, "PENDING", "Cancelled orders cannot be changed."],
    ] as const) {
      const result = await updateOrderStatusAction({ error: null }, formData({ id, status }));
      expect(result.error).toBe(message);
      expect(await prisma.orderHistory.count({ where: { orderId: id } })).toBe(0);
      expect(await prisma.auditLog.count({ where: { entityId: id, action: "ORDER_STATUS_CHANGED" } })).toBe(0);
    }
  });

  test("payment status updates must match recorded payment state", async () => {
    const user = await makeUser();
    const { order } = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const valid = await updateOrderPaymentStatusAction(
      { error: null },
      formData({ id: order.id, paymentStatus: "INITIATED" })
    );
    expect(valid).toEqual({ error: null, message: "Order updated successfully." });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("INITIATED");

    const invalid = await updateOrderPaymentStatusAction(
      { error: null },
      formData({ id: order.id, paymentStatus: "SUCCESS" })
    );
    expect(invalid.error).toBe("Payment status must match the recorded payment state.");
    expect(await prisma.orderHistory.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id, action: "PAYMENT_STATUS_CHANGED" } })).toBe(1);

    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: "REFUNDED" } });
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } });
    const refundedToPending = await updateOrderPaymentStatusAction(
      { error: null },
      formData({ id: order.id, paymentStatus: "PENDING" })
    );
    expect(refundedToPending.error).toBe("Payment cannot transition from REFUNDED to PENDING.");
    const refundedToPaid = await updateOrderPaymentStatusAction(
      { error: null },
      formData({ id: order.id, paymentStatus: "SUCCESS" })
    );
    expect(refundedToPaid.error).toBe("Payment cannot transition from REFUNDED to SUCCESS.");
    expect(await prisma.orderHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  test("admin status actions reject unauthenticated and non-admin callers", async () => {
    const user = await makeUser();
    const { order } = await createCustomerOrder(user);

    mockSession = null;
    await expect(
      updateOrderStatusAction({ error: null }, formData({ id: order.id, status: "PROCESSING" }))
    ).rejects.toThrow("Unauthorized");

    mockSession = { user: { id: user.id, role: "CUSTOMER" } };
    await expect(
      updateOrderPaymentStatusAction({ error: null }, formData({ id: order.id, paymentStatus: "PENDING" }))
    ).rejects.toThrow("Forbidden");
  });

  test("admin cancellation releases reservations and records history/audit", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const result = await updateOrderStatusAction(
      { error: null },
      formData({ id: order.id, status: "CANCELLED", notes: "Customer request" })
    );

    expect(result).toEqual({ error: null, message: "Order updated successfully." });
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { inventoryReservations: true, payments: true },
    });
    expect(after.status).toBe("CANCELLED");
    expect(after.paymentStatus).toBe("CANCELLED");
    expect(after.payments[0].status).toBe("INITIATED");
    expect(after.inventoryReservations[0].status).toBe("RELEASED");
    expect(after.inventoryReservations[0].releasedAt).not.toBeNull();
    expect(await prisma.orderHistory.count({ where: { orderId: order.id, status: "CANCELLED" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id, action: "ORDER_CANCELLED" } })).toBe(1);
    expect(
      await prisma.inventoryTransaction.count({
        where: { variantId: variants[0].variant.id, referenceId: order.id },
      })
    ).toBe(0);

    const second = await updateOrderStatusAction(
      { error: null },
      formData({ id: order.id, status: "CANCELLED" })
    );
    expect(second.error).toBe("Cancelled orders cannot be changed.");
    expect(await prisma.orderHistory.count({ where: { orderId: order.id, status: "CANCELLED" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id, action: "ORDER_CANCELLED" } })).toBe(1);
  });

  test("admin cancellation rejects shipped, delivered, and paid orders without changes", async () => {
    const user = await makeUser();
    const shipped = await createCustomerOrder(user);
    const delivered = await createCustomerOrder(user);
    const paid = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    await prisma.order.update({ where: { id: shipped.order.id }, data: { status: "SHIPPED" } });
    await prisma.order.update({ where: { id: delivered.order.id }, data: { status: "DELIVERED" } });
    await validateOnlinePayment(paid.order.id, paid.order.total.toString());
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    for (const [order, expectedError] of [
      [shipped.order, "Only pending orders can be cancelled."],
      [delivered.order, "Only pending orders can be cancelled."],
      [paid.order, "Paid orders cannot be cancelled online at this time."],
    ] as const) {
      const result = await updateOrderStatusAction(
        { error: null },
        formData({ id: order.id, status: "CANCELLED" })
      );
      expect(result.error).toBe(expectedError);
      const unchanged = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { inventoryReservations: true },
      });
      expect(unchanged.status).not.toBe("CANCELLED");
      expect(unchanged.inventoryReservations.some((reservation) => reservation.status === "RELEASED")).toBe(false);
      expect(await prisma.orderHistory.count({ where: { orderId: order.id } })).toBe(0);
      expect(await prisma.auditLog.count({ where: { entityId: order.id, action: "ORDER_CANCELLED" } })).toBe(0);
    }
  });

  test("order detail returns financial and order-time item snapshots without internal fields", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, {
      paymentMethod: "ONLINE",
      items: [
        {
          productName: "Snapshot Hoodie",
          sellingPrice: "20.00",
          discountPrice: "15.00",
          quantity: 2,
          size: "L",
          color: "Blue",
        },
        {
          productName: "Snapshot Cap",
          sellingPrice: "12.50",
          quantity: 2,
          size: "One Size",
          color: "Black",
        },
      ],
    });
    const originalProductName = variants[0].product.name;
    const originalSku = variants[0].variant.sku;

    await prisma.product.update({
      where: { id: variants[0].product.id },
      data: { name: "Renamed Current Product" },
    });
    await prisma.productVariant.update({
      where: { id: variants[0].variant.id },
      data: {
        sku: `MUTATED-${crypto.randomUUID()}`,
        size: "S",
        color: "Red",
        sellingPrice: new Prisma.Decimal("999.99"),
      },
    });

    mockSession = { user: { id: user.id } };
    const detail = await getCustomerOrder(order.orderNumber);
    expect(detail).not.toBeNull();
    expect(detail?.orderNumber).toBe(order.orderNumber);
    expect(detail?.status).toBe("PENDING");
    expect(detail?.paymentStatus).toBe("PENDING");
    expect(detail?.paymentMethod).toBe("ONLINE");
    expect(detail?.items).toHaveLength(2);
    expect(detail?.items[0]).toMatchObject({
      productName: originalProductName,
      sku: originalSku,
      size: "L",
      color: "Blue",
      quantity: 2,
      unitPrice: 15,
      lineTotal: 30,
    });
    expect(new Prisma.Decimal(detail!.subtotal).equals(order.subtotal)).toBe(true);
    expect(new Prisma.Decimal(detail!.discount).equals(order.discount)).toBe(true);
    expect(new Prisma.Decimal(detail!.shippingCost).equals(order.shippingCost)).toBe(true);
    expect(new Prisma.Decimal(detail!.taxAmount).equals(order.taxAmount)).toBe(true);
    expect(new Prisma.Decimal(detail!.total).equals(order.total)).toBe(true);
    expect(detail?.total).toBe(115);

    expect(detail).not.toHaveProperty("userId");
    expect(detail).not.toHaveProperty("checkoutIdempotencyKey");
    expect(detail).not.toHaveProperty("payments");
    expect(detail).not.toHaveProperty("gatewayPayload");
    expect(detail).not.toHaveProperty("inventoryReservations");
    expect(detail?.items[0]).not.toHaveProperty("costPrice");
    expect(detail?.items[0]).not.toHaveProperty("orderId");
    expect(detail?.items[0]).not.toHaveProperty("productId");
    expect(detail?.items[0]).not.toHaveProperty("variantId");
    const serialized = JSON.stringify(detail);
    for (const secret of ["store_passwd", "store_id", "test_password", "gatewayPayload"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test("order detail and customer actions do not disclose or mutate another user's order", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    const orderA = await createCustomerOrder(userA);
    const orderB = await createCustomerOrder(userB, { paymentMethod: "ONLINE" });

    mockSession = { user: { id: userA.id } };
    expect((await getCustomerOrder(orderA.order.orderNumber))?.orderNumber).toBe(
      orderA.order.orderNumber
    );
    expect(await getCustomerOrder(orderB.order.orderNumber)).toBeNull();
    const cancelBFromA = await cancelOrderAction(orderB.order.orderNumber);
    expect(cancelBFromA).toEqual({ success: false, error: "Order not found or access denied." });
    expect(JSON.stringify(cancelBFromA)).not.toContain(orderB.order.orderNumber);
    expect(JSON.stringify(cancelBFromA)).not.toContain(orderB.order.total.toString());
    expect(JSON.stringify(cancelBFromA)).not.toContain(orderB.order.items[0].productName);

    mockSession = { user: { id: userB.id } };
    expect((await getCustomerOrder(orderB.order.orderNumber))?.orderNumber).toBe(
      orderB.order.orderNumber
    );
    expect(await getCustomerOrder(orderA.order.orderNumber)).toBeNull();
    const cancelAFromB = await cancelOrderAction(orderA.order.orderNumber);
    expect(cancelAFromB).toEqual({ success: false, error: "Order not found or access denied." });

    const orderBAfter = await prisma.order.findUniqueOrThrow({
      where: { id: orderB.order.id },
      include: { inventoryReservations: true, payments: true },
    });
    expect(orderBAfter.status).toBe("PENDING");
    expect(orderBAfter.paymentStatus).toBe("PENDING");
    expect(orderBAfter.inventoryReservations).toHaveLength(1);
    expect(orderBAfter.inventoryReservations[0].status).toBe("RESERVED");
    expect(orderBAfter.payments).toHaveLength(1);
    expect(orderBAfter.payments[0].status).toBe("INITIATED");

    expect(await getCustomerOrder("%%% malformed order number %%%")).toBeNull();
    expect(await getCustomerOrder("VL-DOES-NOT-EXIST")).toBeNull();
    expect(await cancelOrderAction("VL-DOES-NOT-EXIST")).toEqual({
      success: false,
      error: "Order not found or access denied.",
    });
  });

  test("order detail exposes representative COD and online payment states", async () => {
    const user = await makeUser();
    const cod = await createCustomerOrder(user);
    expect(cod.order.paymentStatus).toBe("PENDING");

    const pending = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    expect(pending.order.paymentStatus).toBe("PENDING");
    expect(pending.order.payments[0].status).toBe("INITIATED");

    const succeeded = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    await validateOnlinePayment(succeeded.order.id, succeeded.order.total.toString());

    const failed = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({ status: "INVALID_TRANSACTION" }),
    });
    await expect(
      new PaymentService().verifyCallback("SSLCOMMERZ", {
        tran_id: failed.order.payments[0].merchantReferenceId,
        status: "FAILED",
        val_id: crypto.randomUUID(),
      })
    ).rejects.toThrow("Payment verification failed");

    const cancelled = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      json: async () => ({ status: "INVALID_TRANSACTION" }),
    });
    await expect(
      new PaymentService().verifyCallback("SSLCOMMERZ", {
        tran_id: cancelled.order.payments[0].merchantReferenceId,
        status: "CANCELLED",
        val_id: crypto.randomUUID(),
      })
    ).rejects.toThrow("Payment verification failed");

    mockSession = { user: { id: user.id } };
    const expected = [
      [cod.order, "PENDING"],
      [pending.order, "PENDING"],
      [succeeded.order, "SUCCESS"],
      [failed.order, "PENDING"],
      [cancelled.order, "PENDING"],
    ] as const;
    for (const [order, expectedStatus] of expected) {
      const detail = await getCustomerOrder(order.orderNumber);
      expect(detail?.paymentStatus).toBe(expectedStatus);
      expect(detail?.orderNumber).toBe(order.orderNumber);
    }
    expect(
      (await prisma.payment.findFirst({ where: { orderId: succeeded.order.id } }))?.status
    ).toBe("SUCCESS");
    expect((await prisma.payment.findFirst({ where: { orderId: failed.order.id } }))?.status).toBe(
      "INITIATED"
    );
    expect(
      (await prisma.payment.findFirst({ where: { orderId: cancelled.order.id } }))?.status
    ).toBe("INITIATED");
  });

  test("eligible online cancellation releases reservations and is reflected in later reads", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    const before = await prisma.inventoryReservation.findMany({ where: { orderId: order.id } });
    expect(before).toHaveLength(1);
    expect(before[0].status).toBe("RESERVED");

    mockSession = { user: { id: user.id } };
    const result = await cancelOrderAction(order.orderNumber);
    expect(result).toEqual({ success: true, message: "Order successfully cancelled." });

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, inventoryReservations: true },
    });
    expect(after.status).toBe("CANCELLED");
    expect(after.paymentStatus).toBe("CANCELLED");
    expect(after.payments[0].status).toBe("INITIATED");
    expect(after.inventoryReservations[0].status).toBe("RELEASED");
    expect(after.inventoryReservations[0].releasedAt).not.toBeNull();
    expect(
      await prisma.inventoryTransaction.count({
        where: { variantId: variants[0].variant.id, type: "SALE", referenceId: order.id },
      })
    ).toBe(0);
    expect((await getCustomerOrder(order.orderNumber))?.status).toBe("CANCELLED");
    expect(await cancelOrderAction(order.orderNumber)).toEqual({
      success: true,
      message: "Order is already cancelled.",
    });
  });

  test("cancellation rejects non-pending, paid, and already-committed non-COD orders without inventory reversal", async () => {
    const user = await makeUser();
    const paid = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    await validateOnlinePayment(paid.order.id, paid.order.total.toString());
    mockSession = { user: { id: user.id } };
    const paidRejection = await cancelOrderAction(paid.order.orderNumber);
    expect(paidRejection.success).toBe(false);
    expect(paidRejection.error).toContain("Paid orders cannot be cancelled");
    const paidAfter = await prisma.order.findUniqueOrThrow({
      where: { id: paid.order.id },
      include: { payments: true, inventoryReservations: true },
    });
    expect(paidAfter.paymentStatus).toBe("SUCCESS");
    expect(paidAfter.payments[0].status).toBe("SUCCESS");
    expect(paidAfter.inventoryReservations[0].status).toBe("COMMITTED");

    const committedOnline = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    await prisma.inventoryReservation.updateMany({
      where: { orderId: committedOnline.order.id },
      data: { status: "COMMITTED" },
    });
    const committedOnlineRejection = await cancelOrderAction(committedOnline.order.orderNumber);
    expect(committedOnlineRejection.success).toBe(false);
    expect(committedOnlineRejection.error).toContain("already committed stock");

    const processing = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    await prisma.order.update({
      where: { id: processing.order.id },
      data: { status: "PROCESSING" },
    });
    const processingRejection = await cancelOrderAction(processing.order.orderNumber);
    expect(processingRejection).toEqual({
      success: false,
      error: "Only pending orders can be cancelled.",
    });
    const processingAfter = await prisma.order.findUniqueOrThrow({
      where: { id: processing.order.id },
      include: { payments: true, inventoryReservations: true },
    });
    expect(processingAfter.status).toBe("PROCESSING");
    expect(processingAfter.payments[0].status).toBe("INITIATED");
    expect(processingAfter.inventoryReservations[0].status).toBe("RESERVED");
  });

  test("customer cancels their own eligible COD order and inventory is safely restored", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, { paymentMethod: "COD" });
    const variantId = variants[0].variant.id;

    // Verify initial COD state: SALE transaction created, reservation COMMITTED
    const salesBefore = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "SALE" },
    });
    expect(salesBefore).toHaveLength(1);
    expect(salesBefore[0].quantity).toBe(-1);
    expect(order.inventoryReservations[0].status).toBe("COMMITTED");

    // Check current stock before cancellation
    const txBefore = await prisma.inventoryTransaction.findMany({ where: { variantId } });
    const currentStockBefore = txBefore.reduce((acc, t) => acc + t.quantity, 0);

    mockSession = { user: { id: user.id } };
    const cancellation = await cancelOrderAction(order.orderNumber);
    expect(cancellation.success).toBe(true);
    expect(cancellation.message).toBe("Order successfully cancelled.");

    // Order state
    const orderAfter = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { inventoryReservations: true, history: true },
    });
    expect(orderAfter.status).toBe("CANCELLED");
    expect(orderAfter.paymentStatus).toBe("CANCELLED");
    expect(orderAfter.inventoryReservations[0].status).toBe("RELEASED");

    // History and audit log
    expect(orderAfter.history.some((h) => h.status === "CANCELLED")).toBe(true);
    const auditLog = await prisma.auditLog.findFirst({
      where: { entityId: order.id, action: "ORDER_CANCELLED" },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.actorId).toBe(user.id);

    // Ledger inspection: SALE (-1) + RESTOCK (+1)
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(1);
    expect(restocks[0].variantId).toBe(variantId);

    // Final stock has been restored by +1
    const txAfter = await prisma.inventoryTransaction.findMany({ where: { variantId } });
    const currentStockAfter = txAfter.reduce((acc, t) => acc + t.quantity, 0);
    expect(currentStockAfter).toBe(currentStockBefore + 1);
  });

  test("customer cannot cancel another customer's COD order", async () => {
    const owner = await makeUser();
    const otherUser = await makeUser();
    const { order } = await createCustomerOrder(owner, { paymentMethod: "COD" });

    // Try cancelling as otherUser
    mockSession = { user: { id: otherUser.id } };
    const result = await cancelOrderAction(order.orderNumber);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Order not found or access denied.");

    // Ensure order and inventory remain unchanged
    const orderAfter = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { inventoryReservations: true },
    });
    expect(orderAfter.status).toBe("PENDING");
    expect(orderAfter.inventoryReservations[0].status).toBe("COMMITTED");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: order.id, type: "RESTOCK" },
      })
    ).toBe(0);
  });

  test("repeated cancellation requests for COD order are idempotent and do not restore stock twice", async () => {
    const user = await makeUser();
    const { order } = await createCustomerOrder(user, { paymentMethod: "COD" });

    mockSession = { user: { id: user.id } };
    const firstResult = await cancelOrderAction(order.orderNumber);
    expect(firstResult.success).toBe(true);

    const secondResult = await cancelOrderAction(order.orderNumber);
    expect(secondResult.success).toBe(true);
    expect(secondResult.message).toBe("Order is already cancelled.");

    // Exactly one RESTOCK transaction must exist
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(1);

    // Concurrent duplicate cancellation also idempotent
    const user2 = await makeUser();
    const concurrentOrder = await createCustomerOrder(user2, { paymentMethod: "COD" });
    mockSession = { user: { id: user2.id } };
    const [c1, c2] = await Promise.all([
      cancelOrderAction(concurrentOrder.order.orderNumber),
      cancelOrderAction(concurrentOrder.order.orderNumber),
    ]);
    expect(c1.success).toBe(true);
    expect(c2.success).toBe(true);
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: concurrentOrder.order.id, type: "RESTOCK" },
      })
    ).toBe(1);
  });

  test("ineligible or already fulfilled orders cannot be cancelled", async () => {
    const user = await makeUser();
    const cod = await createCustomerOrder(user, { paymentMethod: "COD" });

    // Attach shipment to order
    await prisma.shipment.create({
      data: {
        orderId: cod.order.id,
        provider: "steadfast",
        status: "CREATED",
        shippingAmount: cod.order.shippingCost,
      },
    });

    mockSession = { user: { id: user.id } };
    const shipmentRejection = await cancelOrderAction(cod.order.orderNumber);
    expect(shipmentRejection.success).toBe(false);
    expect(shipmentRejection.error).toContain("after shipment processing has started");

    // Delivered COD order cannot be cancelled
    const deliveredCod = await createCustomerOrder(user, { paymentMethod: "COD" });
    await prisma.order.update({
      where: { id: deliveredCod.order.id },
      data: { status: "DELIVERED" },
    });
    const deliveredRejection = await cancelOrderAction(deliveredCod.order.orderNumber);
    expect(deliveredRejection.success).toBe(false);
    expect(deliveredRejection.error).toBe("Only pending orders can be cancelled.");
  });

  test("concurrent cancellation attempts release an eligible reservation once", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    mockSession = { user: { id: user.id } };

    const [first, second] = await Promise.all([
      cancelOrderAction(order.orderNumber),
      cancelOrderAction(order.orderNumber),
    ]);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, inventoryReservations: true },
    });
    expect(finalOrder.status).toBe("CANCELLED");
    expect(finalOrder.paymentStatus).toBe("CANCELLED");
    expect(finalOrder.payments[0].status).toBe("INITIATED");
    expect(finalOrder.inventoryReservations).toHaveLength(1);
    expect(finalOrder.inventoryReservations[0].status).toBe("RELEASED");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: order.id, variantId: variants[0].variant.id, type: "SALE" },
      })
    ).toBe(0);
  });

  test("cancellation while provider validation is pending does not commit released inventory", async () => {
    const user = await makeUser();
    const { order, variants } = await createCustomerOrder(user, { paymentMethod: "ONLINE" });
    let markValidationStarted: (() => void) | undefined;
    let releaseValidation: (() => void) | undefined;
    const validationStarted = new Promise<void>((resolve) => {
      markValidationStarted = resolve;
    });

    (global.fetch as import("vitest").Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseValidation = () =>
            resolve({
              json: async () => ({
                status: "VALID",
                amount: order.total.toFixed(2),
                bank_tran_id: crypto.randomUUID(),
                tran_id: order.payments[0].merchantReferenceId,
                currency: "BDT",
              }),
            });
          markValidationStarted?.();
        })
    );

    const verification = new PaymentService().verifyCallback("SSLCOMMERZ", {
      tran_id: order.payments[0].merchantReferenceId,
      val_id: crypto.randomUUID(),
    });
    await validationStarted;

    mockSession = { user: { id: user.id } };
    const cancellation = await cancelOrderAction(order.orderNumber);
    expect(cancellation.success).toBe(true);
    releaseValidation?.();
    await verification;

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, inventoryReservations: true },
    });
    expect(finalOrder.status).toBe("CANCELLED");
    expect(finalOrder.paymentStatus).toBe("SUCCESS");
    expect(finalOrder.payments[0].status).toBe("SUCCESS");
    expect(finalOrder.inventoryReservations[0].status).toBe("RELEASED");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: order.id, variantId: variants[0].variant.id, type: "SALE" },
      })
    ).toBe(0);
  });

  test("malformed cancellation input returns a safe customer-facing error", async () => {
    const user = await makeUser();
    mockSession = { user: { id: user.id } };
    const result = await cancelOrderAction(null as unknown as string);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to cancel the order. Please try again later.");
    for (const internal of ["Prisma", "SQL", "DATABASE_URL", "node_modules", "E:\\"]) {
      expect(result.error).not.toContain(internal);
    }
  });
});
