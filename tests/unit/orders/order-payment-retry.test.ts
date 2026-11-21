/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";

const {
  mockEnv,
  mockAuth,
  mockPrisma,
  mockInitiatePayment,
  mockCancelOrderInventory,
  mockReleaseOrderCoupon,
  mockRevalidatePath,
  mockGetIp,
  mockCheckPaymentInitiationRateLimit,
  mockIsPaymentMethodEnabled,
} = vi.hoisted(() => {
  const mockP: any = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (cb: any) => cb(mockP)),
  };

  return {
    mockEnv: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
      AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
      SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
      SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
      SSLCOMMERZ_SANDBOX: true,
    },
    mockAuth: vi.fn(),
    mockPrisma: mockP,
    mockInitiatePayment: vi.fn(),
    mockCancelOrderInventory: vi.fn(),
    mockReleaseOrderCoupon: vi.fn(async () => ({ success: true })),
    mockRevalidatePath: vi.fn(),
    mockGetIp: vi.fn(async () => "103.1.2.3"),
    mockCheckPaymentInitiationRateLimit: vi.fn(async () => {}),
    mockIsPaymentMethodEnabled: vi.fn(async () => true),
  };
});

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/payment/service", () => ({
  PaymentService: vi.fn(function () {
    return {
      initiatePayment: mockInitiatePayment,
    };
  }),
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    cancelOrderInventory: mockCancelOrderInventory,
  },
}));

vi.mock("@/lib/checkout/coupons", () => ({
  releaseOrderCoupon: mockReleaseOrderCoupon,
}));

vi.mock("@/lib/settings/payment-settings", () => ({
  isPaymentMethodEnabled: mockIsPaymentMethodEnabled,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  getIp: mockGetIp,
  checkPaymentInitiationRateLimit: mockCheckPaymentInitiationRateLimit,
  hashForRateLimit: vi.fn((val: string) => `hash-${val}`),
}));

import { retryOrderPaymentAction, cancelOrderAction } from "@/lib/orders/actions";

describe("Order Payment Retry & Cancellation Financial Safeguards", () => {
  const sampleUserId = "cust-user-123";
  const sampleOrderNumber = "VL-20261119-0CD6E2";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: sampleUserId } });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
  });

  describe("retryOrderPaymentAction", () => {
    it("fails with Unauthorized if customer session is missing", async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });

    it("fails if requested gateway is not supported", async () => {
      const res = await retryOrderPaymentAction(sampleOrderNumber, "BITCOIN");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Unsupported payment gateway");
    });

    it("prevents IDOR: fails if order does not belong to authenticated user", async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);
      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("not found or access denied");
    });

    it("fails if order is already paid", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "CONFIRMED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED" }],
          payments: [{ id: "pay-1", status: "SUCCESS" }],
        });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("already paid");
    });

    it("fails if order is cancelled", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          paymentMethod: "ONLINE",
          inventoryReservations: [],
          payments: [],
        });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("cancelled and cannot be paid");
    });

    it("blocks retry when previous payment attempt is unresolved (INITIATED) after 2 minutes", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) }],
          payments: [
            {
              id: "pay-1",
              status: "INITIATED",
              createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
            },
          ],
        });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("previous payment attempt is currently unresolved");
      expect(mockInitiatePayment).not.toHaveBeenCalled();
    });

    it("blocks retry when previous payment attempt is unresolved (INITIATED) after 15 minutes", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) }],
          payments: [
            {
              id: "pay-1",
              status: "INITIATED",
              createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
            },
          ],
        });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("previous payment attempt is currently unresolved");
      expect(mockInitiatePayment).not.toHaveBeenCalled();
    });

    it("blocks retry when previous payment attempt is in PENDING status", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) }],
          payments: [{ id: "pay-1", status: "PENDING" }],
        });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("previous payment attempt is currently unresolved");
      expect(mockInitiatePayment).not.toHaveBeenCalled();
    });

    it("fails if reservation has expired (no active reservation)", async () => {
      const expiredOrderData = {
        id: "ord-1",
        orderNumber: sampleOrderNumber,
        userId: sampleUserId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        inventoryReservations: [], // expired or empty
        payments: [{ id: "pay-1", status: "FAILED" }], // previous attempt failed
      };

      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce(expiredOrderData)
        .mockResolvedValueOnce(expiredOrderData);

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("reservation for this order has expired");
    });

    it("enforces payment initiation rate limiting", async () => {
      mockCheckPaymentInitiationRateLimit.mockRejectedValueOnce(new Error("RATE_LIMIT_EXCEEDED"));

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("rate limit exceeded");
      expect(mockInitiatePayment).not.toHaveBeenCalled();
    });

    it("successfully retries payment when previous attempt is verified terminal FAILED and order has active reservation", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          total: 3500,
          customerName: "Siam Saddan",
          customerEmail: "siam@vibelock.bd",
          customerPhone: "01711223344",
          shippingStreet: "Road 10",
          shippingCity: "Dhaka",
          shippingZip: "1230",
          shippingCountry: "BD",
          status: "PENDING",
          paymentStatus: "FAILED", // verified terminal failure
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) }],
          payments: [{ id: "pay-1", status: "FAILED", gateway: "PAYSTATION" }],
        });

      mockInitiatePayment.mockResolvedValueOnce({
        success: true,
        redirectUrl: "https://sandbox.paystation.com.bd/checkout/test-session-token",
        merchantReferenceId: "PS-RETRY-123",
      });

      const res = await retryOrderPaymentAction(sampleOrderNumber);
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toBe("https://sandbox.paystation.com.bd/checkout/test-session-token");
      expect(mockInitiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ orderNumber: sampleOrderNumber }),
        "PAYSTATION",
        expect.objectContaining({ skipRateLimit: true, clientIp: "103.1.2.3" })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/order-success/${sampleOrderNumber}`);
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/account/orders/${sampleOrderNumber}`);
    });

    it("blocks retry when target payment gateway is disabled in settings", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "FAILED",
          paymentMethod: "ONLINE",
          inventoryReservations: [{ id: "res-1", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) }],
          payments: [{ id: "pay-1", status: "FAILED", gateway: "PAYSTATION" }],
        });

      mockIsPaymentMethodEnabled.mockResolvedValueOnce(false);

      const res = await retryOrderPaymentAction(sampleOrderNumber, "PAYSTATION");
      expect(res.success).toBe(false);
      expect(res.error).toContain("PayStation payment is currently unavailable");
      expect(mockInitiatePayment).not.toHaveBeenCalled();
    });
  });

  describe("cancelOrderAction Financial Safeguards", () => {
    it("blocks cancellation when an online payment attempt is unresolved (INITIATED) after 30 seconds", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          shipment: null,
          inventoryReservations: [{ status: "RESERVED" }],
          payments: [
            {
              status: "INITIATED",
              createdAt: new Date(Date.now() - 30 * 1000),
            },
          ],
        });

      const res = await cancelOrderAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("A payment attempt for this order is currently unresolved");
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });

    it("blocks cancellation when an online payment attempt is unresolved (INITIATED) after 5 minutes (no 2-min bypass)", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          shipment: null,
          inventoryReservations: [{ status: "RESERVED" }],
          payments: [
            {
              status: "INITIATED",
              createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
            },
          ],
        });

      const res = await cancelOrderAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("A payment attempt for this order is currently unresolved");
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });

    it("blocks cancellation when an online payment attempt is unresolved (INITIATED) after 20 minutes (no reservation expiry bypass)", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          shipment: null,
          inventoryReservations: [], // expired
          payments: [
            {
              status: "INITIATED",
              createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
            },
          ],
        });

      const res = await cancelOrderAction(sampleOrderNumber);
      expect(res.success).toBe(false);
      expect(res.error).toContain("A payment attempt for this order is currently unresolved");
      expect(mockCancelOrderInventory).not.toHaveBeenCalled();
    });

    it("allows cancellation when all online payment attempts are authoritatively verified FAILED or CANCELLED", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "FAILED", // verified failed
          paymentMethod: "ONLINE",
          shipment: null,
          inventoryReservations: [{ status: "RESERVED" }],
          payments: [
            {
              status: "FAILED",
              createdAt: new Date(Date.now() - 5 * 60 * 1000),
            },
          ],
        });

      mockPrisma.order.update.mockResolvedValueOnce({ id: "ord-1", status: "CANCELLED" });

      const res = await cancelOrderAction(sampleOrderNumber);
      expect(res.success).toBe(true);
      expect(res.message).toContain("Order successfully cancelled");
      expect(mockCancelOrderInventory).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/order-success/${sampleOrderNumber}`);
    });

    it("preserves safe cancellation for COD orders with no online payment attempts", async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ id: "ord-1" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: sampleOrderNumber,
          userId: sampleUserId,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "COD",
          shipment: null,
          inventoryReservations: [{ status: "RESERVED" }],
          payments: [],
        });

      mockPrisma.order.update.mockResolvedValueOnce({ id: "ord-1", status: "CANCELLED" });

      const res = await cancelOrderAction(sampleOrderNumber);
      expect(res.success).toBe(true);
      expect(res.message).toContain("Order successfully cancelled");
      expect(mockCancelOrderInventory).toHaveBeenCalled();
    });
  });
});
