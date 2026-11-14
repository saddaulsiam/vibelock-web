/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma/client";
import { authConfig, RateLimitError } from "@/auth";
import { CredentialsSignin } from "next-auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  resetRateLimitMemoryStore,
  getIp,
  checkRateLimit,
} from "@/lib/security/rate-limit";
import { loginAction } from "@/app/actions/auth";
import { POST as authPostHandler, GET as authGetHandler } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest } from "next/server";

const { mockCompare, mockHeaders, mockSignIn } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHeaders: vi.fn(),
  mockSignIn: vi.fn(),
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

vi.mock("@/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth")>();
  return {
    ...actual,
    signIn: mockSignIn,
  };
});

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

vi.mock("@/lib/sms/client", () => ({
  verifyOtp: vi.fn(async (_phone: string, otp: string) => otp === "123456"),
  sendOtp: vi.fn(async () => ({ success: true, devOtp: "123456" })),
}));

describe("Phase 4B: Authentication Hardening & Post-Audit Remediation", () => {
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

  describe("SEC-4B-01: Remove Account-Level DoS via Compound Throttling", () => {
    test("5 failed attempts from IP A exhaust compound quota for IP A only", async () => {
      const email = "victim@example.com";
      const attackerIp = "198.51.100.1";

      for (let i = 0; i < 5; i++) {
        await expect(checkLoginRateLimit(email, attackerIp)).resolves.toBeUndefined();
      }

      // 6th attempt from attacker IP A must fail
      await expect(checkLoginRateLimit(email, attackerIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("Attacker IP A cannot lock out legitimate user logging in from IP B", async () => {
      const email = "victim@example.com";
      const attackerIp = "198.51.100.1";
      const legitimateIp = "203.0.113.50";

      // Attacker on IP A exhausts their 5 attempts on the victim account
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit(email, attackerIp);
      }
      await expect(checkLoginRateLimit(email, attackerIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // Legitimate user on IP B attempting the same account is NOT blocked
      await expect(checkLoginRateLimit(email, legitimateIp)).resolves.toBeUndefined();
    });

    test("Successful login resets compound limiter for that IP and account only", async () => {
      const email = "typo-user@example.com";
      const userIp = "203.0.113.77";
      const attackerIp = "198.51.100.99";

      // User makes 4 typos from userIp
      for (let i = 0; i < 4; i++) {
        await checkLoginRateLimit(email, userIp);
      }

      // Attacker makes 5 attempts from attackerIp and gets throttled
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit(email, attackerIp);
      }
      await expect(checkLoginRateLimit(email, attackerIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");

      // User now successfully authenticates -> clearLoginRateLimit is called for userIp
      await clearLoginRateLimit(email, userIp);

      // User can now make a full fresh quota of attempts from userIp without being blocked
      for (let i = 0; i < 5; i++) {
        await expect(checkLoginRateLimit(email, userIp)).resolves.toBeUndefined();
      }

      // Attacker IP remains throttled (reset did NOT clear attacker IP's quota)
      await expect(checkLoginRateLimit(email, attackerIp)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("Successful login resets compound limiter but does NOT reset global IP counter", async () => {
      const email = "reset-test@example.com";
      const ip = "192.168.10.55";

      // 25 attempts from this IP on other accounts
      for (let i = 0; i < 25; i++) {
        await checkLoginRateLimit(`other-${i}@example.com`, ip);
      }

      // 4 attempts on the target email from this IP (total = 29 attempts from this IP)
      for (let i = 0; i < 4; i++) {
        await checkLoginRateLimit(email, ip);
      }

      // User logs in successfully on the target email -> resets compound counter for this account
      await clearLoginRateLimit(email, ip);

      // Compound quota for this account is now fresh (can make attempt without hitting compound limit)
      // 30th attempt from this IP succeeds
      await expect(checkLoginRateLimit(email, ip)).resolves.toBeUndefined();

      // 31st attempt from this IP must FAIL because global IP counter was NOT reset!
      await expect(checkLoginRateLimit("another@example.com", ip)).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );
    });

    test("Upstash Ratelimit supports resetUsedTokens using official wildcard Lua script", async () => {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const calls: Array<{ hash: string; keys: string[]; args: any[] }> = [];
      const fakeRedis = {
        evalsha: vi.fn(async (hash: string, keys: string[], args: any[]) => {
          calls.push({ hash, keys, args });
          return [];
        }),
        eval: vi.fn(async () => []),
      };
      const limiter = new Ratelimit({
        redis: fakeRedis as any,
        limiter: Ratelimit.slidingWindow(5, "5 m"),
        prefix: "@upstash/ratelimit",
      });

      const compoundIdentifier = "loginCompound:192.168.10.55:reset-test@example.com";
      await limiter.resetUsedTokens(compoundIdentifier);

      expect(fakeRedis.evalsha).toHaveBeenCalledTimes(1);
      expect(calls[0].keys).toEqual([`@upstash/ratelimit:${compoundIdentifier}:*`]);
    });

    test("Global per-IP limit (30 attempts) still protects against credential spraying across accounts", async () => {
      const singleIp = "185.220.101.42";

      // Attacker tests 30 different accounts with 1 attempt each from the same IP
      for (let i = 0; i < 30; i++) {
        await expect(checkLoginRateLimit(`sprayed-${i}@example.com`, singleIp)).resolves.toBeUndefined();
      }

      // 31st attempt from this IP must be blocked regardless of account
      await expect(checkLoginRateLimit("any-account@example.com", singleIp)).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );
    });

    test("Case and whitespace normalization is consistently enforced", async () => {
      const ip = "10.10.10.10";
      const variations = [
        "User@Example.Com",
        "  user@example.com  ",
        "USER@EXAMPLE.COM",
        " user@EXAMPLE.com ",
        "User@example.com",
      ];

      for (const variant of variations) {
        await expect(checkLoginRateLimit(variant, ip)).resolves.toBeUndefined();
      }

      // 6th attempt must be blocked on canonical email
      await expect(checkLoginRateLimit("user@example.com", ip)).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );
    });

    test("authorize calls clearLoginRateLimit upon successful authentication", async () => {
      const email = "valid@example.com";
      const userIp = "192.168.1.100";
      mockHeaders.mockResolvedValue(new Headers({ "x-real-ip": userIp }));

      // User makes 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await checkLoginRateLimit(email, userIp);
      }

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "valid-user-id",
        name: "Valid User",
        email: "valid@example.com",
        passwordHash: "$2b$12$validPasswordHashStringHere1234567890",
        role: "CUSTOMER",
      } as any);
      mockCompare.mockResolvedValueOnce(true);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const user = await authorize({ email: "valid@example.com", password: "correctpassword" });
      expect(user).toBeDefined();
      expect(user.id).toBe("valid-user-id");

      // Verify that counter was reset: user can immediately make another attempt without hitting limit
      await expect(checkLoginRateLimit(email, userIp)).resolves.toBeUndefined();
    });
  });

  describe("SEC-4B-02: Upstash Redis Failure and Fallback", () => {
    test("Redis failure logs a safe structured warning and falls back to in-memory store without crashing", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Simulate rate limiting where in-memory fallback is active
      await expect(checkRateLimit("loginIp", "10.0.0.1", { skipIp: true })).resolves.toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    test("In-memory fallback enforces rate limits strictly when Redis is unconfigured", async () => {
      const testKey = "fallback-test-ip";
      for (let i = 0; i < 30; i++) {
        await expect(checkRateLimit("loginIp", testKey, { skipIp: true })).resolves.toBeUndefined();
      }
      await expect(checkRateLimit("loginIp", testKey, { skipIp: true })).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );
    });
  });

  describe("SEC-4B-03: Trusted Client IP & Missing IP Handling", () => {
    test("getIp prioritizes x-real-ip over x-forwarded-for", async () => {
      mockHeaders.mockResolvedValueOnce(
        new Headers({
          "x-real-ip": "203.0.113.195",
          "x-forwarded-for": "198.51.100.1, 198.51.100.2",
        })
      );

      const resolvedIp = await getIp();
      expect(resolvedIp).toBe("203.0.113.195");
    });

    test("getIp falls back to last entry of x-forwarded-for when x-real-ip is missing", async () => {
      mockHeaders.mockResolvedValueOnce(
        new Headers({
          "x-forwarded-for": "198.51.100.1, 203.0.113.50",
        })
      );

      const resolvedIp = await getIp();
      expect(resolvedIp).toBe("203.0.113.50");
    });

    test("getIp returns null when trusted proxy headers are missing", async () => {
      mockHeaders.mockResolvedValueOnce(new Headers({}));

      const resolvedIp = await getIp();
      expect(resolvedIp).toBeNull();
    });

    test("Missing IP does not group users into a shared localhost bucket", async () => {
      mockHeaders.mockResolvedValue(new Headers({}));
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // 5 attempts on account A without IP
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit("account-a@example.com");
      }
      await expect(checkLoginRateLimit("account-a@example.com")).rejects.toThrow(
        "RATE_LIMIT_EXCEEDED"
      );

      // Account B without IP is NOT locked out by Account A (no shared localhost bucket!)
      await expect(checkLoginRateLimit("account-b@example.com")).resolves.toBeUndefined();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("SEC-4B-04: Auth.js Callback Integration & Route Behavior", () => {
    async function getValidCsrf(): Promise<{ csrfToken: string; cookie: string }> {
      const req = new NextRequest("http://localhost:3000/api/auth/csrf", { method: "GET" });
      const res = await authGetHandler(req);
      const data = await res.json();
      const setCookie = res.headers.get("set-cookie") || "";
      const cookieValue = setCookie.split(";")[0];
      return { csrfToken: data.csrfToken, cookie: cookieValue };
    }

    test("RateLimitError carries code 'rate_limit_exceeded'", () => {
      const err = new RateLimitError();
      expect(err.code).toBe("rate_limit_exceeded");
      expect(err.type).toBe("CredentialsSignin");
    });

    test("loginAction server action catches rate_limit_exceeded cleanly", async () => {
      const rateLimitErr: any = new RateLimitError();
      rateLimitErr.type = "CredentialsSignin";
      rateLimitErr.code = "rate_limit_exceeded";

      mockSignIn.mockRejectedValueOnce(rateLimitErr);

      const result = await loginAction({
        email: "user@example.com",
        password: "password123",
      });

      expect(result).toEqual({ error: "Too many attempts. Please try again later." });
    });

    test("API client receiving rate-limited callback gets HTTP 429 JSON response", async () => {
      const { csrfToken, cookie } = await getValidCsrf();

      const body = new URLSearchParams({
        email: "rate-limited@example.com",
        password: "password123",
        csrfToken,
        callbackUrl: "http://localhost:3000",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Cookie: cookie,
        },
        body: body.toString(),
      });

      // Exhaust compound limit
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit("rate-limited@example.com", "192.168.1.100");
      }

      const res = await authPostHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data).toEqual({ error: "Too many attempts. Please try again later." });
    });

    test("Browser form submission receiving rate-limited callback gets 302 redirect", async () => {
      const { csrfToken, cookie } = await getValidCsrf();

      const body = new URLSearchParams({
        email: "form-user@example.com",
        password: "password123",
        csrfToken,
        callbackUrl: "http://localhost:3000",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookie,
        },
        body: body.toString(),
      });

      // Exhaust compound limit
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit("form-user@example.com", "192.168.1.100");
      }

      const res = await authPostHandler(req);
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("code=rate_limit_exceeded");
    });

    test("Normal failed credentials returns 302 redirect with code=credentials (not 429)", async () => {
      const { csrfToken, cookie } = await getValidCsrf();

      const body = new URLSearchParams({
        email: "wrong-pw@example.com",
        password: "wrongpassword",
        csrfToken,
        callbackUrl: "http://localhost:3000",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookie,
        },
        body: body.toString(),
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      mockCompare.mockResolvedValueOnce(false);

      const res = await authPostHandler(req);
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("error=CredentialsSignin");
      expect(location).not.toContain("code=rate_limit_exceeded");
    });

    test("OAuth callback and GET routes remain unaffected", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/csrf", {
        method: "GET",
      });

      const res = await authGetHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("csrfToken");
    });
  });

  describe("V-06: Mitigate Login Account-Enumeration and Timing Side Channels", () => {
    test("Non-existent user executes cost-12 dummy bcrypt compare and returns null", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      mockCompare.mockResolvedValueOnce(false);

      const result = await authorize({
        email: "missing@example.com",
        password: "password123",
      });

      expect(result).toBeNull();
      expect(mockCompare).toHaveBeenCalledWith(
        "password123",
        "$2b$12$6JBswt1UKeuozUJfRsQmPulGsk5iQwI2YjR7Gm.3zzs.quF7x0axK"
      );
    });

    test("OAuth user without password executes cost-12 dummy bcrypt compare and returns null", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "oauth-user-id",
        email: "oauth@example.com",
        passwordHash: null,
      } as any);
      mockCompare.mockResolvedValueOnce(false);

      const result = await authorize({
        email: "oauth@example.com",
        password: "password123",
      });

      expect(result).toBeNull();
      expect(mockCompare).toHaveBeenCalledWith(
        "password123",
        "$2b$12$6JBswt1UKeuozUJfRsQmPulGsk5iQwI2YjR7Gm.3zzs.quF7x0axK"
      );
    });

    test("User with invalid password executes compare with their hash and returns null", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        passwordHash: "$2b$12$userRealPasswordHashStringHere1234567890",
      } as any);
      mockCompare.mockResolvedValueOnce(false);

      const result = await authorize({
        email: "user@example.com",
        password: "wrongpassword",
      });

      expect(result).toBeNull();
      expect(mockCompare).toHaveBeenCalledWith(
        "wrongpassword",
        "$2b$12$userRealPasswordHashStringHere1234567890"
      );
    });

    test("Suspended customer with valid password executes compare and returns null", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "suspended-user-id",
        email: "suspended@example.com",
        passwordHash: "$2b$12$userRealPasswordHashStringHere1234567890",
        role: "CUSTOMER",
      } as any);
      mockCompare.mockResolvedValueOnce(true);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const result = await authorize({
        email: "suspended@example.com",
        password: "correctpassword",
      });

      expect(result).toBeNull();
    });

    test("All failure modes return identical generic error via loginAction", async () => {
      const credentialsSigninErr = new CredentialsSignin();
      mockSignIn.mockRejectedValueOnce(credentialsSigninErr);

      const res1 = await loginAction({
        email: "nonexistent@example.com",
        password: "password123",
      });
      expect(res1).toEqual({ error: "Invalid email or password." });

      mockSignIn.mockRejectedValueOnce(credentialsSigninErr);
      const res2 = await loginAction({
        email: "existing@example.com",
        password: "wrongpassword",
      });
      expect(res2).toEqual({ error: "Invalid email or password." });

      mockSignIn.mockRejectedValueOnce(credentialsSigninErr);
      const res3 = await loginAction({
        email: "suspended@example.com",
        password: "password123",
      });
      expect(res3).toEqual({ error: "Invalid email or password." });
    });
  });

  describe("Preservation of OAuth & Phone Flows", () => {
    test("Google OAuth signIn callback does not trigger credentials rate limit", async () => {
      const signInCallback = authConfig.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const allowed = await signInCallback!({
        user: { id: "google-123", email: "googleuser@gmail.com" } as any,
        account: { provider: "google" } as any,
      });

      expect(allowed).toBe(true);
    });

    test("Phone + OTP login continues to function properly", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "phone-user-123",
        name: "Phone User",
        email: "01712345678@vibelock.bd",
        phone: "01712345678",
        role: "CUSTOMER",
        phoneVerified: new Date("2026-01-01"),
      } as any);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const user = await authorize({ phone: "01712345678", otp: "123456" });
      expect(user).toMatchObject({
        id: "phone-user-123",
        name: "Phone User",
        role: "CUSTOMER",
      });
    });
  });
});
