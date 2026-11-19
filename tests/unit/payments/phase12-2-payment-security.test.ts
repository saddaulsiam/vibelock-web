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
    BKASH_APP_KEY: "sandbox_app_key",
    BKASH_APP_SECRET: "sandbox_app_secret",
    BKASH_USERNAME: "sandbox_user",
    BKASH_PASSWORD: "sandbox_pass",
    BKASH_SANDBOX: true,
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
vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    consumeReservation: vi.fn(),
    releaseReservation: vi.fn(),
    calculateAvailableQuantity: vi.fn(() => 10),
  },
}));

import { PaymentService } from "@/lib/payment/service";
import { InventoryService } from "@/lib/inventory/service";
import {
  checkPaymentInitiationRateLimit,
  clearPaymentInitiationRateLimit,
  resetRateLimitMemoryStore,
} from "@/lib/security/rate-limit";
import {
  APPROVED_SECURITY_EVENTS,
  APPROVED_METADATA_KEYS,
  sanitizeSecurityMetadata,
} from "@/lib/monitoring/security-logger";

describe("Phase 12.2: Payment Abuse & Tampering Alerts (SEC-12-02)", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
    paymentService = new PaymentService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Payment Tampering Detection (PAYMENT_TAMPERING_DETECTED)", () => {
    it("emits PAYMENT_TAMPERING_DETECTED when verified amount mismatches expected payment amount", async () => {
      const mockPayment = {
        id: "pay-tamper-amount",
        orderId: "ord-tamper-amount",
        amount: new Prisma.Decimal("3500.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-TAMPER-AMOUNT-1",
        gateway: "SSLCOMMERZ",
      };

      const mockOrder = {
        id: "ord-tamper-amount",
        orderNumber: "VL-20261119-TAMPER01",
        status: "PENDING",
        paymentStatus: "PENDING",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);
      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-TAMPER-AMOUNT-1",
          verifiedAmount: 50.0, // Attacker paid 50 BDT instead of 3500 BDT!
          verifiedCurrency: "BDT",
          verifiedOrderNumber: "VL-20261119-TAMPER01",
          providerTransactionId: "BANK-TAMPER-TRX-1",
          rawPayload: { tran_id: "SSLC-TAMPER-AMOUNT-1", status: "VALID", amount: "50.00" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-TAMPER-AMOUNT-1",
          val_id: "VAL-TAMPER-1",
        })
      ).rejects.toThrow("Payment verification failed: Amount Mismatch");

      // Verify Sentry alert was dispatched with privacy-safe fields
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            security_event: "PAYMENT_TAMPERING_DETECTED",
            event_type: "security",
          }),
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "amount_mismatch",
              status: "FAILED",
            }),
          }),
        })
      );

      // Verify payment was marked FAILED and order was NOT paid
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-tamper-amount", status: { not: "SUCCESS" } },
          data: expect.objectContaining({ status: "FAILED" }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when verified currency is not BDT", async () => {
      const mockPayment = {
        id: "pay-tamper-currency",
        orderId: "ord-tamper-currency",
        amount: new Prisma.Decimal("1000.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-TAMPER-CURRENCY-1",
        gateway: "SSLCOMMERZ",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-TAMPER-CURRENCY-1",
          verifiedAmount: 1000.0,
          verifiedCurrency: "USD", // Mismatch: USD instead of BDT
          providerTransactionId: "BANK-TAMPER-USD",
          rawPayload: { tran_id: "SSLC-TAMPER-CURRENCY-1", currency: "USD" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-TAMPER-CURRENCY-1",
          val_id: "VAL-CURRENCY-1",
        })
      ).rejects.toThrow("Payment verification failed: Transaction or Currency Mismatch");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "currency_mismatch",
            }),
          }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when verified merchant reference does not match callback record", async () => {
      const mockPayment = {
        id: "pay-tamper-ref",
        orderId: "ord-tamper-ref",
        amount: new Prisma.Decimal("2000.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-REF-LEGITIMATE",
        gateway: "SSLCOMMERZ",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-REF-TAMPERED-SPOOF", // Reference mismatch!
          verifiedAmount: 2000.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-TRX-TAMPERED",
          rawPayload: {},
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-REF-LEGITIMATE",
          val_id: "VAL-SPOOF-1",
        })
      ).rejects.toThrow("Payment verification failed: Transaction or Currency Mismatch");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "transaction_reference_mismatch",
            }),
          }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when verified order number does not match order record", async () => {
      const mockPayment = {
        id: "pay-tamper-orderno",
        orderId: "ord-tamper-orderno",
        amount: new Prisma.Decimal("2000.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-ORDNO-TEST",
        gateway: "SSLCOMMERZ",
      };

      const mockOrder = {
        id: "ord-tamper-orderno",
        orderNumber: "VL-20261119-EXPECTED",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);
      mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-ORDNO-TEST",
          verifiedAmount: 2000.0,
          verifiedCurrency: "BDT",
          verifiedOrderNumber: "VL-20261119-ATTACKER-ORDER", // Order number mismatch!
          providerTransactionId: "BANK-TRX-ORDNO",
          rawPayload: {},
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-ORDNO-TEST",
          val_id: "VAL-ORDNO-1",
        })
      ).rejects.toThrow("Payment verification failed: Order reference mismatch");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "order_reference_mismatch",
            }),
          }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when callback references nonexistent payment record", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentService.verifyCallback("BKASH", {
          paymentID: "BKASH_NONEXISTENT_REF",
          status: "success",
        })
      ).rejects.toThrow("Payment record not found");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "bkash",
              reason: "payment_not_found",
            }),
          }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when callback payload is missing transaction reference", async () => {
      await expect(
        paymentService.verifyCallback("NAGAD", {
          status: "success",
        })
      ).rejects.toThrow("Missing transaction reference");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "nagad",
              reason: "missing_transaction_reference",
            }),
          }),
        })
      );
    });

    it("emits PAYMENT_TAMPERING_DETECTED when transaction reference exceeds maximum length (128 chars)", async () => {
      const longRef = "a".repeat(129);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: longRef,
        })
      ).rejects.toThrow("Invalid transaction reference");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "invalid_transaction_reference_length",
            }),
          }),
        })
      );
    });
  });

  describe("2. Duplicate Successful Capture Detection (PAYMENT_DUPLICATE_CAPTURE_ATTEMPT)", () => {
    it("emits PAYMENT_DUPLICATE_CAPTURE_ATTEMPT when second payment is verified successful for the same order", async () => {
      const secondPayment = {
        id: "pay-second-success",
        orderId: "ord-multi-pay",
        amount: new Prisma.Decimal("2500.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-MULTI-PAY-2",
        gateway: "SSLCOMMERZ",
      };

      const existingOrder = {
        id: "ord-multi-pay",
        orderNumber: "VL-20261119-MULTI01",
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
        items: [{ sku: "SKU-TEST-1", quantity: 1 }],
      };

      const priorPayment = {
        id: "pay-first-success",
        orderId: "ord-multi-pay",
        status: "SUCCESS",
        merchantReferenceId: "SSLC-MULTI-PAY-1",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(secondPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(existingOrder) // under lock in tx
        .mockResolvedValueOnce(existingOrder); // final lookup
      mockPrisma.payment.findFirst.mockResolvedValueOnce(priorPayment);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-MULTI-PAY-2",
          verifiedAmount: 2500.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-MULTI-TRX-2",
          rawPayload: { tran_id: "SSLC-MULTI-PAY-2", status: "VALID" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-PAY-2",
        val_id: "VAL-MULTI-2",
      });

      expect(result.verification.status).toBe("SUCCESS");

      // Verify Sentry alert was dispatched for duplicate capture attempt
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            security_event: "PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
            event_type: "security",
          }),
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "verifyCallback",
              gateway: "sslcommerz",
              reason: "duplicate_payment_captured",
              status: "SUCCESS",
            }),
          }),
        })
      );

      // Verify inventory was NOT double deducted
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();

      // Verify AuditLog and OrderHistory were recorded
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DUPLICATE_PAYMENT_CAPTURED",
            entityType: "Payment",
            entityId: "pay-second-success",
          }),
        })
      );
    });

    it("repeated callback for the EXACT SAME payment already in SUCCESS status short-circuits idempotently without provider calls, DB mutations, or inventory changes", async () => {
      const alreadySuccessPayment = {
        id: "pay-already-success",
        orderId: "ord-repeat-test",
        amount: new Prisma.Decimal("1500.00"),
        status: "SUCCESS",
        merchantReferenceId: "SSLC-REPEAT-REF-1",
        gateway: "SSLCOMMERZ",
      };

      const existingOrder = {
        id: "ord-repeat-test",
        orderNumber: "VL-20261119-REPEAT01",
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(alreadySuccessPayment);
      mockPrisma.order.findUnique.mockResolvedValueOnce(existingOrder);

      const mockProvider = {
        verifyPayment: vi.fn(),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-REPEAT-REF-1",
        val_id: "VAL-REPEAT-1",
      });

      // 1. Returns existing SUCCESS status and orderNumber
      expect(result.orderNumber).toBe("VL-20261119-REPEAT01");
      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.success).toBe(true);

      // 2. Gateway API must NOT be called again
      expect(mockProvider.verifyPayment).not.toHaveBeenCalled();

      // 3. Database transaction must NOT be opened
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();

      // 4. Payment status must NOT be modified
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();

      // 5. Inventory must NOT be deducted or touched
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();

      // 6. No security alerts dispatched (idempotent duplicate callback is normal gateway delivery)
      expect(mockSentry.captureMessage).not.toHaveBeenCalled();
    });

    it("concurrent callbacks for the EXACT SAME payment in PENDING/INITIATED status: only one performs success transition and inventory consumption; second callback handles idempotently without duplicate side-effects", async () => {
      const samePaymentInitial = {
        id: "pay-concurrent-same-1",
        orderId: "ord-concurrent-same-1",
        amount: new Prisma.Decimal("2000.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-CONCURRENT-SAME-1",
        gateway: "SSLCOMMERZ",
      };

      const orderData = {
        id: "ord-concurrent-same-1",
        orderNumber: "VL-20261119-CONC01",
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        customerEmail: "customer@vibelock.com",
        items: [{ sku: "SKU-CONC-1", quantity: 1 }],
      };

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-CONCURRENT-SAME-1",
          verifiedAmount: 2000.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-CONC-TRX-1",
          rawPayload: { tran_id: "SSLC-CONCURRENT-SAME-1", val_id: "VAL-CONC-1" },
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      // Callback 1 & Callback 2 both read the payment outside transaction
      // First call (CB1 outer): status is INITIATED
      // Second call (CB2 outer): status is INITIATED (both arrived concurrently before either tx committed)
      mockPrisma.payment.findUnique
        .mockResolvedValueOnce(samePaymentInitial) // CB1 outer lookup
        .mockResolvedValueOnce(samePaymentInitial); // CB2 outer lookup

      // Order lookups:
      // CB1: inside tx (under lock), then post-tx final lookup
      // CB2: inside tx (under lock), then post-tx final lookup
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(orderData) // CB1 inside tx
        .mockResolvedValueOnce(orderData) // CB1 post-tx
        .mockResolvedValueOnce({ ...orderData, paymentStatus: "SUCCESS" }) // CB2 inside tx
        .mockResolvedValueOnce({ ...orderData, paymentStatus: "SUCCESS" }); // CB2 post-tx

      // Payment updateMany (Atomic Conditional State Transition):
      // CB1: whereCondition matches 1 row and updates to SUCCESS (count: 1)
      // CB2: whereCondition evaluates against committed status="SUCCESS", matches 0 rows (count: 0) -> short-circuits
      mockPrisma.payment.updateMany
        .mockResolvedValueOnce({ count: 1 }) // CB1 updates payment to SUCCESS
        .mockResolvedValueOnce({ count: 0 }); // CB2 updateMany finds 0 rows, short-circuiting duplicate execution

      // No prior distinct payments on order for CB1
      mockPrisma.payment.findFirst.mockResolvedValueOnce(null);

      // Inventory setup for CB1:
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([
        { id: "var-conc-1", sku: "SKU-CONC-1" },
      ]);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValueOnce([]); // No existing SALE
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        {
          id: "res-conc-1",
          orderId: "ord-concurrent-same-1",
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 100000),
        },
      ]);

      // Execute both callbacks concurrently
      const [res1, res2] = await Promise.all([
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-CONCURRENT-SAME-1",
          val_id: "VAL-CONC-1",
        }),
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-CONCURRENT-SAME-1",
          val_id: "VAL-CONC-1",
        }),
      ]);

      // 1. Both callbacks return successful terminal response to their respective callers
      expect(res1.orderNumber).toBe("VL-20261119-CONC01");
      expect(res1.verification.status).toBe("SUCCESS");
      expect(res2.orderNumber).toBe("VL-20261119-CONC01");
      expect(res2.verification.status).toBe("SUCCESS");

      // 2. Only ONE callback performs the payment success transition (updateMany count=1 called once)
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pay-concurrent-same-1" }),
          data: expect.objectContaining({ status: "SUCCESS" }),
        })
      );

      // 3. Inventory reservation is consumed AT MOST ONCE
      expect(InventoryService.consumeReservation).toHaveBeenCalledTimes(1);
      expect(InventoryService.consumeReservation).toHaveBeenCalledWith(
        "ord-concurrent-same-1",
        expect.anything()
      );

      // 4. Order fulfillment / status side-effects execute AT MOST ONCE
      expect(mockPrisma.order.updateMany).toHaveBeenCalledTimes(1);

      // 5. No DUPLICATE_PAYMENT alert or audit log is dispatched (this is the same payment handled idempotently)
      expect(mockSentry.captureMessage).not.toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
        expect.anything()
      );
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "DUPLICATE_PAYMENT_CAPTURED" }),
        })
      );
    });

    it("cross-gateway duplicate payment (bKash after SSLCOMMERZ) captures funds, flags DUPLICATE_PAYMENT, and strictly avoids duplicate inventory deduction", async () => {
      const secondPayment = {
        id: "pay-bkash-dup",
        orderId: "ord-cross-dup",
        amount: new Prisma.Decimal("3000.00"),
        status: "INITIATED",
        merchantReferenceId: "BKASH_DUP_REF_2",
        gateway: "BKASH",
      };

      const existingOrder = {
        id: "ord-cross-dup",
        orderNumber: "VL-20261119-CROSS01",
        status: "CONFIRMED",
        paymentStatus: "SUCCESS",
        items: [{ sku: "SKU-CROSS-1", quantity: 2 }],
      };

      const priorPayment = {
        id: "pay-sslc-first",
        orderId: "ord-cross-dup",
        status: "SUCCESS",
        merchantReferenceId: "SSLC_PRIOR_REF_1",
        gateway: "SSLCOMMERZ",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(secondPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(existingOrder) // under lock in tx
        .mockResolvedValueOnce(existingOrder); // final lookup
      mockPrisma.payment.findFirst.mockResolvedValueOnce(priorPayment);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "BKASH_DUP_REF_2",
          verifiedAmount: 3000.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BKASH-TRX-CROSS-DUP",
          rawPayload: {},
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "BKASH_DUP_REF_2",
        status: "success",
      });

      expect(result.verification.status).toBe("SUCCESS");

      // 1. Second payment recorded as captured SUCCESS
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pay-bkash-dup" }),
          data: expect.objectContaining({ status: "SUCCESS" }),
        })
      );

      // 2. Concurrency lock acquired on Order first
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();

      // 3. Inventory must NOT be deducted again
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();

      // 4. AuditLog recorded with action DUPLICATE_PAYMENT_CAPTURED linking both payments
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DUPLICATE_PAYMENT_CAPTURED",
            entityType: "Payment",
            entityId: "pay-bkash-dup",
            metadata: expect.objectContaining({
              orderId: "ord-cross-dup",
              orderNumber: "VL-20261119-CROSS01",
              gateway: "BKASH",
              priorPaymentId: "pay-sslc-first",
            }),
          }),
        })
      );

      // 5. Telemetry alert emitted
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              gateway: "bkash",
              reason: "duplicate_payment_captured",
            }),
          }),
        })
      );
    });
  });

  describe("3. Payment Initiation Rate Limiting (checkPaymentInitiationRateLimit)", () => {
    it("allows up to 10 payment initiation attempts per customer within 15 minutes", async () => {
      const customerUserId = "cust-user-uuid-123";

      for (let i = 0; i < 10; i++) {
        await expect(
          checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3")
        ).resolves.not.toThrow();
      }

      // 11th attempt throws RATE_LIMIT_EXCEEDED
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3")
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    it("enforces IP ceiling of 30 attempts per 15 minutes per IP", async () => {
      const testIp = "103.20.30.40";

      // 30 attempts across distinct users on same IP
      for (let i = 0; i < 30; i++) {
        await expect(
          checkPaymentInitiationRateLimit(`cust-user-${i}`, testIp)
        ).resolves.not.toThrow();
      }

      // 31st attempt on same IP is blocked by IP ceiling
      await expect(
        checkPaymentInitiationRateLimit("cust-user-999", testIp)
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    it("safely bypasses global IP ceiling when client IP is missing or untrusted without grouping into a shared bucket", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // IP is null (untrusted/missing)
      await expect(
        checkPaymentInitiationRateLimit("cust-user-no-ip-1", undefined)
      ).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RATE_LIMIT_MISSING_CLIENT_IP")
      );
      warnSpy.mockRestore();
    });

    it("clearPaymentInitiationRateLimit resets the customer-level counter", async () => {
      const customerUserId = "cust-reset-test-uuid";

      for (let i = 0; i < 10; i++) {
        await checkPaymentInitiationRateLimit(customerUserId, "10.0.0.1");
      }

      // Blocked at 10
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "10.0.0.1")
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Reset customer counter
      await clearPaymentInitiationRateLimit(customerUserId);

      // Allowed again
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "10.0.0.2")
      ).resolves.not.toThrow();
    });

    it("paymentService.initiatePayment respects options.skipRateLimit and guards against rapid initiation", async () => {
      const customerUserId = "cust-initiate-rate-test";
      const testOrder: any = {
        id: "ord-rate-limit-test",
        userId: customerUserId,
        orderNumber: "VL-RATE-TEST-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1500,
      };

      // Exhaust customer's 10 quota
      for (let i = 0; i < 10; i++) {
        await checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3");
      }

      // 11th initiation via paymentService without skipRateLimit fails gracefully
      const response = await paymentService.initiatePayment(testOrder, "SSLCOMMERZ", {
        clientIp: "103.1.2.3",
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("rate limit exceeded");

      // Verify Sentry alert was dispatched for payment rate limit exceeded
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_RATE_LIMIT_EXCEEDED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              endpoint: "initiatePayment",
              gateway: "sslcommerz",
              reason: "payment_initiation_rate_limit_exceeded",
            }),
          }),
        })
      );
    });

    it("allows customer to switch payment methods (ONLINE -> BKASH -> NAGAD) within quota without premature blockage", async () => {
      const customerUserId = "cust-switch-method-user";

      // Attempt 1: ONLINE
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3")
      ).resolves.not.toThrow();

      // Attempt 2: BKASH
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3")
      ).resolves.not.toThrow();

      // Attempt 3: NAGAD
      await expect(
        checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3")
      ).resolves.not.toThrow();
    });

    it("ensures options.skipRateLimit skips limiter invocation so counter does not double-increment", async () => {
      const customerUserId = "cust-no-double-increment";
      const testOrder: any = {
        id: "ord-single-inc-test",
        userId: customerUserId,
        orderNumber: "VL-SINGLE-INC-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1000,
      };

      // Call 9 times directly
      for (let i = 0; i < 9; i++) {
        await checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3");
      }

      // 10th attempt: createOrderAction checks rate-limit once
      await checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3");

      // Now quota is at 10 (exhausted).
      // When initiatePayment is invoked with skipRateLimit: true (as createOrderAction does),
      // it must proceed to preCheck without throwing RATE_LIMIT_EXCEEDED!
      mockPrisma.order.findUnique.mockResolvedValueOnce(testOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValueOnce({ id: "pay-test-123" });

      const mockProvider = {
        initiatePayment: vi.fn(async () => ({
          success: true,
          redirectUrl: "https://sandbox.sslcommerz.com/test",
          merchantReferenceId: "SSLC-TEST-123",
        })),
        verifyPayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const response = await paymentService.initiatePayment(testOrder, "SSLCOMMERZ", {
        skipRateLimit: true,
        clientIp: "103.1.2.3",
      });

      // Does not throw RATE_LIMIT_EXCEEDED because skipRateLimit was true!
      expect(response.success).toBe(true);
    });

    it("blocks switching gateways when an earlier payment attempt on another gateway is unresolved (INITIATED) regardless of age", async () => {
      const testOrder: any = {
        id: "ord-switch-gate-inflight",
        userId: "cust-switch-inflight",
        orderNumber: "VL-SWITCH-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1200,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(testOrder);
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // activePending (< 30s)
        .mockResolvedValueOnce({
          id: "pay-existing-sslc",
          orderId: "ord-switch-gate-inflight",
          gateway: "SSLCOMMERZ",
          status: "INITIATED",
          merchantReferenceId: "SSLC-REF-INFLIGHT",
          createdAt: new Date(Date.now() - 25 * 60 * 1000), // even 25 mins old is unresolved!
          gatewayPayload: {},
        });

      const response = await paymentService.initiatePayment(testOrder, "BKASH", {
        skipRateLimit: true,
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("Switching payment methods is blocked until the existing transaction is confirmed");
    });

    it("blocks same-gateway initiation if previous attempt is unresolved and has no cached redirectUrl to prevent blind duplicate sessions", async () => {
      const testOrder: any = {
        id: "ord-same-gate-no-url",
        userId: "cust-same-no-url",
        orderNumber: "VL-SAME-01",
        status: "PENDING",
        paymentStatus: "PENDING",
        total: 1200,
      };

      mockPrisma.order.findUnique.mockResolvedValueOnce(testOrder);
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // activePending (< 30s)
        .mockResolvedValueOnce({
          id: "pay-existing-sslc-nourl",
          orderId: "ord-same-gate-no-url",
          gateway: "SSLCOMMERZ",
          status: "INITIATED",
          merchantReferenceId: "SSLC-REF-NOURL",
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          gatewayPayload: {}, // No redirectUrl cached
        });

      const response = await paymentService.initiatePayment(testOrder, "SSLCOMMERZ", {
        skipRateLimit: true,
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("A payment attempt on this gateway is currently unresolved");
    });

    it("allows initiating on a new gateway when all previous payment attempts on other gateways are confirmed terminal FAILED", async () => {
      const testOrder: any = {
        id: "ord-switch-gate-failed",
        userId: "cust-switch-failed",
        orderNumber: "VL-SWITCH-02",
        status: "PENDING",
        paymentStatus: "FAILED",
        total: 1200,
      };

      mockPrisma.order.findUnique
        .mockResolvedValueOnce(testOrder) // preCheck
        .mockResolvedValueOnce(testOrder); // post-initiation
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });

      mockPrisma.payment.findFirst
        .mockResolvedValueOnce(null) // activePending (< 30s)
        .mockResolvedValueOnce(null); // existingInitiated (null because previous was FAILED)

      mockPrisma.payment.create.mockResolvedValueOnce({ id: "pay-placeholder-bkash" });
      mockPrisma.payment.update.mockResolvedValueOnce({
        id: "pay-placeholder-bkash",
        status: "INITIATED",
      });

      const mockProvider = {
        initiatePayment: vi.fn(async () => ({
          success: true,
          redirectUrl: "https://sandbox.bkash.com/payment",
          merchantReferenceId: "BKASH-REF-NEW",
        })),
        verifyPayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const response = await paymentService.initiatePayment(testOrder, "BKASH", {
        skipRateLimit: true,
      });

      expect(response.success).toBe(true);
      expect(response.redirectUrl).toBe("https://sandbox.bkash.com/payment");
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CANCELLED" }),
        })
      );
    });
  });

  describe("4. Provider Callback Immunity (Callbacks NEVER blocked by customer rate limits)", () => {
    it("allows provider callbacks to process successfully even when customer initiation rate limit is exhausted", async () => {
      const customerUserId = "cust-exhausted-user";

      // Exhaust customer quota
      for (let i = 0; i < 10; i++) {
        await checkPaymentInitiationRateLimit(customerUserId, "103.1.2.3");
      }

      const mockPayment = {
        id: "pay-callback-immune",
        orderId: "ord-callback-immune",
        amount: new Prisma.Decimal("1500.00"),
        status: "INITIATED",
        merchantReferenceId: "SSLC-IMMUNE-REF-1",
        gateway: "SSLCOMMERZ",
      };

      const mockOrder = {
        id: "ord-callback-immune",
        userId: customerUserId,
        orderNumber: "VL-20261119-IMMUNE",
        status: "PENDING",
        paymentStatus: "PENDING",
        items: [{ sku: "SKU-IMMUNE-1", quantity: 1 }],
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([{ id: "var-1", sku: "SKU-IMMUNE-1" }]);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([{ id: "res-1", status: "RESERVED" }]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS",
          verifiedMerchantReferenceId: "SSLC-IMMUNE-REF-1",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          providerTransactionId: "BANK-IMMUNE-TRX",
          rawPayload: {},
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      // Callback executes and succeeds despite customer having exhausted initiation quota!
      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-IMMUNE-REF-1",
        val_id: "VAL-IMMUNE-1",
      });

      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.success).toBe(true);
    });
  });

  describe("5. Privacy & Allowlist Enforcement", () => {
    it("ensures all security event names and metadata fields strictly adhere to allowlists", () => {
      expect(APPROVED_SECURITY_EVENTS).toContain("PAYMENT_TAMPERING_DETECTED");
      expect(APPROVED_SECURITY_EVENTS).toContain("PAYMENT_DUPLICATE_CAPTURE_ATTEMPT");
      expect(APPROVED_SECURITY_EVENTS).toContain("PAYMENT_RATE_LIMIT_EXCEEDED");

      expect(APPROVED_METADATA_KEYS.has("gateway")).toBe(true);
      expect(APPROVED_METADATA_KEYS.has("referenceHash")).toBe(true);
      expect(APPROVED_METADATA_KEYS.has("orderHash")).toBe(true);
    });

    it("sanitizes metadata and strips unapproved or sensitive fields", () => {
      const sanitized = sanitizeSecurityMetadata({
        endpoint: "verifyCallback",
        gateway: "sslcommerz",
        reason: "amount_mismatch",
        referenceHash: "a1b2c3d4e5f60718",
        orderHash: "f6e5d4c3b2a10987",
        unapprovedField: "sensitive_leak",
        cardNumber: "4111222233334444",
        cvv: "123",
      } as any);

      expect(sanitized.endpoint).toBe("verifyCallback");
      expect(sanitized.gateway).toBe("sslcommerz");
      expect(sanitized.reason).toBe("amount_mismatch");
      expect(sanitized.referenceHash).toBe("a1b2c3d4e5f60718");
      expect(sanitized.orderHash).toBe("f6e5d4c3b2a10987");

      expect((sanitized as any).unapprovedField).toBeUndefined();
      expect((sanitized as any).cardNumber).toBeUndefined();
      expect((sanitized as any).cvv).toBeUndefined();
    });
  });
});
