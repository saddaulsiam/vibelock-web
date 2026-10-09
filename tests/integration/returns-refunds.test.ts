import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../src/lib/prisma/client";
import { createReturnRequestAction } from "../../src/lib/returns/actions";
import { ReturnService } from "../../src/lib/returns/service";
import { RefundService } from "../../src/lib/refunds/service";
import { PaymentService } from "../../src/lib/payment/service";
import { cancelOrderAction } from "../../src/lib/orders/actions";
import { createTestProduct, createTestVariant } from "../factories";
import { createTestUser } from "../factories/user";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));
vi.mock("../../src/lib/config/env", () => ({
  env: {
    SSLCOMMERZ_STORE_ID: "test_store_id",
    SSLCOMMERZ_STORE_PASSWORD: "test_store_password",
    SSLCOMMERZ_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  },
}));

const userIds: string[] = [];
const productIds: string[] = [];
const variantIds: string[] = [];
const orderIds: string[] = [];
const paymentIds: string[] = [];
const returnIds: string[] = [];

type Fixture = {
  user: Awaited<ReturnType<typeof createTestUser>>;
  order: Awaited<ReturnType<typeof prisma.order.create>>;
  orderItems: Awaited<ReturnType<typeof prisma.orderItem.create>>[];
  variants: Awaited<ReturnType<typeof createTestVariant>>[];
  payment?: Awaited<ReturnType<typeof prisma.payment.create>>;
};

async function createFixture(
  options: {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paymentStatus?: "PENDING" | "INITIATED" | "SUCCESS" | "FAILED";
    quantity?: number;
    prices?: string[];
    gateway?: string;
  } = {}
): Promise<Fixture> {
  const user = await createTestUser({ email: `phase3j-${crypto.randomUUID()}@example.com` });
  userIds.push(user.id);

  const quantity = options.quantity ?? 5;
  const prices = options.prices ?? ["999.99"];
  const variants: Awaited<ReturnType<typeof createTestVariant>>[] = [];
  const orderItems: Awaited<ReturnType<typeof prisma.orderItem.create>>[] = [];
  for (let index = 0; index < prices.length; index += 1) {
    const product = await createTestProduct({ name: `Return Fixture ${crypto.randomUUID()}` });
    productIds.push(product.id);
    const variant = await createTestVariant({
      productId: product.id,
      sku: `RMA-${crypto.randomUUID()}`,
      sellingPrice: new Prisma.Decimal(prices[index]),
    });
    variantIds.push(variant.id);
    variants.push(variant);
  }

  const subtotal = prices.reduce(
    (sum, price) => sum.add(new Prisma.Decimal(price).mul(quantity)),
    new Prisma.Decimal(0)
  );
  const paymentMethod = options.paymentMethod ?? "ONLINE";
  const isSuccessful = options.paymentStatus === "SUCCESS";
  const order = await prisma.order.create({
    data: {
      orderNumber: `VLE-${crypto.randomUUID()}`,
      userId: user.id,
      status: options.status ?? "DELIVERED",
      paymentStatus: options.paymentStatus ?? (paymentMethod === "COD" ? "PENDING" : "SUCCESS"),
      paymentMethod,
      customerEmail: user.email,
      taxRate: new Prisma.Decimal("0.00"),
      taxIncluded: false,
      shippingCost: new Prisma.Decimal("0.00"),
      subtotal,
      taxAmount: new Prisma.Decimal("0.00"),
      discount: new Prisma.Decimal("0.00"),
      total: subtotal,
      shippingStreet: "1 Test Road",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
      shippingMethodName: "Test delivery",
      items: {
        create: prices.map((price, index) => ({
          productName: `Snapshot ${index + 1}`,
          sku: variants[index].sku,
          unitPrice: new Prisma.Decimal(price),
          costPrice: new Prisma.Decimal("250.25"),
          appliedDiscount: new Prisma.Decimal("0.00"),
          taxRate: new Prisma.Decimal("0.00"),
          taxIncluded: false,
          lineSubtotal: new Prisma.Decimal(price).mul(quantity),
          discountAmount: new Prisma.Decimal("0.00"),
          taxAmount: new Prisma.Decimal("0.00"),
          lineTotal: new Prisma.Decimal(price).mul(quantity),
          quantity,
        })),
      },
    },
    include: { items: true },
  });
  orderIds.push(order.id);
  orderItems.push(...order.items);

  for (const variant of variants) {
    await prisma.inventoryTransaction.create({
      data: {
        variantId: variant.id,
        type: "RESTOCK",
        quantity: 10,
        referenceId: `SEED-${crypto.randomUUID()}`,
      },
    });
  }

  let payment: Fixture["payment"];
  if (paymentMethod === "ONLINE") {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: subtotal,
        status: options.paymentStatus ?? "SUCCESS",
        gateway: options.gateway ?? "SSLCOMMERZ",
        merchantReferenceId: `MERCHANT-${crypto.randomUUID()}`,
        gatewayTransactionId:
          isSuccessful || options.paymentStatus === undefined
            ? `BANK-${crypto.randomUUID()}`
            : null,
      },
    });
    paymentIds.push(payment.id);
  }

  return { user, order, orderItems, variants, payment };
}

async function createReturn(fixture: Fixture, quantity = 1) {
  const result = await prisma.returnRequest.create({
    data: {
      orderId: fixture.order.id,
      status: "COMPLETED",
      reason: "Regression fixture",
      items: { create: [{ orderItemId: fixture.orderItems[0].id, quantity }] },
    },
  });
  returnIds.push(result.id);
  return result;
}

describe("Phase 3J - Returns, Refunds & Reconciliation", () => {
  beforeEach(() => {
    mockSession = null;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await prisma.$transaction(async (tx) => {
      if (returnIds.length) {
        await tx.inventoryTransaction.deleteMany({ where: { referenceId: { in: returnIds } } });
        await tx.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
      }
      if (paymentIds.length)
        await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
      if (orderIds.length) {
        await tx.inventoryReservation.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (variantIds.length) {
        await tx.inventoryTransaction.deleteMany({ where: { variantId: { in: variantIds } } });
        await tx.productVariant.deleteMany({ where: { id: { in: variantIds } } });
      }
      if (productIds.length) await tx.product.deleteMany({ where: { id: { in: productIds } } });
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    userIds.length = 0;
    productIds.length = 0;
    variantIds.length = 0;
    orderIds.length = 0;
    paymentIds.length = 0;
    returnIds.length = 0;
  });

  test("return creation requires ownership, a delivered order, and valid quantities", async () => {
    const owner = await createFixture({ quantity: 5 });
    const other = await createFixture({ quantity: 5 });
    mockSession = null;
    expect(
      await createReturnRequestAction({
        orderNumber: owner.order.orderNumber,
        items: [{ orderItemId: owner.orderItems[0].id, quantity: 1 }],
      })
    ).toEqual({ success: false, error: "Unauthorized" });
    mockSession = { user: { id: owner.user.id } };
    const own = await createReturnRequestAction({
      orderNumber: owner.order.orderNumber,
      items: [{ orderItemId: owner.orderItems[0].id, quantity: 1 }],
    });
    expect(own.success).toBe(true);
    if ("returnRequestId" in own) returnIds.push(own.returnRequestId);

    const foreign = await createReturnRequestAction({
      orderNumber: other.order.orderNumber,
      items: [{ orderItemId: other.orderItems[0].id, quantity: 1 }],
    });
    expect(foreign.success).toBe(false);
    expect(JSON.stringify(foreign)).not.toContain(other.order.orderNumber);

    for (const status of ["PENDING", "PROCESSING", "CANCELLED"] as const) {
      const fixture = await createFixture({ status, quantity: 2 });
      const response = await createReturnRequestAction({
        orderNumber: fixture.order.orderNumber,
        items: [{ orderItemId: fixture.orderItems[0].id, quantity: 1 }],
      });
      expect(response.success).toBe(false);
    }

    for (const quantity of [0, -1, 1.5]) {
      const response = await createReturnRequestAction({
        orderNumber: owner.order.orderNumber,
        items: [{ orderItemId: owner.orderItems[0].id, quantity }],
      });
      expect(response).toEqual({ success: false, error: "Invalid return request data" });
    }
    const tooMany = await createReturnRequestAction({
      orderNumber: owner.order.orderNumber,
      items: [{ orderItemId: owner.orderItems[0].id, quantity: 6 }],
    });
    expect(tooMany.success).toBe(false);
    expect(
      await createReturnRequestAction({
        orderNumber: owner.order.orderNumber,
        items: [],
      })
    ).toEqual({ success: false, error: "Invalid return request data" });
    const missingOrder = await createReturnRequestAction({
      orderNumber: "VLE-MISSING-ORDER",
      items: [{ orderItemId: owner.orderItems[0].id, quantity: 1 }],
    });
    expect(missingOrder).toEqual({
      success: false,
      error: "Order not found or access denied.",
    });
    expect(JSON.stringify(missingOrder)).not.toContain("Prisma");
    const duplicate = await createReturnRequestAction({
      orderNumber: owner.order.orderNumber,
      items: [
        { orderItemId: owner.orderItems[0].id, quantity: 1 },
        { orderItemId: owner.orderItems[0].id, quantity: 1 },
      ],
    });
    expect(duplicate).toEqual({ success: false, error: "Invalid return request data" });
  });

  test("partial return quantities are capped by prior non-rejected requests", async () => {
    const fixture = await createFixture({ quantity: 5 });
    mockSession = { user: { id: fixture.user.id } };
    const request = (quantity: number) =>
      createReturnRequestAction({
        orderNumber: fixture.order.orderNumber,
        items: [{ orderItemId: fixture.orderItems[0].id, quantity }],
      });
    const first = await request(2);
    expect(first.success).toBe(true);
    if ("returnRequestId" in first) returnIds.push(first.returnRequestId);
    const second = await request(3);
    expect(second.success).toBe(true);
    if ("returnRequestId" in second) returnIds.push(second.returnRequestId);
    expect((await request(1)).success).toBe(false);
  });

  test("concurrent return requests cannot exceed the purchased quantity", async () => {
    const fixture = await createFixture({ quantity: 5 });
    mockSession = { user: { id: fixture.user.id } };
    const request = () =>
      createReturnRequestAction({
        orderNumber: fixture.order.orderNumber,
        items: [{ orderItemId: fixture.orderItems[0].id, quantity: 3 }],
      });
    const outcomes = await Promise.all([request(), request()]);
    const accepted = outcomes.filter((outcome) => outcome.success);
    expect(accepted).toHaveLength(1);
    for (const outcome of accepted) {
      if ("returnRequestId" in outcome) returnIds.push(outcome.returnRequestId);
    }
    const returnable = await new ReturnService().getReturnableQuantities(fixture.order.id);
    expect(returnable[fixture.orderItems[0].id]).toBe(2);
  });

  test("completed return restocking targets the right SKU and is idempotent", async () => {
    const fixture = await createFixture({ quantity: 5, prices: ["999.99", "1499.50"] });
    const returnRequest = await createReturn(fixture, 2);
    const service = new ReturnService();
    const before = await prisma.inventoryTransaction.aggregate({
      where: { variantId: fixture.variants[0].id },
      _sum: { quantity: true },
    });
    await prisma.$transaction((tx) => service.processReturnRestock(returnRequest.id, tx));
    await prisma.$transaction((tx) => service.processReturnRestock(returnRequest.id, tx));
    const after0 = await prisma.inventoryTransaction.aggregate({
      where: { variantId: fixture.variants[0].id },
      _sum: { quantity: true },
    });
    const after1 = await prisma.inventoryTransaction.aggregate({
      where: { variantId: fixture.variants[1].id },
      _sum: { quantity: true },
    });
    expect(after0._sum.quantity! - before._sum.quantity!).toBe(2);
    expect(after1._sum.quantity).toBe(10);
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: returnRequest.id, type: "RETURN" },
      })
    ).toBe(1);
  });

  test("return restocking rejects non-completed requests", async () => {
    const fixture = await createFixture();
    const pending = await prisma.returnRequest.create({
      data: {
        orderId: fixture.order.id,
        status: "APPROVED",
        items: { create: [{ orderItemId: fixture.orderItems[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(pending.id);
    await expect(
      prisma.$transaction((tx) => new ReturnService().processReturnRestock(pending.id, tx))
    ).rejects.toThrow("Return must be completed to restock");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: pending.id, type: "RETURN" },
      })
    ).toBe(0);
    const rejected = await prisma.returnRequest.create({
      data: {
        orderId: fixture.order.id,
        status: "REJECTED",
        items: { create: [{ orderItemId: fixture.orderItems[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(rejected.id);
    await expect(
      prisma.$transaction((tx) => new ReturnService().processReturnRestock(rejected.id, tx))
    ).rejects.toThrow("Return must be completed to restock");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: rejected.id, type: "RETURN" },
      })
    ).toBe(0);
    expect(await prisma.refund.count({ where: { payment: { orderId: fixture.order.id } } })).toBe(
      0
    );
  });

  test("refund amount must be positive and no larger than the remaining payment", async () => {
    const fixture = await createFixture({ quantity: 1, prices: ["999.99"] });
    const refunds = new RefundService();
    const amount = new Prisma.Decimal("999.99");
    for (const invalid of [new Prisma.Decimal(0), new Prisma.Decimal(-1)]) {
      await expect(refunds.initiateRefund(fixture.payment!.id, invalid)).rejects.toThrow();
    }
    const refund = await refunds.initiateRefund(fixture.payment!.id, amount);
    expect(refund.amount.equals(amount)).toBe(true);
    expect(refund.status).toBe("PENDING");
    await expect(
      refunds.initiateRefund(fixture.payment!.id, new Prisma.Decimal("0.01"))
    ).rejects.toThrow(/exceeds remaining refundable amount/i);
  });

  test("partial refund can be completed cumulatively and updates the parent order state", async () => {
    const fixture = await createFixture({ quantity: 1, prices: ["1499.50"] });
    const refunds = new RefundService();
    const first = await refunds.initiateRefund(fixture.payment!.id, new Prisma.Decimal("999.25"));
    if (first.status !== "SUCCESS") {
      const completed = await refunds.markRefundSuccess(first.id, `REF-${crypto.randomUUID()}`);
      expect(completed.status).toBe("SUCCESS");
    }
    expect((await refunds.getRefundableAmount(fixture.payment!.id)).toFixed(2)).toBe("500.25");
    const second = await refunds.initiateRefund(fixture.payment!.id, new Prisma.Decimal("500.25"));
    await refunds.markRefundSuccess(second.id, `REF-${crypto.randomUUID()}`);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: fixture.payment!.id } });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    expect(payment.status).toBe("REFUNDED");
    expect(order.paymentStatus).toBe("REFUNDED");
  });

  test("concurrent refund reservations cannot exceed the successful payment", async () => {
    const fixture = await createFixture({ quantity: 1, prices: ["999.99"] });
    const service = new RefundService();
    const attempts = await Promise.allSettled([
      service.initiateRefund(fixture.payment!.id, new Prisma.Decimal("600.00")),
      service.initiateRefund(fixture.payment!.id, new Prisma.Decimal("600.00")),
    ]);
    const accepted = attempts.filter((attempt) => attempt.status === "fulfilled");
    expect(accepted).toHaveLength(1);
    const refunds = await prisma.refund.findMany({ where: { paymentId: fixture.payment!.id } });
    const reserved = refunds.reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    expect(reserved.toFixed(2)).toBe("600.00");
    expect(reserved.lte(fixture.payment!.amount)).toBe(true);
  });

  test("failed/pending/COD payments are not sent to the online refund provider", async () => {
    const cod = await createFixture({ paymentMethod: "COD" });
    const pending = await createFixture({ paymentStatus: "INITIATED" });
    const failed = await createFixture({ paymentStatus: "FAILED" });
    const service = new RefundService();
    expect(cod.payment).toBeUndefined();
    await expect(service.getRefundableAmount("COD-ORDER-HAS-NO-PAYMENT")).rejects.toThrow(
      "Payment not found"
    );
    expect((await service.getRefundableAmount(pending.payment!.id)).isZero()).toBe(true);
    expect((await service.getRefundableAmount(failed.payment!.id)).isZero()).toBe(true);
    await expect(
      service.initiateRefund(pending.payment!.id, new Prisma.Decimal("1.00"))
    ).rejects.toThrow(/exceeds remaining refundable amount/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("SSLCommerz provider sends exact refund details and does not leak credentials", async () => {
    const fixture = await createFixture({ quantity: 1, prices: ["250.25"] });
    const refund = await new RefundService().initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("250.25"),
      "Return approved"
    );
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "success", refund_ref_id: "GW-REF-1" }),
    } as Response);
    const result = await new RefundService().processRefundWithProvider(refund.id);
    expect(result.success).toBe(true);
    const [url] = vi.mocked(global.fetch).mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.searchParams.get("refund_amount")).toBe("250.25");
    expect(requestUrl.searchParams.get("bank_tran_id")).toBe(fixture.payment!.gatewayTransactionId);
    expect(requestUrl.searchParams.get("refe_id")).toBe(refund.id);
    expect(requestUrl.searchParams.get("store_id")).toBe("test_store_id");
    expect(requestUrl.searchParams.get("store_passwd")).toBe("test_store_password");
    const persisted = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
    expect(persisted.status).toBe("SUCCESS");
    expect(persisted.gatewayRefId).toBe("GW-REF-1");
    expect(JSON.stringify(result)).not.toContain("test_store_password");
    expect((await new RefundService().processRefundWithProvider(refund.id)).success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("provider failure and timeout do not create a successful refund", async () => {
    const fixture = await createFixture({ quantity: 2, prices: ["500.00"] });
    const service = new RefundService();
    const rejected = await service.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("200.00")
    );
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "failed", errorReason: "declined" }),
    } as Response);
    const rejectedResult = await service.processRefundWithProvider(rejected.id);
    expect(rejectedResult.success).toBe(false);
    expect(JSON.stringify(rejectedResult)).not.toContain("declined");
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: rejected.id } })).status).toBe(
      "FAILED"
    );

    const httpError = await service.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("50.00")
    );
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        APIConnect: "DONE",
        status: "success",
        refund_ref_id: "SHOULD-NOT-ACCEPT",
      }),
    } as Response);
    expect((await service.processRefundWithProvider(httpError.id)).success).toBe(false);
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: httpError.id } })).status).toBe(
      "PROCESSING"
    );

    const malformed = await service.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("50.00")
    );
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    expect((await service.processRefundWithProvider(malformed.id)).success).toBe(false);
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: malformed.id } })).status).toBe(
      "PROCESSING"
    );

    const timeout = await service.initiateRefund(fixture.payment!.id, new Prisma.Decimal("100.00"));
    const providerErrorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(global.fetch).mockRejectedValueOnce(
      new Error("network timeout DATABASE_URL test_store_password")
    );
    const timeoutResult = await service.processRefundWithProvider(timeout.id);
    expect(timeoutResult.success).toBe(false);
    expect(JSON.stringify(timeoutResult)).not.toMatch(/DATABASE_URL|test_store_password|stack/i);
    expect(JSON.stringify(providerErrorLog.mock.calls)).not.toMatch(
      /DATABASE_URL|test_store_password|network timeout/i
    );
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: timeout.id } })).status).toBe(
      "PROCESSING"
    );
    expect((await service.processRefundWithProvider(timeout.id)).success).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test("concurrent processing of one refund invokes the provider at most once", async () => {
    const fixture = await createFixture({ quantity: 1, prices: ["250.25"] });
    const service = new RefundService();
    const refund = await service.initiateRefund(fixture.payment!.id, new Prisma.Decimal("250.25"));
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "success", refund_ref_id: "RACE-REF" }),
    } as Response);
    const outcomes = await Promise.all([
      service.processRefundWithProvider(refund.id),
      service.processRefundWithProvider(refund.id),
    ]);
    expect(outcomes.some((outcome) => outcome.success)).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(await prisma.refund.count({ where: { paymentId: fixture.payment!.id } })).toBe(1);
  });

  test("late success after cancellation is reconciled by a full refund without stock mutation", async () => {
    const fixture = await createFixture({
      status: "PENDING",
      paymentStatus: "INITIATED",
      quantity: 1,
    });
    const reservation = await prisma.inventoryReservation.create({
      data: {
        orderId: fixture.order.id,
        variantId: fixture.variants[0].id,
        quantity: 1,
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    mockSession = { user: { id: fixture.user.id } };
    const cancelled = await cancelOrderAction(fixture.order.orderNumber);
    expect(cancelled.success).toBe(true);
    expect(
      (await prisma.inventoryReservation.findUniqueOrThrow({ where: { id: reservation.id } }))
        .status
    ).toBe("RELEASED");

    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        status: "VALID",
        amount: fixture.payment!.amount.toFixed(2),
        bank_tran_id: "LATE-BANK-TX",
        tran_id: fixture.payment!.merchantReferenceId,
        currency: "BDT",
      }),
    } as Response);
    await new PaymentService().verifyCallback("SSLCOMMERZ", {
      tran_id: fixture.payment!.merchantReferenceId,
      val_id: "VALIDATION-ID",
    });
    const afterCallback = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    expect(afterCallback.status).toBe("CANCELLED");
    expect(afterCallback.paymentStatus).toBe("SUCCESS");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: fixture.order.id, type: "SALE" },
      })
    ).toBe(0);

    const refunds = new RefundService();
    const refund = await refunds.initiateRefund(fixture.payment!.id, fixture.payment!.amount);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "success", refund_ref_id: "LATE-REFUND" }),
    } as Response);
    await refunds.processRefundWithProvider(refund.id);
    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: fixture.payment!.id },
    });
    expect(finalPayment.status).toBe("REFUNDED");
    expect(finalOrder.status).toBe("CANCELLED");
    expect(finalOrder.paymentStatus).toBe("REFUNDED");
    expect(
      await prisma.inventoryTransaction.count({
        where: { referenceId: fixture.order.id, type: "SALE" },
      })
    ).toBe(0);
  });

  test("regression: persisted uppercase SSLCOMMERZ gateway successfully dispatches to refund provider", async () => {
    const fixture = await createFixture({
      quantity: 1,
      prices: ["300.00"],
      gateway: "SSLCOMMERZ",
    });
    expect(fixture.payment!.gateway).toBe("SSLCOMMERZ");

    const refundService = new RefundService();
    const refund = await refundService.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("300.00"),
      "Return approved for SSLCOMMERZ payment"
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "success", refund_ref_id: "UPPER-REF-1" }),
    } as Response);

    const result = await refundService.processRefundWithProvider(refund.id);
    expect(result.success).toBe(true);

    const [url] = vi.mocked(global.fetch).mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.searchParams.get("refund_amount")).toBe("300");
    expect(requestUrl.searchParams.get("bank_tran_id")).toBe(fixture.payment!.gatewayTransactionId);
    expect(requestUrl.searchParams.get("refe_id")).toBe(refund.id);

    const persisted = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
    expect(persisted.status).toBe("SUCCESS");
    expect(persisted.gatewayRefId).toBe("UPPER-REF-1");

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: fixture.payment!.id },
    });
    expect(updatedPayment.status).toBe("REFUNDED");
  });

  test("regression: legacy lowercase sslcommerz gateway also dispatches to refund provider", async () => {
    const fixture = await createFixture({
      quantity: 1,
      prices: ["150.00"],
      gateway: "sslcommerz",
    });
    expect(fixture.payment!.gateway).toBe("sslcommerz");

    const refundService = new RefundService();
    const refund = await refundService.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("150.00"),
      "Return approved for legacy lowercase payment"
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ APIConnect: "DONE", status: "success", refund_ref_id: "LOWER-REF-1" }),
    } as Response);

    const result = await refundService.processRefundWithProvider(refund.id);
    expect(result.success).toBe(true);

    const persisted = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
    expect(persisted.status).toBe("SUCCESS");
    expect(persisted.gatewayRefId).toBe("LOWER-REF-1");
  });

  test("regression: unsupported gateway fails safely without dispatching to SSLCommerz", async () => {
    const fixture = await createFixture({
      quantity: 1,
      prices: ["100.00"],
      gateway: "UNSUPPORTED_GATEWAY",
    });

    const refundService = new RefundService();
    const refund = await refundService.initiateRefund(
      fixture.payment!.id,
      new Prisma.Decimal("100.00")
    );

    const result = await refundService.processRefundWithProvider(refund.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Refund provider rejected the request");
    expect(global.fetch).not.toHaveBeenCalled();

    const persisted = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
    expect(persisted.status).toBe("FAILED");
  });
});
