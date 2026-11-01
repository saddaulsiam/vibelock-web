/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

// Generate test RSA keypairs for merchant and Nagad gateway
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
    NAGAD_MERCHANT_ID: "68300000025",
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

import {
  formatPemKey,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  generateChallenge,
  formatNagadDateTime,
} from "@/lib/payment/providers/nagad/crypto";
import { NagadProvider } from "@/lib/payment/providers/nagad/client";
import { PaymentInitiationRequest } from "@/lib/payment/types";

describe("Nagad Cryptography Helpers", () => {
  test("formatPemKey handles escaped newlines and missing headers", () => {
    const rawPublicBody = testNagadKeys.publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "");

    const formatted = formatPemKey(rawPublicBody, "PUBLIC");
    expect(formatted).toContain("-----BEGIN PUBLIC KEY-----");
    expect(formatted).toContain("-----END PUBLIC KEY-----");

    const withEscapedNewlines = testNagadKeys.publicKey.replace(/\n/g, "\\n");
    const formattedWithEscapes = formatPemKey(withEscapedNewlines, "PUBLIC");
    expect(formattedWithEscapes).toContain("\n");
  });

  test("encrypt and decrypt roundtrip matches plain text", () => {
    const samplePayload = JSON.stringify({
      orderId: "VL-ORD-999",
      amount: "1500.00",
      challenge: "abc123challenge",
    });

    const encrypted = encryptWithPublicKey(samplePayload, testNagadKeys.publicKey);
    expect(typeof encrypted).toBe("string");
    // 256 bytes in Base64 is 344 characters (excluding padding variance)
    expect(Buffer.from(encrypted, "base64").length).toBe(256);

    const decrypted = decryptWithPrivateKey(encrypted, testNagadKeys.privateKey);
    expect(decrypted).toBe(samplePayload);
  });

  test("encryptWithPublicKey strictly rejects plaintext exceeding 245 bytes for 2048-bit RSA key", () => {
    const oversizedPayload = "x".repeat(246);
    expect(() => encryptWithPublicKey(oversizedPayload, testNagadKeys.publicKey)).toThrow(
      /Plaintext size \(246 bytes\) exceeds maximum RSA block size of 245 bytes for 2048-bit key/
    );
  });

  test("encryptWithPublicKey and decryptWithPrivateKey succeed for maximum boundary 245-byte plaintext", () => {
    const boundaryPayload = "b".repeat(245);
    const encrypted = encryptWithPublicKey(boundaryPayload, testNagadKeys.publicKey);
    expect(Buffer.from(encrypted, "base64").length).toBe(256);

    const decrypted = decryptWithPrivateKey(encrypted, testNagadKeys.privateKey);
    expect(decrypted).toBe(boundaryPayload);
  });

  test("decryptWithPrivateKey strictly rejects ciphertext that is not exactly 256 bytes", () => {
    // Multi-chunk 512-byte concatenated ciphertext simulation
    const oversizedCiphertext = Buffer.alloc(512, 1).toString("base64");
    expect(() => decryptWithPrivateKey(oversizedCiphertext, testNagadKeys.privateKey)).toThrow(
      /does not match expected single-block RSA size of 256 bytes/
    );

    // Truncated ciphertext simulation
    const truncatedCiphertext = Buffer.alloc(128, 1).toString("base64");
    expect(() => decryptWithPrivateKey(truncatedCiphertext, testNagadKeys.privateKey)).toThrow(
      /does not match expected single-block RSA size of 256 bytes/
    );

    // Empty ciphertext
    expect(() => decryptWithPrivateKey("", testNagadKeys.privateKey)).toThrow(
      /Ciphertext cannot be empty/
    );
  });

  test("sign and verify roundtrip validates signature and detects tampering", () => {
    const sampleText = "MERCHANT_VERIFICATION_PAYLOAD";
    const signature = signWithPrivateKey(sampleText, testMerchantKeys.privateKey);

    expect(typeof signature).toBe("string");
    const isValid = verifyWithPublicKey(sampleText, signature, testMerchantKeys.publicKey);
    expect(isValid).toBe(true);

    const isTamperedValid = verifyWithPublicKey(
      "TAMPERED_PAYLOAD",
      signature,
      testMerchantKeys.publicKey
    );
    expect(isTamperedValid).toBe(false);
  });

  test("generateChallenge produces 40-character hex string", () => {
    const challenge = generateChallenge();
    expect(challenge).toMatch(/^[0-9a-f]{40}$/);
  });

  test("formatNagadDateTime formats timestamp to 14-character YYYYMMDDHHmmss", () => {
    const fixedDate = new Date("2026-10-13T15:30:45Z");
    const formatted = formatNagadDateTime(fixedDate);
    expect(formatted.length).toBe(14);
    expect(/^\d{14}$/.test(formatted)).toBe(true);
  });
});

describe("Nagad Provider Unit Tests", () => {
  let provider: NagadProvider;
  const originalFetch = global.fetch;

  const sampleRequest: PaymentInitiationRequest = {
    orderId: "order-uuid-123",
    orderNumber: "VL-20261013-NGD01",
    amount: 1490.5,
    customerName: "Siam Customer",
    customerEmail: "siam@vibelock.com",
    customerPhone: "01711111111",
    shippingStreet: "Gulshan 1",
    shippingCity: "Dhaka",
    shippingZip: "1212",
    shippingCountry: "BD",
  };

  beforeEach(() => {
    mockEnv.NAGAD_MERCHANT_ID = "68300000025";
    mockEnv.NAGAD_MERCHANT_NUMBER = "01711111111";
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

  test("initiatePayment fails closed when required credentials are missing", async () => {
    mockEnv.NAGAD_MERCHANT_ID = "";
    const res = await provider.initiatePayment(sampleRequest);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Nagad credentials not configured");
  });

  test("initiatePayment handles Step 1 HTTP errors", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response("Gateway unavailable", { status: 503 })
    );

    const res = await provider.initiatePayment(sampleRequest);
    expect(res.success).toBe(false);
    expect(res.error).toContain("HTTP 503");
  });

  test("initiatePayment handles Step 2 HTTP errors", async () => {
    // Mock Step 1 success
    const step1Decrypted = JSON.stringify({
      paymentReferenceId: "PRID_NAGAD_123456",
      challenge: "server_challenge_abc",
    });
    const step1Encrypted = encryptWithPublicKey(step1Decrypted, testMerchantKeys.publicKey);

    (global.fetch as any)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sensitiveData: step1Encrypted }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      // Mock Step 2 failure
      .mockResolvedValueOnce(new Response("Invalid complete request", { status: 400 }));

    const res = await provider.initiatePayment(sampleRequest);
    expect(res.success).toBe(false);
    expect(res.error).toContain("HTTP 400");
  });

  test("initiatePayment executes 2-step handshake and returns redirectUrl", async () => {
    const step1Decrypted = JSON.stringify({
      paymentReferenceId: "PRID_NAGAD_987654",
      challenge: "server_challenge_xyz",
    });
    const step1Encrypted = encryptWithPublicKey(step1Decrypted, testMerchantKeys.publicKey);

    (global.fetch as any)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sensitiveData: step1Encrypted }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "Success",
            callBackUrl:
              "https://api-sandbox.mynagad.com/remote-payment-gateway-1.0/index.php?paymentrefid=PRID_NAGAD_987654",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const res = await provider.initiatePayment(sampleRequest);
    expect(res.success).toBe(true);
    expect(res.merchantReferenceId).toBe("PRID_NAGAD_987654");
    expect(res.redirectUrl).toContain("remote-payment-gateway-1.0");
  });

  test("verifyPayment treats browser cancel callback as unverified", async () => {
    const res = await provider.verifyPayment({
      payment_ref_id: "PRID_NAGAD_CANCEL_1",
      status: "Aborted",
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe("CANCELLED");
    expect(res.isUnverified).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("verifyPayment treats browser failure callback as unverified", async () => {
    const res = await provider.verifyPayment({
      payment_ref_id: "PRID_NAGAD_FAIL_1",
      status: "Failed",
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.isUnverified).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("verifyPayment returns error when payment reference is missing", async () => {
    const res = await provider.verifyPayment({});
    expect(res.success).toBe(false);
    expect(res.isUnverified).toBe(true);
    expect(res.error).toContain("Missing payment reference");
  });

  test("verifyPayment queries server ledger and settles successfully upon verified success", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          merchantId: "68300000025",
          orderId: "VL-20261013-NGD01",
          paymentRefId: "PRID_NAGAD_SUCCESS_99",
          amount: "1490.50",
          status: "Success",
          statusCode: "000_0000",
          issuerPaymentRefNo: "TXN_NAGAD_99999",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await provider.verifyPayment({
      payment_ref_id: "PRID_NAGAD_SUCCESS_99",
      status: "Success",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("SUCCESS");
    expect(res.providerTransactionId).toBe("TXN_NAGAD_99999");
    expect(res.verifiedAmount).toBe(1490.5);
    expect(res.verifiedOrderNumber).toBe("VL-20261013-NGD01");
    expect(res.verifiedMerchantReferenceId).toBe("PRID_NAGAD_SUCCESS_99");
  });

  test("verifyPayment returns authoritative failure when server ledger marks payment failed", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          merchantId: "68300000025",
          orderId: "VL-20261013-NGD01",
          paymentRefId: "PRID_NAGAD_LEDGER_FAIL",
          amount: "1490.50",
          status: "Failed",
          message: "Insufficient funds in wallet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await provider.verifyPayment({
      payment_ref_id: "PRID_NAGAD_LEDGER_FAIL",
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.isUnverified).toBe(false);
  });
});
