import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as bkashCallbackGet,
  POST as bkashCallbackPost,
} from "@/app/api/payments/bkash/callback/route";
import {
  GET as paystationCallbackGet,
  POST as paystationCallbackPost,
} from "@/app/api/payments/paystation/callback/route";
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

    test("PayStation callback rejects Content-Length exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      headers.set("content-length", String(65 * 1024));

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "POST",
        headers,
        body: JSON.stringify({ invoice_number: "PS-123" }),
      });

      const res = await paystationCallbackPost(req);
      expect(res.status).toBe(413);
      const text = await res.text();
      expect(text).toMatch(/payload too large/i);
      expect(mockVerifyCallback).not.toHaveBeenCalled();
    });

    test("PayStation callback rejects actual body exceeding 64KB with 413 and never calls PaymentService", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/x-www-form-urlencoded");

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "POST",
        headers,
        body: "field=" + "z".repeat(65 * 1024),
      });

      const res = await paystationCallbackPost(req);
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
  // 3. PayStation Gateway Regression Tests
  // ==========================================
  describe("PayStation Gateway Callbacks", () => {
    test("handles legitimate browser GET callback redirect on success", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-PS-01",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-ORD-PS-01-12345&status=Successful",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-PS-01?payment=success"
      );
      expect(mockVerifyCallback).toHaveBeenCalledWith("PAYSTATION", {
        invoice_number: "PS-VL-ORD-PS-01-12345",
        status: "Successful",
      });
    });

    test("handles legitimate browser GET callback redirect on cancellation", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: false, status: "CANCELLED" },
        orderNumber: "VL-ORD-PS-02",
      });

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-ORD-PS-02-12345&status=Canceled",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-PS-02?payment=cancelled"
      );
    });

    test("handles legitimate browser POST callback (URL-encoded) redirect on success", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS" },
        orderNumber: "VL-ORD-PS-03",
      });

      const body = new URLSearchParams({
        invoice_number: "PS-VL-ORD-PS-03-12345",
        status: "Successful",
        trx_id: "PS_TRX_3",
      }).toString();

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const res = await paystationCallbackPost(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(
        "https://vibelock.bd/order-success/VL-ORD-PS-03?payment=success"
      );
    });

    test("handles legitimate POST callback with JSON accept header", async () => {
      mockVerifyCallback.mockResolvedValueOnce({
        verification: { success: true, status: "SUCCESS", isUnverified: false },
        orderNumber: "VL-ORD-PS-04",
      });

      const req = new NextRequest("https://vibelock.bd/api/payments/paystation/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          invoice_number: "PS-VL-ORD-PS-04-12345",
          status: "Successful",
        }),
      });

      const res = await paystationCallbackPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        status: "SUCCESS",
        orderNumber: "VL-ORD-PS-04",
        isUnverified: false,
      });
    });

    test("handles verification failure safely by redirecting with failed payment param", async () => {
      mockVerifyCallback.mockRejectedValueOnce(new Error("Database connection lost"));

      const req = new NextRequest(
        "https://vibelock.bd/api/payments/paystation/callback?invoice_number=PS-VL-ORD-PS-05-12345&status=Failed",
        { method: "GET" }
      );

      const res = await paystationCallbackGet(req);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toContain("payment=");
    });
  });
});
