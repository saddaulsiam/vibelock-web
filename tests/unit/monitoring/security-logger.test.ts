import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";

const TEST_AUTH_SECRET = "mock-secret-for-testing-at-least-32-chars-long";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    AUTH_GOOGLE_ID: "mock-google-id",
    AUTH_GOOGLE_SECRET: "mock-google-secret",
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

import {
  logSecurityAlert,
  hashSecurityIdentifier,
  maskIpAddress,
  sanitizeSecurityMetadata,
  APPROVED_SECURITY_EVENTS,
  type SecurityEventName,
} from "@/lib/monitoring/security-logger";

describe("Security Event Logger (SEC-12-04 & HMAC Pseudonymization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashSecurityIdentifier (HMAC-SHA256)", () => {
    it("generates deterministic 16-char HMAC-SHA256 hex pseudonym", () => {
      const hash1 = hashSecurityIdentifier("01712345678");
      const hash2 = hashSecurityIdentifier("01712345678");
      expect(hash1).toHaveLength(16);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{16}$/.test(hash1)).toBe(true);
    });

    it("produces identical keys for identical normalized numbers regardless of casing or whitespace", () => {
      const standard = hashSecurityIdentifier("01712345678");
      const withSpaces = hashSecurityIdentifier("  01712345678  ");
      expect(standard).toBe(withSpaces);

      const emailStandard = hashSecurityIdentifier("admin@vibelock.bd");
      const emailMixedCase = hashSecurityIdentifier("  ADMIN@VibeLock.BD  ");
      expect(emailStandard).toBe(emailMixedCase);
    });

    it("produces distinct keys for different phone numbers (no collision)", () => {
      const phoneA = hashSecurityIdentifier("01711111111");
      const phoneB = hashSecurityIdentifier("01722222222");
      const phoneC = hashSecurityIdentifier("01811111111");

      expect(phoneA).not.toBe(phoneB);
      expect(phoneA).not.toBe(phoneC);
      expect(phoneB).not.toBe(phoneC);
    });

    it("defeats rainbow-table / dictionary enumeration by using HMAC instead of plain SHA-256", () => {
      const rawPhone = "01712345678";
      const plainSha256 = crypto.createHash("sha256").update(rawPhone).digest("hex").slice(0, 16);
      const hmacPseudonym = hashSecurityIdentifier(rawPhone);

      // The pseudonym MUST NOT match an unkeyed SHA-256 hash
      expect(hmacPseudonym).not.toBe(plainSha256);

      // Must exactly match HMAC-SHA256 keyed with AUTH_SECRET
      const expectedHmac = crypto
        .createHmac("sha256", TEST_AUTH_SECRET)
        .update(rawPhone)
        .digest("hex")
        .slice(0, 16);
      expect(hmacPseudonym).toBe(expectedHmac);
    });

    it("never logs or exposes the HMAC secret in the hash output", () => {
      const pseudonym = hashSecurityIdentifier("01712345678");
      expect(pseudonym).not.toContain(TEST_AUTH_SECRET);
      expect(TEST_AUTH_SECRET).not.toContain(pseudonym);
    });

    it("safely handles null, undefined, empty, and non-string inputs", () => {
      expect(hashSecurityIdentifier("")).toBe("anonymous");
      expect(hashSecurityIdentifier(null)).toBe("anonymous");
      expect(hashSecurityIdentifier(undefined)).toBe("anonymous");
      expect(hashSecurityIdentifier(12345 as unknown as string)).toBe("anonymous");
    });
  });

  describe("maskIpAddress", () => {
    it("masks last two octets of IPv4 addresses", () => {
      expect(maskIpAddress("103.1.2.3")).toBe("103.1.***.***");
      expect(maskIpAddress("192.168.100.55")).toBe("192.168.***.***");
    });

    it("masks lower sections of IPv6 addresses", () => {
      expect(maskIpAddress("2001:db8:85a3::8a2e:370:7334")).toBe("2001:db8:****:****");
    });

    it("handles invalid or missing IPs safely", () => {
      expect(maskIpAddress(null)).toBe("unknown");
      expect(maskIpAddress("")).toBe("unknown");
      expect(maskIpAddress(undefined)).toBe("unknown");
      expect(maskIpAddress("invalid")).toBe("masked_ip");
    });
  });

  describe("sanitizeSecurityMetadata", () => {
    it("preserves explicitly approved metadata keys and scalar values", () => {
      const input = {
        endpoint: "loginCompound",
        attemptCount: 5,
        windowSeconds: 300,
        role: "ADMIN",
        reason: "rate_limit_exceeded",
        phoneHash: "1234567890abcdef",
        emailHash: "abcdef1234567890",
        ipMasked: "103.1.***.***",
        status: "BLOCKED",
      };

      const result = sanitizeSecurityMetadata(input);
      expect(result).toEqual(input);
    });

    it("strips unapproved keys and prohibited patterns", () => {
      const input = {
        endpoint: "loginCompound",
        unapprovedKey: "malicious_data",
        password: "secret_password",
        secretToken: "xyz",
        sessionCookie: "session_123",
        authToken: "Bearer 123",
        cardDetails: "4111-2222",
        cvv: "123",
      };

      const result = sanitizeSecurityMetadata(input as unknown as Record<string, unknown>);
      expect(result).toEqual({ endpoint: "loginCompound" });
      expect((result as Record<string, unknown>).unapprovedKey).toBeUndefined();
      expect((result as Record<string, unknown>).password).toBeUndefined();
      expect((result as Record<string, unknown>).secretToken).toBeUndefined();
    });

    it("redacts raw emails and raw Bangladeshi phone numbers in string values", () => {
      const input = {
        endpoint: "credentials",
        reason: "Failed for admin@vibelock.bd and phone 01712345678",
      };

      const result = sanitizeSecurityMetadata(input);
      expect(result.reason).toBe("[REDACTED_PII]");
    });

    it("hashes raw emails or phones using HMAC if mistakenly passed into phoneHash or emailHash", () => {
      const rawPhone = "01712345678";
      const rawEmail = "admin@vibelock.bd";
      const input = {
        emailHash: rawEmail,
        phoneHash: rawPhone,
      };

      const result = sanitizeSecurityMetadata(input);
      expect(result.emailHash).not.toContain("@");
      expect(result.emailHash).toBe(hashSecurityIdentifier(rawEmail));
      expect(result.phoneHash).not.toBe(rawPhone);
      expect(result.phoneHash).toBe(hashSecurityIdentifier(rawPhone));
    });

    it("rejects non-scalar or non-finite numbers", () => {
      const input = {
        endpoint: "login",
        attemptCount: Infinity,
        windowSeconds: NaN,
      };

      const result = sanitizeSecurityMetadata(input);
      expect(result.attemptCount).toBeUndefined();
      expect(result.windowSeconds).toBeUndefined();
    });
  });

  describe("logSecurityAlert", () => {
    it("dispatches approved security events to Sentry with tags and security context", () => {
      logSecurityAlert("AUTH_ADMIN_LOGIN_FAILED", {
        role: "ADMIN",
        reason: "invalid_credentials",
        emailHash: "abcdef1234567890",
        endpoint: "credentials",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "[SECURITY_ALERT] AUTH_ADMIN_LOGIN_FAILED",
        expect.objectContaining({
          level: "warning",
          tags: {
            security_event: "AUTH_ADMIN_LOGIN_FAILED",
            event_type: "security",
          },
          contexts: {
            security: {
              role: "ADMIN",
              reason: "invalid_credentials",
              emailHash: "abcdef1234567890",
              endpoint: "credentials",
            },
          },
        })
      );
    });

    it("rejects unapproved event names and does not call Sentry", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      logSecurityAlert("UNAPPROVED_EVENT" as SecurityEventName, {
        role: "ADMIN",
      });

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("SECURITY_LOGGER_REJECTED"));
      warnSpy.mockRestore();
    });

    it("covers all approved security events in allowlist", () => {
      for (const eventName of APPROVED_SECURITY_EVENTS) {
        logSecurityAlert(eventName, { endpoint: "test" });
      }
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(APPROVED_SECURITY_EVENTS.length);
    });

    it("never throws even if Sentry.captureMessage throws an exception (fail-safe)", () => {
      vi.mocked(Sentry.captureMessage).mockImplementationOnce(() => {
        throw new Error("Sentry transport failure");
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => {
        logSecurityAlert("AUTH_RATE_LIMIT_EXCEEDED", {
          endpoint: "loginCompound",
        });
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("SECURITY_LOGGER_DISPATCH_ERROR"));
      warnSpy.mockRestore();
    });
  });
});
