import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    PAYSTATION_MERCHANT_ID: "test_merchant_id_123",
    PAYSTATION_PASSWORD: "test_password_456",
    PAYSTATION_SANDBOX: true,
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

import { PaystationProvider } from "@/lib/payment/providers/paystation/client";
import { PaymentInitiationRequest } from "@/lib/payment/types";
import {
  PAYMENT_GATEWAY,
  isPaystationGateway,
  normalizePaymentGateway,
} from "@/lib/payment/constants";
import { getHumanGatewayName } from "@/lib/payment/format";
import { formatPaymentGatewayLabel } from "@/components/shared/payment-gateway-badge";
import { isPaystationCredentialConfigured } from "@/lib/settings/payment-settings";

describe("PayStation Payment Gateway Unit Tests", () => {
  let provider: PaystationProvider;
  const originalFetch = global.fetch;

  const sampleRequest: PaymentInitiationRequest = {
    orderId: "order-uuid-123",
    orderNumber: "VL-20261121-001",
    amount: 1500,
    customerName: "Siam Sadman",
    customerEmail: "siam@vibelock.com",
    customerPhone: "01711223344",
    shippingStreet: "House 10, Road 5",
    shippingCity: "Dhaka",
    shippingZip: "1212",
    shippingCountry: "BD",
  };

  beforeEach(() => {
    mockEnv.PAYSTATION_MERCHANT_ID = "test_merchant_id_123";
    mockEnv.PAYSTATION_PASSWORD = "test_password_456";
    mockEnv.PAYSTATION_SANDBOX = true;

    global.fetch = vi.fn();
    provider = new PaystationProvider();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Environment & Base URL Resolution", () => {
    test("resolves sandbox base URL when PAYSTATION_SANDBOX is true", () => {
      expect(provider.baseUrl).toBe("https://sandbox.paystation.com.bd");
    });

    test("resolves production base URL when PAYSTATION_SANDBOX is false", () => {
      mockEnv.PAYSTATION_SANDBOX = false;
      const liveProvider = new PaystationProvider();
      expect(liveProvider.baseUrl).toBe("https://api.paystation.com.bd");
    });
  });

  describe("2. Payment Initiation (POST /initiate-payment)", () => {
    test("successfully initiates payment and validates response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "Success",
          payment_url: "https://sandbox.paystation.com.bd/checkout/token123",
          message: "Payment Initiated",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBe("https://sandbox.paystation.com.bd/checkout/token123");
      expect(result.merchantReferenceId).toMatch(/^PS-VL-20261121-001-\d+$/);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [fetchUrl, fetchOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchUrl).toBe("https://sandbox.paystation.com.bd/initiate-payment");
      expect(fetchOptions.method).toBe("POST");
      expect(fetchOptions.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

      const params = new URLSearchParams(fetchOptions.body);
      expect(params.get("merchantId")).toBe("test_merchant_id_123");
      expect(params.get("password")).toBe("test_password_456");
      expect(params.get("payment_amount")).toBe("1500");
      expect(params.get("currency")).toBe("BDT");
      expect(params.get("pay_with_charge")).toBe("0");
      expect(params.get("cust_name")).toBe("Siam Sadman");
      expect(params.get("cust_phone")).toBe("01711223344");
      expect(params.get("cust_email")).toBe("siam@vibelock.com");
      expect(params.get("callback_url")).toBe(
        "https://vibelock.bd/api/payments/paystation/callback"
      );
      expect(params.get("reference")).toBe("VL-20261121-001");
    });

    test("fails initiation when credentials are missing", async () => {
      mockEnv.PAYSTATION_MERCHANT_ID = undefined as unknown as string;
      const noCredProvider = new PaystationProvider();

      const result = await noCredProvider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("configuration missing");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("rejects fractional amounts safely without silent rounding", async () => {
      const fractionalRequest = { ...sampleRequest, amount: 1500.5 };
      const result = await provider.initiatePayment(fractionalRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain("integer amount");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("rejects zero or negative amounts", async () => {
      const zeroRequest = { ...sampleRequest, amount: 0 };
      const result = await provider.initiatePayment(zeroRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain("integer amount");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("handles non-200 HTTP response from initiation API", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("HTTP 502");
    });

    test("handles gateway error status_code (e.g. duplicate invoice or credential error)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "1008",
          status: "failed",
          message: "Duplicate Invoice Number",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Duplicate Invoice Number");
    });

    test("rejects initiation when payment_url is missing from response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "Success",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("missing payment_url");
    });

    test("rejects non-HTTPS payment_url", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "Success",
          payment_url: "http://sandbox.paystation.com.bd/checkout/token123",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Insecure payment URL");
    });

    test("rejects untrusted payment_url domain to prevent open redirect tampering", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "Success",
          payment_url: "https://malicious-phishing-site.com/checkout",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Untrusted payment URL host");
    });

    test("rejects initiation when returned invoice_number mismatches requested invoice", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "Success",
          payment_url: "https://sandbox.paystation.com.bd/checkout/token123",
          invoice_number: "MISMATCHED-INVOICE-999",
        }),
      });

      const result = await provider.initiatePayment(sampleRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invoice number mismatch");
    });
  });

  describe("3. Transaction Verification (POST /transaction-status)", () => {
    test("successfully verifies payment status server-to-server", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          message: "Transaction found",
          data: {
            invoice_number: "PS-VL-20261121-001-12345",
            trx_status: "Success",
            trx_id: "TRX_PS_998877",
            payment_amount: 1500,
            payment_method: "bKash",
            reference: "VL-20261121-001",
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-VL-20261121-001-12345",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("SUCCESS");
      expect(result.providerTransactionId).toBe("TRX_PS_998877");
      expect(result.verifiedMerchantReferenceId).toBe("PS-VL-20261121-001-12345");
      expect(result.verifiedAmount).toBe(1500);
      expect(result.verifiedCurrency).toBe("BDT");

      const [fetchUrl, fetchOptions] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchUrl).toBe("https://sandbox.paystation.com.bd/transaction-status");
      expect(fetchOptions.headers["merchantId"]).toBe("test_merchant_id_123");
      const body = new URLSearchParams(fetchOptions.body);
      expect(body.get("invoice_number")).toBe("PS-VL-20261121-001-12345");
    });

    test("fails verification when credentials are missing", async () => {
      mockEnv.PAYSTATION_MERCHANT_ID = undefined as unknown as string;
      const noCredProvider = new PaystationProvider();

      const result = await noCredProvider.verifyPayment({
        invoice_number: "PS-INV-123",
      });

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("configuration missing");
    });

    test("fails verification when invoice_number is missing in payload", async () => {
      const result = await provider.verifyPayment({});

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.error).toContain("Missing invoice_number");
    });

    test("handles failed transaction status correctly", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-FAIL",
            trx_status: "Failed",
            trx_id: "TRX_FAIL_123",
            payment_amount: 1500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-FAIL",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.providerTransactionId).toBe("TRX_FAIL_123");
    });

    test("handles cancelled transaction status correctly", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-CANCEL",
            trx_status: "Cancelled",
            trx_id: "TRX_CANCEL_123",
            payment_amount: 1500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-CANCEL",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("CANCELLED");
    });

    test("handles in-flight processing status as PENDING without premature failure", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-PROCESSING",
            trx_status: "Processing",
            payment_amount: 1500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-PROCESSING",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("PENDING");
      expect(result.isUnverified).toBe(true);
      expect(result.isRetryable).toBe(true);
    });

    test("handles transaction status 500 error with isUnverified and isRetryable=true without tampering alert", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-ERR",
      });

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.isRetryable).toBe(true);
      expect(result.error).toContain("HTTP 500");
    });

    test("handles transaction status timeout network error with isRetryable=true", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("The operation was aborted due to timeout")
      );

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-TIMEOUT",
      });

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.isRetryable).toBe(true);
      expect(result.error).toContain("timeout");
    });

    test("handles transaction status 400 client error with isRetryable=false", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-400",
      });

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.error).toContain("HTTP 400");
    });

    test("handles explicit cancellation callback with isUnverified=false and status=CANCELLED", async () => {
      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-CANCEL",
        status: "cancel",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("CANCELLED");
      expect(result.isUnverified).toBe(false);
      expect(result.error).toContain("Customer cancelled payment");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("handles explicit cancelled status in callbackPayload with isUnverified=false", async () => {
      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-CANCEL",
        trx_status: "cancelled",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("CANCELLED");
      expect(result.isUnverified).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("recognizes all cancellation variants: cancel, canceled, cancelled, aborted", async () => {
      const variants = ["cancel", "canceled", "cancelled", "aborted", "Canceled", "Cancelled"];
      for (const variant of variants) {
        const result = await provider.verifyPayment({
          invoice_number: "PS-INV-CANCEL-VAR",
          status: variant,
        });

        expect(result.success).toBe(false);
        expect(result.status).toBe("CANCELLED");
        expect(result.isUnverified).toBe(false);
        expect(result.error).toContain("Customer cancelled payment");
      }
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("normalizes empty string trx_id to undefined", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-EMPTY-TRX",
            trx_status: "Failed",
            trx_id: "",
            payment_amount: 1500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-EMPTY-TRX",
        trx_id: "",
      });

      expect(result.status).toBe("FAILED");
      expect(result.providerTransactionId).toBeUndefined();
    });

    test("normalizes whitespace-only trx_id to undefined", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-WS-TRX",
            trx_status: "Failed",
            trx_id: "    ",
            payment_amount: 1500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-WS-TRX",
        trx_id: "   ",
      });

      expect(result.status).toBe("FAILED");
      expect(result.providerTransactionId).toBeUndefined();
    });

    test("does not treat status=Failed with Invalid Security Signature as client-side cancel; queries server-to-server", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "200",
          status: "success",
          data: {
            invoice_number: "PS-INV-SIG-FAIL",
            trx_status: "Failed",
            trx_id: "",
            payment_amount: 2500,
          },
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-SIG-FAIL",
        status: "Failed",
        message: "Invalid Security Signature",
        trx_id: "",
      });

      // Must have queried transaction-status
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("FAILED");
      expect(result.isUnverified).toBe(false);
      expect(result.providerTransactionId).toBeUndefined();
    });

    test("preserves safe unverified PENDING state when transaction-status rejects with error for invalid signature", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status_code: "1004",
          status: "failed",
          message: "Invalid Security Signature",
        }),
      });

      const result = await provider.verifyPayment({
        invoice_number: "PS-INV-SIG-REJECT",
        status: "Failed",
        message: "Invalid Security Signature",
        trx_id: "",
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("PENDING");
      expect(result.isUnverified).toBe(true);
      expect(result.providerTransactionId).toBeUndefined();
    });
  });

  describe("4. Constants & Gateway Normalization", () => {
    test("identifies PAYSTATION gateway constant correctly", () => {
      expect(PAYMENT_GATEWAY.PAYSTATION).toBe("PAYSTATION");
      expect(isPaystationGateway("PAYSTATION")).toBe(true);
      expect(isPaystationGateway("paystation")).toBe(true);
      expect(isPaystationGateway("  PAYSTATION  ")).toBe(true);
      expect(isPaystationGateway("SSLCOMMERZ")).toBe(false);
      expect(isPaystationGateway(null)).toBe(false);
    });

    test("normalizes gateway string to canonical PAYSTATION", () => {
      expect(normalizePaymentGateway("paystation")).toBe("PAYSTATION");
      expect(normalizePaymentGateway("PAYSTATION")).toBe("PAYSTATION");
    });

    test("formats human-readable name for PayStation", () => {
      expect(getHumanGatewayName("PAYSTATION")).toBe("PayStation");
    });

    test("formats badge label and icon for PayStation", () => {
      const badge = formatPaymentGatewayLabel("PAYSTATION");
      expect(badge.label).toBe("PayStation");
      expect(badge.icon).toBe("CARD");
    });
  });

  describe("5. Credential Enforcement", () => {
    test("isPaystationCredentialConfigured returns true when both credentials present", () => {
      expect(isPaystationCredentialConfigured()).toBe(true);
    });

    test("isPaystationCredentialConfigured returns false when credentials are empty whitespace", () => {
      mockEnv.PAYSTATION_MERCHANT_ID = "   ";
      expect(isPaystationCredentialConfigured()).toBe(false);
    });

    test("isPaystationCredentialConfigured returns false when credentials are undefined", () => {
      mockEnv.PAYSTATION_MERCHANT_ID = undefined as unknown as string;
      expect(isPaystationCredentialConfigured()).toBe(false);
    });
  });
});
