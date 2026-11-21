/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

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

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
    calculateAvailableQuantity: vi.fn(() => 10),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { PaymentService } from "@/lib/payment/service";
import {
  GET as paystationCallbackGet,
  POST as paystationCallbackPost,
} from "@/app/api/payments/paystation/callback/route";
import { POST as paystationIpnPost } from "@/app/api/payments/paystation/ipn/route";
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
    total: 2500,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "ONLINE",
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
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderHistory.create.mockResolvedValue({});
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
      expect(res.headers.get("location")).toContain("/order-success/VL-20261121-PS01?payment=success");
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
      expect(res.headers.get("location")).toContain("/order-success/VL-20261121-PS01?payment=success");
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

    test("returns 400 when IPN payload is genuinely unverified / rejected by PayStation", async () => {
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
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Unverified IPN");
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
});
