/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma/client";
import { sendOtp } from "@/lib/sms/client";
import { sendPhoneOtpAction } from "@/app/actions/auth";
import { sendOrderConfirmationEmail } from "@/lib/email/order-emails";
import {
  logSecurityAlert,
  APPROVED_SECURITY_EVENTS,
  APPROVED_METADATA_KEYS,
} from "@/lib/monitoring/security-logger";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return {
    ...actual,
    checkOtpSendRateLimit: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Phase 12.4.4: External Services & Operations", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // 1. SMS OTP Honest Failure & Provider Degradation
  // =========================================================================
  describe("1. SMS OTP Honest Failure & Provider Degradation", () => {
    it("fails honestly in production when SMS_API_KEY is unconfigured", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.SMS_API_KEY;

      const deleteManySpy = vi.spyOn(prisma.verificationToken, "deleteMany");
      const createSpy = vi.spyOn(prisma.verificationToken, "create");

      const result = await sendOtp("01712345678");

      expect(result.success).toBe(false);
      expect(result.error).toContain("SMS service is temporarily unavailable");
      expect(result.devOtp).toBeUndefined();

      // Must not create unreachable tokens in database
      expect(deleteManySpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("fails honestly when SMS gateway returns error in production", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.SMS_API_KEY = "test-sms-key";
      process.env.SMS_API_URL = "https://mock-sms.local";

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as any);

      const deleteManySpy = vi.spyOn(prisma.verificationToken, "deleteMany").mockResolvedValue({ count: 1 });
      const createSpy = vi.spyOn(prisma.verificationToken, "create").mockResolvedValue({} as any);

      const result = await sendOtp("01712345678");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to deliver SMS verification code");
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(deleteManySpy).toHaveBeenCalledTimes(2);
      expect(deleteManySpy).toHaveBeenLastCalledWith({
        where: {
          identifier: "phone_otp:01712345678",
          token: expect.any(String),
        },
      });
    });

    it("preserves concurrent newer OTP token when an earlier request's SMS dispatch fails", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.SMS_API_KEY = "test-sms-key";
      process.env.SMS_API_URL = "https://mock-sms.local";

      const phone = "01712345678";
      const identifier = `phone_otp:${phone}`;

      // In-memory simulation of the VerificationToken table
      const tokenStore = new Map<string, { identifier: string; token: string; expires: Date }>();

      vi.spyOn(prisma.verificationToken, "deleteMany").mockImplementation(((args?: any) => {
        let count = 0;
        if (args?.where) {
          for (const [key, item] of Array.from(tokenStore.entries())) {
            const matchesId = !args.where.identifier || item.identifier === args.where.identifier;
            const matchesToken = !args.where.token || item.token === args.where.token;
            if (matchesId && matchesToken) {
              tokenStore.delete(key);
              count++;
            }
          }
        }
        return Promise.resolve({ count });
      }) as any);

      vi.spyOn(prisma.verificationToken, "create").mockImplementation(((args: any) => {
        const item = args.data;
        tokenStore.set(`${item.identifier}:${item.token}`, item);
        return Promise.resolve(item);
      }) as any);

      // Controlled dispatch promises for Request A and Request B
      let rejectRequestAFetch!: (reason?: any) => void;
      const requestAFetchPromise = new Promise<Response>((_, reject) => {
        rejectRequestAFetch = reject;
      });

      let fetchCallCount = 0;
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          // Request A dispatch hangs until rejected
          return requestAFetchPromise;
        } else {
          // Request B dispatch succeeds immediately
          return { ok: true, status: 200 } as any;
        }
      });

      // 1. Request A starts, generates token A in DB, and enters SMS gateway dispatch
      const requestAPromise = sendOtp(phone);
      await new Promise((resolve) => setTimeout(resolve, 15));

      expect(tokenStore.size).toBe(1);
      const tokenA = Array.from(tokenStore.values())[0];

      // 2. Request B starts for the same phone, creates token B, and its SMS succeeds
      const resultB = await sendOtp(phone);
      expect(resultB.success).toBe(true);

      // Verify Token B is now in DB
      expect(tokenStore.size).toBe(1);
      const tokenB = Array.from(tokenStore.values())[0];
      expect(tokenB.token).not.toBe(tokenA.token);

      // 3 & 4. Request A's SMS dispatch fails and Request A executes rollback
      rejectRequestAFetch(new Error("Network timeout contacting SMS gateway"));
      const resultA = await requestAPromise;

      expect(resultA.success).toBe(false);
      expect(resultA.error).toContain("Failed to deliver SMS verification code");

      // 5. Verify Request B's token is STILL in the database and valid
      expect(tokenStore.size).toBe(1);
      const preservedToken = Array.from(tokenStore.values())[0];
      expect(preservedToken.token).toBe(tokenB.token);
      expect(preservedToken.identifier).toBe(identifier);
    });

    it("stores token and returns success in production only when SMS dispatch succeeds", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.SMS_API_KEY = "test-sms-key";
      process.env.SMS_API_URL = "https://mock-sms.local";

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as any);

      const deleteManySpy = vi.spyOn(prisma.verificationToken, "deleteMany").mockResolvedValue({ count: 1 });
      const createSpy = vi.spyOn(prisma.verificationToken, "create").mockResolvedValue({} as any);

      const result = await sendOtp("01712345678");

      expect(result.success).toBe(true);
      expect(result.devOtp).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalled();
      expect(deleteManySpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
    });

    it("returns devOtp in development mode", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";

      vi.spyOn(prisma.verificationToken, "deleteMany").mockResolvedValue({ count: 0 });
      vi.spyOn(prisma.verificationToken, "create").mockResolvedValue({} as any);

      const result = await sendOtp("01712345678");

      expect(result.success).toBe(true);
      expect(typeof result.devOtp).toBe("string");
      expect(result.devOtp).toHaveLength(6);
    });

    it("sendPhoneOtpAction propagates clear operational error when provider is unconfigured in production", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.SMS_API_KEY;

      const res = await sendPhoneOtpAction({ phone: "01712345678" });

      expect(res.error).toBeDefined();
      expect(res.error).toContain("SMS service is temporarily unavailable");
      expect(res.success).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Email PII Masking in Order Emails
  // =========================================================================
  describe("2. Email PII Masking in Order Email Logs", () => {
    it("never logs raw customer email address when sending order confirmation email", async () => {
      const rawEmail = "customer.secret.test@example.com";
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const orderData = {
        orderNumber: "VL-20261121-TEST01",
        customerName: "Jane Doe",
        customerEmail: rawEmail,
        items: [
          {
            productName: "Signature Heavyweight Tee",
            size: "L",
            color: "Obsidian Black",
            quantity: 1,
            unitPrice: 2200,
            lineTotal: 2200,
          },
        ],
        subtotal: 2200,
        shippingCost: 80,
        discount: 0,
        total: 2280,
        paymentMethod: "COD",
        shippingAddress: {
          street: "123 Test Street",
          city: "Dhaka",
          state: "Dhaka",
          zip: "1212",
          country: "Bangladesh",
        },
      };

      await sendOrderConfirmationEmail(orderData);

      // Verify that the unmasked raw email NEVER appeared in any console stream
      const allLogCalls = [
        ...consoleLogSpy.mock.calls.map((c) => c.join(" ")),
        ...consoleWarnSpy.mock.calls.map((c) => c.join(" ")),
        ...consoleErrorSpy.mock.calls.map((c) => c.join(" ")),
      ];

      for (const logLine of allLogCalls) {
        expect(logLine).not.toContain(rawEmail);
      }

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. Operational Sentry Alerts
  // =========================================================================
  describe("3. Operational Sentry Alerting & Contract", () => {
    it("includes all Phase 12.4.4 operational event types in APPROVED_SECURITY_EVENTS", () => {
      const expectedEvents = [
        "EMAIL_DELIVERY_FAILED",
        "COURIER_DISPATCH_FAILED",
        "COURIER_WEBHOOK_REJECTED",
        "CRON_EXECUTION_FAILED",
        "CHECKOUT_ORDER_CREATION_FAILED",
      ];

      for (const evt of expectedEvents) {
        expect(APPROVED_SECURITY_EVENTS).toContain(evt);
      }
    });

    it("includes operational metadata keys in APPROVED_METADATA_KEYS", () => {
      expect(APPROVED_METADATA_KEYS.has("provider")).toBe(true);
      expect(APPROVED_METADATA_KEYS.has("jobName")).toBe(true);
      expect(APPROVED_METADATA_KEYS.has("errorCode")).toBe(true);
    });

    it("dispatches Sentry message and structured log for EMAIL_DELIVERY_FAILED without leaking raw PII", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      logSecurityAlert("EMAIL_DELIVERY_FAILED", {
        endpoint: "sendOrderConfirmationEmail",
        emailHash: "a1b2c3d4e5f67890",
        orderHash: "f0e1d2c3b4a59687",
        provider: "resend",
        reason: "domain_unverified",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] EMAIL_DELIVERY_FAILED",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            security_event: "EMAIL_DELIVERY_FAILED",
          }),
        })
      );

      expect(consoleWarnSpy).toHaveBeenCalled();
      const emittedLog = consoleWarnSpy.mock.calls[0][0];
      expect(emittedLog).toContain("[SECURITY_ALERT]");
      expect(emittedLog).toContain("EMAIL_DELIVERY_FAILED");
      expect(emittedLog).toContain("domain_unverified");

      consoleWarnSpy.mockRestore();
    });

    it("dispatches Sentry message for COURIER_WEBHOOK_REJECTED with masked IP", () => {
      logSecurityAlert("COURIER_WEBHOOK_REJECTED", {
        endpoint: "shipping/webhook/steadfast",
        gateway: "steadfast",
        reason: "unauthorized_signature",
        ipMasked: "103.205.***.***",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] COURIER_WEBHOOK_REJECTED",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            security_event: "COURIER_WEBHOOK_REJECTED",
          }),
        })
      );
    });

    it("dispatches Sentry message for CRON_EXECUTION_FAILED", () => {
      logSecurityAlert("CRON_EXECUTION_FAILED", {
        endpoint: "/api/cron/orders/cleanup",
        jobName: "cleanupExpiredOrders",
        reason: "database_timeout",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] CRON_EXECUTION_FAILED",
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({
            security_event: "CRON_EXECUTION_FAILED",
          }),
        })
      );
    });
  });
});
