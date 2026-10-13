/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock env
vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    NAGAD_MERCHANT_ID: "68300000025",
    NAGAD_MERCHANT_NUMBER: "01711111111",
    NAGAD_PG_PUBLIC_KEY: "mock_pg_public_key",
    NAGAD_MERCHANT_PRIVATE_KEY: "mock_merchant_private_key",
    NAGAD_SANDBOX: true,
  },
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelockbd.vercel.app",
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
import { GET as nagadCallbackGet, POST as nagadCallbackPost } from "@/app/api/payments/nagad/callback/route";

describe("Nagad Callback & PaymentService Verification", () => {
  let paymentService: PaymentService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.inventoryReservation.updateMany.mockResolvedValue({ count: 1 });
    paymentService = new PaymentService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Reference Resolution & Idempotency", () => {
    test("throws error when transaction reference is missing in callback", async () => {
      await expect(
        paymentService.verifyCallback("NAGAD", { status: "Success" })
      ).rejects.toThrow("Missing transaction reference");
    });

    test("resolves reference using payload.payment_ref_id", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentService.verifyCallback("NAGAD", {
          payment_ref_id: "NGD_REF_NOT_FOUND",
          status: "Success",
        })
      ).rejects.toThrow("Payment record not found");

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { merchantReferenceId: "NGD_REF_NOT_FOUND" },
      });
    });

    test("resolves reference using payload.paymentRefId (camelCase)", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentService.verifyCallback("NAGAD", {
          paymentRefId: "NGD_CAMEL_CASE",
          status: "Success",
        })
      ).rejects.toThrow("Payment record not found");

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { merchantReferenceId: "NGD_CAMEL_CASE" },
      });
    });

    test("idempotent short-circuit when payment is already terminal SUCCESS", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-1",
        orderId: "order-1",
        status: "SUCCESS",
        amount: 2500,
        merchantReferenceId: "PRID_ALREADY_SUCCESS",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-1",
        orderNumber: "VL-ORD-ALREADY-PAID",
      });

      const res = await paymentService.verifyCallback("NAGAD", {
        payment_ref_id: "PRID_ALREADY_SUCCESS",
        status: "Success",
      });

      expect(res.orderNumber).toBe("VL-ORD-ALREADY-PAID");
      expect(res.verification.success).toBe(true);
      expect(res.verification.status).toBe("SUCCESS");
      // fetch must not be called again
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("2. Unverified Browser vs Authoritative Settlement", () => {
    test("browser cancel callback returns isUnverified without modifying reservations", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-cancel",
        orderId: "order-cancel",
        status: "INITIATED",
        amount: 1500,
        merchantReferenceId: "PRID_BROWSER_CANCEL",
      });

      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: "order-cancel",
        orderNumber: "VL-ORD-CANCEL",
      });

      const res = await paymentService.verifyCallback("NAGAD", {
        payment_ref_id: "PRID_BROWSER_CANCEL",
        status: "Aborted",
      });

      expect(res.orderNumber).toBe("VL-ORD-CANCEL");
      expect(res.verification.success).toBe(false);
      expect(res.verification.status).toBe("CANCELLED");
      expect(res.verification.isUnverified).toBe(true);
      // Ensure payment was NOT marked terminal FAILED/CANCELLED
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    test("authoritative server-to-server query settles payment to SUCCESS", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-ok",
        orderId: "order-ok",
        status: "INITIATED",
        amount: 1500,
        merchantReferenceId: "PRID_SERVER_OK",
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-ok",
        orderNumber: "VL-ORD-OK",
        items: [],
      });

      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([]);

      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merchantId: "68300000025",
            orderId: "VL-ORD-OK",
            paymentRefId: "PRID_SERVER_OK",
            amount: "1500.00",
            status: "Success",
            issuerPaymentRefNo: "TXN_NAGAD_VERIFIED_77",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await paymentService.verifyCallback("NAGAD", {
        payment_ref_id: "PRID_SERVER_OK",
        status: "Success",
      });

      expect(res.orderNumber).toBe("VL-ORD-OK");
      expect(res.verification.success).toBe(true);
      expect(res.verification.status).toBe("SUCCESS");
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            gatewayTransactionId: "TXN_NAGAD_VERIFIED_77",
          }),
        })
      );
    });

    test("fails payment when server amount mismatches order amount", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-tampered",
        orderId: "order-tampered",
        status: "INITIATED",
        amount: 1500,
        merchantReferenceId: "PRID_TAMPERED",
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-tampered",
        orderNumber: "VL-ORD-TAMPERED",
        items: [],
      });

      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merchantId: "68300000025",
            orderId: "VL-ORD-TAMPERED",
            paymentRefId: "PRID_TAMPERED",
            amount: "50.00", // Tampered lower amount!
            status: "Success",
            issuerPaymentRefNo: "TXN_TAMPERED_1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      await expect(
        paymentService.verifyCallback("NAGAD", {
          payment_ref_id: "PRID_TAMPERED",
          status: "Success",
        })
      ).rejects.toThrow("Amount Mismatch");

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
          }),
        })
      );
    });
  });

  describe("3. HTTP Callback Route Handlers", () => {
    test("GET callback redirects to order-success upon verified payment", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-route-ok",
        orderId: "order-route-ok",
        status: "INITIATED",
        amount: 1200,
        merchantReferenceId: "PRID_ROUTE_OK",
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-route-ok",
        orderNumber: "VL-ORD-ROUTE-OK",
        items: [],
      });

      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([]);

      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merchantId: "68300000025",
            orderId: "VL-ORD-ROUTE-OK",
            paymentRefId: "PRID_ROUTE_OK",
            amount: "1200.00",
            status: "Success",
            issuerPaymentRefNo: "TXN_ROUTE_99",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = new NextRequest(
        "https://vibelockbd.vercel.app/api/payments/nagad/callback?payment_ref_id=PRID_ROUTE_OK&status=Success",
        { method: "GET" }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(303);
      const location = res.headers.get("location");
      expect(location).toContain("/order-success/VL-ORD-ROUTE-OK?payment=success");
    });

    test("GET callback returns JSON when Accept header specifies application/json", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce({
        id: "pay-route-json",
        orderId: "order-route-json",
        status: "INITIATED",
        amount: 800,
        merchantReferenceId: "PRID_ROUTE_JSON",
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-route-json",
        orderNumber: "VL-ORD-ROUTE-JSON",
        items: [],
      });

      mockPrisma.inventoryReservation.findMany.mockResolvedValueOnce([]);

      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merchantId: "68300000025",
            orderId: "VL-ORD-ROUTE-JSON",
            paymentRefId: "PRID_ROUTE_JSON",
            amount: "800.00",
            status: "Success",
            issuerPaymentRefNo: "TXN_ROUTE_JSON_88",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = new NextRequest(
        "https://vibelockbd.vercel.app/api/payments/nagad/callback?payment_ref_id=PRID_ROUTE_JSON&status=Success",
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orderNumber).toBe("VL-ORD-ROUTE-JSON");
    });

    test("GET callback redirects to /cart?error=payment_verification_failed on unhandled failure", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      const req = new NextRequest(
        "https://vibelockbd.vercel.app/api/payments/nagad/callback?payment_ref_id=UNKNOWN_REF",
        { method: "GET" }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(303);
      const location = res.headers.get("location");
      expect(location).toContain("/cart?error=payment_verification_failed");
    });

    test("POST callback handles JSON payload", async () => {
      mockPrisma.payment.findUnique.mockResolvedValueOnce(null);

      const req = new NextRequest(
        "https://vibelockbd.vercel.app/api/payments/nagad/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_ref_id: "UNKNOWN_POST_REF" }),
        }
      );

      const res = await nagadCallbackPost(req);
      expect(res.status).toBe(303);
      const location = res.headers.get("location");
      expect(location).toContain("/cart?error=payment_verification_failed");
    });
  });
});
