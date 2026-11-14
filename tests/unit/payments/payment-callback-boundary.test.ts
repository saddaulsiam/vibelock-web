import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as bkashCallbackGet,
  POST as bkashCallbackPost,
} from "@/app/api/payments/bkash/callback/route";
import {
  GET as nagadCallbackGet,
  POST as nagadCallbackPost,
} from "@/app/api/payments/nagad/callback/route";
import {
  GET as sslcommerzCallbackGet,
  POST as sslcommerzCallbackPost,
} from "@/app/api/payments/sslcommerz/callback/route";
import { POST as courierWebhook } from "@/app/api/shipping/webhook/route";

const { mockVerifyCallback } = vi.hoisted(() => ({
  mockVerifyCallback: vi.fn(),
}));

vi.mock("@/lib/payment/service", () => ({
  PaymentService: class {
    verifyCallback(...args: unknown[]) {
      return mockVerifyCallback(...args);
    }
  },
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    COURIER_WEBHOOK_SECRET: "test-courier-secret",
    SHIPPING_PROVIDER: "mock",
  },
}));

describe("Payment Callbacks & Webhooks Request Boundary & Regression Safety Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. Boundary & Request Size Enforcement
  // ==========================================
  describe("Request Boundary Size Limits (64 KB Cap)", () => {
    test("bKash callback rejects Content-Length exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json");
      headers.set("content-length", String(65 * 1024));

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentID: "TR-123" }),
      });

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("bKash callback rejects actual body exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json");

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers,
        body: "a".repeat(65 * 1024),
      });

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("Nagad callback rejects Content-Length exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json");
      headers.set("content-length", String(65 * 1024));

      const req = new NextRequest("https://vibelock.bd/api/payments/nagad/callback", {
        method: "POST",
        headers,
        body: JSON.stringify({ payment_ref_id: "NAGAD-123" }),
      });

      const res = await nagadCallbackPost(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("Nagad callback rejects actual body exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");

      const req = new NextRequest("https://vibelock.bd/api/payments/nagad/callback", {
        method: "POST",
        headers,
        body: "x".repeat(65 * 1024),
      });

      const res = await nagadCallbackPost(req);
      expect(res.status).toBe(413);
      const text = await res.text();
      expect(text).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("SSLCOMMERZ callback rejects Content-Length exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/x-www-form-urlencoded");
      headers.set("content-length", String(65 * 1024));

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers,
        body: "val_id=TEST_VAL_ID",
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(413);
      const text = await res.text();
      expect(text).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("SSLCOMMERZ callback rejects actual body exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/x-www-form-urlencoded");

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers,
        body: "field=" + "z".repeat(65 * 1024),
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(413);
      const text = await res.text();
      expect(text).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("Courier webhook rejects Content-Length exceeding 64KB with 413", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("content-length", String(65 * 1024));

      const req = new NextRequest("https://vibelock.bd/api/shipping/webhook", {
        method: "POST",
        headers,
        body: JSON.stringify({ providerShipmentId: "SHIP-1", status: "DELIVERED" }),
      });

      const res = await courierWebhook(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.error).toMatch(/payload too large/i);
    });
  });

  // ==========================================
  // 2. bKash Gateway Regression Tests
  // ==========================================
  describe("bKash Gateway Callbacks", () => {
    test("handles legitimate GET callback browser redirect on success", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-BKASH-01",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=BKASH_PAY_1&status=success",
        { method: "GET" }
      );

      const res = await bkashCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-BKASH-01?payment=success"
      );
      expect(mockVerifyCallback).toHaveBeenCalledWith("BKASH", {
        paymentID: "BKASH_PAY_1",
        status: "success",
      });
    });

    test("handles legitimate GET callback browser redirect on cancellation", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "CANCELLED", isUnverified: true },
        orderNumber: "VL-ORD-BKASH-02",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=BKASH_PAY_2&status=cancel",
        { method: "GET" }
      );

      const res = await bkashCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-BKASH-02?payment=cancelled"
      );
    });

    test("handles legitimate POST callback with JSON accept", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS", isUnverified: false },
        orderNumber: "VL-ORD-BKASH-03",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ paymentID: "BKASH_PAY_3", status: "success" }),
      });

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        status: "SUCCESS",
        orderNumber: "VL-ORD-BKASH-03",
        isUnverified: false,
      });
    });

    test("handles legitimate POST callback with URL-encoded body", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-BKASH-04",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "paymentID=BKASH_PAY_4&status=success",
      });

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-BKASH-04?payment=success"
      );
      expect(mockVerifyCallback).toHaveBeenCalledWith("BKASH", {
        paymentID: "BKASH_PAY_4",
        status: "success",
      });
    });

    test("handles empty POST body safely by relying on query parameters", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-BKASH-EMPTY",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=BKASH_PAY_EMPTY&status=success",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "",
        }
      );

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(303);
      expect(mockVerifyCallback).toHaveBeenCalledWith("BKASH", {
        paymentID: "BKASH_PAY_EMPTY",
        status: "success",
      });
    });

    test("handles malformed JSON body safely without crashing", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-BKASH-MALFORMED",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=BKASH_FALLBACK",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{ invalid json ...",
        }
      );

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(303);
      expect(mockVerifyCallback).toHaveBeenCalledWith("BKASH", {
        paymentID: "BKASH_FALLBACK",
      });
    });

    test("redirects to cart when verification fails", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Payment record not found"));

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/bkash/callback?paymentID=UNKNOWN_PAYMENT",
        { method: "GET" }
      );

      const res = await bkashCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/cart?error=payment_verification_failed"
      );
    });

    test("returns 400 JSON on verification failure when Accept is application/json", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Invalid payment signature"));

      const req = new NextRequest("https://vibelock.bd/api/payments/bkash/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ paymentID: "INVALID_SIG" }),
      });

      const res = await bkashCallbackPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid payment signature");
    });
  });

  // ==========================================
  // 3. Nagad Gateway Regression Tests
  // ==========================================
  describe("Nagad Gateway Callbacks", () => {
    test("handles legitimate GET callback browser redirect on success", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-NAGAD-01",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/nagad/callback?payment_ref_id=NGD_REF_1&status=Success",
        { method: "GET" }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-NAGAD-01?payment=success"
      );
      expect(mockVerifyCallback).toHaveBeenCalledWith("NAGAD", {
        payment_ref_id: "NGD_REF_1",
        status: "Success",
      });
    });

    test("handles legitimate GET callback browser redirect on failure", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "FAILED" },
        orderNumber: "VL-ORD-NAGAD-02",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/nagad/callback?payment_ref_id=NGD_REF_2&status=Failed",
        { method: "GET" }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-NAGAD-02?payment=failed"
      );
    });

    test("handles legitimate POST callback with URL-encoded body", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-NAGAD-03",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/nagad/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "payment_ref_id=NGD_REF_3&status=Success",
      });

      const res = await nagadCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-NAGAD-03?payment=success"
      );
    });

    test("handles legitimate POST callback with JSON accept header", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS", isUnverified: false },
        orderNumber: "VL-ORD-NAGAD-04",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/nagad/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ payment_ref_id: "NGD_REF_4", status: "Success" }),
      });

      const res = await nagadCallbackPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        status: "SUCCESS",
        orderNumber: "VL-ORD-NAGAD-04",
        isUnverified: false,
      });
    });

    test("handles verification failure by redirecting to /cart", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Verification failed"));

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/nagad/callback?payment_ref_id=UNKNOWN",
        { method: "GET" }
      );

      const res = await nagadCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/cart?error=payment_verification_failed"
      );
    });
  });

  // ==========================================
  // 4. SSLCOMMERZ Gateway Regression Tests
  // ==========================================
  describe("SSLCOMMERZ Gateway Callbacks & IPN", () => {
    test("handles legitimate browser POST callback (URL-encoded) redirect on success", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-SSLC-01",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_1",
        val_id: "VAL_12345",
        amount: "1500.00",
        currency: "BDT",
        status: "VALID",
        bank_tran_id: "BANK_999",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-SSLC-01?payment=success"
      );
      expect(mockVerifyCallback).toHaveBeenCalledWith(
        "SSLCOMMERZ",
        expect.objectContaining({
          tran_id: "SSLC_TRX_1",
          val_id: "VAL_12345",
          amount: "1500.00",
          status: "VALID",
        })
      );
    });

    test("handles legitimate browser POST callback redirect on failure", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "FAILED" },
        orderNumber: "VL-ORD-SSLC-02",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_2",
        status: "FAILED",
        failedreason: "Card expired or insufficient balance",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-SSLC-02?payment=failed"
      );
    });

    test("handles legitimate browser POST callback redirect on cancellation", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "CANCELLED" },
        orderNumber: "VL-ORD-SSLC-03",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_3",
        status: "CANCELLED",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-SSLC-03?payment=cancelled"
      );
    });

    test("handles duplicate callback idempotently (already SUCCESS)", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-SSLC-DUP",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_DUP",
        val_id: "VAL_DUP",
        status: "VALID",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-SSLC-DUP?payment=success"
      );
    });

    test("handles verified server-to-server IPN callback via query status=ipn", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS", isUnverified: false },
        orderNumber: "VL-ORD-SSLC-IPN-1",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_IPN_1",
        val_id: "VAL_IPN_1",
        status: "VALID",
      }).toString();

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/sslcommerz/callback?status=ipn",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        }
      );

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("IPN OK");
    });

    test("handles verified server-to-server IPN callback via header x-sslcommerz-ipn", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS", isUnverified: false },
        orderNumber: "VL-ORD-SSLC-IPN-2",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_IPN_2",
        val_id: "VAL_IPN_2",
        status: "VALID",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-sslcommerz-ipn": "true",
        },
        body,
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("IPN OK");
    });

    test("rejects unverified IPN callback with 400 Unverified IPN payload", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "FAILED", isUnverified: true },
        orderNumber: "VL-ORD-SSLC-IPN-UNVERIFIED",
      });

      const body = new URLSearchParams({
        tran_id: "SSLC_TRX_UNVERIFIED",
        status: "FAILED",
      }).toString();

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/sslcommerz/callback?status=ipn",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        }
      );

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe("Unverified IPN payload");
    });

    test("returns 503 for retryable database error during IPN processing", async () => {
      mockVerifyCallback.mockRejectedValueOnce(
        new Error("P2028: Transaction timed out on database query")
      );

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/sslcommerz/callback?status=ipn",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "tran_id=SSLC_TIMEOUT",
        }
      );

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(503);
      const text = await res.text();
      expect(text).toBe("Service Unavailable");
    });

    test("returns 400 for non-retryable error during IPN processing", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Invalid merchant validation key"));

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/sslcommerz/callback?status=ipn",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "tran_id=SSLC_BAD_KEY",
        }
      );

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe("Bad Request");
    });

    test("redirects non-IPN callback error to /cart?error=payment_verification_failed", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Database connection lost"));

      const req = new NextRequest("https://vibelock.bd/api/payments/sslcommerz/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "tran_id=SSLC_FAIL",
      });

      const res = await sslcommerzCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/cart?error=payment_verification_failed"
      );
    });

    test("handles legitimate GET callback for SSLCOMMERZ safely", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-SSLC-GET",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/sslcommerz/callback?tran_id=SSLC_GET&status=VALID",
        { method: "GET" }
      );

      const res = await sslcommerzCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-SSLC-GET?payment=success"
      );
    });
  });
});
