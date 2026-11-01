/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock env
vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    BKASH_APP_KEY: "sandbox_app_key_test_123",
    BKASH_APP_SECRET: "sandbox_app_secret_test_456",
    BKASH_USERNAME: "sandbox_user_test_789",
    BKASH_PASSWORD: "sandbox_pass_test_000",
    BKASH_SANDBOX: true,
  },
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

// Mock Prisma using vi.hoisted
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    payment: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    inventoryReservation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mock)),
    $queryRaw: vi.fn(),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  __esModule: true,
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
import {
  GET as bkashCallbackGet,
  POST as bkashCallbackPost,
} from "@/app/api/payments/bkash/callback/route";

describe("Phase 2B — bKash Callback & PaymentService Verification", () => {
  let paymentService: PaymentService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    paymentService = new PaymentService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. PaymentService Reference Resolution & Validation", () => {
    test("throws error when neither tran_id nor paymentID is provided", async () => {
      await expect(paymentService.verifyCallback("BKASH", { status: "success" })).rejects.toThrow(
        "Missing transaction reference"
      );
    });

    test("resolves reference using payload.paymentID", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentService.verifyCallback("BKASH", {
          paymentID: "TR0011_NOT_FOUND",
          status: "success",
        })
      ).rejects.toThrow("Payment record not found");

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { merchantReferenceId: "TR0011_NOT_FOUND" },
      });
    });

    test("resolves reference using payload.paymentId (case-insensitive key)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentService.verifyCallback("BKASH", {
          paymentId: "TR0011_CAMEL_CASE",
          status: "success",
        })
      ).rejects.toThrow("Payment record not found");

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { merchantReferenceId: "TR0011_CAMEL_CASE" },
      });
    });
  });

  describe("2. Idempotency & Duplicate Callbacks", () => {
    test("ignores duplicate callback when payment is already SUCCESS", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "SUCCESS",
        merchantReferenceId: "TR0011_ALREADY_SUCCESS",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_ALREADY_SUCCESS",
        status: "success",
      });

      expect(result.orderNumber).toBe("VL-20261013-0001");
      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.success).toBe(true);

      // Must never call bKash gateway or update DB
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("ignores duplicate non-success callback when payment is already FAILED", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "FAILED",
        merchantReferenceId: "TR0011_ALREADY_FAILED",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_ALREADY_FAILED",
        status: "cancel",
      });

      expect(result.orderNumber).toBe("VL-20261013-0001");
      expect(result.verification.status).toBe("FAILED");
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("3. Unverified Browser Redirect Safeguards", () => {
    test("preserves INITIATED status and keeps reservations on untrusted browser cancel", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        merchantReferenceId: "TR0011_CANCEL_REQ",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_CANCEL_REQ",
        status: "cancel",
      });

      expect(result.orderNumber).toBe("VL-20261013-0001");
      expect(result.verification.status).toBe("CANCELLED");
      expect(result.verification.isUnverified).toBe(true);
      expect(result.verification.success).toBe(false);

      // Crucial safeguard: DB payment and order remain unmodified, reservations NOT released
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    test("preserves INITIATED status and keeps reservations on untrusted browser failure", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        merchantReferenceId: "TR0011_FAIL_REQ",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_FAIL_REQ",
        status: "failure",
      });

      expect(result.orderNumber).toBe("VL-20261013-0001");
      expect(result.verification.status).toBe("FAILED");
      expect(result.verification.isUnverified).toBe(true);

      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("4. Server-Side Execution & Reconciliation Verification", () => {
    test("successfully settles payment, order, and consumes reservation on valid gateway completion", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        amount: 1490.5,
        merchantReferenceId: "TR0011_VALID",
      });

      // Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // Execute call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_VALID",
          trxID: "BKASH_TRX_SETTLED_01",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-0001",
        }),
      });

      // Order lookup for reference validation
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ orderNumber: "VL-20261013-0001" }) // for orderNumber check
        .mockResolvedValueOnce({
          // for orderWithItems in transaction
          id: "ord-1",
          orderNumber: "VL-20261013-0001",
          items: [{ sku: "SKU-TEST-01", quantity: 1 }],
        })
        .mockResolvedValueOnce({ orderNumber: "VL-20261013-0001" }); // final return

      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([
        { id: "var-1", sku: "SKU-TEST-01" },
      ]);
      mockPrisma.inventoryTransaction.findMany.mockResolvedValueOnce([]); // no existing SALE
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: "res-1", status: "RESERVED" },
      ]); // active unexpired reservation

      const result = await paymentService.verifyCallback("BKASH", {
        paymentID: "TR0011_VALID",
        status: "success",
      });

      expect(result.orderNumber).toBe("VL-20261013-0001");
      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.success).toBe(true);
      expect(result.verification.providerTransactionId).toBe("BKASH_TRX_SETTLED_01");

      // Verify payment was updated to SUCCESS
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: "pay-1", status: { in: ["INITIATED", "FAILED", "CANCELLED"] } },
        data: expect.objectContaining({
          status: "SUCCESS",
          gatewayTransactionId: "BKASH_TRX_SETTLED_01",
        }),
      });

      // Verify order paymentStatus was updated to SUCCESS
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-1", paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS" },
      });
    });

    test("fails payment when verified amount does not match expected order total", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        amount: 1490.5,
        merchantReferenceId: "TR0011_MISMATCH",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // bKash executed with different amount (e.g. 500 instead of 1490.50)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_MISMATCH",
          trxID: "BKASH_TRX_MISMATCH",
          transactionStatus: "Completed",
          amount: "500.00",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-0001",
        }),
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      await expect(
        paymentService.verifyCallback("BKASH", {
          paymentID: "TR0011_MISMATCH",
          status: "success",
        })
      ).rejects.toThrow("Payment verification failed: Amount Mismatch");

      // Payment record updated to FAILED
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: "pay-1", status: { not: "SUCCESS" } },
        data: expect.objectContaining({
          status: "FAILED",
        }),
      });

      // Order is NOT settled
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    test("fails payment when verified order reference does not match local order", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        amount: 1490.5,
        merchantReferenceId: "TR0011_ORDER_MISMATCH",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // bKash returns invoice number for a different order
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_ORDER_MISMATCH",
          trxID: "BKASH_TRX_WRONG_ORDER",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "SOME_OTHER_ORDER_NUMBER",
        }),
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-EXPECTED",
      });

      await expect(
        paymentService.verifyCallback("BKASH", {
          paymentID: "TR0011_ORDER_MISMATCH",
          status: "success",
        })
      ).rejects.toThrow("Payment verification failed: Order reference mismatch");

      // Order is NOT settled
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("5. Callback HTTP Route (/api/payments/bkash/callback)", () => {
    test("GET redirect redirects to /order-success on successful payment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        amount: 1490.5,
        merchantReferenceId: "TR0011_ROUTE_SUCCESS",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_ROUTE_SUCCESS",
          trxID: "BKASH_TRX_ROUTE_OK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-0001",
        }),
      });

      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ orderNumber: "VL-20261013-0001" })
        .mockResolvedValueOnce({
          id: "ord-1",
          orderNumber: "VL-20261013-0001",
          items: [],
        })
        .mockResolvedValueOnce({ orderNumber: "VL-20261013-0001" });

      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 1 });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=TR0011_ROUTE_SUCCESS&status=success",
        { method: "GET" }
      );

      const response = await bkashCallbackGet(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/order-success/VL-20261013-0001?payment=success");
    });

    test("GET redirect handles unverified cancel redirect safely", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        merchantReferenceId: "TR0011_ROUTE_CANCEL",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=TR0011_ROUTE_CANCEL&status=cancel",
        { method: "GET" }
      );

      const response = await bkashCallbackGet(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/order-success/VL-20261013-0001?payment=cancelled");
    });

    test("redirects to /cart with error param when payment verification fails", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null); // Payment not found

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=UNKNOWN_PAYMENT&status=success",
        { method: "GET" }
      );

      const response = await bkashCallbackGet(req);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/cart?error=payment_verification_failed");
    });

    test("POST request returns JSON payload when Accept: application/json header is provided", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "ord-1",
        status: "INITIATED",
        merchantReferenceId: "TR0011_JSON_CANCEL",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        orderNumber: "VL-20261013-0001",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          paymentID: "TR0011_JSON_CANCEL",
          status: "cancel",
        }),
      });

      const response = await bkashCallbackPost(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.status).toBe("CANCELLED");
      expect(json.isUnverified).toBe(true);
      expect(json.orderNumber).toBe("VL-20261013-0001");
    });

    test("redirect uses configured publicEnv.NEXT_PUBLIC_APP_URL directly regardless of request origin", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      const reqWithArbitraryHost = new NextRequest(
        "http://some-other-host:8080/api/payments/bkash/callback?paymentID=MISSING_REF&status=success",
        { method: "GET" }
      );

      const response = await bkashCallbackGet(reqWithArbitraryHost);

      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toBe("https://vibelock.bd/cart?error=payment_verification_failed");
    });
  });
});
