/* eslint-disable @typescript-eslint/no-explicit-any */
import { authConfig } from "@/auth";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { isCustomerSuspended } from "@/lib/auth/suspension";
import prisma from "@/lib/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockAuth, mockCompare } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCompare: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
  default: {
    compare: mockCompare,
  },
}));

vi.mock("@/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth")>();
  return {
    ...actual,
    auth: mockAuth,
  };
});

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

describe("Phase 4A: Authentication Security Remediation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isCustomerSuspended Helper", () => {
    test("returns false when user has no suspension audit logs", async () => {
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const result = await isCustomerSuspended("user-1");
      expect(result).toBe(false);
      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
        where: {
          entityType: "Customer",
          entityId: "user-1",
          action: { in: ["CUSTOMER_ACCOUNT_SUSPENDED", "CUSTOMER_ACCOUNT_ACTIVATED"] },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { action: true },
      });
    });

    test("returns true when latest audit log is CUSTOMER_ACCOUNT_SUSPENDED", async () => {
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const result = await isCustomerSuspended("user-suspended");
      expect(result).toBe(true);
    });

    test("returns false when latest audit log is CUSTOMER_ACCOUNT_ACTIVATED", async () => {
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_ACTIVATED",
      } as any);

      const result = await isCustomerSuspended("user-reactivated");
      expect(result).toBe(false);
    });

    test("fails closed (returns true) if database lookup throws an error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(prisma.auditLog, "findFirst").mockRejectedValueOnce(
        new Error("DB connection timeout")
      );

      const result = await isCustomerSuspended("user-err");
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("returns false safely when userId is missing or empty", async () => {
      expect(await isCustomerSuspended("")).toBe(false);
    });
  });

  describe("getCurrentUser: V-02 & Fail-Closed & Existing Sessions Suspension", () => {
    test("returns null if session is not present or has no user id", async () => {
      mockAuth.mockResolvedValueOnce(null);
      expect(await getCurrentUser()).toBeNull();

      mockAuth.mockResolvedValueOnce({ user: {} });
      expect(await getCurrentUser()).toBeNull();
    });

    test("V-02: returns null when database user does not exist (no stale JWT fallback)", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "deleted-user-uuid",
          name: "Ghost Admin",
          email: "ghost@example.com",
          role: "ADMIN",
        },
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test("Fail-Closed: returns null when database lookup throws an error (never authorizes stale JWT)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "user-with-stale-jwt",
          name: "Stale User",
          email: "stale@example.com",
          role: "ADMIN",
        },
      });

      vi.spyOn(prisma.user, "findUnique").mockRejectedValueOnce(
        new Error("Database connection lost")
      );

      const user = await getCurrentUser();
      expect(user).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("V-04: returns null for existing session when customer account is suspended", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "suspended-user-uuid",
          name: "Suspended Customer",
          email: "baduser@example.com",
          role: "CUSTOMER",
        },
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "suspended-user-uuid",
        name: "Suspended Customer",
        email: "baduser@example.com",
        phone: "01700000000",
        image: null,
        role: "CUSTOMER",
        emailVerified: new Date(),
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    test("P-01: skips suspension check for ADMIN role (only checks for CUSTOMER)", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "admin-user-uuid",
          name: "Admin User",
          email: "admin@vibelock.bd",
          role: "ADMIN",
        },
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "admin-user-uuid",
        name: "Admin User",
        email: "admin@vibelock.bd",
        phone: null,
        image: null,
        role: "ADMIN",
        emailVerified: new Date(),
      } as any);

      const auditSpy = vi.spyOn(prisma.auditLog, "findFirst");

      const user = await getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.role).toBe("ADMIN");
      expect(auditSpy).not.toHaveBeenCalled();
    });

    test("returns live user profile when user exists and is not suspended", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "active-user-uuid",
          name: "Active Customer",
          email: "active@example.com",
          role: "CUSTOMER",
        },
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "active-user-uuid",
        name: "Active Customer Updated",
        email: "active@example.com",
        phone: "01711111111",
        image: "https://example.com/photo.png",
        role: "CUSTOMER",
        emailVerified: new Date("2026-01-01"),
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const user = await getCurrentUser();
      expect(user).toEqual({
        id: "active-user-uuid",
        name: "Active Customer Updated",
        email: "active@example.com",
        phone: "01711111111",
        image: "https://example.com/photo.png",
        role: "CUSTOMER",
        emailVerified: new Date("2026-01-01"),
      });
    });
  });

  describe("V-04: Auth.js Provider Suspension Enforcement", () => {
    test("Google OAuth / OAuth signIn callback rejects suspended customer", async () => {
      const signInCallback = authConfig.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "oauth-suspended-id",
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const allowed = await signInCallback!({
        user: { id: "oauth-suspended-id", email: "suspended@gmail.com" } as any,
        account: { provider: "google" } as any,
        profile: {} as any,
      });

      expect(allowed).toBe(false);
    });

    test("Google OAuth / OAuth signIn callback allows active customer", async () => {
      const signInCallback = authConfig.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "oauth-active-id",
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const allowed = await signInCallback!({
        user: { id: "oauth-active-id", email: "active@gmail.com" } as any,
        account: { provider: "google" } as any,
        profile: {} as any,
      });

      expect(allowed).toBe(true);
    });

    test("P-02: deduplicates suspension check in OAuth signIn when dbUser is found by email", async () => {
      const signInCallback = authConfig.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "oauth-user-id",
      } as any);

      const auditSpy = vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const allowed = await signInCallback!({
        user: { id: "oauth-user-id", email: "user@example.com" } as any,
        account: { provider: "google" } as any,
        profile: {} as any,
      });

      expect(allowed).toBe(true);
      expect(auditSpy).toHaveBeenCalledTimes(1);
    });

    test("P-02: preserves fallback checking of user.id when no dbUser is found by email", async () => {
      const signInCallback = authConfig.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      // No user found by email
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

      // But user.id is suspended
      const auditSpy = vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const allowed = await signInCallback!({
        user: { id: "existing-linked-id", email: "newalias@example.com" } as any,
        account: { provider: "google" } as any,
        profile: {} as any,
      });

      expect(allowed).toBe(false);
      expect(auditSpy).toHaveBeenCalledTimes(1);
    });

    test("Phone + OTP authorize rejects suspended customer", async () => {
      const credentialsProvider = authConfig.providers.find(
        (p: any) => typeof p === "object" && p?.id === "credentials"
      ) as any;
      const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "phone-suspended-id",
        name: "Suspended Phone User",
        email: "01799999999@vibelock.bd",
        phone: "01799999999",
        role: "CUSTOMER",
        phoneVerified: new Date(),
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const user = await authorize({ phone: "01799999999", otp: "123456" });
      expect(user).toBeNull();
    });

    test("Phone + OTP authorize allows active customer", async () => {
      const credentialsProvider = authConfig.providers.find(
        (p: any) => typeof p === "object" && p?.id === "credentials"
      ) as any;
      const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "phone-active-id",
        name: "Active Phone User",
        email: "01788888888@vibelock.bd",
        phone: "01788888888",
        role: "CUSTOMER",
        phoneVerified: new Date(),
      } as any);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce(null);

      const user = await authorize({ phone: "01788888888", otp: "123456" });
      expect(user).toMatchObject({
        id: "phone-active-id",
        name: "Active Phone User",
        role: "CUSTOMER",
      });
    });

    test("P-03: Email + Password authorize rejects suspended customer", async () => {
      const credentialsProvider = authConfig.providers.find(
        (p: any) => typeof p === "object" && p?.id === "credentials"
      ) as any;
      const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "email-suspended-id",
        name: "Suspended Email User",
        email: "suspended@example.com",
        passwordHash: "hashed-pw",
        role: "CUSTOMER",
      } as any);

      mockCompare.mockResolvedValueOnce(true);

      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValueOnce({
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
      } as any);

      const user = await authorize({ email: "suspended@example.com", password: "correctpassword" });
      expect(user).toBeNull();
    });
  });
});
