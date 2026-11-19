/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";

// Hoist mock env
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

// Mock Sentry
const { mockSentry } = vi.hoisted(() => ({
  mockSentry: {
    captureMessage: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => mockSentry);

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

// Mock inventory service
const { mockCancelOrderInventory, mockConsumeReservation } = vi.hoisted(() => ({
  mockCancelOrderInventory: vi.fn(async () => {}),
  mockConsumeReservation: vi.fn(async () => {}),
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    consumeReservation: mockConsumeReservation,
    cancelOrderInventory: mockCancelOrderInventory,
    calculateAvailableQuantity: vi.fn(() => 10),
  },
}));

// Mock coupon release
const { mockReleaseOrderCoupon } = vi.hoisted(() => ({
  mockReleaseOrderCoupon: vi.fn(async () => {}),
}));

vi.mock("@/lib/checkout/coupons", () => ({
  releaseOrderCoupon: mockReleaseOrderCoupon,
}));

import { SSLCommerzProvider } from "@/lib/payment/providers/sslcommerz/client";
import { PaymentService } from "@/lib/payment/service";

const originalFetch = global.fetch;

describe("SSLCommerz Failed Payment Verification & Query Fallback", () => {
  let provider: SSLCommerzProvider;
  let paymentService: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.order.findUnique.mockReset();
    mockPrisma.order.findFirst.mockReset();
    mockPrisma.order.create.mockReset();
    mockPrisma.order.update.mockReset();
    mockPrisma.order.updateMany.mockReset();
    mockPrisma.payment.findUnique.mockReset();
    mockPrisma.payment.findFirst.mockReset();
    mockPrisma.payment.create.mockReset();
    mockPrisma.payment.update.mockReset();
    mockPrisma.payment.updateMany.mockReset();
    mockPrisma.productVariant.findMany.mockReset();
    mockPrisma.productVariant.findUnique.mockReset();
    mockPrisma.inventoryReservation.findMany.mockReset();
    mockPrisma.inventoryReservation.updateMany.mockReset();
    mockPrisma.inventoryTransaction.findMany.mockReset();
    mockPrisma.inventoryTransaction.createMany.mockReset();
    mockPrisma.orderHistory.create.mockReset();
    mockPrisma.auditLog.create.mockReset();
    provider = new SSLCommerzProvider();
    paymentService = new PaymentService();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Failed IPN without val_id confirmed by query API
  // --------------------------------------------------------------------------
  it("1. verifies failed IPN without val_id via Merchant Transaction ID validation query", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-VL-ORD-01-12345",
              val_id: "VAL-FAIL-01",
              status: "FAILED",
              amount: "1050.00",
              currency: "BDT",
              bank_tran_id: "BANK-TRX-FAIL-01",
              error: "Insufficient funds",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-VL-ORD-01-12345",
      status: "FAILED",
      amount: "1050.00",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.isUnverified).toBe(false);
    expect(result.verifiedMerchantReferenceId).toBe("SSLC-VL-ORD-01-12345");
    expect(result.verifiedAmount).toBe(1050.0);
    expect(result.verifiedCurrency).toBe("BDT");
    expect(result.providerTransactionId).toBe("BANK-TRX-FAIL-01");
  });

  // --------------------------------------------------------------------------
  // 2. ISSUER BANK DECLINED response (production scenario)
  // --------------------------------------------------------------------------
  it("2. normalizes ISSUER BANK DECLINED as verified FAILED status", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-VL-20261119-CDA9BE-1795087077634",
              val_id: "261119171758wfcbUNST0w6UiPJ",
              status: "ISSUER BANK DECLINED",
              amount: "1050.00",
              currency: "BDT",
              bank_tran_id: "261119171758wfcbUNST0w6UiPJ",
              error: "Issuer Bank Declined",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-VL-20261119-CDA9BE-1795087077634",
      status: "FAILED",
      amount: "1050.00",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.isUnverified).toBe(false);
    expect(result.verifiedMerchantReferenceId).toBe("SSLC-VL-20261119-CDA9BE-1795087077634");
    expect(result.verifiedAmount).toBe(1050.0);
    expect(result.verifiedCurrency).toBe("BDT");
  });

  // --------------------------------------------------------------------------
  // 3. Confirmed cancellation
  // --------------------------------------------------------------------------
  it("3. normalizes gateway CANCELLED status as verified CANCELLED", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-CANCEL-01",
              status: "CANCELLED",
              amount: "1050.00",
              currency: "BDT",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-CANCEL-01",
      status: "CANCEL",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("CANCELLED");
    expect(result.isUnverified).toBe(false);
    expect(result.verifiedMerchantReferenceId).toBe("SSLC-CANCEL-01");
  });

  // --------------------------------------------------------------------------
  // 4. Wrong tran_id
  // --------------------------------------------------------------------------
  it("4. rejects query response when returned tran_id does not match requested tran_id", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "WRONG-TRAN-ID-99",
              status: "FAILED",
              amount: "1050.00",
              currency: "BDT",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-CORRECT-TRAN-01",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("No matching tran_id found");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "transaction_reference_mismatch",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 5. Amount mismatch
  // --------------------------------------------------------------------------
  it("5. rejects query response when amount does not match incoming amount", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-AMT-TEST-01",
              status: "FAILED",
              amount: "500.00",
              currency: "BDT",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-AMT-TEST-01",
      status: "FAILED",
      amount: "1050.00",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("Amount mismatch");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "amount_mismatch",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 6. Currency mismatch
  // --------------------------------------------------------------------------
  it("6. rejects query response when currency is not BDT", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-CURR-TEST-01",
              status: "FAILED",
              amount: "1050.00",
              currency: "USD",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-CURR-TEST-01",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("Currency mismatch");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "currency_mismatch",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 7. Unknown gateway status
  // --------------------------------------------------------------------------
  it("7. treats unknown or pending status as unverified and emits security alert", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 1,
          element: [
            {
              tran_id: "SSLC-UNKNOWN-ST-01",
              status: "PROCESSING_UNKNOWN",
              amount: "1050.00",
              currency: "BDT",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-UNKNOWN-ST-01",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("Unknown or pending gateway status");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "unknown_gateway_status",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 8. No transaction returned (element: [])
  // --------------------------------------------------------------------------
  it("8. handles element: [] safely without crashing and logs no_transaction_found", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 0,
          element: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-NO-TRANS-01",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("No transaction records found");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "no_transaction_found",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 9. Multiple transaction records (selecting correct tran_id)
  // --------------------------------------------------------------------------
  it("9. safely locates the matching tran_id record when multiple elements returned", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          APIConnect: "DONE",
          no_of_trans_found: 2,
          element: [
            {
              tran_id: "SSLC-OTHER-TRX-01",
              status: "VALID",
              amount: "2000.00",
              currency: "BDT",
            },
            {
              tran_id: "SSLC-TARGET-TRX-02",
              status: "DECLINED",
              amount: "1050.00",
              currency: "BDT",
              bank_tran_id: "BANK-DECLINED-99",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-TARGET-TRX-02",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.verifiedMerchantReferenceId).toBe("SSLC-TARGET-TRX-02");
    expect(result.verifiedAmount).toBe(1050.0);
    expect(result.providerTransactionId).toBe("BANK-DECLINED-99");
  });

  // --------------------------------------------------------------------------
  // 10. Gateway API timeout
  // --------------------------------------------------------------------------
  it("10. handles gateway API timeout safely and preserves unresolved state", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));

    const result = await provider.verifyPayment({
      tran_id: "SSLC-TIMEOUT-01",
      status: "FAILED",
    });

    expect(result.isUnverified).toBe(true);
    expect(result.error).toContain("timed out or failed");
    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
      expect.objectContaining({
        contexts: expect.objectContaining({
          security: expect.objectContaining({
            reason: "gateway_query_failed",
          }),
        }),
      })
    );
  });

  // --------------------------------------------------------------------------
  // 11. Duplicate callback idempotency
  // --------------------------------------------------------------------------
  it("11. short-circuits duplicate non-success callback when payment is already FAILED", async () => {
    const alreadyFailedPayment = {
      id: "pay-failed-dup-01",
      orderId: "ord-failed-dup-01",
      amount: new Prisma.Decimal("1050.00"),
      status: "FAILED",
      merchantReferenceId: "SSLC-DUP-FAIL-01",
      gateway: "SSLCOMMERZ",
    };

    const existingOrder = {
      id: "ord-failed-dup-01",
      orderNumber: "VL-20261119-DUP01",
      status: "PENDING",
      paymentStatus: "FAILED",
    };

    mockPrisma.payment.findUnique.mockResolvedValueOnce(alreadyFailedPayment);
    mockPrisma.order.findUnique.mockResolvedValueOnce(existingOrder);

    const mockProvider = {
      verifyPayment: vi.fn(),
      initiatePayment: vi.fn(),
    };
    vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

    const result = await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-DUP-FAIL-01",
      status: "ISSUER BANK DECLINED",
    });

    expect(result.orderNumber).toBe("VL-20261119-DUP01");
    expect(result.verification.status).toBe("FAILED");

    // Provider verifyPayment must NOT be invoked
    expect(mockProvider.verifyPayment).not.toHaveBeenCalled();
    // Database transaction must NOT be opened
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 12. Concurrent callback serialization
  // --------------------------------------------------------------------------
  it("12. serializes concurrent callbacks safely using atomic row update condition", async () => {
    const initiatedPayment = {
      id: "pay-concurrent-01",
      orderId: "ord-concurrent-01",
      amount: new Prisma.Decimal("1050.00"),
      status: "INITIATED",
      merchantReferenceId: "SSLC-CONCURRENT-01",
      gateway: "SSLCOMMERZ",
    };

    const orderRecord = {
      id: "ord-concurrent-01",
      orderNumber: "VL-20261119-CONC01",
      status: "PENDING",
      paymentStatus: "PENDING",
      items: [],
    };

    mockPrisma.payment.findUnique
      .mockResolvedValueOnce(initiatedPayment)
      .mockResolvedValueOnce(initiatedPayment);
    mockPrisma.order.findUnique
      .mockResolvedValueOnce(orderRecord) // worker 1 tx lock
      .mockResolvedValueOnce(orderRecord) // worker 1 final lookup
      .mockResolvedValueOnce(orderRecord) // worker 2 tx lock
      .mockResolvedValueOnce(orderRecord); // worker 2 final lookup

    // First concurrent worker succeeds in updating 1 row; second worker gets count = 0
    mockPrisma.payment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
      { id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
    ]);

    const mockProvider = {
      verifyPayment: vi.fn(async () => ({
        success: false,
        status: "FAILED",
        verifiedMerchantReferenceId: "SSLC-CONCURRENT-01",
        verifiedAmount: 1050.0,
        verifiedCurrency: "BDT",
        isUnverified: false,
        rawPayload: { tran_id: "SSLC-CONCURRENT-01", status: "FAILED" },
      })),
      initiatePayment: vi.fn(),
    };
    vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

    // Run first worker
    const res1 = await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-CONCURRENT-01",
    });

    // Run second worker
    const res2 = await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-CONCURRENT-01",
    });

    expect(res1.orderNumber).toBe("VL-20261119-CONC01");
    expect(res2.orderNumber).toBe("VL-20261119-CONC01");

    // Order status updated once only by worker 1
    expect(mockPrisma.order.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.orderHistory.create).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 13. Successful payment flow regression test
  // --------------------------------------------------------------------------
  it("13. preserves successful payment verification flow with val_id via validationserverAPI.php", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "VALID",
          amount: "1050.00",
          currency: "BDT",
          tran_id: "SSLC-SUCCESS-REGRESS-01",
          bank_tran_id: "BANK-VALID-12345",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await provider.verifyPayment({
      tran_id: "SSLC-SUCCESS-REGRESS-01",
      val_id: "VAL-SUCCESS-12345",
      status: "VALID",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SUCCESS");
    expect(result.isUnverified).toBe(false);
    expect(result.verifiedMerchantReferenceId).toBe("SSLC-SUCCESS-REGRESS-01");
    expect(result.verifiedAmount).toBe(1050.0);
    expect(result.verifiedCurrency).toBe("BDT");
    expect(result.providerTransactionId).toBe("BANK-VALID-12345");
  });

  // --------------------------------------------------------------------------
  // 14. Unverified browser return cannot independently mark payment FAILED
  // --------------------------------------------------------------------------
  it("14. unverified browser return preserves INITIATED status and active reservations intact", async () => {
    const payment = {
      id: "pay-unverified-01",
      orderId: "ord-unverified-01",
      amount: new Prisma.Decimal("1050.00"),
      status: "INITIATED",
      merchantReferenceId: "SSLC-UNVERIFIED-01",
      gateway: "SSLCOMMERZ",
    };

    const order = {
      id: "ord-unverified-01",
      orderNumber: "VL-20261119-UNVER01",
      status: "PENDING",
      paymentStatus: "PENDING",
      items: [],
    };

    mockPrisma.payment.findUnique.mockResolvedValueOnce(payment);
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);

    // Gateway query fails or returns unverified
    (global.fetch as any).mockRejectedValueOnce(new Error("Connection reset"));

    const result = await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-UNVERIFIED-01",
      status: "FAILED",
    });

    expect(result.orderNumber).toBe("VL-20261119-UNVER01");
    expect(result.verification.isUnverified).toBe(true);

    // Safeguard: Database transaction must NOT be opened to alter payment or cancel order
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    expect(mockCancelOrderInventory).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 15. Requirement 8: Active reservation retention allows retry on payment failure
  // --------------------------------------------------------------------------
  it("15. preserves Order.status = PENDING when active reservation exists on verified payment failure", async () => {
    const initiatedPayment = {
      id: "pay-req8-fail-01",
      orderId: "ord-req8-fail-01",
      amount: new Prisma.Decimal("1050.00"),
      status: "INITIATED",
      merchantReferenceId: "SSLC-REQ8-FAIL-01",
      gateway: "SSLCOMMERZ",
    };

    const pendingOrder = {
      id: "ord-req8-fail-01",
      orderNumber: "VL-20261119-REQ8",
      status: "PENDING",
      paymentStatus: "PENDING",
      items: [],
    };

    mockPrisma.payment.findUnique.mockResolvedValueOnce(initiatedPayment);
    mockPrisma.order.findUnique
      .mockResolvedValueOnce(pendingOrder) // under lock in tx
      .mockResolvedValueOnce(pendingOrder); // final lookup
    mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });

    // Active reservation exists (expires in future)
    mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
      {
        id: "res-active-1",
        orderId: "ord-req8-fail-01",
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 600000), // 10 minutes in future
      },
    ]);

    const mockProvider = {
      verifyPayment: vi.fn(async () => ({
        success: false,
        status: "FAILED",
        verifiedMerchantReferenceId: "SSLC-REQ8-FAIL-01",
        verifiedAmount: 1050.0,
        verifiedCurrency: "BDT",
        isUnverified: false,
        rawPayload: { tran_id: "SSLC-REQ8-FAIL-01", status: "FAILED" },
      })),
      initiatePayment: vi.fn(),
    };
    vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-REQ8-FAIL-01",
      val_id: "VAL-REQ8-1",
    });

    // 1. Payment status set to FAILED
    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
        }),
      })
    );

    // 2. Order kept in PENDING status, paymentStatus set to FAILED
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-req8-fail-01", paymentStatus: { not: "SUCCESS" } },
        data: {
          status: "PENDING",
          paymentStatus: "FAILED",
        },
      })
    );

    // 3. OrderHistory notes active reservation retention
    expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "ord-req8-fail-01",
          status: "PENDING",
          notes: expect.stringContaining("Active inventory reservation preserved"),
        }),
      })
    );

    // 4. Inventory was NOT cancelled or released
    expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    expect(mockReleaseOrderCoupon).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 16. Requirement 8: Cancelled order / expired reservation cancels order on failure
  // --------------------------------------------------------------------------
  it("16. cancels Order and releases inventory when reservation is expired on verified payment failure", async () => {
    const initiatedPayment = {
      id: "pay-req8-exp-01",
      orderId: "ord-req8-exp-01",
      amount: new Prisma.Decimal("1050.00"),
      status: "INITIATED",
      merchantReferenceId: "SSLC-REQ8-EXP-01",
      gateway: "SSLCOMMERZ",
    };

    const pendingOrder = {
      id: "ord-req8-exp-01",
      orderNumber: "VL-20261119-EXP8",
      status: "PENDING",
      paymentStatus: "PENDING",
      items: [],
    };

    mockPrisma.payment.findUnique.mockResolvedValueOnce(initiatedPayment);
    mockPrisma.order.findUnique
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(pendingOrder);
    mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });

    // No active unexpired reservations found
    mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([]);

    const mockProvider = {
      verifyPayment: vi.fn(async () => ({
        success: false,
        status: "FAILED",
        verifiedMerchantReferenceId: "SSLC-REQ8-EXP-01",
        verifiedAmount: 1050.0,
        verifiedCurrency: "BDT",
        isUnverified: false,
        rawPayload: { tran_id: "SSLC-REQ8-EXP-01", status: "FAILED" },
      })),
      initiatePayment: vi.fn(),
    };
    vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

    await paymentService.verifyCallback("SSLCOMMERZ", {
      tran_id: "SSLC-REQ8-EXP-01",
      val_id: "VAL-REQ8-EXP",
    });

    // 1. Order cancelled and inventory released
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord-req8-exp-01", paymentStatus: { not: "SUCCESS" } },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
        },
      })
    );

    expect(mockCancelOrderInventory).toHaveBeenCalledWith("ord-req8-exp-01", expect.anything());
    expect(mockReleaseOrderCoupon).toHaveBeenCalledWith("ord-req8-exp-01", expect.anything());
  });
});
