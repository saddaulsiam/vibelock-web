/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";
import {
  validateRsaKeyMaterial,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  generateChallenge,
  formatNagadDateTime,
} from "@/lib/payment/providers/nagad/crypto";
import { NagadProvider } from "@/lib/payment/providers/nagad/client";
import { PaymentInitiationRequest } from "@/lib/payment/types";

// Synthetic 2048-bit test keys generated in-memory for local testing
const testMerchantKeys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const testNagadKeys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    NAGAD_MERCHANT_ID: "6800000025",
    NAGAD_MERCHANT_NUMBER: "01711111111",
    NAGAD_PG_PUBLIC_KEY: "",
    NAGAD_MERCHANT_PRIVATE_KEY: "",
    NAGAD_SANDBOX: true,
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

describe("Nagad Sandbox Smoke Test (Local Mocked & Diagnostic Validation)", () => {
  describe("1. Key Material Validation & Diagnostics", () => {
    test("validates full 2048-bit RSA keys correctly", () => {
      const pubResult = validateRsaKeyMaterial(testNagadKeys.publicKey, "PUBLIC");
      expect(pubResult.isValid).toBe(true);
      expect(pubResult.type).toBe("RSA");
      expect(pubResult.modulusLength).toBe(2048);

      const privResult = validateRsaKeyMaterial(testMerchantKeys.privateKey, "PRIVATE");
      expect(privResult.isValid).toBe(true);
      expect(privResult.type).toBe("RSA");
      expect(privResult.modulusLength).toBe(2048);
    });

    test("detects and rejects truncated key material safely without leaking content", () => {
      // Simulate truncated key string (e.g. 139 chars)
      const truncatedPriv =
        "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7V9K07eS" +
        "hP6t0KjF/77Y9x6QkQ7n6lPqZ0W8v8u8m8k7oI15l";
      const resultPriv = validateRsaKeyMaterial(truncatedPriv, "PRIVATE");
      expect(resultPriv.isValid).toBe(false);
      expect(resultPriv.error).toBeDefined();

      const truncatedPub = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9fzj";
      const resultPub = validateRsaKeyMaterial(truncatedPub, "PUBLIC");
      expect(resultPub.isValid).toBe(false);
      expect(resultPub.error).toBeDefined();
    });

    test("rejects empty or whitespace keys", () => {
      expect(validateRsaKeyMaterial("", "PUBLIC").isValid).toBe(false);
      expect(validateRsaKeyMaterial("   ", "PRIVATE").isValid).toBe(false);
      expect(validateRsaKeyMaterial(null as any, "PUBLIC").isValid).toBe(false);
    });

    test("rejects non-2048-bit RSA keys when 2048-bit modulus is required", () => {
      const keys1024 = crypto.generateKeyPairSync("rsa", {
        modulusLength: 1024,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      const pub1024Result = validateRsaKeyMaterial(keys1024.publicKey, "PUBLIC", 2048);
      expect(pub1024Result.isValid).toBe(false);
      expect(pub1024Result.error).toContain("does not match required 2048 bits");

      const priv1024Result = validateRsaKeyMaterial(keys1024.privateKey, "PRIVATE", 2048);
      expect(priv1024Result.isValid).toBe(false);
      expect(priv1024Result.error).toContain("does not match required 2048 bits");
    });
  });

  describe("2. Cryptographic Roundtrip & Payload Formatting", () => {
    test("encrypts and decrypts payload with single-block RSA PKCS#1 v1.5", () => {
      const payload = JSON.stringify({
        merchantId: "6800000025",
        datetime: formatNagadDateTime(),
        orderId: "VL-20261013-DEMO01",
        challenge: generateChallenge(),
      });

      const encrypted = encryptWithPublicKey(payload, testNagadKeys.publicKey);
      expect(typeof encrypted).toBe("string");
      expect(Buffer.from(encrypted, "base64").length).toBe(256);

      const decrypted = decryptWithPrivateKey(encrypted, testNagadKeys.privateKey);
      expect(decrypted).toBe(payload);
    });

    test("signs with merchant private key and verifies with merchant public key", () => {
      const payload = JSON.stringify({
        merchantId: "6800000025",
        orderId: "VL-20261013-DEMO01",
        currencyCode: "050",
        amount: "1500.00",
        challenge: generateChallenge(),
      });

      const sig = signWithPrivateKey(payload, testMerchantKeys.privateKey);
      expect(typeof sig).toBe("string");
      expect(verifyWithPublicKey(payload, sig, testMerchantKeys.publicKey)).toBe(true);
      expect(verifyWithPublicKey("tampered", sig, testMerchantKeys.publicKey)).toBe(false);
    });
  });

  describe("3. End-to-End Mocked Gateway Initiation & Verification Flow", () => {
    let provider: NagadProvider;
    const originalFetch = global.fetch;

    const sampleRequest: PaymentInitiationRequest = {
      orderId: "uuid-order-1",
      orderNumber: "VL-20261013-DEMO01",
      amount: 1500.0,
      customerName: "Smoke Tester",
      customerEmail: "smoke@vibelock.com",
      customerPhone: "01700000000",
      shippingStreet: "Road 1",
      shippingCity: "Dhaka",
      shippingZip: "1212",
      shippingCountry: "BD",
    };

    beforeEach(() => {
      mockEnv.NAGAD_MERCHANT_ID = "6800000025";
      mockEnv.NAGAD_PG_PUBLIC_KEY = testNagadKeys.publicKey;
      mockEnv.NAGAD_MERCHANT_PRIVATE_KEY = testMerchantKeys.privateKey;
      mockEnv.NAGAD_SANDBOX = true;

      global.fetch = vi.fn();
      provider = new NagadProvider();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    test("Step 1 & Step 2 Initiation with mocked Nagad server responses", async () => {
      const serverChallenge = generateChallenge();
      const step1Payload = JSON.stringify({
        paymentReferenceId: "NAGAD_REF_SMOKE_789",
        challenge: serverChallenge,
      });
      const step1Encrypted = encryptWithPublicKey(step1Payload, testMerchantKeys.publicKey);

      (global.fetch as any)
        // Step 1 response
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ sensitiveData: step1Encrypted }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        // Step 2 response
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              status: "Success",
              callBackUrl: "https://sandbox.mynagad.com/pay/session_token_smoke",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

      const res = await provider.initiatePayment(sampleRequest);
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toBe("https://sandbox.mynagad.com/pay/session_token_smoke");
      expect(res.merchantReferenceId).toBe("NAGAD_REF_SMOKE_789");
    });

    test("Step 3 Server-to-Server Verification with mocked verified transaction", async () => {
      (global.fetch as any).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            merchantId: "6800000025",
            orderId: "VL-20261013-DEMO01",
            paymentRefId: "NAGAD_REF_SMOKE_789",
            amount: "1500.00",
            clientMobileNo: "01700000000",
            status: "Success",
            statusCode: "000_0000_000",
            issuerPaymentRefNo: "NAGAD_TRX_999888",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const verification = await provider.verifyPayment({
        payment_ref_id: "NAGAD_REF_SMOKE_789",
      });

      expect(verification.success).toBe(true);
      expect(verification.status).toBe("SUCCESS");
      expect(verification.verifiedOrderNumber).toBe("VL-20261013-DEMO01");
      expect(verification.verifiedAmount).toBe(1500.0);
      expect(verification.verifiedCurrency).toBe("BDT");
      expect(verification.providerTransactionId).toBe("NAGAD_TRX_999888");
      expect(verification.isUnverified).toBeFalsy();
    });

    test("untrusted browser cancel payload keeps transaction unverified", async () => {
      const verification = await provider.verifyPayment({
        payment_ref_id: "NAGAD_REF_SMOKE_789",
        status: "Aborted",
      });

      expect(verification.success).toBe(false);
      expect(verification.status).toBe("CANCELLED");
      expect(verification.isUnverified).toBe(true);
      // No server query should be made for browser-reported cancellation
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("4. Security & Production Safeguards", () => {
    test("key validation error messages never expose secret material", () => {
      const secretMarker = "SUPER_SECRET_PRIVATE_KEY_BYTES_DO_NOT_PRINT";
      const result = validateRsaKeyMaterial(secretMarker, "PRIVATE");
      expect(result.isValid).toBe(false);
      expect(result.error).not.toContain(secretMarker);
    });

    test("unmocked outbound network requests are intercepted safely", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        throw new Error(`[SAFETY INTERCEPT] Blocked real network call to ${url}`);
      });
      global.fetch = mockFetch;

      const provider = new NagadProvider();
      const res = await provider.initiatePayment({
        orderId: "order-test",
        orderNumber: "VL-ORD-01",
        amount: 100,
        customerName: "Test",
        customerEmail: "test@example.com",
        customerPhone: "01700000000",
        shippingStreet: "Street",
        shippingCity: "City",
        shippingZip: "1200",
        shippingCountry: "BD",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
