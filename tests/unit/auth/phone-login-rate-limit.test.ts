/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma/client";
import { authConfig } from "@/auth";
import {
  loginSchema,
  registerSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  isValidBdPhoneNumber,
  isValidEmail,
  isValidLoginIdentifier,
  normalizeBdPhoneNumber,
} from "@/lib/validations/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  normalizeLoginIdentifier,
  resetRateLimitMemoryStore,
  checkRateLimit,
  setLimiterForTesting,
  setRedisClientForTesting,
  isSensitiveRateLimitEndpoint,
  isDistributedRateLimitAvailable,
} from "@/lib/security/rate-limit";

const { mockCompare, mockHeaders } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
  default: {
    compare: mockCompare,
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    AUTH_GOOGLE_ID: "mock-google-id",
    AUTH_GOOGLE_SECRET: "mock-google-secret",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
  },
}));

describe("Phase 12.4.2: Phone Login Alignment & Production Rate-Limit Hardening", () => {
  const credentialsProvider = authConfig.providers.find(
    (p: any) => typeof p === "object" && p?.id === "credentials"
  ) as any;
  const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
    mockHeaders.mockResolvedValue(
      new Headers({
        "x-real-ip": "192.168.1.100",
      })
    );
  });

  describe("1. Validation Helpers & Schemas", () => {
    test("isValidBdPhoneNumber recognizes valid Bangladeshi mobile prefixes (013-019)", () => {
      expect(isValidBdPhoneNumber("01712345678")).toBe(true);
      expect(isValidBdPhoneNumber("01812345678")).toBe(true);
      expect(isValidBdPhoneNumber("01912345678")).toBe(true);
      expect(isValidBdPhoneNumber("01612345678")).toBe(true);
      expect(isValidBdPhoneNumber("01512345678")).toBe(true);
      expect(isValidBdPhoneNumber("01312345678")).toBe(true);
      expect(isValidBdPhoneNumber("01412345678")).toBe(true);

      // With international prefixes
      expect(isValidBdPhoneNumber("+8801712345678")).toBe(true);
      expect(isValidBdPhoneNumber("8801712345678")).toBe(true);
      expect(isValidBdPhoneNumber("017-1234-5678")).toBe(true);

      // Invalid operators or lengths
      expect(isValidBdPhoneNumber("01212345678")).toBe(false); // 012 does not exist in BD
      expect(isValidBdPhoneNumber("0171234567")).toBe(false); // 10 digits
      expect(isValidBdPhoneNumber("017123456789")).toBe(false); // 12 digits
      expect(isValidBdPhoneNumber("randomstring")).toBe(false);
      expect(isValidBdPhoneNumber("")).toBe(false);
    });

    test("isValidEmail validates standard email format", () => {
      expect(isValidEmail("user@vibelock.bd")).toBe(true);
      expect(isValidEmail("customer.service@store.com")).toBe(true);
      expect(isValidEmail("01712345678")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
    });

    test("isValidLoginIdentifier and normalizeBdPhoneNumber handle email and phone identifiers", () => {
      expect(isValidLoginIdentifier("user@vibelock.bd")).toBe(true);
      expect(isValidLoginIdentifier("01712345678")).toBe(true);
      expect(isValidLoginIdentifier("+8801712345678")).toBe(true);
      expect(isValidLoginIdentifier("not_an_email_or_phone")).toBe(false);

      expect(normalizeBdPhoneNumber("+8801712345678")).toBe("01712345678");
      expect(normalizeBdPhoneNumber("8801712345678")).toBe("01712345678");
      expect(normalizeBdPhoneNumber("017-1234-5678")).toBe("01712345678");
    });

    test("loginSchema accepts valid email OR valid BD phone number", () => {
      // Valid email
      const emailRes = loginSchema.safeParse({
        email: "member@vibelock.bd",
        password: "SecretPassword123!",
      });
      expect(emailRes.success).toBe(true);

      // Valid phone in local format
      const phoneLocalRes = loginSchema.safeParse({
        email: "01712345678",
        password: "SecretPassword123!",
      });
      expect(phoneLocalRes.success).toBe(true);

      // Valid phone with +880
      const phoneIntlRes = loginSchema.safeParse({
        email: "+8801712345678",
        password: "SecretPassword123!",
      });
      expect(phoneIntlRes.success).toBe(true);

      // Invalid identifier
      const invalidRes = loginSchema.safeParse({
        email: "invalid_identifier",
        password: "SecretPassword123!",
      });
      expect(invalidRes.success).toBe(false);
      if (!invalidRes.success) {
        expect(invalidRes.error.issues[0].message).toContain(
          "Please enter a valid email address or 11-digit Bangladeshi mobile number."
        );
      }
    });

    test("registerSchema permits optional valid phone number", () => {
      // Without phone
      const noPhoneRes = registerSchema.safeParse({
        name: "Test User",
        email: "test@vibelock.bd",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(noPhoneRes.success).toBe(true);

      // With valid phone
      const withPhoneRes = registerSchema.safeParse({
        name: "Test User",
        email: "test@vibelock.bd",
        phone: "01712345678",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(withPhoneRes.success).toBe(true);

      // With invalid phone
      const invalidPhoneRes = registerSchema.safeParse({
        name: "Test User",
        email: "test@vibelock.bd",
        phone: "12345",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(invalidPhoneRes.success).toBe(false);
    });
  });

  describe("2. Phone + Password Credentials Authentication", () => {
    test("authenticates user with phone number and valid password", async () => {
      const mockUser = {
        id: "user-phone-1",
        name: "Siam Customer",
        email: "01712345678@vibelock.bd",
        phone: "01712345678",
        passwordHash: "$2b$12$hashedpasswordvalue",
        role: "CUSTOMER",
        image: null,
        emailVerified: null,
      };

      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockUser as any);
      mockCompare.mockResolvedValue(true);

      const result = await authorize({
        email: "01712345678",
        password: "CorrectPassword123!",
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-phone-1");
      expect(result?.role).toBe("CUSTOMER");
      expect(mockCompare).toHaveBeenCalledWith("CorrectPassword123!", mockUser.passwordHash);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ phone: "01712345678" }, { email: "01712345678" }, { email: "01712345678" }],
        },
      });
    });

    test("authenticates user with +880 formatted phone number normalizing to local format", async () => {
      const mockUser = {
        id: "user-phone-2",
        name: "Normalized Customer",
        email: "norm@vibelock.bd",
        phone: "01799999999",
        passwordHash: "$2b$12$hashedpasswordvalue",
        role: "CUSTOMER",
        image: null,
        emailVerified: null,
      };

      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockUser as any);
      mockCompare.mockResolvedValue(true);

      const result = await authorize({
        email: "+8801799999999",
        password: "CorrectPassword123!",
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-phone-2");
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ phone: "01799999999" }, { email: "01799999999" }, { email: "+8801799999999" }],
        },
      });
    });

    test("rejects phone login with invalid password and mitigates timing attacks", async () => {
      const mockUser = {
        id: "user-phone-1",
        name: "Siam Customer",
        phone: "01712345678",
        passwordHash: "$2b$12$hashedpasswordvalue",
        role: "CUSTOMER",
      };

      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockUser as any);
      mockCompare.mockResolvedValue(false);

      const result = await authorize({
        email: "01712345678",
        password: "WrongPassword123!",
      });

      expect(result).toBeNull();
      expect(mockCompare).toHaveBeenCalledWith("WrongPassword123!", mockUser.passwordHash);
    });

    test("rejects non-existent phone number with constant-time dummy comparison", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
      mockCompare.mockResolvedValue(false);

      const result = await authorize({
        email: "01700000000",
        password: "AnyPassword123!",
      });

      expect(result).toBeNull();
      // Verifies constant-time mitigation
      expect(mockCompare).toHaveBeenCalledWith(
        "AnyPassword123!",
        expect.stringContaining("$2b$12$")
      );
    });

    test("standard email + password login continues to work unaffected", async () => {
      const mockUser = {
        id: "user-email-1",
        name: "Email Customer",
        email: "customer@vibelock.bd",
        passwordHash: "$2b$12$hashedpasswordvalue",
        role: "CUSTOMER",
        image: null,
        emailVerified: new Date(),
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
      mockCompare.mockResolvedValue(true);

      const result = await authorize({
        email: "customer@vibelock.bd",
        password: "CorrectPassword123!",
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-email-1");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "customer@vibelock.bd" },
      });
    });
  });

  describe("3. Production Rate-Limit Hardening & Security Policies", () => {
    test("normalizeLoginIdentifier normalizes phone number variations to identical keys", () => {
      const k1 = normalizeLoginIdentifier("01712345678");
      const k2 = normalizeLoginIdentifier("+8801712345678");
      const k3 = normalizeLoginIdentifier("8801712345678");
      const k4 = normalizeLoginIdentifier("  01712345678  ");

      expect(k1).toBe("01712345678");
      expect(k1).toBe(k2);
      expect(k1).toBe(k3);
      expect(k1).toBe(k4);
    });

    test("normalizeLoginIdentifier lowercases and trims email addresses", () => {
      expect(normalizeLoginIdentifier("  Member@VibeLock.BD  ")).toBe("member@vibelock.bd");
    });

    test("phone rate-limiting enforces quota across +880 and local representations in same bucket", async () => {
      const testIp = "192.168.1.100";

      // 5 failed attempts using +880 format
      for (let i = 0; i < 5; i++) {
        await expect(checkLoginRateLimit("+8801712345678", testIp)).resolves.toBeUndefined();
      }

      // 6th attempt using local format (01712345678) must be blocked because they share the normalized key
      await expect(checkLoginRateLimit("01712345678", testIp)).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );

      // Successful clear via local format clears the quota
      await clearLoginRateLimit("01712345678", testIp);

      // Next attempt is now allowed
      await expect(checkLoginRateLimit("+8801712345678", testIp)).resolves.toBeUndefined();
    });

    test("isSensitiveRateLimitEndpoint correctly classifies sensitive vs public endpoints", () => {
      expect(isSensitiveRateLimitEndpoint("login")).toBe(true);
      expect(isSensitiveRateLimitEndpoint("loginCompound")).toBe(true);
      expect(isSensitiveRateLimitEndpoint("register")).toBe(true);
      expect(isSensitiveRateLimitEndpoint("forgotPassword")).toBe(true);
      expect(isSensitiveRateLimitEndpoint("otpVerifyPhone")).toBe(true);
      expect(isSensitiveRateLimitEndpoint("adminUserManagement")).toBe(true);

      // Public / Storefront non-sensitive endpoints
      expect(isSensitiveRateLimitEndpoint("search")).toBe(false);
      expect(isSensitiveRateLimitEndpoint("newsletter")).toBe(false);
      expect(isSensitiveRateLimitEndpoint("submitReview")).toBe(false);
    });

    test("Production without Redis configuration: sensitive endpoints FAIL CLOSED", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";
        setRedisClientForTesting(null);

        expect(isDistributedRateLimitAvailable()).toBe(false);

        // Sensitive auth endpoints must throw RATE_LIMIT_EXCEEDED in production when Redis is missing
        await expect(checkRateLimit("login", "attacker-account")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
        await expect(checkRateLimit("loginCompound", "192.168.1.1:victim")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
        await expect(checkRateLimit("register", "newuser@example.com")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
        await expect(checkRateLimit("forgotPassword", "victim@example.com")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
        await expect(checkLoginRateLimit("01712345678")).rejects.toThrow("RATE_LIMIT_EXCEEDED");
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        setRedisClientForTesting(null);
      }
    });

    test("Production without Redis configuration: non-sensitive public endpoints DO NOT fail closed", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";
        setRedisClientForTesting(null);

        // Non-sensitive public endpoints use local in-memory store so users can still search
        await expect(checkRateLimit("search", "summer-hoodie")).resolves.toBeUndefined();
        await expect(checkRateLimit("newsletter", "user@example.com")).resolves.toBeUndefined();
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        setRedisClientForTesting(null);
      }
    });

    test("Production Redis infrastructure failure: sensitive endpoints FAIL CLOSED to prevent bypass", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";

        // Create a mock limiter that throws an unexpected network error (simulating Redis outage)
        const mockFailingLimiter = {
          limit: vi
            .fn()
            .mockRejectedValue(new Error("ETIMEDOUT: Connection to Upstash Redis lost")),
          resetUsedTokens: vi.fn(),
        } as any;

        // Set simulated redis presence and failing limiter
        setRedisClientForTesting({} as any);
        setLimiterForTesting("loginCompound", mockFailingLimiter);
        setLimiterForTesting("register", mockFailingLimiter);

        // In production, when Redis fails on sensitive auth, it must FAIL CLOSED
        await expect(
          checkRateLimit("loginCompound", "192.168.1.1:user@vibelock.bd")
        ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
        await expect(checkRateLimit("register", "user@vibelock.bd")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );

        // Public non-sensitive endpoint should fall back gracefully rather than crash
        const mockFailingSearchLimiter = {
          limit: vi.fn().mockRejectedValue(new Error("ETIMEDOUT: Redis down")),
          resetUsedTokens: vi.fn(),
        } as any;
        setLimiterForTesting("search", mockFailingSearchLimiter);
        await expect(checkRateLimit("search", "graphic-tee")).resolves.toBeUndefined();
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        setRedisClientForTesting(null);
      }
    });

    test("Successful distributed rate limiting: respects distributed quota and enforces ceiling", async () => {
      let callCount = 0;
      const mockLimiter = {
        limit: vi.fn().mockImplementation(async (key: string) => {
          expect(key).toContain("dist-user");
          callCount++;
          return { success: callCount <= 3 };
        }),
        resetUsedTokens: vi.fn(),
      } as any;

      setRedisClientForTesting({} as any);
      setLimiterForTesting("login", mockLimiter);

      // First 3 calls succeed
      await expect(checkRateLimit("login", "dist-user")).resolves.toBeUndefined();
      await expect(checkRateLimit("login", "dist-user")).resolves.toBeUndefined();
      await expect(checkRateLimit("login", "dist-user")).resolves.toBeUndefined();

      // 4th call is blocked by distributed limiter
      await expect(checkRateLimit("login", "dist-user")).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      expect(mockLimiter.limit).toHaveBeenCalledTimes(4);
      setRedisClientForTesting(null);
    });

    test("Development fallback: in-memory store enables full offline local usability", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "development";
        setRedisClientForTesting(null);

        // Memory store allows 5 attempts in development without Redis
        for (let i = 0; i < 5; i++) {
          await expect(checkRateLimit("login", "dev-user-login")).resolves.toBeUndefined();
        }

        // 6th attempt throws RATE_LIMIT_EXCEEDED in development memory limiter
        await expect(checkRateLimit("login", "dev-user-login")).rejects.toThrow(
          "RATE_LIMIT_EXCEEDED"
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        setRedisClientForTesting(null);
      }
    });
  });

  describe("4. Authentication Architecture Coexistence (Phone + Password and Phone OTP)", () => {
    test("phoneOtpRequestSchema normalizes and validates Bangladeshi numbers", () => {
      const parsed = phoneOtpRequestSchema.parse({ phone: "+8801712345678" });
      expect(parsed.phone).toBe("01712345678");

      expect(() => phoneOtpRequestSchema.parse({ phone: "01234567890" })).toThrow();
    });

    test("phoneOtpVerifySchema validates 6-digit OTP codes", () => {
      const valid = phoneOtpVerifySchema.parse({
        phone: "01812345678",
        otp: "654321",
      });
      expect(valid.phone).toBe("01812345678");
      expect(valid.otp).toBe("654321");

      // Non-digit OTP fails
      expect(() =>
        phoneOtpVerifySchema.parse({
          phone: "01812345678",
          otp: "abcdef",
        })
      ).toThrow();

      // Less than 6 digits fails
      expect(() =>
        phoneOtpVerifySchema.parse({
          phone: "01812345678",
          otp: "12345",
        })
      ).toThrow();
    });

    test("authorize handler correctly routes Phone OTP vs Phone + Password credentials", async () => {
      // 1. Phone + Password route
      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "pw-user-id",
        name: "Password User",
        email: "pwuser@example.com",
        phone: "01711111111",
        passwordHash: "$2a$10$mockPasswordHash",
        role: "CUSTOMER",
        emailVerified: new Date(),
      } as any);
      mockCompare.mockResolvedValueOnce(true);

      const pwUser = await authorize({
        email: "01711111111",
        password: "ValidPassword123!",
      });
      expect(pwUser).toMatchObject({
        id: "pw-user-id",
        name: "Password User",
      });

      // 2. Phone + OTP route
      vi.spyOn(prisma.verificationToken, "findFirst").mockResolvedValueOnce({
        identifier: "phone_otp:01722222222",
        token: "mock-token-hash",
        expires: new Date(Date.now() + 60000),
      } as any);
      vi.spyOn(prisma.verificationToken, "deleteMany").mockResolvedValueOnce({ count: 1 } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "otp-user-id",
        name: "OTP User",
        email: "01722222222@vibelock.bd",
        phone: "01722222222",
        role: "CUSTOMER",
        phoneVerified: new Date("2026-01-01"),
      } as any);

      const otpUser = await authorize({
        phone: "01722222222",
        otp: "123456",
      });
      expect(otpUser).toMatchObject({
        id: "otp-user-id",
        name: "OTP User",
      });
    });
  });
});
