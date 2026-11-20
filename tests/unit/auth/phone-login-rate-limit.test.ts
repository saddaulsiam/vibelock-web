/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma/client";
import { authConfig } from "@/auth";
import {
  loginSchema,
  registerSchema,
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
          OR: [
            { phone: "01712345678" },
            { email: "01712345678" },
            { email: "01712345678" },
          ],
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
          OR: [
            { phone: "01799999999" },
            { email: "01799999999" },
            { email: "+8801799999999" },
          ],
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

  describe("3. Production Rate-Limit Hardening", () => {
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

    test("phone rate-limiting enforces quota across +880 and local representations", async () => {
      const testIp = "192.168.1.100";

      // 5 failed attempts using +880 format
      for (let i = 0; i < 5; i++) {
        await expect(checkLoginRateLimit("+8801712345678", testIp)).resolves.toBeUndefined();
      }

      // 6th attempt using local format (01712345678) must be blocked because they share the normalized key
      await expect(checkLoginRateLimit("01712345678", testIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Successful clear via local format clears the quota
      await clearLoginRateLimit("01712345678", testIp);

      // Next attempt is now allowed
      await expect(checkLoginRateLimit("+8801712345678", testIp)).resolves.toBeUndefined();
    });

    test("in-memory sliding window fallback operates safely without throwing when Redis is absent", async () => {
      // Memory store is active (UPSTASH_REDIS_REST_URL is empty in test environment)
      for (let i = 0; i < 5; i++) {
        await expect(checkRateLimit("login", "test-user-rate-limit")).resolves.toBeUndefined();
      }

      // 6th attempt throws RATE_LIMIT_EXCEEDED
      await expect(checkRateLimit("login", "test-user-rate-limit")).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );
    });
  });
});
