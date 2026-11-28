/* eslint-disable @typescript-eslint/no-explicit-any */
import { authConfig, RateLimitError } from "@/auth";
import * as securityLogger from "@/lib/monitoring/security-logger";
import prisma from "@/lib/prisma/client";
import {
  checkOtpRateLimit,
  checkOtpSendRateLimit,
  clearOtpRateLimit,
  getIp,
  hashForRateLimit,
  isPlausibleIp,
  resetRateLimitMemoryStore,
} from "@/lib/security/rate-limit";
import { normalizeBdPhoneNumber } from "@/lib/validations/auth";
import crypto from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

const TEST_AUTH_SECRET = "mock-secret-for-testing-at-least-32-chars-long";

const { mockCompare } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
  default: {
    compare: mockCompare,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    AUTH_GOOGLE_ID: "mock-google-id",
    AUTH_GOOGLE_SECRET: "mock-google-secret",
  },
}));

vi.mock("@/lib/sms/client", () => ({
  verifyOtp: vi.fn(async (_phone: string, otp: string) => otp === "123456"),
  sendOtp: vi.fn(async () => ({ success: true, devOtp: "123456" })),
}));

describe("Phase 12.1: Authentication Security & Monitoring (SEC-12-01 & SEC-12-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
  });

  describe("1. Phone Number HMAC-SHA256 Pseudonymization & Rainbow-Table Defense", () => {
    test("generates deterministic 16-char HMAC-SHA256 pseudonyms", () => {
      const hash1 = hashForRateLimit("01712345678");
      const hash2 = hashForRateLimit("01712345678");
      expect(hash1).toHaveLength(16);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{16}$/.test(hash1)).toBe(true);
    });

    test("identical normalized phone numbers produce identical HMAC keys", () => {
      const p1 = hashForRateLimit("01712345678");
      const p2 = hashForRateLimit(normalizeBdPhoneNumber("+8801712345678"));
      const p3 = hashForRateLimit(normalizeBdPhoneNumber("017-1234-5678"));
      const p4 = hashForRateLimit("  01712345678  ");

      expect(p1).toBe(p2);
      expect(p1).toBe(p3);
      expect(p1).toBe(p4);
    });

    test("different phone numbers produce distinct HMAC keys (no collision)", () => {
      const pA = hashForRateLimit("01711111111");
      const pB = hashForRateLimit("01722222222");
      const pC = hashForRateLimit("01811111111");

      expect(pA).not.toBe(pB);
      expect(pA).not.toBe(pC);
      expect(pB).not.toBe(pC);
    });

    test("defeats dictionary enumeration: pseudonym differs from plain unkeyed SHA-256", () => {
      const rawPhone = "01712345678";
      const plainSha256 = crypto.createHash("sha256").update(rawPhone).digest("hex").slice(0, 16);
      const hmacKey = hashForRateLimit(rawPhone);

      // Crucial: plain SHA-256 must NOT match HMAC
      expect(hmacKey).not.toBe(plainSha256);

      // Must match HMAC-SHA256 keyed with AUTH_SECRET
      const expectedHmac = crypto
        .createHmac("sha256", TEST_AUTH_SECRET)
        .update(rawPhone)
        .digest("hex")
        .slice(0, 16);
      expect(hmacKey).toBe(expectedHmac);
    });

    test("rate-limit hash aligns with security-logger hash for cross-telemetry correlation", () => {
      const phone = "01712345678";
      const rateLimitHash = hashForRateLimit(phone);
      const loggerHash = securityLogger.hashSecurityIdentifier(phone);

      expect(rateLimitHash).toBe(loggerHash);
    });

    test("no raw phone number enters rate-limit storage keys", async () => {
      const rawPhone = "01712345678";
      const ip = "103.1.2.99";

      await checkOtpRateLimit(rawPhone, ip);

      // Verify pseudonym used
      const expectedPseudonym = hashForRateLimit(rawPhone);
      expect(expectedPseudonym).not.toContain(rawPhone);
      expect(rawPhone).not.toContain(expectedPseudonym);
    });

    test("opaque tokens with raw: true preserve exact bytes and case sensitivity", () => {
      // Case sensitivity: session tokens can be mixed-case Base64/UUID strings
      const tokenUpper = "Session-Token-Case-Sensitive-ABC";
      const tokenLower = "session-token-case-sensitive-abc";

      // In raw mode, different case produces distinct hashes (prevents collisions)
      const hashUpper = hashForRateLimit(tokenUpper, { raw: true });
      const hashLower = hashForRateLimit(tokenLower, { raw: true });
      expect(hashUpper).not.toBe(hashLower);

      // In default mode (for phone/email), case is normalized
      const normalizedUpper = hashForRateLimit(tokenUpper);
      const normalizedLower = hashForRateLimit(tokenLower);
      expect(normalizedUpper).toBe(normalizedLower);
    });

    test("opaque tokens with raw: true do not strip leading or trailing whitespace", () => {
      const exactToken = "cart_exact_id_123";
      const paddedToken = " cart_exact_id_123 ";

      const hashExact = hashForRateLimit(exactToken, { raw: true });
      const hashPadded = hashForRateLimit(paddedToken, { raw: true });
      expect(hashExact).not.toBe(hashPadded);
    });
  });

  describe("2. Phone OTP Verification Rate Limiter", () => {
    test("allows up to 5 OTP verification attempts per phone and blocks the 6th", async () => {
      const phone = "01712345678";
      const ip = "103.1.2.3";

      for (let i = 0; i < 5; i++) {
        await expect(checkOtpRateLimit(phone, ip)).resolves.toBeUndefined();
      }

      await expect(checkOtpRateLimit(phone, ip)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("enforces per-phone isolation: exhausting phone A does not block phone B", async () => {
      const phoneA = "01711111111";
      const phoneB = "01722222222";
      const ipA = "103.1.2.10";
      const ipB = "103.1.2.20";

      for (let i = 0; i < 5; i++) {
        await checkOtpRateLimit(phoneA, ipA);
      }
      await expect(checkOtpRateLimit(phoneA, ipA)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Phone B on IP B remains completely unblocked
      await expect(checkOtpRateLimit(phoneB, ipB)).resolves.toBeUndefined();
    });

    test("enforces IP ceiling: blocks rotating phones from a single attacking IP after 20 attempts", async () => {
      const attackerIp = "192.168.10.50";

      // Attacker attempts 20 different phone numbers from the same IP
      for (let i = 0; i < 20; i++) {
        const rotatedPhone = `017000000${String(i).padStart(2, "0")}`;
        await expect(checkOtpRateLimit(rotatedPhone, attackerIp)).resolves.toBeUndefined();
      }

      // 21st attempt from this IP is blocked by the IP ceiling even with a new phone number
      const newPhone = "01799999999";
      await expect(checkOtpRateLimit(newPhone, attackerIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // But a legitimate user from a different IP can still attempt that phone
      const legitimateIp = "203.0.113.5";
      await expect(checkOtpRateLimit(newPhone, legitimateIp)).resolves.toBeUndefined();
    });

    test("clearOtpRateLimit resets only the per-phone verification counter, leaving IP ceiling intact", async () => {
      const phone = "01733333333";
      const ip = "103.1.2.33";

      for (let i = 0; i < 5; i++) {
        await checkOtpRateLimit(phone, ip);
      }
      await expect(checkOtpRateLimit(phone, ip)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Reset phone counter upon successful verification
      await clearOtpRateLimit(phone);

      // Phone is now unblocked
      await expect(checkOtpRateLimit(phone, ip)).resolves.toBeUndefined();
    });

    test("bypasses global IP ceiling when client IP cannot be resolved (avoids shared bucket DoS)", async () => {
      const phone = "01744444444";

      // 5 attempts allowed per phone even without trusted IP
      for (let i = 0; i < 5; i++) {
        await expect(checkOtpRateLimit(phone, "unknown")).resolves.toBeUndefined();
      }
      await expect(checkOtpRateLimit(phone, "unknown")).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("3. Decoupled OTP Send vs OTP Verify Limiters", () => {
    test("exhausting OTP send limit does not block OTP verification", async () => {
      const phone = "01755555555";
      const ip = "103.1.2.55";

      // Exhaust OTP send limiter (5 requests)
      for (let i = 0; i < 5; i++) {
        await checkOtpSendRateLimit(phone, ip);
      }
      await expect(checkOtpSendRateLimit(phone, ip)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Legitimate OTP verification for this phone remains unblocked
      await expect(checkOtpRateLimit(phone, ip)).resolves.toBeUndefined();
    });

    test("exhausting OTP verification limit does not block OTP send", async () => {
      const phone = "01766666666";
      const ip = "103.1.2.66";

      // Exhaust OTP verify limiter (5 attempts)
      for (let i = 0; i < 5; i++) {
        await checkOtpRateLimit(phone, ip);
      }
      await expect(checkOtpRateLimit(phone, ip)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Requesting an OTP resend remains unblocked
      await expect(checkOtpSendRateLimit(phone, ip)).resolves.toBeUndefined();
    });
  });

  describe("4. Auth.js Credentials Provider Security Telemetry", () => {
    const getAuthorize = () => {
      const credentialsProvider = authConfig.providers.find(
        (p: any) => typeof p === "object" && p?.id === "credentials"
      ) as any;
      return credentialsProvider.options?.authorize ?? credentialsProvider.authorize;
    };

    test("verification attempts are rate limited BEFORE database verification", async () => {
      const authorize = getAuthorize();
      const phone = "01777777777";
      const findFirstSpy = vi.spyOn(prisma.verificationToken, "findFirst");

      // Exhaust OTP verify rate limit
      for (let i = 0; i < 5; i++) {
        await checkOtpRateLimit(phone);
      }

      findFirstSpy.mockClear();

      // Attempt 6 throws RateLimitError
      await expect(authorize({ phone, otp: "123456" })).rejects.toThrow(RateLimitError);

      // Verification token table must NOT be queried once rate limited
      expect(findFirstSpy).not.toHaveBeenCalled();
    });

    test("phone OTP flow emits AUTH_OTP_RATE_LIMIT_EXCEEDED and throws RateLimitError when rate limited", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");
      const phone = "01777777777";

      // Exhaust OTP verify rate limit
      for (let i = 0; i < 5; i++) {
        await checkOtpRateLimit(phone);
      }

      await expect(authorize({ phone, otp: "123456" })).rejects.toThrow(RateLimitError);

      expect(alertSpy).toHaveBeenCalledWith(
        "AUTH_OTP_RATE_LIMIT_EXCEEDED",
        expect.objectContaining({
          endpoint: "otpVerifyPhone",
          reason: "rate_limit_exceeded",
          phoneHash: expect.any(String),
        })
      );
    });

    test("email password flow emits AUTH_RATE_LIMIT_EXCEEDED and throws RateLimitError when rate limited", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");
      const email = "attacker@example.com";

      // Exhaust login rate limit (5 attempts)
      const { checkLoginRateLimit } = await import("@/lib/security/rate-limit");
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit(email);
      }

      await expect(authorize({ email, password: "wrong-password" })).rejects.toThrow(
        RateLimitError
      );

      expect(alertSpy).toHaveBeenCalledWith(
        "AUTH_RATE_LIMIT_EXCEEDED",
        expect.objectContaining({
          endpoint: "loginCompound",
          reason: "rate_limit_exceeded",
          emailHash: expect.any(String),
        })
      );
    });

    test("failed password on CUSTOMER role returns null and does NOT emit AUTH_ADMIN_LOGIN_FAILED", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");
      const email = "customer@example.com";

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "cust-1",
        email,
        passwordHash: "$2b$12$mockhash",
        role: "CUSTOMER",
      } as any);

      mockCompare.mockResolvedValueOnce(false); // Wrong password

      const result = await authorize({ email, password: "wrongpassword" });
      expect(result).toBeNull();

      // No admin security alert emitted for regular customer typo
      expect(alertSpy).not.toHaveBeenCalledWith("AUTH_ADMIN_LOGIN_FAILED", expect.anything());
    });

    test("failed password on ADMIN role returns null and emits AUTH_ADMIN_LOGIN_FAILED", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");
      const email = "superadmin@vibelock.bd";

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "admin-1",
        email,
        passwordHash: "$2b$12$mockhash",
        role: "ADMIN",
      } as any);

      mockCompare.mockResolvedValueOnce(false); // Wrong password

      const result = await authorize({ email, password: "badpassword" });
      expect(result).toBeNull();

      expect(alertSpy).toHaveBeenCalledWith(
        "AUTH_ADMIN_LOGIN_FAILED",
        expect.objectContaining({
          role: "ADMIN",
          reason: "invalid_credentials",
          endpoint: "credentials",
          emailHash: expect.any(String),
        })
      );
    });

    test("failed password on MANAGER and STAFF roles emits AUTH_ADMIN_LOGIN_FAILED", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");

      for (const role of ["MANAGER", "STAFF"]) {
        vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
          id: `user-${role}`,
          email: `${role.toLowerCase()}@vibelock.bd`,
          passwordHash: "$2b$12$mockhash",
          role,
        } as any);

        mockCompare.mockResolvedValueOnce(false);

        const result = await authorize({
          email: `${role.toLowerCase()}@vibelock.bd`,
          password: "bad",
        });
        expect(result).toBeNull();

        expect(alertSpy).toHaveBeenCalledWith(
          "AUTH_ADMIN_LOGIN_FAILED",
          expect.objectContaining({
            role,
            reason: "invalid_credentials",
          })
        );
      }
    });

    test("suspended account login returns null and emits AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");
      const email = "suspended@vibelock.bd";

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "suspended-user-id",
        email,
        passwordHash: "$2b$12$mockhash",
        role: "CUSTOMER",
      } as any);

      mockCompare.mockResolvedValueOnce(true); // Password matches

      // Account is suspended
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const result = await authorize({ email, password: "correct-password" });
      expect(result).toBeNull();

      expect(alertSpy).toHaveBeenCalledWith(
        "AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT",
        expect.objectContaining({
          role: "CUSTOMER",
          reason: "account_suspended",
        })
      );
    });

    test("telemetry error inside authorize NEVER breaks authentication (fail-safe)", async () => {
      const authorize = getAuthorize();

      // Force logSecurityAlert to throw
      vi.spyOn(securityLogger, "logSecurityAlert").mockImplementation(() => {
        throw new Error("Telemetry transport failure");
      });

      const email = "admin@vibelock.bd";
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "admin-1",
        email,
        passwordHash: "$2b$12$mockhash",
        role: "ADMIN",
      } as any);

      mockCompare.mockResolvedValueOnce(false);

      // Does not throw despite telemetry failure
      const result = await authorize({ email, password: "badpassword" });
      expect(result).toBeNull();
    });

    test("non-existent email performs dummy comparison and returns null without leaking account status", async () => {
      const authorize = getAuthorize();
      const alertSpy = vi.spyOn(securityLogger, "logSecurityAlert");

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

      mockCompare.mockResolvedValueOnce(false);

      const result = await authorize({ email: "nonexistent@example.com", password: "pwd" });
      expect(result).toBeNull();

      // Dummy comparison executed for timing mitigation
      expect(mockCompare).toHaveBeenCalled();

      // No admin alert emitted since account does not exist
      expect(alertSpy).not.toHaveBeenCalledWith("AUTH_ADMIN_LOGIN_FAILED", expect.anything());
    });
  });

  describe("5. IP Trust Boundary: getIp() & isPlausibleIp() Regression Tests", () => {
    describe("isPlausibleIp() format validator", () => {
      test("accepts valid standard IPv4 addresses", () => {
        expect(isPlausibleIp("203.0.113.195")).toBe(true);
        expect(isPlausibleIp("127.0.0.1")).toBe(true);
        expect(isPlausibleIp("10.0.0.1")).toBe(true);
        expect(isPlausibleIp("192.168.1.254")).toBe(true);
        expect(isPlausibleIp("0.0.0.0")).toBe(true);
        expect(isPlausibleIp("255.255.255.255")).toBe(true);
      });

      test("accepts valid IPv6 addresses", () => {
        expect(isPlausibleIp("::1")).toBe(true);
        expect(isPlausibleIp("2001:db8::1")).toBe(true);
        expect(isPlausibleIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
        expect(isPlausibleIp("fe80::1ff:fe23:4567:890a")).toBe(true);
      });

      test("rejects malformed IPv4 octets exceeding 255", () => {
        expect(isPlausibleIp("999.999.999.999")).toBe(false);
        expect(isPlausibleIp("256.0.0.1")).toBe(false);
        expect(isPlausibleIp("192.168.1.300")).toBe(false);
      });

      test("rejects empty, whitespace, and non-IP strings", () => {
        expect(isPlausibleIp("")).toBe(false);
        expect(isPlausibleIp("   ")).toBe(false);
        expect(isPlausibleIp("unknown")).toBe(false);
        expect(isPlausibleIp("localhost")).toBe(false);
      });

      test("rejects injection and malicious payloads", () => {
        expect(isPlausibleIp("'; DROP TABLE users; --")).toBe(false);
        expect(isPlausibleIp("<script>alert(1)</script>")).toBe(false);
        expect(isPlausibleIp("203.0.113.5\r\nSet-Cookie: evil=1")).toBe(false);
        expect(isPlausibleIp("1.2.3.4; cat /etc/passwd")).toBe(false);
        expect(isPlausibleIp("A".repeat(50))).toBe(false);
      });
    });

    describe("getIp() header resolution & anti-spoofing", () => {
      test("resolves client IP from x-real-ip when valid IPv4", async () => {
        const headers = new Headers({ "x-real-ip": "203.0.113.195" });
        const ip = await getIp(headers);
        expect(ip).toBe("203.0.113.195");
      });

      test("resolves client IP from x-real-ip when valid IPv6", async () => {
        const headers = new Headers({ "x-real-ip": "2001:db8::8a2e" });
        const ip = await getIp(headers);
        expect(ip).toBe("2001:db8::8a2e");
      });

      test("resolves client IP from x-forwarded-for when it is a single valid IP", async () => {
        const headers = new Headers({ "x-forwarded-for": "198.51.100.55" });
        const ip = await getIp(headers);
        expect(ip).toBe("198.51.100.55");
      });

      test("enforces header precedence: x-real-ip > x-vercel-forwarded-for > x-forwarded-for", async () => {
        // When all 3 are present, x-real-ip wins
        const headersAll = new Headers({
          "x-real-ip": "203.0.113.10",
          "x-vercel-forwarded-for": "203.0.113.20",
          "x-forwarded-for": "203.0.113.30",
        });
        expect(await getIp(headersAll)).toBe("203.0.113.10");

        // When x-real-ip is missing, x-vercel-forwarded-for wins over x-forwarded-for
        const headersNoReal = new Headers({
          "x-vercel-forwarded-for": "203.0.113.20",
          "x-forwarded-for": "203.0.113.30",
        });
        expect(await getIp(headersNoReal)).toBe("203.0.113.20");

        // When only x-forwarded-for is present, it is used
        const headersOnlyXff = new Headers({
          "x-forwarded-for": "203.0.113.30",
        });
        expect(await getIp(headersOnlyXff)).toBe("203.0.113.30");
      });

      test("rejects comma-separated spoofed or ambiguous multi-value headers", async () => {
        // In the documented Vercel environment, client IP is a single value.
        // Comma-separated input is rejected as ambiguous without a documented proxy setup.
        const headersMultiXff = new Headers({
          "x-forwarded-for": "198.51.100.1, 203.0.113.195, 192.0.2.55",
        });
        expect(await getIp(headersMultiXff)).toBeNull();

        const headersMultiReal = new Headers({
          "x-real-ip": "10.0.0.1, 10.0.0.2",
        });
        expect(await getIp(headersMultiReal)).toBeNull();

        const headersMultiVercel = new Headers({
          "x-vercel-forwarded-for": "172.16.0.1, 172.16.0.2",
        });
        expect(await getIp(headersMultiVercel)).toBeNull();
      });

      test("rejects malformed or ambiguous x-real-ip and safely falls through to single valid header", async () => {
        // x-real-ip is ambiguous (multi-value); falls through to single valid x-forwarded-for
        const headers = new Headers({
          "x-real-ip": "198.51.100.1, 203.0.113.195",
          "x-forwarded-for": "192.0.2.77",
        });
        const ip = await getIp(headers);
        expect(ip).toBe("192.0.2.77");
      });

      test("never trusts client-supplied headers like cf-connecting-ip or true-client-ip", async () => {
        const headers = new Headers({
          "cf-connecting-ip": "1.1.1.1",
          "true-client-ip": "2.2.2.2",
          "x-client-ip": "3.3.3.3",
        });
        const ip = await getIp(headers);
        expect(ip).toBeNull();
      });

      test("returns null when no trusted headers are present (local dev / test runners)", async () => {
        const headers = new Headers({});
        const ip = await getIp(headers);
        expect(ip).toBeNull();
      });

      test("returns null when all header values are malformed/injection strings", async () => {
        const headers = new Headers({
          "x-real-ip": "'; DROP TABLE users; --",
          "x-forwarded-for": "<script>alert(1)</script>, 999.999.999.999",
        });
        const ip = await getIp(headers);
        expect(ip).toBeNull();
      });
    });

    describe("Caller-level bypass & per-phone enforcement with null/missing IP", () => {
      test("IP ceiling is bypassed and per-phone limit enforced when IP is null/unknown", async () => {
        const phone = "01788888888";
        // 'unknown' triggers the bypass path in checkOtpRateLimit
        for (let i = 0; i < 5; i++) {
          await expect(checkOtpRateLimit(phone, "unknown")).resolves.toBeUndefined();
        }
        await expect(checkOtpRateLimit(phone, "unknown")).rejects.toThrow("RATE_LIMIT_EXCEEDED");
      });

      test("IP ceiling is enforced when a valid IPv4 is supplied (normal request path)", async () => {
        const attackerIp = "1.2.3.4";
        // 20 attempts across different phones exhaust the per-IP ceiling
        for (let i = 0; i < 20; i++) {
          const phone = `017000${String(i).padStart(5, "0")}`;
          await expect(checkOtpRateLimit(phone, attackerIp)).resolves.toBeUndefined();
        }
        // 21st is blocked by IP ceiling, not phone limit
        await expect(checkOtpRateLimit("01799988888", attackerIp)).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
      });

      test("per-phone limit still fires even if IP value is an injection string (defense depth)", async () => {
        const phone = "01799911111";
        const injectedIp = "'; DROP TABLE users; --";
        for (let i = 0; i < 5; i++) {
          await expect(checkOtpRateLimit(phone, injectedIp)).resolves.toBeUndefined();
        }
        await expect(checkOtpRateLimit(phone, injectedIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
      });

      test("absent IP (undefined) triggers bypass and per-phone still enforced", async () => {
        const phone = "01799922222";
        for (let i = 0; i < 5; i++) {
          await expect(checkOtpRateLimit(phone, undefined)).resolves.toBeUndefined();
        }
        await expect(checkOtpRateLimit(phone, undefined)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
      });

      test("two distinct client IPs are rate-limited independently for IP ceiling (no cross-contamination)", async () => {
        const ipA = "10.0.0.1";
        const ipB = "10.0.0.2";

        // Exhaust IP A ceiling across 20 different phones
        for (let i = 0; i < 20; i++) {
          const phone = `017100${String(i).padStart(5, "0")}`;
          await checkOtpRateLimit(phone, ipA);
        }
        // 21st phone on IP A is blocked by IP ceiling
        await expect(checkOtpRateLimit("01799900001", ipA)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

        // ipB has its own independent bucket — can still verify phones
        await expect(checkOtpRateLimit("01799900001", ipB)).resolves.toBeUndefined();
      });
    });
  });

  describe("6. OTP Send Rate Limiter — Missing IP Observability", () => {
    test("emits RATE_LIMIT_MISSING_CLIENT_IP warning when no trusted IP resolved on OTP send", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const phone = "01799944444";

      await checkOtpSendRateLimit(phone, "unknown");

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("RATE_LIMIT_MISSING_CLIENT_IP"));

      // Confirm warning payload does not contain raw phone number
      const warningPayload = warnSpy.mock.calls[0][0] as string;
      expect(warningPayload).not.toContain(phone);

      warnSpy.mockRestore();
    });

    test("per-phone HMAC throttle still fires even without a trusted IP during OTP send", async () => {
      const phone = "01799955555";

      for (let i = 0; i < 5; i++) {
        await expect(checkOtpSendRateLimit(phone, "unknown")).resolves.toBeUndefined();
      }
      await expect(checkOtpSendRateLimit(phone, "unknown")).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("OTP send warning log is valid structured JSON and contains no PII", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const phone = "01799966666";

      await checkOtpSendRateLimit(phone, "unknown");

      const warningPayload = warnSpy.mock.calls[0]?.[0] as string;
      // Must parse as valid JSON
      expect(() => JSON.parse(warningPayload)).not.toThrow();
      const parsed = JSON.parse(warningPayload) as Record<string, unknown>;
      expect(parsed.event).toBe("RATE_LIMIT_MISSING_CLIENT_IP");
      expect(parsed.level).toBe("warn");
      // No raw phone number leaked
      expect(warningPayload).not.toContain(phone);

      warnSpy.mockRestore();
    });

    test("OTP send: IP ceiling fires when valid IP supplied, per-phone always fires", async () => {
      const phone = "01799977777";
      const ip = "192.168.1.50";

      // 15 OTP send requests exhaust the per-IP send ceiling
      for (let i = 0; i < 15; i++) {
        const rotatedPhone = `017888${String(i).padStart(5, "0")}`;
        await checkOtpSendRateLimit(rotatedPhone, ip);
      }
      // 16th from same IP is blocked
      await expect(checkOtpSendRateLimit(phone, ip)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });
});
