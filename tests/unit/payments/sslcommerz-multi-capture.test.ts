/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CaptureReconciliationStatus, PaymentStatus } from "@prisma/client";

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
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    payment: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: "pay-default-placeholder", status: "PENDING" })),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    paymentCapture: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    productVariant: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(async () => []),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    inventoryTransaction: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    shipment: {
      create: vi.fn(async () => ({ id: "shipment-uuid-01" })),
    },
    $queryRaw: vi.fn(async () => []),
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

// Mock InventoryService
const { mockConsumeReservation, mockCancelOrderInventory, mockCalculateAvailableQuantity } =
  vi.hoisted(() => ({
    mockConsumeReservation: vi.fn(async () => {}),
    mockCancelOrderInventory: vi.fn(async () => {}),
    mockCalculateAvailableQuantity: vi.fn(async () => 10),
  }));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    consumeReservation: mockConsumeReservation,
    cancelOrderInventory: mockCancelOrderInventory,
    calculateAvailableQuantity: mockCalculateAvailableQuantity,
  },
}));

// Mock Authorization
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn(async () => ({ id: "admin-user-01", role: "ADMIN" })),
}));

// Mock Next Cache
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

import { PaymentService } from "@/lib/payment/service";
import { SSLCommerzProvider } from "@/lib/payment/providers/sslcommerz/client";
import { ShippingService } from "@/lib/shipping/service";
import {
  updateOrderStatusAction,
  quickUpdateOrderStatusAction,
  bulkUpdateOrderStatusAction,
} from "@/lib/admin/orders/order-actions";

describe("Phase 12.2 PR1: Multi-Capture Reconciliation & PaymentCapture Ledger", () => {
  let paymentService: PaymentService;
  let sslProvider: SSLCommerzProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.order.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.order.findFirst.mockReset().mockResolvedValue(null);
    mockPrisma.order.create.mockReset();
    mockPrisma.order.update.mockReset().mockResolvedValue({});
    mockPrisma.order.updateMany.mockReset().mockResolvedValue({ count: 1 });
    mockPrisma.payment.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.payment.findFirst.mockReset().mockResolvedValue(null);
    mockPrisma.payment.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.payment.create.mockReset().mockResolvedValue({ id: "pay-default-placeholder", status: "PENDING" });
    mockPrisma.payment.update.mockReset().mockResolvedValue({});
    mockPrisma.payment.updateMany.mockReset().mockResolvedValue({ count: 1 });
    mockPrisma.paymentCapture.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.paymentCapture.findUnique.mockReset().mockResolvedValue(null);
    mockPrisma.paymentCapture.create.mockReset().mockResolvedValue({});
    mockPrisma.inventoryReservation.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.inventoryReservation.updateMany.mockReset().mockResolvedValue({ count: 1 });
    mockPrisma.inventoryTransaction.findMany.mockReset().mockResolvedValue([]);
    mockPrisma.inventoryTransaction.createMany.mockReset().mockResolvedValue({ count: 1 });
    mockPrisma.orderHistory.create.mockReset();
    mockPrisma.auditLog.create.mockReset();
    mockPrisma.shipment.create.mockReset().mockResolvedValue({ id: "shipment-uuid-01" });
    mockPrisma.$queryRaw.mockReset().mockResolvedValue([]);
    mockPrisma.$executeRaw.mockReset().mockResolvedValue(1);

    global.fetch = vi.fn() as any;
    paymentService = new PaymentService();
    sslProvider = new SSLCommerzProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. SSLCommerz Query API element[] parsing & candidate extraction
  // --------------------------------------------------------------------------
  describe("SSLCommerzProvider.queryTransactionByTranId element[] extraction", () => {
    it("extracts and prioritizes valid attempt following failed attempt in element[]", async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            APIConnect: "DONE",
            no_of_trans_found: 2,
            element: [
              {
                tran_id: "SSLC-MULTI-01",
                status: "FAILED",
                error: "Card expired",
                amount: "1500.00",
                currency: "BDT",
                tran_date: "2026-11-20 10:00:00",
              },
              {
                tran_id: "SSLC-MULTI-01",
                val_id: "VAL-SUCCESS-01",
                bank_tran_id: "BANK-TRX-01",
                status: "VALID",
                card_type: "VISA-Classic",
                card_brand: "VISA",
                card_no: "411111XXXXXX1111", // sensitive PAN must be omitted!
                amount: "1500.00",
                currency: "BDT",
                risk_level: "0",
                risk_title: "Safe",
                tran_date: "2026-11-20 10:05:00",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const result = await sslProvider.verifyPayment({
        tran_id: "SSLC-MULTI-01",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.providerTransactionId).toBe("BANK-TRX-01");
      expect(result.verifiedAmount).toBe(1500);
      expect(result.verifiedCurrency).toBe("BDT");

      expect(result.candidates).toBeDefined();
      expect(result.candidates!.length).toBe(2);

      // Verify PAN exclusion
      const validCandidate = result.candidates!.find((c) => c.status === PaymentStatus.SUCCESS);
      expect(validCandidate).toBeDefined();
      expect(validCandidate!.bankTranId).toBe("BANK-TRX-01");
      expect(validCandidate!.riskLevel).toBe("0");
      expect(validCandidate!.rawPayload.card_no).toBeUndefined();
    });

    it("sorts multiple valid captures deterministically: earliest tran_date, tiebreaker bank_tran_id", async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            APIConnect: "DONE",
            no_of_trans_found: 2,
            element: [
              {
                tran_id: "SSLC-MULTI-02",
                val_id: "VAL-LATER",
                bank_tran_id: "BANK-TRX-LATER",
                status: "VALID",
                amount: "1500.00",
                currency: "BDT",
                risk_level: "0",
                tran_date: "2026-11-20 10:15:00",
              },
              {
                tran_id: "SSLC-MULTI-02",
                val_id: "VAL-EARLIER",
                bank_tran_id: "BANK-TRX-EARLIER",
                status: "VALID",
                amount: "1500.00",
                currency: "BDT",
                risk_level: "0",
                tran_date: "2026-11-20 10:05:00",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const result = await sslProvider.verifyPayment({
        tran_id: "SSLC-MULTI-02",
      });

      expect(result.success).toBe(true);
      // Earliest tran_date should be primary providerTransactionId
      expect(result.providerTransactionId).toBe("BANK-TRX-EARLIER");
      expect(result.candidates).toBeDefined();
      expect(result.candidates!.length).toBe(2);
    });

    it("maps candidate with missing bank_tran_id without crashing", async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            APIConnect: "DONE",
            no_of_trans_found: 1,
            element: [
              {
                tran_id: "SSLC-NO-BANK-01",
                val_id: "VAL-MISSING-BANK-01",
                status: "VALID",
                amount: "1500.00",
                currency: "BDT",
                risk_level: "0",
                tran_date: "2026-11-20 10:00:00",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const result = await sslProvider.verifyPayment({
        tran_id: "SSLC-NO-BANK-01",
      });

      expect(result.success).toBe(true);
      expect(result.candidates).toBeDefined();
      expect(result.candidates![0].bankTranId).toBeUndefined();
      expect(result.candidates![0].valId).toBe("VAL-MISSING-BANK-01");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Transactional Reconciliation & PaymentCapture Ledger
  // --------------------------------------------------------------------------
  describe("PaymentService.verifyCallback reconciliation logic", () => {
    const basePayment = {
      id: "pay-multi-01",
      orderId: "ord-multi-01",
      merchantReferenceId: "SSLC-MULTI-REF-01",
      amount: 1500.0,
      currency: "BDT",
      status: "INITIATED",
      gatewayPayload: {},
    };

    const baseOrder = {
      id: "ord-multi-01",
      orderNumber: "VL-20261120-ORD01",
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "ONLINE",
      customerEmail: "user@vibelock.bd",
      items: [{ sku: "SKU-VL-01", quantity: 1 }],
    };

    it("Scenario 1: Clean capture (risk_level = 0) settles primary capture and fulfills order", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder) // tx row-lock query
        .mockResolvedValueOnce(baseOrder); // post-tx lookup
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]); // no existing captures
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-01", orderId: "ord-multi-01", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      // Mock target-less insert returning 1 row (success)
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-primary-01" }]); // INSERT INTO PaymentCapture RETURNING id

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-CLEAN-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-CLEAN-01",
              valId: "VAL-CLEAN-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { bank_tran_id: "BANK-CLEAN-01" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const result = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      expect(result.orderNumber).toBe("VL-20261120-ORD01");
      expect(result.verification.status).toBe("SUCCESS");

      // Verify reservation consumption
      expect(mockConsumeReservation).toHaveBeenCalledWith("ord-multi-01", expect.anything());

      // Verify order payment status updated to SUCCESS
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS" },
      });
    });

    it("Scenario 2: Excess capture (multiple captures) records primary as SETTLED and second as duplicate NEEDS_REVIEW", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]); // initial: no existing captures
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-01", orderId: "ord-multi-01", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      // Mock SQL calls:
      // 1. SELECT order FOR UPDATE
      // 2. INSERT primary capture -> returns [{ id: "cap-01" }]
      // 3. INSERT second candidate as excess capture -> returns [{ id: "cap-02" }]
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-01" }]) // candidate 1 insert
        .mockResolvedValueOnce([{ id: "cap-02" }]); // candidate 2 insert (excess)

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-PRIMARY-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-PRIMARY-01",
              valId: "VAL-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: {},
            },
            {
              bankTranId: "BANK-EXCESS-02",
              valId: "VAL-02",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:05:00",
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Security alert must be emitted for excess capture
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_DUPLICATE_CAPTURE_ATTEMPT",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              reason: "excess_capture_recorded",
            }),
          }),
        })
      );

      // Order fulfilled exactly once
      expect(mockConsumeReservation).toHaveBeenCalledTimes(1);
    });

    it("Scenario 3: Idempotent replay of same bank transaction ID returns HTTP 200 without duplicate side-effects", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([
        {
          id: "cap-existing-01",
          paymentId: "pay-multi-01",
          bankTranId: "BANK-REPLAY-01",
          amount: 1500.0,
          currency: "BDT",
          isPrimary: true,
          reconciliationStatus: CaptureReconciliationStatus.SETTLED,
        },
      ]);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValueOnce([
        { id: "sale-01", referenceId: "ord-multi-01", type: "SALE" },
      ]); // SALE already recorded!

      // Mock SQL calls:
      // 1. SELECT order FOR UPDATE
      // 2. INSERT returns 0 rows (ON CONFLICT DO NOTHING)
      // 3. Query 1 finds matching existing capture
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([]) // INSERT returns 0 rows
        .mockResolvedValueOnce([
          {
            id: "cap-existing-01",
            paymentId: "pay-multi-01",
            bankTranId: "BANK-REPLAY-01",
            amount: 1500.0,
            currency: "BDT",
            isPrimary: true,
            isDuplicate: false,
            reconciliationStatus: "SETTLED",
          },
        ]); // Query 1: match!

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-REPLAY-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-REPLAY-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      const res = await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      expect(res.verification.status).toBe("SUCCESS");
      // Must NOT consume reservations again
      expect(mockConsumeReservation).not.toHaveBeenCalled();
    });

    it("Scenario 4: Cross-payment bank transaction ID collision logs PAYMENT_TAMPERING_DETECTED and throws", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);

      // Mock SQL calls:
      // 1. SELECT order FOR UPDATE
      // 2. INSERT returns 0 rows (conflict on (gateway, bankTranId))
      // 3. Query 1 finds existing capture with DIFFERENT paymentId!
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([]) // INSERT returns 0 rows
        .mockResolvedValueOnce([
          {
            id: "cap-other-payment",
            paymentId: "OTHER-PAYMENT-UUID-999", // MISMATCH!
            bankTranId: "BANK-ATTACK-01",
            amount: 1500.0,
            currency: "BDT",
            isPrimary: true,
            isDuplicate: false,
            reconciliationStatus: "SETTLED",
          },
        ]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-ATTACK-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-ATTACK-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-MULTI-REF-01",
        })
      ).rejects.toThrow("Payment verification failed: Duplicate bank transaction ID collision");

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] PAYMENT_TAMPERING_DETECTED",
        expect.objectContaining({
          contexts: expect.objectContaining({
            security: expect.objectContaining({
              reason: "cross_payment_bank_tran_id_collision",
            }),
          }),
        })
      );
    });

    it("Scenario 5: Partial primary index collision safely falls back to inserting excess capture", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]); // initial empty

      // Mock SQL calls:
      // 1. SELECT order FOR UPDATE
      // 2. INSERT returns 0 rows (conflict on primary partial index)
      // 3. Query 1: bankTranId not found ([])
      // 4. Query 2: primary capture exists for this paymentId!
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([]) // INSERT returns 0 rows
        .mockResolvedValueOnce([]) // Query 1: no bankTranId found
        .mockResolvedValueOnce([
          {
            id: "cap-existing-primary",
            paymentId: "pay-multi-01",
            bankTranId: "BANK-EXISTING-PRIMARY",
          },
        ]); // Query 2: primary capture found!

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-CONCURRENT-PRIMARY",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-CONCURRENT-PRIMARY",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Verify excess capture was inserted via $executeRaw with isDuplicate = true
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it("Scenario 6: Provisional evidence (missing bank_tran_id) stages hold, extends reservation by 24h, and holds fulfillment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        {
          id: "res-01",
          orderId: "ord-multi-01",
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      ]);

      mockPrisma.$queryRaw.mockResolvedValueOnce([]); // row-lock order

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "VAL-PROV-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: undefined, // MISSING bank_tran_id
              valId: "VAL-PROV-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { val_id: "VAL-PROV-01" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Verify active reservation extended by 24 hours
      expect(mockPrisma.inventoryReservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orderId: "ord-multi-01", status: "RESERVED" }),
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      );

      // Verify order held in PENDING without reservation consumption
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
    });

    it("Scenario 7: 24-hour escalation deadline is preserved across repeated provisional callbacks", async () => {
      const fixedDeadline = new Date(Date.now() + 80000000).toISOString();
      const paymentWithExistingHold = {
        ...basePayment,
        gatewayPayload: {
          provisional: {
            "VAL-PROV-01": {
              valId: "VAL-PROV-01",
              escalationDeadline: fixedDeadline,
              reconciliationHold: true,
            },
          },
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(paymentWithExistingHold);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        {
          id: "res-01",
          orderId: "ord-multi-01",
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      ]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "VAL-PROV-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: undefined,
              valId: "VAL-PROV-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              rawPayload: { val_id: "VAL-PROV-01" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Must align with the original fixedDeadline, preventing infinite extension
      expect(mockPrisma.inventoryReservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            expiresAt: new Date(fixedDeadline),
          },
        })
      );
    });

    it("Scenario 8: Non-success callback with active provisional hold does not cancel order or release stock", async () => {
      const paymentWithHold = {
        ...basePayment,
        gatewayPayload: {
          provisional: {
            "VAL-PROV-01": {
              valId: "VAL-PROV-01",
              reconciliationHold: true,
            },
          },
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(paymentWithHold);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: false,
          status: "FAILED" as const,
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          isUnverified: false,
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Stock is NOT released! Order remains PENDING!
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { status: "PENDING", paymentStatus: "FAILED" },
      });
    });

    it("Scenario 9: Risk hold (risk_level = 1) records capture as primary NEEDS_REVIEW and holds fulfillment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-risk-hold-01" }]); // INSERT RETURNING id

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-RISK-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-RISK-01",
              valId: "VAL-RISK-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "1", // RISK HOLD!
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Fulfillment must be held
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
    });

    it("Scenario 10: Missing risk_level on SSLCommerz is treated as risk hold NEEDS_REVIEW", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "cap-risk-missing-01" }]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-RISK-MISSING",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-RISK-MISSING",
              valId: "VAL-RISK-MISSING",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: undefined, // MISSING RISK LEVEL!
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Held in PENDING
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
    });

    it("Scenario 11: Late capture on CANCELLED order records isPrimary: true, isDuplicate: false, NEEDS_REVIEW, and does NOT resurrect order or deduct inventory", async () => {
      const cancelledOrder = {
        ...baseOrder,
        status: "CANCELLED",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(cancelledOrder)
        .mockResolvedValueOnce(cancelledOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "cap-late-01" }]);

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-LATE-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-LATE-01",
              valId: "VAL-LATE-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              rawPayload: {},
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Must NOT consume inventory or commit reservations
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryTransaction.createMany).not.toHaveBeenCalled();

      // Order must remain CANCELLED
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "ord-multi-01" },
        data: { paymentStatus: "SUCCESS" },
      });
    });

    it("Scenario 12: Risk level '0.00' is treated as non-clean and produces risk hold NEEDS_REVIEW", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-risk-00" }]); // INSERT INTO PaymentCapture

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-RISK-00",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-RISK-00",
              valId: "VAL-RISK-00",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0.00", // Non-clean! Must be strictly "0" or 0
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-RISK-00", risk_level: "0.00" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Verification held in PENDING
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining("[RISK_HOLD]"),
          }),
        })
      );
    });

    it("Scenario 13: Unknown/unexplained conflict during capture insertion throws reconciliation error and fails closed", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([]) // INSERT returns 0 rows (conflict!)
        .mockResolvedValueOnce([]) // Step 1: query existing by bankTranId returns []
        .mockResolvedValueOnce([]); // Step 2: query existing primary returns []

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-ANOMALY-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-ANOMALY-01",
              valId: "VAL-ANOMALY-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-ANOMALY-01", risk_level: "0" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await expect(
        paymentService.verifyCallback("SSLCOMMERZ", {
          tran_id: "SSLC-MULTI-REF-01",
        })
      ).rejects.toThrow(/Unexplained database conflict/);

      expect(mockConsumeReservation).not.toHaveBeenCalled();
    });

    it("Scenario 14: Re-reads payment under transaction lock and preserves concurrent provisional evidence", async () => {
      const paymentWithConcurrentProvisional = {
        ...basePayment,
        gatewayPayload: {
          initiation: { sessionKey: "SESS-CONCURRENT-01" },
          provisional: {
            "VAL-CONCURRENT-01": {
              valId: "VAL-CONCURRENT-01",
              amount: 1500,
              currency: "BDT",
              reconciliationHold: true,
            },
          },
        },
      };

      // Outside transaction read returns basePayment (without provisional)
      mockPrisma.payment.findUnique
        .mockResolvedValueOnce(basePayment) // outside transaction
        .mockResolvedValueOnce(paymentWithConcurrentProvisional); // inside transaction after acquiring order lock

      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-clean-01" }]); // INSERT capture

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-CLEAN-01",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-CLEAN-01",
              valId: "VAL-CLEAN-01",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-CLEAN-01", risk_level: "0" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Verify that the updated gatewayPayload in payment.updateMany preserved the concurrent provisional entry
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gatewayPayload: expect.objectContaining({
              provisional: expect.objectContaining({
                "VAL-CONCURRENT-01": expect.objectContaining({
                  reconciliationHold: true,
                }),
              }),
            }),
          }),
        })
      );
    });

    it("Scenario 15: Amount mismatch evidence persistence records candidate as NEEDS_REVIEW in PaymentCapture and holds fulfillment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-mismatch-amt" }]); // INSERT into PaymentCapture

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-MISMATCH-AMT",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 50.0, // Expected: 1500, received: 50
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-MISMATCH-AMT",
              valId: "VAL-MISMATCH-AMT",
              amount: 50.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-MISMATCH-AMT", amount: "50.00" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Capture was persisted, but fulfillment is held
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining("[MISMATCH_HOLD]"),
          }),
        })
      );
    });

    it("Scenario 16: Currency mismatch evidence persistence records candidate as NEEDS_REVIEW in PaymentCapture and holds fulfillment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(basePayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-mismatch-curr" }]); // INSERT into PaymentCapture

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-MISMATCH-CURR",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "USD", // Expected BDT, got USD
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-MISMATCH-CURR",
              valId: "VAL-MISMATCH-CURR",
              amount: 1500.0,
              currency: "USD",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:00:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-MISMATCH-CURR", currency: "USD" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Capture was persisted, but fulfillment is held
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-multi-01", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS", status: "PENDING" },
      });
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining("[MISMATCH_HOLD]"),
          }),
        })
      );
    });

    it("Scenario 17: Second distinct capture on already-SUCCESS payment records excess capture without duplicate inventory deduction or email", async () => {
      const alreadySuccessPayment = {
        ...basePayment,
        status: "SUCCESS",
        gatewayTransactionId: "BANK-PRIMARY-01",
      };

      const alreadyConfirmedOrder = {
        ...baseOrder,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(alreadySuccessPayment);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(alreadyConfirmedOrder)
        .mockResolvedValueOnce(alreadyConfirmedOrder);
      mockPrisma.payment.update.mockResolvedValueOnce(alreadySuccessPayment);
      mockPrisma.paymentCapture.findMany.mockResolvedValueOnce([
        {
          id: "cap-primary-01",
          bankTranId: "BANK-PRIMARY-01",
          isPrimary: true,
          reconciliationStatus: CaptureReconciliationStatus.SETTLED,
        },
      ]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // row-lock order
        .mockResolvedValueOnce([{ id: "cap-excess-02" }]); // INSERT returns ID

      const mockProvider = {
        verifyPayment: vi.fn(async () => ({
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: "BANK-EXCESS-02",
          verifiedMerchantReferenceId: "SSLC-MULTI-REF-01",
          verifiedAmount: 1500.0,
          verifiedCurrency: "BDT",
          isUnverified: false,
          candidates: [
            {
              bankTranId: "BANK-EXCESS-02",
              valId: "VAL-EXCESS-02",
              amount: 1500.0,
              currency: "BDT",
              status: PaymentStatus.SUCCESS,
              riskLevel: "0",
              tranDate: "2026-11-20 10:20:00",
              rawPayload: { tran_id: "SSLC-MULTI-REF-01", bank_tran_id: "BANK-EXCESS-02", risk_level: "0" },
            },
          ],
        })),
        initiatePayment: vi.fn(),
      };
      vi.spyOn(paymentService as any, "getProvider").mockReturnValue(mockProvider as any);

      await paymentService.verifyCallback("SSLCOMMERZ", {
        tran_id: "SSLC-MULTI-REF-01",
      });

      // Excess capture recorded in order history
      expect(mockPrisma.orderHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining("[EXCESS_CAPTURE]"),
          }),
        })
      );
      // No duplicate inventory reservation consumption
      expect(mockConsumeReservation).not.toHaveBeenCalled();
      // Order status preserved as PROCESSING (not regressed to PENDING)
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Downstream Fulfillment Protection
  // --------------------------------------------------------------------------
  describe("Downstream Fulfillment Protection", () => {
    it("ShippingService blocks shipment creation when online order has unreconciled primary capture (risk hold)", async () => {
      const shippingProvider = {
        name: "steadfast",
        createShipment: vi.fn(),
        trackShipment: vi.fn(),
        cancelShipment: vi.fn(),
      };
      const shippingService = new ShippingService(shippingProvider as any);

      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: "ord-ship-01",
          paymentMethod: "ONLINE",
          paymentStatus: "SUCCESS",
          status: "PENDING",
          shipment: null,
          shippingCost: 60,
        })
        .mockResolvedValueOnce({
          id: "ord-ship-01",
          paymentMethod: "ONLINE",
          paymentStatus: "SUCCESS",
          status: "PENDING",
          shipment: null,
          shippingCost: 60,
        });

      mockPrisma.payment.findMany.mockResolvedValueOnce([
        {
          id: "pay-ship-01",
          captures: [
            {
              id: "cap-risk-01",
              isPrimary: true,
              reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW, // RISK HOLD
            },
          ],
        },
      ]);

      await expect(shippingService.createShipmentForOrder("ord-ship-01")).rejects.toThrow(
        "Online orders with unreconciled payment captures or risk holds cannot be shipped"
      );
      expect(shippingProvider.createShipment).not.toHaveBeenCalled();
    });

    it("Admin updateOrderStatusAction blocks status advancement when online payment has unreconciled primary capture", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "11111111-1111-1111-1111-111111111111",
        status: "PENDING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        shipment: null,
        payments: [
          {
            status: "SUCCESS",
            captures: [
              {
                isPrimary: true,
                reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW, // RISK HOLD
              },
            ],
          },
        ],
      });

      const formData = new FormData();
      formData.set("id", "11111111-1111-1111-1111-111111111111");
      formData.set("status", "CONFIRMED");

      const result = await updateOrderStatusAction({ error: null }, formData);

      expect(result.error).toBe(
        "Cannot advance order status: online payment has unreconciled primary capture or risk hold."
      );
    });

    it("ShippingService blocks shipment creation when online order has an unresolved provisional hold", async () => {
      const shippingProvider = {
        name: "test-courier",
        createShipment: vi.fn(),
        trackShipment: vi.fn(),
        cancelShipment: vi.fn(),
      };
      const shippingService = new ShippingService(shippingProvider as any);

      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: "ord-prov-ship-01",
          paymentMethod: "ONLINE",
          paymentStatus: "SUCCESS",
          status: "PENDING",
          shipment: null,
          shippingCost: 60,
        })
        .mockResolvedValueOnce({
          id: "ord-prov-ship-01",
          paymentMethod: "ONLINE",
          paymentStatus: "SUCCESS",
          status: "PENDING",
          shipment: null,
          shippingCost: 60,
        });

      mockPrisma.payment.findMany.mockResolvedValueOnce([
        {
          id: "pay-prov-01",
          status: "SUCCESS",
          gatewayPayload: {
            provisional: {
              "VAL-PROV-HOLD-01": {
                valId: "VAL-PROV-HOLD-01",
                reconciliationHold: true,
              },
            },
          },
          captures: [],
        },
      ]);

      await expect(shippingService.createShipmentForOrder("ord-prov-ship-01")).rejects.toThrow(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
      expect(shippingProvider.createShipment).not.toHaveBeenCalled();
    });

    it("Admin updateOrderStatusAction blocks status advancement when online payment has an unresolved provisional hold", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "22222222-2222-2222-2222-222222222222",
        status: "PENDING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        shipment: null,
        payments: [
          {
            status: "SUCCESS",
            gatewayPayload: {
              provisional: {
                "VAL-PROV-HOLD-01": {
                  valId: "VAL-PROV-HOLD-01",
                  reconciliationHold: true,
                },
              },
            },
            captures: [],
          },
        ],
      });

      const formData = new FormData();
      formData.set("id", "22222222-2222-2222-2222-222222222222");
      formData.set("status", "CONFIRMED");

      const result = await updateOrderStatusAction({ error: null }, formData);

      expect(result.error).toBe(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
    });

    it("Admin quickUpdateOrderStatusAction blocks status advancement when online payment has an unresolved provisional hold", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "ord-admin-quick-prov-01",
        status: "PENDING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        shipment: null,
        payments: [
          {
            status: "SUCCESS",
            gatewayPayload: {
              provisional: {
                "VAL-PROV-HOLD-01": {
                  valId: "VAL-PROV-HOLD-01",
                  reconciliationHold: true,
                },
              },
            },
            captures: [],
          },
        ],
      });

      const result = await quickUpdateOrderStatusAction({
        orderId: "ord-admin-quick-prov-01",
        status: "PROCESSING" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
    });

    it("Admin bulkUpdateOrderStatusAction blocks status advancement when any online order has an unresolved provisional hold", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "ord-admin-bulk-prov-01",
        status: "PENDING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        inventoryReservations: [],
        shipment: null,
        payments: [
          {
            status: "SUCCESS",
            gatewayPayload: {
              provisional: {
                "VAL-PROV-HOLD-01": {
                  valId: "VAL-PROV-HOLD-01",
                  reconciliationHold: true,
                },
              },
            },
            captures: [],
          },
        ],
      });

      const result = await bulkUpdateOrderStatusAction({
        orderIds: ["ord-admin-bulk-prov-01"],
        status: "CONFIRMED" as any,
      });

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.errors).toContain(
        "Online payment has an unresolved provisional capture hold pending verification."
      );
    });
  });
});
