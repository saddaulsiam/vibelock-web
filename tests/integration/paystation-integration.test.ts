/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    PAYSTATION_MERCHANT_ID: "test_merchant_id_123",
    PAYSTATION_PASSWORD: "test_password_456",
    PAYSTATION_SANDBOX: true,
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

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(async () => null as any),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentMethodSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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
    paymentCapture: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mock)),
    $queryRaw: vi.fn(async (strings: any) => {
      const sql = Array.isArray(strings) ? strings.join(" ") : String(strings ?? "");
      if (sql.includes('INSERT INTO "PaymentCapture"')) {
        return [{ id: "mock-capture-uuid" }];
      }
      return [];
    }),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  __esModule: true,
  default: mockPrisma,
}));

vi.mock("@/lib/inventory/service", () => ({
  InventoryService: {
    consumeReservation: vi.fn(),
    releaseReservation: vi.fn(),
    cancelOrderInventory: vi.fn(),
    calculateAvailableQuantity: vi.fn(() => 10),
  },
}));

vi.mock("@/lib/checkout/coupons", () => ({
  releaseOrderCoupon: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  getIp: vi.fn(async () => "103.1.2.3"),
  checkPaymentInitiationRateLimit: vi.fn(async () => {}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  GET as paystationCallbackGet,
  POST as paystationCallbackPost,
} from "@/app/api/payments/paystation/callback/route";
import { POST as paystationIpnPost } from "@/app/api/payments/paystation/ipn/route";
import { retryOrderPaymentAction } from "@/lib/orders/actions";
import { PaymentService } from "@/lib/payment/service";
import {
  isPaymentMethodEnabled,
  updatePaymentMethodSetting,
} from "@/lib/settings/payment-settings";

describe("PayStation Hosted Checkout Integration Tests", () => {
  let paymentService: PaymentService;
  const originalFetch = global.fetch;

  const mockOrder = {
    id: "ord-paystation-101",
    orderNumber: "VL-20261121-PS01",
    userId: "user-ps-123",
    customerName: "Test Customer",
    customerPhone: "+8801700000000",
    customerEmail: "customer@vibelock.bd",
    shippingStreet: "Gulshan",
    shippingCity: "Dhaka",
    total: 2500,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "ONLINE",
    inventoryReservations: [
      {
        id: "res-101",
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 600000),
      },
    ],
  };

  const mockPayment = {
    id: "pay-paystation-101",
    orderId: "ord-paystation-101",
    amount: 2500,
    status: "INITIATED",
    gateway: "PAYSTATION",
    merchantReferenceId: "PS-VL-20261121-PS01-123456",
    gatewayTransactionId: null,
    gatewayPayload: {
      initiation: {
        invoiceNumber: "PS-VL-20261121-PS01-123456",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv.PAYSTATION_MERCHANT_ID = "test_merchant_id_123";
    mockEnv.PAYSTATION_PASSWORD = "test_password_456";
    mockEnv.PAYSTATION_SANDBOX = true;

    global.fetch = vi.fn();
    paymentService = new PaymentService();

    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.payment.create.mockResolvedValue(mockPayment);
    mockPrisma.payment.update.mockResolvedValue(mockPayment);
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderHistory.create.mockResolvedValue({});
    mockPrisma.inventoryReservation.findMany.mockResolvedValue([]);
    mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
      id: "setting-ps-1",
      code: "PAYSTATION",
      isEnabled: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. PaymentService.verifyCallback for PayStation", () => {
    test("settles payment on authoritative successful transaction-status verification", async () => {
      // Mock gateway response for POST /transaction-status
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_999000",
            payment_amount: 2500,
            payment_method: "bKash",
          },
        }),
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(result.orderNumber).toBe("VL-20261121-PS01");
      expect(result.verification.success).toBe(true);
      expect(result.verification.status).toBe("SUCCESS");
      expect(result.verification.providerTransactionId).toBe("PS_TRX_999000");

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayTransactionId: "PS_TRX_999000",
          }),
        })
      );
    });

    test("detects amount mismatch and fails payment securely", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_999000",
            payment_amount: 1000, // Mismatch: Expected 2500, got 1000
          },
        }),
      });

      await expect(
        paymentService.verifyCallback("PAYSTATION", {
          invoice_number: "PS-VL-20261121-PS01-123456",
        })
      ).rejects.toThrow(/Amount Mismatch/i);
    });

    test("detects invoice reference mismatch and fails with tampering alert", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "DIFFERENT-INVOICE-REF",
            trx_status: "Success",
            trx_id: "PS_TRX_999000",
            payment_amount: 2500,
          },
        }),
      });

      await expect(
        paymentService.verifyCallback("PAYSTATION", {
          invoice_number: "PS-VL-20261121-PS01-123456",
        })
      ).rejects.toThrow(/Transaction or Currency Mismatch/i);
    });

    test("handles duplicate callback idempotently when payment is already SUCCESS", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        ...mockPayment,
        status: "SUCCESS",
        gatewayTransactionId: "PS_TRX_999000",
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "PS_TRX_999000",
      });

      expect(result.orderNumber).toBe("VL-20261121-PS01");
      expect(result.verification.success).toBe(true);
      expect(result.verification.status).toBe("SUCCESS");
      // No extra HTTP calls or database updates
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("preserves INITIATED status and does not release reservations when transaction is in-flight (Processing)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
            payment_amount: 2500,
          },
        }),
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(result.verification.status).toBe("PENDING");
      expect(result.verification.isUnverified).toBe(true);
      // Payment status in DB must NOT be marked FAILED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("2. Browser Callback Route (/api/payments/paystation/callback)", () => {
    test("handles browser callback redirect and verifies server-to-server", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_123",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toContain(
        "/order-success/VL-20261121-PS01?payment=success"
      );
    });

    test("handles POST form-urlencoded browser callback redirect", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_123",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "invoice_number=PS-VL-20261121-PS01-123456&trx_status=Success",
      });

      const res = await paystationCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toContain(
        "/order-success/VL-20261121-PS01?payment=success"
      );
    });

    test("supports JSON client response for headless verification", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_123",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456",
        {
          method: "GET",
          headers: { accept: "application/json" },
        }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderNumber).toBe("VL-20261121-PS01");
    });

    test("redirects to order-success with payment=cancelled when customer cancels with explicit status=cancel", async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        {
          id: "res-101",
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      ]);

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01&status=cancel",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=cancelled"
      );
      // Explicit cancellation marks only that payment attempt as CANCELLED
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "pay-paystation-101",
            status: "INITIATED",
          }),
          data: expect.objectContaining({
            status: "CANCELLED",
          }),
        })
      );
    });

    test("redirects to order-success with payment=pending when customer exits and PayStation status query returns Processing", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=pending"
      );
      // Zero-trust: DB payment remains INITIATED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("safely recovers correlation from session if PayStation stripped query parameters on redirect", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user-ps-123" },
      });
      mockPrisma.payment.findFirst.mockResolvedValueOnce({
        ...mockPayment,
        order: { orderNumber: "VL-20261121-PS01" },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
            payment_amount: 2500,
          },
        }),
      });

      // Browser redirected to callback URL with no search params at all
      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "GET",
      });

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=pending"
      );
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gateway: "PAYSTATION",
            status: "INITIATED",
            order: { userId: "user-ps-123" },
          }),
        })
      );
    });

    test("safely redirects correlated order to payment=pending if upstream PayStation status query times out", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("The operation was aborted due to timeout")
      );

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=pending"
      );
      // Zero-trust: DB payment remains INITIATED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("safely redirects correlated order to payment=pending if an unexpected exception occurs during verification", async () => {
      mockPrisma.payment.findUnique.mockRejectedValueOnce(
        new Error("Database connection pool saturated")
      );

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=pending"
      );
      // Ensure zero-trust: payment in DB must NOT be marked FAILED or CANCELLED, preserving INITIATED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("redirects to order-success with payment=failed and updates DB when PayStation status query authoritatively returns Failed", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "PS_TRX_FAILED_999",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=failed"
      );
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "pay-paystation-101",
            status: "INITIATED",
          }),
          data: expect.objectContaining({
            status: "FAILED",
            gatewayTransactionId: "PS_TRX_FAILED_999",
          }),
        })
      );
    });

    test("redirects to generic cart error when request cannot be correlated to any order", async () => {
      mockAuth.mockResolvedValueOnce(null);
      mockPrisma.payment.findFirst.mockResolvedValueOnce(null);

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "GET",
      });

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/cart?error=payment_verification_failed"
      );
    });

    test("returns JSON response with status CANCELLED when JSON client reports explicit cancel", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01&status=cancel",
        {
          method: "GET",
          headers: { accept: "application/json" },
        }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.status).toBe("CANCELLED");
      expect(json.orderNumber).toBe("VL-20261121-PS01");
      expect(json.isUnverified).toBe(false);
    });
  });

  describe("3. IPN Route (/api/payments/paystation/ipn)", () => {
    test("handles valid IPN notification with server-to-server confirmation", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "PS_TRX_IPN_001",
            payment_amount: 2500,
          },
        }),
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
          trx_id: "PS_TRX_IPN_001",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("SUCCESS");
    });

    test("returns 503 retryable status when IPN is received while transaction is still Processing", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
          },
        }),
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain("temporarily unavailable");
    });

    test("returns 503 retryable status when upstream PayStation status query fails with HTTP 500", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain("temporarily unavailable");
    });

    test("returns 502 when upstream PayStation status query fails with HTTP 400 without tampering alert", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain("Upstream gateway query error");
    });

    test("returns 500 when upstream PayStation status query fails with HTTP 401 without tampering alert", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("authentication error");
    });

    test("returns 500 when PayStation merchant configuration is missing without tampering alert", async () => {
      mockEnv.PAYSTATION_MERCHANT_ID = "";

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("configuration error");

      mockEnv.PAYSTATION_MERCHANT_ID = "test_merchant_id_123";
    });

    test("returns 400 when IPN payload transaction is genuinely rejected / not found by PayStation", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "1004",
          status: "failed",
          message: "Transaction not found",
        }),
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Unverified IPN");
    });

    test("returns 400 for malformed JSON payload", async () => {
      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    test("returns 413 for oversized payload", async () => {
      const oversizedText = "x".repeat(70000); // > 64 KB
      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: oversizedText,
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toBe("Payload too large");
    });

    test("returns 500 on unexpected internal runtime exception", async () => {
      mockPrisma.payment.findUnique.mockRejectedValueOnce(
        new TypeError("Unexpected null pointer in database client")
      );

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Internal Server Error");
    });

    test("returns 503 retryable status on database timeout/connectivity failure", async () => {
      mockPrisma.payment.findUnique.mockRejectedValueOnce(
        new Error("P1001: Can't reach database server at localhost:5432")
      );

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/ipn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: "PS-VL-20261121-PS01-123456",
        }),
      });

      const res = await paystationIpnPost(req);
      expect(res.status).toBe(503);
    });
  });

  describe("4. Settings & Gating Controls", () => {
    test("isPaymentMethodEnabled returns false by default if no setting persisted", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValueOnce(null);

      const enabled = await isPaymentMethodEnabled("PAYSTATION");
      expect(enabled).toBe(false);
    });

    test("isPaymentMethodEnabled returns true when configured and persisted enabled", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValueOnce({
        id: "setting-ps-1",
        code: "PAYSTATION",
        name: "PayStation Gateway",
        isEnabled: true,
      });

      const enabled = await isPaymentMethodEnabled("PAYSTATION");
      expect(enabled).toBe(true);
    });

    test("isPaymentMethodEnabled returns false when credentials are missing even if enabled in DB", async () => {
      mockEnv.PAYSTATION_MERCHANT_ID = undefined as unknown as string;
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValueOnce({
        id: "setting-ps-1",
        code: "PAYSTATION",
        name: "PayStation Gateway",
        isEnabled: true,
      });

      const enabled = await isPaymentMethodEnabled("PAYSTATION");
      expect(enabled).toBe(false);
    });

    test("updatePaymentMethodSetting rejects enabling PayStation without environment credentials", async () => {
      mockEnv.PAYSTATION_MERCHANT_ID = undefined as unknown as string;

      const result = await updatePaymentMethodSetting("PAYSTATION", true, "admin-user-id");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot enable PayStation without configured credentials");
    });
  });

  describe("5. Checkout Cancellation, Status Mapping & Retry Safety", () => {
    test("1. status=Canceled marks payment attempt CANCELLED, preserves pending order & reservation, and redirects to payment=cancelled", async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([
        {
          id: "res-101",
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      ]);

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01&status=Canceled&trx_id=",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-20261121-PS01?payment=cancelled"
      );
      // Payment attempt in DB is marked CANCELLED
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "pay-paystation-101",
            status: "INITIATED",
          }),
          data: expect.objectContaining({
            status: "CANCELLED",
          }),
        })
      );
      // Order status is preserved as PENDING
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            paymentStatus: "PENDING",
          }),
        })
      );
    });

    test("1b. recognizes cancel, canceled, cancelled, and aborted variants and marks payment CANCELLED", async () => {
      const cancelVariants = [
        "cancel",
        "canceled",
        "cancelled",
        "aborted",
        "Canceled",
        "Cancelled",
      ];
      for (const variant of cancelVariants) {
        mockPrisma.payment.updateMany.mockClear();
        mockPrisma.payment.findUnique.mockResolvedValueOnce({
          ...mockPayment,
          status: "INITIATED",
        });
        mockPrisma.order.findUnique.mockResolvedValueOnce(mockOrder);

        const verifyResult = await paymentService.verifyCallback("PAYSTATION", {
          invoice_number: "PS-VL-20261121-PS01-123456",
          status: variant,
        });

        expect(verifyResult.verification.status).toBe("CANCELLED");
        expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: "CANCELLED",
            }),
          })
        );
      }
    });

    test("1c. allows retry to initiate a new payment attempt after previous attempt is CANCELLED", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-ps-123" } });
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: "user-ps-123",
        status: "PENDING",
        paymentStatus: "PENDING",
        payments: [{ ...mockPayment, status: "CANCELLED" }],
      });
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "setting-ps-1",
        code: "PAYSTATION",
        isEnabled: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          payment_url: "https://sandbox.paystation.com.bd/checkout/token_retry_cancel_001",
        }),
      });

      mockPrisma.payment.create = vi.fn().mockResolvedValue({
        id: "pay-new-456",
        merchantReferenceId: "PS-VL-20261121-PS01-retry",
      });

      const retryResult = await retryOrderPaymentAction("VL-20261121-PS01", "PAYSTATION");
      expect(retryResult.success).toBe(true);
      expect(retryResult.redirectUrl).toBe(
        "https://sandbox.paystation.com.bd/checkout/token_retry_cancel_001"
      );
    });

    test("1d. never overwrites a verified SUCCESS payment with CANCELLED", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        ...mockPayment,
        status: "SUCCESS",
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        ...mockOrder,
        paymentStatus: "SUCCESS",
        status: "CONFIRMED",
      });

      mockPrisma.payment.updateMany.mockClear();
      mockPrisma.order.updateMany.mockClear();

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        status: "Canceled",
      });

      expect(result.verification.status).toBe("SUCCESS");
      // Must not update payment status to CANCELLED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
      // Must not cancel order or release inventory
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    test("2. processing status preserves pending payment without releasing reservations", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Processing",
            payment_amount: 2500,
          },
        }),
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(result.verification.status).toBe("PENDING");
      expect(result.verification.isUnverified).toBe(true);
      expect(result.verification.isRetryable).toBe(true);
      // Ensure zero-trust: payment in DB must NOT be marked FAILED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("3. verified failed marks payment FAILED and allows retry", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        ...mockPayment,
        status: "INITIATED",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "PS_TRX_FAILED_101",
            payment_amount: 2500,
          },
        }),
      });

      const verifyResult = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(verifyResult.verification.status).toBe("FAILED");
      expect(verifyResult.verification.isUnverified).toBe(false);
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
          }),
        })
      );

      // Verify retry eligibility: customer can now initiate a new payment attempt
      mockAuth.mockResolvedValueOnce({ user: { id: "user-ps-123" } });
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: "user-ps-123",
        payments: [{ ...mockPayment, status: "FAILED" }],
      });
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "setting-ps-1",
        code: "PAYSTATION",
        isEnabled: true,
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          payment_url: "https://sandbox.paystation.com.bd/checkout/token_retry_001",
        }),
      });

      mockPrisma.payment.create = vi.fn().mockResolvedValue({
        id: "pay-new-123",
        merchantReferenceId: "PS-VL-20261121-PS01-123456",
      });

      const retryResult = await retryOrderPaymentAction("VL-20261121-PS01", "PAYSTATION");
      expect(retryResult.success).toBe(true);
      expect(retryResult.redirectUrl).toBe(
        "https://sandbox.paystation.com.bd/checkout/token_retry_001"
      );
    });

    test("4. verified success prevents duplicate payment on retry", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-ps-123" } });
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: "user-ps-123",
        paymentStatus: "SUCCESS",
        payments: [{ ...mockPayment, status: "SUCCESS" }],
      });

      const retryResult = await retryOrderPaymentAction("VL-20261121-PS01", "PAYSTATION");
      expect(retryResult.success).toBe(false);
      expect(retryResult.error).toBe("Order is already paid.");
      // No payment initiation fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("5. timeout or network error preserves pending status", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Connection to PayStation timed out")
      );

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(result.verification.status).toBe("PENDING");
      expect(result.verification.isUnverified).toBe(true);
      expect(result.verification.isRetryable).toBe(true);
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("6. duplicate callbacks do not cause duplicate settlement", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        ...mockPayment,
        status: "SUCCESS",
        gatewayTransactionId: "PS_TRX_ALREADY_SETTLED_999",
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "PS_TRX_ALREADY_SETTLED_999",
      });

      expect(result.orderNumber).toBe("VL-20261121-PS01");
      expect(result.verification.success).toBe(true);
      expect(result.verification.status).toBe("SUCCESS");
      // Idempotent: no fetch, no db updates
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("6. Empty trx_id, Duplicate gatewayTransactionId & Security Robustness", () => {
    test("handles empty string trx_id in failed callback and saves gatewayTransactionId as null without unique constraint error", async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
        { id: "res-101", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "",
            payment_amount: 2500,
          },
        }),
      });

      const verifyResult = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "",
      });

      expect(verifyResult.verification.status).toBe("FAILED");
      expect(verifyResult.verification.isUnverified).toBe(false);

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            gatewayTransactionId: null,
          }),
        })
      );

      // Order remains PENDING with active reservations preserved
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            paymentStatus: "FAILED",
          }),
        })
      );
    });

    test("handles whitespace-only trx_id in failed callback and saves gatewayTransactionId as null", async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
        { id: "res-101", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "    ",
            payment_amount: 2500,
          },
        }),
      });

      const verifyResult = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "   ",
      });

      expect(verifyResult.verification.status).toBe("FAILED");
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            gatewayTransactionId: null,
          }),
        })
      );
    });

    test("never overwrites existing valid gatewayTransactionId when subsequent callback provides empty trx_id", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        gatewayTransactionId: "ORIGINAL_VALID_TRX_888",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "",
            payment_amount: 2500,
          },
        }),
      });

      await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "",
      });

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gatewayTransactionId: "ORIGINAL_VALID_TRX_888",
          }),
        })
      );
    });

    test("detects conflicting duplicate gatewayTransactionId and omits it without crashing", async () => {
      mockPrisma.payment.findFirst.mockResolvedValueOnce({
        id: "conflicting-payment-999",
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Success",
            trx_id: "DUPLICATE_TRX_COLLISION",
            payment_amount: 2500,
          },
        }),
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
        trx_id: "DUPLICATE_TRX_COLLISION",
      });

      expect(result.verification.status).toBe("SUCCESS");
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayTransactionId: null,
          }),
        })
      );
    });

    test("falls back safely to null gatewayTransactionId when P2002 unique constraint is thrown by Prisma", async () => {
      const p2002Error: any = new Error(
        "Unique constraint failed on the fields: (`gatewayTransactionId`)"
      );
      p2002Error.code = "P2002";

      mockPrisma.payment.updateMany
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce({ count: 1 });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "RACE_CONDITION_TRX",
            payment_amount: 2500,
          },
        }),
      });

      const result = await paymentService.verifyCallback("PAYSTATION", {
        invoice_number: "PS-VL-20261121-PS01-123456",
      });

      expect(result.verification.status).toBe("FAILED");
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.payment.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            gatewayTransactionId: null,
          }),
        })
      );
    });

    test("handles browser callback with status=Failed and Invalid Security Signature cleanly without crashing", async () => {
      mockPrisma.inventoryReservation.findMany.mockResolvedValue([
        { id: "res-101", status: "RESERVED", expiresAt: new Date(Date.now() + 600000) },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-VL-20261121-PS01-123456",
            trx_status: "Failed",
            trx_id: "",
            payment_amount: 2500,
          },
        }),
      });

      const { GET } = await import("@/app/api/payments/paystation/callback/route");
      const req = new NextRequest(
        "http://localhost:3000/api/payments/paystation/callback?invoice_number=PS-VL-20261121-PS01-123456&order_number=VL-20261121-PS01&status=Failed&trx_id=&message=Invalid%20Security%20Signature"
      );

      const response = await GET(req);
      expect(response.status).toBe(303);
      const location = response.headers.get("location");
      expect(location).toContain("/order-success/VL-20261121-PS01");
      expect(location).toContain("payment=failed");

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            gatewayTransactionId: null,
          }),
        })
      );
    });
  });
});
