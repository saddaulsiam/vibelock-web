import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
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

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/config/public-env", () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: "https://vibelockbd.vercel.app",
  },
}));

import { BkashProvider } from "@/lib/payment/providers/bkash/client";
import { PaymentInitiationRequest } from "@/lib/payment/types";

describe("Phase 2A — bKash Tokenized Checkout Provider Unit Tests", () => {
  let provider: BkashProvider;
  const originalFetch = global.fetch;

  const sampleRequest: PaymentInitiationRequest = {
    orderId: "order-uuid-123",
    orderNumber: "VL-20261013-TEST01",
    amount: 1490.5,
    customerName: "Dhaka Customer",
    customerEmail: "customer@vibelock.com",
    customerPhone: "01711111111",
    shippingStreet: "House 12, Road 4",
    shippingCity: "Dhaka",
    shippingZip: "1213",
    shippingCountry: "BD",
  };

  beforeEach(() => {
    mockEnv.BKASH_APP_KEY = "sandbox_app_key_test_123";
    mockEnv.BKASH_APP_SECRET = "sandbox_app_secret_test_456";
    mockEnv.BKASH_USERNAME = "sandbox_user_test_789";
    mockEnv.BKASH_PASSWORD = "sandbox_pass_test_000";
    mockEnv.BKASH_SANDBOX = true;

    global.fetch = vi.fn();
    provider = new BkashProvider();
    provider.clearCachedToken();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Environment & Base URL Resolution", () => {
    test("resolves to official sandbox base URL in sandbox mode", () => {
      expect(provider.baseUrl).toBe("https://tokenized.sandbox.bka.sh/v1.2.0-beta");
    });

    test("resolves to live production base URL when sandbox is false", () => {
      mockEnv.BKASH_SANDBOX = false;
      const liveProvider = new BkashProvider();
      expect(liveProvider.baseUrl).toBe("https://tokenized.pay.bka.sh/v1.2.0-beta");
    });
  });

  describe("2. Token Grant & Caching Lifecycle", () => {
    test("successfully grants and caches id_token on valid credentials", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-bkash-jwt-token-xyz",
          token: "mock-token",
          refreshToken: "mock-refresh-token",
          expires_in: 3600,
        }),
      });

      const token = await provider.grantToken();

      expect(token).toBe("mock-bkash-jwt-token-xyz");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [fetchUrl, fetchOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchUrl).toBe("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant");
      expect(fetchOptions.method).toBe("POST");
      expect(fetchOptions.headers["Content-Type"]).toBe("application/json");
      expect(fetchOptions.headers["username"]).toBe("sandbox_user_test_789");
      expect(fetchOptions.headers["password"]).toBe("sandbox_pass_test_000");

      const body = JSON.parse(fetchOptions.body);
      expect(body.app_key).toBe("sandbox_app_key_test_123");
      expect(body.app_secret).toBe("sandbox_app_secret_test_456");

      // Verify that subsequent getValidToken reuses the cached token without making another fetch
      const reusedToken = await provider.getValidToken();
      expect(reusedToken).toBe("mock-bkash-jwt-token-xyz");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test("handles token grant rejection with sanitized error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "2001",
          statusMessage: "Invalid App Key",
        }),
      });

      await expect(provider.grantToken()).rejects.toThrow("Invalid App Key");
    });

    test("handles non-200 HTTP response during token grant", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(provider.grantToken()).rejects.toThrow("bKash token grant request failed with HTTP status 401");
    });

    test("guards against missing credentials without making network calls", async () => {
      mockEnv.BKASH_APP_KEY = "";
      const unconfiguredProvider = new BkashProvider();

      await expect(unconfiguredProvider.grantToken()).rejects.toThrow(
        "bKash configuration missing: required credentials not provided"
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("handles network timeout during token grant gracefully", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      await expect(provider.grantToken()).rejects.toThrow("bKash token grant timed out");
    });
  });

  describe("3. Payment Creation (initiatePayment)", () => {
    test("successfully creates payment and returns redirect URL with paymentID", async () => {
      // 1. Mock grant token response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
          expires_in: 3600,
        }),
      });

      // 2. Mock create payment response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011X1627000000000",
          bkashURL: "https://sandbox.bka.sh/checkout/version?paymentID=TR0011X1627000000000",
          callbackURL: "https://vibelockbd.vercel.app/api/payments/bkash/callback",
          amount: "1490.50",
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.merchantReferenceId).toBe("TR0011X1627000000000");
      expect(result.redirectUrl).toBe("https://sandbox.bka.sh/checkout/version?paymentID=TR0011X1627000000000");
      expect(result.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verify create call headers and payload
      const [createUrl, createOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(createUrl).toBe("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create");
      expect(createOptions.headers["Authorization"]).toBe("mock-valid-id-token");
      expect(createOptions.headers["X-APP-Key"]).toBe("sandbox_app_key_test_123");

      const body = JSON.parse(createOptions.body);
      expect(body.mode).toBe("0011");
      expect(body.amount).toBe("1490.50");
      expect(body.currency).toBe("BDT");
      expect(body.intent).toBe("sale");
      expect(body.merchantInvoiceNumber).toBe("VL-20261013-TEST01");
      expect(body.payerReference).toBe("01711111111");
      expect(body.callbackURL).toBe("https://vibelockbd.vercel.app/api/payments/bkash/callback");
    });

    test("fails safely if configuration is missing without calling API", async () => {
      mockEnv.BKASH_APP_KEY = "";
      const unconfiguredProvider = new BkashProvider();

      const result = await unconfiguredProvider.initiatePayment(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("bKash configuration missing");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("handles API error code in create payment response", async () => {
      // Mock grant token ok
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // Mock create payment failure
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "2005",
          statusMessage: "Payer reference is invalid",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Payer reference is invalid");
      expect(result.redirectUrl).toBeUndefined();
    });

    test("handles malformed response with 0000 but missing paymentID/bkashURL", async () => {
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
          // Missing paymentID and bkashURL
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Malformed bKash response");
    });

    test("handles HTTP non-200 error on payment create", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("bKash payment create request failed with HTTP 502");
    });

    test("handles request timeout on payment create", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe("bKash payment initiation timed out");
    });
  });

  describe("4. Phase 2B Server-Side Payment Verification (verifyPayment)", () => {
    test("rejects callback with missing or empty paymentID as unverified", async () => {
      const result = await provider.verifyPayment({ status: "success" });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toBe("Missing or invalid paymentID in callback");
    });

    test("treats browser cancellation redirect as unverified cancelled", async () => {
      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "cancel",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("CANCELLED");
      expect(result.isUnverified).toBe(true);
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.error).toBe("Customer cancelled payment on bKash checkout");
      // Never calls fetch to execute payment
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("treats browser failure redirect as unverified failure", async () => {
      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "failure",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.error).toBe("Payment failed on bKash checkout");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("treats unknown non-success status as unverified failure", async () => {
      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "pending",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("Unverified bKash callback status");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("returns unverified failure when server credentials are missing", async () => {
      (mockEnv as { BKASH_APP_KEY?: string }).BKASH_APP_KEY = undefined;
      const unconfigProvider = new BkashProvider();

      const result = await unconfigProvider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toBe("bKash configuration missing");
    });

    test("returns unverified failure when token grant fails during execution", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("bKash token grant request failed");
    });

    test("successfully verifies payment when execute returns Completed with valid trxID", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          payerReference: "01711111111",
          customerMsisdn: "01711111111",
          trxID: "BKASH_TRX_99999",
          amount: "1490.50",
          transactionStatus: "Completed",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.isUnverified).toBe(false);
      expect(result.providerTransactionId).toBe("BKASH_TRX_99999");
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.verifiedOrderNumber).toBe("VL-20261013-TEST01");
      expect(result.verifiedAmount).toBe(1490.5);
      expect(result.verifiedCurrency).toBe("BDT");

      // Verify the execute request payload and headers
      const [executeUrl, executeOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(executeUrl).toBe("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute");
      expect(executeOptions.method).toBe("POST");
      expect(executeOptions.headers.Authorization).toBe("mock-valid-id-token");
      expect(executeOptions.headers["X-APP-Key"]).toBe("sandbox_app_key_test_123");
      expect(JSON.parse(executeOptions.body)).toEqual({ paymentID: "TR0011_TEST" });
    });

    test("detects spoofed success callback when gateway execute returns failure code", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute returns invalid payment ID error
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "2001",
          statusMessage: "Invalid Payment ID",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "SPOOFED_PAYMENT_ID",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toBe("Invalid Payment ID");
    });

    test("handles gateway cancellation code (2050) during execute", async () => {
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
          statusCode: "2050",
          statusMessage: "User Cancelled",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("CANCELLED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toBe("User Cancelled");
    });

    test("rejects malformed execute response (missing amount or currency)", async () => {
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
          paymentID: "TR0011_TEST",
          merchantInvoiceNumber: "VL-20261013-TEST01",
          trxID: "BKASH_TRX_99999",
          transactionStatus: "Completed",
          // amount and currency missing
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Incomplete or malformed verification response");
    });

    test("falls back to Query Payment Status when execute encounters timeout and confirms Completed", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute times out
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      // 3. Query Payment Status succeeds with Completed
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_FALLBACK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.isUnverified).toBe(false);
      expect(result.providerTransactionId).toBe("BKASH_TRX_FALLBACK");

      // Verify the query status URL
      const [queryUrl, queryOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[2];
      expect(queryUrl).toBe("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status");
      expect(queryOptions.method).toBe("POST");
      expect(JSON.parse(queryOptions.body)).toEqual({ paymentID: "TR0011_TEST" });
    });

    test("falls back to Query Payment Status on duplicate error (2029) and confirms Completed", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute returns duplicate code 2029
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "2029",
          statusMessage: "Duplicate for all transactions",
        }),
      });

      // 3. Query Payment Status returns Completed
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_DUP_RESOLVED",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.isUnverified).toBe(false);
      expect(result.providerTransactionId).toBe("BKASH_TRX_DUP_RESOLVED");
    });

    test("treats in-flight / Initiated status from query as unverified pending", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute times out
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      // 3. Query Payment Status returns Initiated
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          transactionStatus: "Initiated",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("Payment execution pending or unconfirmed");
    });

    test("returns unverified failure when both execute and query timeout", async () => {
      // 1. Token grant
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      // 2. Execute times out
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      // 3. Query times out too
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("timed out");
    });

    test("rejects execute response missing merchantInvoiceNumber", async () => {
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
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_99999",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          // merchantInvoiceNumber omitted
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Missing or empty merchantInvoiceNumber in bKash execution response");
    });

    test("rejects execute response containing mismatched paymentID", async () => {
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
          paymentID: "TR0011_WRONG_PAYMENT_ID",
          trxID: "BKASH_TRX_99999",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Mismatched paymentID in bKash execution response");
    });

    test("rejects execute response missing paymentID", async () => {
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
          // paymentID omitted
          trxID: "BKASH_TRX_99999",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Missing paymentID in bKash execution response");
    });

    test("rejects query fallback response missing or empty merchantInvoice", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_FALLBACK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          // merchantInvoice omitted
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Missing or empty merchantInvoice in bKash query response");
    });

    test("rejects query fallback response containing only undocumented merchantInvoiceNumber", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_FALLBACK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-TEST01", // undocumented on query endpoint
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Missing or empty merchantInvoice in bKash query response");
    });

    test("rejects query fallback response containing mismatched paymentID", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_WRONG_FROM_QUERY",
          trxID: "BKASH_TRX_FALLBACK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Mismatched paymentID in bKash query response");
    });

    test("rejects query fallback response missing paymentID", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          // paymentID omitted
          trxID: "BKASH_TRX_FALLBACK",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Missing paymentID in bKash query response");
    });

    test("successfully verifies payment when execute returns paymentId and trxId aliases", async () => {
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
          paymentId: "TR0011_TEST", // alias
          trxId: "BKASH_TRX_ALIAS_123", // alias
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoiceNumber: "VL-20261013-TEST01",
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.providerTransactionId).toBe("BKASH_TRX_ALIAS_123");
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.verifiedOrderNumber).toBe("VL-20261013-TEST01");
      expect(result.verifiedAmount).toBe(1490.50);
      expect(result.verifiedCurrency).toBe("BDT");
    });

    test("successfully verifies payment when query fallback returns documented merchantInvoice alias", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentID: "TR0011_TEST",
          trxID: "BKASH_TRX_QUERY_INVOICE",
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01", // documented alias in query-payment docs
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.providerTransactionId).toBe("BKASH_TRX_QUERY_INVOICE");
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.verifiedOrderNumber).toBe("VL-20261013-TEST01");
      expect(result.verifiedAmount).toBe(1490.50);
      expect(result.verifiedCurrency).toBe("BDT");
    });

    test("successfully verifies payment when query fallback returns paymentId, trxId, and merchantInvoice aliases", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          id_token: "mock-valid-id-token",
        }),
      });

      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: "0000",
          statusMessage: "Successful",
          paymentId: "TR0011_TEST", // alias
          trxId: "BKASH_TRX_QUERY_ALL_ALIASES", // alias
          transactionStatus: "Completed",
          amount: "1490.50",
          currency: "BDT",
          merchantInvoice: "VL-20261013-TEST01", // alias
        }),
      });

      const result = await provider.verifyPayment({
        paymentID: "TR0011_TEST",
        status: "success",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.providerTransactionId).toBe("BKASH_TRX_QUERY_ALL_ALIASES");
      expect(result.verifiedMerchantReferenceId).toBe("TR0011_TEST");
      expect(result.verifiedOrderNumber).toBe("VL-20261013-TEST01");
      expect(result.verifiedAmount).toBe(1490.50);
      expect(result.verifiedCurrency).toBe("BDT");
    });
  });
});
