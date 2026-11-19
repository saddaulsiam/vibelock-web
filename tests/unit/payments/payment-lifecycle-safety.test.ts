/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
    BKASH_APP_KEY: "sandbox_app_key",
    BKASH_APP_SECRET: "sandbox_app_secret",
    BKASH_USERNAME: "sandbox_user",
    BKASH_PASSWORD: "sandbox_pass",
    BKASH_SANDBOX: true,
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
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

// Mock Prisma client
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    refund: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
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
    paymentCapture: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    $queryRaw: vi.fn(async (strings: any) => {
      const sql = Array.isArray(strings) ? strings.join(" ") : String(strings ?? "");
      if (sql.includes('INSERT INTO "PaymentCapture"')) {
        return [{ id: "mock-capture-uuid" }];
      }
      return [];
    }),
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

import { PaymentService } from "@/lib/payment/service";
import { RefundService } from "@/lib/refunds/service";

describe("Phase 5B-3 — Payment Lifecycle Security Unit Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("PAY-5B-02: Late Gateway Success on CANCELLED Order", () => {
    test("does not reactivate cancelled order or deduct inventory when late SUCCESS callback arrives", async () => {
      const paymentService = new PaymentService();

      const existingPayment = {
        id: "pay-cancelled-123",
        orderId: "ord-cancelled-123",
        amount: new Prisma.Decimal("1500.00"),
        status: "CANCELLED",
        merchantReferenceId: "SSLC-ORD-CANCELLED-1",
        gateway: "SSLCOMMERZ",
      };

      const cancelledOrder = {
        id: "ord-cancelled-123",
        orderNumber: "VL-20261115-CAN01",
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        items: [{ sku: "SKU-CAN-1", quantity: 2 }],
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(existingPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(cancelledOrder) // inside transaction under lock
        .mockResolvedValueOnce(cancelledOrder); // final query for return

      // Mock provider verifyPayment
      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-ORD-CANCELLED-1",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-LATE-999",
          rawPayload: { tran_id: "SSLC-ORD-CANCELLED-1", status: "VALID" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-ORD-CANCELLED-1",
        val_id: "VALIDATION-LATE-123",
        status: "VALID",
      });

      expect(result.verification.status).toBe("SUCCESS");

      // 1. Payment status transitioned to SUCCESS (funds captured)
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pay-cancelled-123" }),
          data: expect.objectContaining({ status: "SUCCESS" }),
        })
      );

      // 2. Order status was NOT updated to PENDING or CONFIRMED (remains CANCELLED)
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-cancelled-123" },
          data: { paymentStatus: "SUCCESS" },
        })
      );
      // Ensure no update set status = "PENDING"
      const statusUpdates = mockPrisma.order.update.mock.calls.filter(
        (call: any) => call[0]?.data?.status
      );
      expect(statusUpdates).toHaveLength(0);

      // 3. No inventory consumption or SALE transactions created
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryReservation.updateMany).not.toHaveBeenCalled();

      // 4. OrderHistory notes [LATE_PAYMENT_ON_CANCELLED_ORDER]
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "ord-cancelled-123",
            status: "CANCELLED",
            notes: expect.stringContaining("[LATE_PAYMENT_ON_CANCELLED_ORDER]"),
          }),
        })
      );

      // 5. AuditLog created with action LATE_PAYMENT_ON_CANCELLED_ORDER
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LATE_PAYMENT_ON_CANCELLED_ORDER",
            entityType: "Order",
            entityId: "ord-cancelled-123",
          }),
        })
      );
    });
  });

  describe("PAY-5B-03: Concurrent Payment Attempts & Duplicate Succeeded Payments", () => {
    test("initiatePayment rejects if order is already paid", async () => {
      const paymentService = new PaymentService();
      const paidOrder: any = {
        id: "ord-paid-1",
        orderNumber: "VL-PAID-01",
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
        total: 1200,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(paidOrder);

      const response = await paymentService.initiatePayment(paidOrder, "SSLCOMMERZ");
      expect(response.success).toBe(false);
      expect(response.error).toContain("already paid");
    });

    test("initiatePayment rejects if order is cancelled", async () => {
      const paymentService = new PaymentService();
      const cancelledOrder: any = {
        id: "ord-can-1",
        orderNumber: "VL-CAN-01",
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        total: 1200,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(cancelledOrder);

      const response = await paymentService.initiatePayment(cancelledOrder, "SSLCOMMERZ");
      expect(response.success).toBe(false);
      expect(response.error).toContain("cancelled order");
    });

    test("initiatePayment reuses active recent INITIATED payment session without making duplicate provider call", async () => {
      const paymentService = new PaymentService();
      const pendingOrder: any = {
        id: "ord-reuse-1",
        orderNumber: "VL-REUSE-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1200,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(pendingOrder);
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // activePending (< 30s) is null
        .mockResolvedValueOnce({
          // existingInitiated (15m)
          id: "pay-existing-active",
          status: "INITIATED",
          gateway: "SSLCOMMERZ",
          merchantReferenceId: "SSLC-ACTIVE-REF-1",
          gatewayPayload: { redirectUrl: "https://sandbox.sslcommerz.com/gwprocess/active-session" },
          createdAt: new Date(),
        });

      const mockProvider = {
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const response = await paymentService.initiatePayment(pendingOrder, "SSLCOMMERZ");
      expect(response.success).toBe(true);
      expect(response.redirectUrl).toBe(
        "https://sandbox.sslcommerz.com/gwprocess/active-session"
      );
      expect(response.merchantReferenceId).toBe("SSLC-ACTIVE-REF-1");
      // External provider call was skipped because active session was reused!
      expect(mockProvider.initiatePayment).not.toHaveBeenCalled();
    });

    test("blocks concurrent cross-gateway payment initiation for the same order (e.g. BKASH in-flight blocks SSLCOMMERZ)", async () => {
      const paymentService = new PaymentService();
      const pendingOrder: any = {
        id: "ord-concurrent-cross",
        orderNumber: "VL-CROSS-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1500,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(pendingOrder);
      // Active PENDING placeholder exists across gateways (created 5 seconds ago by BKASH)
      mockPrisma.payment.findFirst.mockResolvedValueOnce({
        id: "pay-bkash-inflight",
        orderId: "ord-concurrent-cross",
        status: "PENDING",
        gateway: "BKASH",
        createdAt: new Date(Date.now() - 5 * 1000),
      });

      const mockSslProvider = {
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockSslProvider as any);

      // Concurrent request attempts SSLCOMMERZ for the same order
      const response = await paymentService.initiatePayment(pendingOrder, "SSLCOMMERZ");

      expect(response.success).toBe(false);
      expect(response.error).toContain("A payment initiation is already in progress for this order");
      // Network call must NOT be made!
      expect(mockSslProvider.initiatePayment).not.toHaveBeenCalled();
    });

    test("safely cleans up stale PENDING placeholders exceeding 30 seconds and proceeds with new initiation", async () => {
      const paymentService = new PaymentService();
      const pendingOrder: any = {
        id: "ord-stale-pending",
        orderNumber: "VL-STALE-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 2500,
      };

      mockPrisma.order.findUnique
        .mockResolvedValueOnce(pendingOrder) // Step 1 preCheck
        .mockResolvedValueOnce(pendingOrder); // Step 3 post-initiation check

      // updateMany cleans up stale records
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      // findFirst for activePending (< 30s) returns null (stale placeholder was > 30s)
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // activePending (< 30s)
        .mockResolvedValueOnce(null); // existingInitiated (15m)

      mockPrisma.payment.create.mockResolvedValueOnce({
        id: "pay-new-placeholder-123",
        status: "PENDING",
        gateway: "BKASH",
      });

      const mockBkashProvider = {
        initiatePayment: vi.fn(async () => ({
          success: true,
          redirectUrl: "https://sandbox.bkash.com/checkout/fresh-url",
          merchantReferenceId: "BKASH-FRESH-123",
        })),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockBkashProvider as any);

      const response = await paymentService.initiatePayment(pendingOrder, "BKASH");

      expect(response.success).toBe(true);
      expect(response.redirectUrl).toBe("https://sandbox.bkash.com/checkout/fresh-url");

      // Verify stale placeholders were cleaned up to FAILED
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderId: "ord-stale-pending",
            status: "PENDING",
          }),
          data: expect.objectContaining({
            status: "FAILED",
            gatewayPayload: expect.objectContaining({
              error: expect.stringContaining("stale pending placeholder cleaned up"),
            }),
          }),
        })
      );

      // Verify new payment was finalized to INITIATED
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-new-placeholder-123" },
          data: expect.objectContaining({
            status: "INITIATED",
            merchantReferenceId: "BKASH-FRESH-123",
          }),
        })
      );
    });

    test("second successful gateway payment captures funds but flags DUPLICATE_PAYMENT without double-deducting stock", async () => {
      const paymentService = new PaymentService();

      const secondPayment = {
        id: "pay-second-dup",
        orderId: "ord-duplicate-test",
        amount: new Prisma.Decimal("2000.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-DUP-REF-2",
        gateway: "SSLCOMMERZ",
      };

      const existingOrder = {
        id: "ord-duplicate-test",
        orderNumber: "VL-DUP-ORDER",
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
        items: [{ sku: "SKU-DUP-1", quantity: 1 }],
      };

      const priorPayment = {
        id: "pay-first-success",
        orderId: "ord-duplicate-test",
        status: "SUCCESS",
        merchantReferenceId: "SSLC-DUP-REF-1",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(secondPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(existingOrder) // under lock
        .mockResolvedValueOnce(existingOrder); // final lookup

      // Return the prior successful payment to trigger duplicate-payment branch
      mockPrisma.payment.findFirst.mockResolvedValueOnce(priorPayment);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-DUP-REF-2",
          verifiedAmount: 2000.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-DUP-222",
          rawPayload: { tran_id: "SSLC-DUP-REF-2", status: "VALID" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-DUP-REF-2",
        status: "VALID",
      });

      expect(result.verification.status).toBe("SUCCESS");

      // Second payment row must be recorded as captured SUCCESS
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pay-second-dup" }),
          data: expect.objectContaining({ status: "SUCCESS" }),
        })
      );

      // Inventory must NOT be deducted again
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();

      // OrderHistory records [DUPLICATE_PAYMENT]
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: "ord-duplicate-test",
            notes: expect.stringContaining("[DUPLICATE_PAYMENT]"),
          }),
        })
      );

      // AuditLog records DUPLICATE_PAYMENT_CAPTURED
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DUPLICATE_PAYMENT_CAPTURED",
            entityType: "Payment",
            entityId: "pay-second-dup",
          }),
        })
      );
    });
  });

  describe("PAY-5B-04: Refund Capability & Manual Reconciliation", () => {
    test("processRefundWithProvider for non-SSLCommerz (e.g. BKASH) returns requiresManualProcessing and does not mark FAILED", async () => {
      const refundService = new RefundService();

      const bkashRefund = {
        id: "ref-bkash-1",
        paymentId: "pay-bkash-1",
        amount: new Prisma.Decimal("500.00"),
        status: "PENDING",
        reason: "Customer return",
        payment: {
          id: "pay-bkash-1",
          gateway: "BKASH",
          gatewayTransactionId: "BKASH-TRX-001",
        },
      };

      mockPrisma.refund.findUnique.mockResolvedValueOnce(bkashRefund);
      mockPrisma.refund.updateMany.mockResolvedValueOnce({ count: 1 }); // PENDING -> PROCESSING

      const result = await refundService.processRefundWithProvider("ref-bkash-1");

      expect(result.success).toBe(false);
      expect((result as any).requiresManualProcessing).toBe(true);
      expect(result.error).toContain("Automated refund is unsupported for gateway 'BKASH'");

      // Verify status was reverted to PENDING and NOT set to FAILED!
      expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ref-bkash-1", status: "PROCESSING" },
          data: { status: "PENDING" },
        })
      );
      expect(mockPrisma.refund.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "FAILED" } })
      );
    });

    test("recordManualRefundSuccess requires authorized admin actor", async () => {
      const refundService = new RefundService();

      await expect(
        refundService.recordManualRefundSuccess({
          refundId: "ref-test-1",
          adminId: "",
          transactionReference: "BKASH-TRX-12345",
        })
      ).rejects.toThrow(/Authorized admin access is required/i);
    });

    test("recordManualRefundSuccess rejects invalid/empty transaction reference", async () => {
      const refundService = new RefundService();

      await expect(
        refundService.recordManualRefundSuccess({
          refundId: "ref-test-1",
          adminId: "admin-uuid-1",
          transactionReference: "ab",
        })
      ).rejects.toThrow(/valid provider transaction reference is required/i);
    });

    test("recordManualRefundSuccess rejects when refund is in terminal FAILED status", async () => {
      const refundService = new RefundService();

      mockPrisma.refund.findUnique.mockResolvedValueOnce({
        id: "ref-failed-1",
        paymentId: "pay-1",
        status: "FAILED",
        amount: new Prisma.Decimal("200.00"),
      });
      mockPrisma.refund.findUniqueOrThrow.mockResolvedValueOnce({
        id: "ref-failed-1",
        paymentId: "pay-1",
        status: "FAILED",
        amount: new Prisma.Decimal("200.00"),
      });

      await expect(
        refundService.recordManualRefundSuccess({
          refundId: "ref-failed-1",
          adminId: "admin-uuid-1",
          transactionReference: "BKASH-TRX-99999",
        })
      ).rejects.toThrow(/Cannot mark a failed refund as successful/i);
    });

    test("recordManualRefundSuccess authoritatively transitions PENDING refund to SUCCESS, updates Payment/Order, and writes AuditLog", async () => {
      const refundService = new RefundService();

      const existingRefund = {
        id: "ref-valid-1",
        paymentId: "pay-bkash-1",
        amount: new Prisma.Decimal("1000.00"),
        status: "PENDING",
        reason: "Defective item return",
      };

      const parentPayment = {
        id: "pay-bkash-1",
        orderId: "ord-bkash-1",
        amount: new Prisma.Decimal("1000.00"),
        status: "SUCCESS",
        gateway: "BKASH",
        refunds: [], // no prior refunds
      };

      mockPrisma.refund.findUnique.mockResolvedValueOnce(existingRefund);
      mockPrisma.refund.findUniqueOrThrow.mockResolvedValueOnce(existingRefund);
      mockPrisma.payment.findUniqueOrThrow.mockResolvedValueOnce(parentPayment);
      mockPrisma.refund.update.mockResolvedValueOnce({
        ...existingRefund,
        status: "SUCCESS",
        gatewayRefId: "BKASH-TRX-MANUAL-777",
      });
      mockPrisma.order.update.mockResolvedValueOnce({
        id: "ord-bkash-1",
        status: "DELIVERED",
        paymentStatus: "REFUNDED",
      });

      const updated = await refundService.recordManualRefundSuccess({
        refundId: "ref-valid-1",
        adminId: "admin-manager-1",
        transactionReference: "BKASH-TRX-MANUAL-777",
        notes: "Verified via bKash Merchant Portal statement",
      });

      expect(updated.status).toBe("SUCCESS");

      // Verify Refund record updated with verified reference
      expect(mockPrisma.refund.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ref-valid-1" },
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayRefId: "BKASH-TRX-MANUAL-777",
          }),
        })
      );

      // Verify Payment and Order transitioned to REFUNDED
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-bkash-1" },
          data: { status: "REFUNDED" },
        })
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ord-bkash-1" },
          data: { paymentStatus: "REFUNDED" },
        })
      );

      // Verify immutable AuditLog created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-manager-1",
            action: "MANUAL_REFUND_COMPLETED",
            entityType: "Refund",
            entityId: "ref-valid-1",
            metadata: expect.objectContaining({
              transactionReference: "BKASH-TRX-MANUAL-777",
              gateway: "BKASH",
            }),
          }),
        })
      );
    });
  });
});
