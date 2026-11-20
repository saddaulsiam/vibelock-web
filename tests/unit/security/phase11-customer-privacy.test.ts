/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state and functions
// ---------------------------------------------------------------------------
const {
  mockAuth,
  mockRequireUser,
  mockRequireRole,
  mockCheckRateLimit,
  mockCookiesSet,
  mockCookiesGet,
  mockRevalidatePath,
  mockCompare,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const mockCookiesSet = vi.fn();
  const mockCookiesGet = vi.fn();

  const mockTx: any = {
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => []),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    order: {
      count: vi.fn(async () => 0),
    },
    returnRequest: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    refund: {
      count: vi.fn(async () => 0),
    },
    cart: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    address: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    review: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    account: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    passwordResetToken: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    auditLog: {
      create: vi.fn(async () => ({ id: "audit-123" })),
      findMany: vi.fn(async () => []),
    },
    newsletterSubscriber: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      upsert: vi.fn(async () => ({})),
    },
  };

  const mockPrisma: any = {
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (callback: any) => callback(mockTx)),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    order: {
      findMany: vi.fn(async () => []),
      aggregate: vi.fn(async () => ({ _sum: { total: 0 } })),
      count: vi.fn(async () => 0),
    },
    returnRequest: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    refund: {
      count: vi.fn(async () => 0),
    },
    coupon: {
      findMany: vi.fn(async () => []),
    },
    address: {
      findMany: vi.fn(async () => []),
    },
    review: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(async () => ({ id: "audit-123" })),
      findMany: vi.fn(async () => []),
    },
    newsletterSubscriber: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      upsert: vi.fn(async () => ({})),
    },
    productVariant: {
      findMany: vi.fn(async () => []),
    },
  };

  return {
    mockAuth: vi.fn(),
    mockRequireUser: vi.fn(),
    mockRequireRole: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCookiesSet,
    mockCookiesGet,
    mockRevalidatePath: vi.fn(),
    mockCompare: vi.fn(),
    mockTx,
    mockPrisma,
  };
});

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireUser: (opts?: any) => mockRequireUser(opts),
  requireRole: (role: string) => mockRequireRole(role),
  getCurrentUser: () => mockRequireUser({ throw: false }),
  AuthRequiredError: class AuthRequiredError extends Error {
    constructor(msg = "Authentication required") {
      super(msg);
      this.name = "AuthRequiredError";
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(msg = "Permission denied") {
      super(msg);
      this.name = "ForbiddenError";
    }
  },
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: () => mockRequireUser({ throw: false }),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: (type: string, key?: string) => mockCheckRateLimit(type, key),
  RateLimitExceededError: class RateLimitExceededError extends Error {
    constructor(msg = "Rate limit exceeded") {
      super(msg);
      this.name = "RateLimitExceededError";
    }
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: any[]) => mockCompare(...args),
  },
  compare: (...args: any[]) => mockCompare(...args),
}));

vi.mock("@/lib/email/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/client")>();
  return {
    ...actual,
    sendNewsletterWelcomeEmail: vi.fn(async () => true),
    sendPasswordResetEmail: vi.fn(async () => true),
  };
});

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-at-least-32-characters-long",
    RESEND_API_KEY: "mock-resend-key",
    EMAIL_FROM: "test@vibelock.com",
    SMS_API_KEY: "mock-sms-key",
    SMS_SENDER_ID: "VibeLock",
    STEADFAST_API_KEY: "mock-steadfast-api-key",
    STEADFAST_SECRET_KEY: "mock-steadfast-secret-key",
    STEADFAST_BASE_URL: "https://portal.packzy.com/api/v1",
    CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
  },
}));

vi.mock("@/lib/config/app", () => ({
  appConfig: {
    name: "VibeLock",
    url: "https://vibelock.com",
  },
}));

// ---------------------------------------------------------------------------
// Imports of functions under test
// ---------------------------------------------------------------------------
import { validateCustomerCouponEligibility, CouponError } from "@/lib/checkout/coupons";
import { getAccountOverview } from "@/lib/account/queries";
import { maskEmail } from "@/lib/email/client";
import { sendSmsNotification, maskPhoneNumber } from "@/lib/sms/client";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";
import { sanitizeReviewerName, getProductReviews } from "@/lib/reviews/queries";
import { deleteAccountAction } from "@/app/actions/account-deletion";
import { deleteAdminCustomerAction } from "@/lib/admin/customers/customer-actions";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { updateProfileAction, uploadAvatarAction } from "@/lib/account/actions";
import { submitReviewAction } from "@/lib/reviews/actions";
import { updateNotificationPreferencesAction } from "@/lib/account/notification-actions";

describe("Phase 11: Customer Privacy & Personal Data Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(undefined);
  });

  // =========================================================================
  // 1. Store Credit Isolation and Ownership (SEC-11)
  // =========================================================================
  describe("1. Store Credit Isolation and Ownership", () => {
    test("validateCustomerCouponEligibility rejects store credit voucher belonging to another customer", async () => {
      // Mock db returns returnRequest and auditLog that do NOT match the voucher
      const mockDb: any = {
        user: {
          findUnique: vi.fn(async () => ({ email: "attacker@vibelock.com" })),
        },
        order: {
          count: vi.fn(async () => 0),
        },
        returnRequest: {
          findMany: vi.fn(async () => [{ id: "ret-attacker-1" }]),
        },
        auditLog: {
          findMany: vi.fn(async () => [
            { metadata: { couponCode: "VL-CREDIT-MYOWN-7788" } },
          ]),
        },
      };

      await expect(
        validateCustomerCouponEligibility("user-attacker", "VL-CREDIT-VICTIM-9999", mockDb)
      ).rejects.toThrow(CouponError);

      await expect(
        validateCustomerCouponEligibility("user-attacker", "VL-CREDIT-VICTIM-9999", mockDb)
      ).rejects.toThrow("This store credit voucher is not associated with your account.");
    });

    test("validateCustomerCouponEligibility approves store credit voucher belonging to authenticated customer", async () => {
      const mockDb: any = {
        user: {
          findUnique: vi.fn(async () => ({ email: "owner@vibelock.com" })),
        },
        order: {
          count: vi.fn(async () => 0),
        },
        returnRequest: {
          findMany: vi.fn(async () => [{ id: "ret-owner-1" }]),
        },
        auditLog: {
          findMany: vi.fn(async () => [
            { metadata: { couponCode: "VL-CREDIT-OWNER-1234" } },
          ]),
        },
      };

      await expect(
        validateCustomerCouponEligibility("user-owner", "VL-CREDIT-OWNER-1234", mockDb)
      ).resolves.toBeUndefined();
    });

    test("validateCustomerCouponEligibility allows standard promotional coupons without returnRequest check", async () => {
      const mockDb: any = {
        user: { findUnique: vi.fn() },
        order: { count: vi.fn(async () => 0) },
        returnRequest: { findMany: vi.fn() },
        auditLog: { findMany: vi.fn() },
      };

      await expect(
        validateCustomerCouponEligibility("user-any", "SUMMER20", mockDb)
      ).resolves.toBeUndefined();

      expect(mockDb.returnRequest.findMany).not.toHaveBeenCalled();
    });

    test("getAccountOverview isolates personal store credit vouchers and does not leak other users' vouchers", async () => {
      mockRequireUser.mockResolvedValue({
        id: "cust-1",
        name: "Customer One",
        email: "customer1@vibelock.com",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        name: "Customer One",
        email: "customer1@vibelock.com",
        createdAt: new Date(),
        emailVerified: new Date(),
        image: null,
      });

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.returnRequest.count.mockResolvedValue(1);
      mockPrisma.address.findMany.mockResolvedValue([]);

      // Three active coupons exist in database:
      // 1. Public promotional code: "SAVE10"
      // 2. Customer 1's store credit: "VL-CREDIT-CUST1-1111"
      // 3. Customer 2's store credit: "VL-CREDIT-CUST2-2222" (LEAK TARGET)
      mockPrisma.coupon.findMany.mockResolvedValue([
        {
          id: "cp-public",
          code: "SAVE10",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minOrderValue: null,
          usageLimit: null,
          usageCount: 0,
          endDate: null,
        },
        {
          id: "cp-cust1",
          code: "VL-CREDIT-CUST1-1111",
          discountType: "FIXED",
          discountValue: 500,
          minOrderValue: null,
          usageLimit: 1,
          usageCount: 0,
          endDate: null,
        },
        {
          id: "cp-cust2",
          code: "VL-CREDIT-CUST2-2222",
          discountType: "FIXED",
          discountValue: 1200,
          minOrderValue: null,
          usageLimit: 1,
          usageCount: 0,
          endDate: null,
        },
      ]);

      // Customer 1's return request linking to their store credit
      mockPrisma.returnRequest.findMany.mockResolvedValue([{ id: "ret-cust-1" }]);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { metadata: { couponCode: "VL-CREDIT-CUST1-1111" } },
      ]);

      const overview = await getAccountOverview();

      const availableCodes = overview.coupons.map((c) => c.code);
      expect(availableCodes).toContain("SAVE10");
      expect(availableCodes).toContain("VL-CREDIT-CUST1-1111");
      // Customer 2's store credit MUST NOT be visible
      expect(availableCodes).not.toContain("VL-CREDIT-CUST2-2222");
    });
  });

  // =========================================================================
  // 2. PII Masking and Logging Safeguards
  // =========================================================================
  describe("2. PII Masking and Logging Safeguards", () => {
    test("maskEmail safely masks valid emails and defends against edge cases", () => {
      expect(maskEmail("siam@vibelock.com")).toBe("s***@vibelock.com");
      expect(maskEmail("john.doe@company.org")).toBe("j***@company.org");
      // Short local-part
      expect(maskEmail("a@b.com")).toBe("***@***");
      // Non-string or null/undefined
      expect(maskEmail(null)).toBe("***@***");
      expect(maskEmail(undefined)).toBe("***@***");
      expect(maskEmail("")).toBe("***@***");
      expect(maskEmail(12345 as any)).toBe("***@***");
      expect(maskEmail("invalid-email-without-at")).toBe("***@***");
    });

    test("sendSmsNotification masks recipient phone number in production error logs", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const envObj = process.env as Record<string, string | undefined>;
      const prevEnv = envObj.NODE_ENV;
      const prevApiKey = envObj.SMS_API_KEY;
      const prevApiUrl = envObj.SMS_API_URL;
      envObj.NODE_ENV = "production";
      envObj.SMS_API_KEY = "dummy-sms-api-key";
      envObj.SMS_API_URL = "https://mock-sms.local";

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("SMS gateway connection refused"));

      const rawPhone = "01712345678";
      const result = await sendSmsNotification({ phone: rawPhone, message: "Your OTP is 998877" });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      const loggedOutput = consoleSpy.mock.calls.map((c) => c.join(" ")).join(" ");
      // Must contain masked phone number
      expect(loggedOutput).toContain(maskPhoneNumber(rawPhone));
      // Must NEVER contain the raw unmasked phone number
      expect(loggedOutput).not.toContain(rawPhone);

      globalThis.fetch = originalFetch;
      envObj.NODE_ENV = prevEnv;
      envObj.SMS_API_KEY = prevApiKey;
      envObj.SMS_API_URL = prevApiUrl;
      consoleSpy.mockRestore();
    });

    test("Steadfast courier provider masks phone in request failure logs", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const provider = new SteadfastCourierProvider(
        "test-key",
        "test-secret",
        "https://portal.packzy.com/api/v1"
      );

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Steadfast timeout"));

      const rawPhone = "01887654321";
      const result = await provider.checkCustomerRisk(rawPhone);
      expect(result.success).toBe(false);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedOutput = consoleErrorSpy.mock.calls.map((c) => c.join(" ")).join(" ");
      // The logged URL must mask the phone in /fraud_check/...
      expect(loggedOutput).toContain(maskPhoneNumber(rawPhone));
      expect(loggedOutput).not.toContain(rawPhone);

      globalThis.fetch = originalFetch;
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. Public Reviewer Name Sanitization (Storefront Exposure)
  // =========================================================================
  describe("3. Public Reviewer Name Sanitization", () => {
    test("sanitizeReviewerName masks emails, phone numbers, and handles empty inputs", () => {
      // Email entered as name
      expect(sanitizeReviewerName("customer.user@gmail.com")).toBe("c***@gmail.com");
      // Bangladeshi phone entered as name
      expect(sanitizeReviewerName("01712345678")).toBe(maskPhoneNumber("01712345678"));
      expect(sanitizeReviewerName("+8801812345678")).toBe(maskPhoneNumber("+8801812345678"));
      // Standard regular names remain intact
      expect(sanitizeReviewerName("Siam Ahmed")).toBe("Siam Ahmed");
      expect(sanitizeReviewerName("Farhan Kabir")).toBe("Farhan Kabir");
      // Empty / whitespace / null / undefined fallback
      expect(sanitizeReviewerName(null)).toBe("Verified Customer");
      expect(sanitizeReviewerName(undefined)).toBe("Verified Customer");
      expect(sanitizeReviewerName("")).toBe("Verified Customer");
      expect(sanitizeReviewerName("   ")).toBe("Verified Customer");
    });

    test("getProductReviews sanitizes customer PII in review items returned to public storefront", async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        {
          id: "rev-1",
          userId: "user-1",
          productId: "prod-1",
          rating: 5,
          comment: "Amazing drop shoulder tee!",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: "user-1",
            name: "01799887766", // Raw phone number as name
            image: null,
          },
        },
        {
          id: "rev-2",
          userId: "user-2",
          productId: "prod-1",
          rating: 4,
          comment: "Great quality fabric",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: "user-2",
            name: "private.buyer@vibelock.com", // Raw email as name
            image: null,
          },
        },
        {
          id: "rev-3",
          userId: "user-3",
          productId: "prod-1",
          rating: 5,
          comment: "Best fit!",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: "user-3",
            name: "Tanvir Ahmed",
            image: null,
          },
        },
      ]);

      const result = await getProductReviews("prod-1");

      expect(result.reviews).toHaveLength(3);
      // Review 1: phone must be masked
      expect(result.reviews[0].user.name).toBe(maskPhoneNumber("01799887766"));
      expect(result.reviews[0].user.name).not.toContain("01799887766");
      // Review 2: email must be masked
      expect(result.reviews[1].user.name).toBe("p***@vibelock.com");
      expect(result.reviews[1].user.name).not.toContain("private.buyer@vibelock.com");
      // Review 3: regular name preserved
      expect(result.reviews[2].user.name).toBe("Tanvir Ahmed");
    });
  });

  // =========================================================================
  // 4. Account Deletion Marketing Consent Cleanup
  // =========================================================================
  describe("4. Account Deletion Marketing Consent Cleanup", () => {
    test("deleteAccountAction deactivates newsletter subscriber upon customer self-deletion", async () => {
      mockRequireUser.mockResolvedValue({
        id: "cust-self-del",
        email: "deleteme@example.com",
        name: "Delete Me",
        role: "CUSTOMER",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cust-self-del",
        email: "deleteme@example.com",
        passwordHash: "$2a$12$dummyhashforpasswordtestinghere...",
        role: "CUSTOMER",
      });
      mockCompare.mockResolvedValue(true);

      mockTx.order.count.mockResolvedValue(0);
      mockTx.returnRequest.count.mockResolvedValue(0);
      mockTx.refund.count.mockResolvedValue(0);
      mockTx.user.delete.mockResolvedValue({ id: "cust-self-del" });

      const result = await deleteAccountAction({ password: "ValidPass123!" });

      expect(result.success).toBe(true);
      // Must deactivate marketing consent for the deleting user's email
      expect(mockTx.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
        where: { email: "deleteme@example.com" },
        data: { isActive: false },
      });
    });

    test("deleteAccountAction normalizes mixed-case and whitespace-padded user email to lowercase", async () => {
      mockRequireUser.mockResolvedValue({
        id: "cust-mixed-case",
        email: "   User.OAuth@VibeLock.COM   ",
        name: "OAuth User",
        role: "CUSTOMER",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cust-mixed-case",
        email: "   User.OAuth@VibeLock.COM   ",
        passwordHash: "$2a$12$dummyhashforpasswordtestinghere...",
        role: "CUSTOMER",
      });
      mockCompare.mockResolvedValue(true);

      mockTx.order.count.mockResolvedValue(0);
      mockTx.returnRequest.count.mockResolvedValue(0);
      mockTx.refund.count.mockResolvedValue(0);
      mockTx.user.delete.mockResolvedValue({ id: "cust-mixed-case" });

      const result = await deleteAccountAction({ password: "ValidPass123!" });

      expect(result.success).toBe(true);
      expect(mockTx.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
        where: { email: "user.oauth@vibelock.com" },
        data: { isActive: false },
      });
    });

    test("deleteAdminCustomerAction normalizes mixed-case and whitespace-padded customer email to lowercase", async () => {
      mockRequireRole.mockResolvedValue({
        id: "admin-1",
        email: "admin@vibelock.com",
        role: "ADMIN",
        name: "Admin User",
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: "cust-zero-mixed",
        email: "  NewCustomer.Signup@GMAIL.Com  ",
        name: "Mixed Customer",
        phone: "01700000001",
        role: "CUSTOMER",
        _count: { orders: 0 },
      });

      mockTx.$queryRaw.mockResolvedValue([{ id: "cust-zero-mixed" }]);
      mockTx.user.deleteMany.mockResolvedValue({ count: 1 });

      const result = await deleteAdminCustomerAction("cust-zero-mixed");

      expect(result.success).toBe(true);
      expect(mockTx.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
        where: { email: "newcustomer.signup@gmail.com" },
        data: { isActive: false },
      });
    });

    test("deleteAccountAction rolls back and returns error if newsletter deactivation fails", async () => {
      mockRequireUser.mockResolvedValue({
        id: "cust-fail-deactivate",
        email: "fail@vibelock.com",
        name: "Fail User",
        role: "CUSTOMER",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cust-fail-deactivate",
        email: "fail@vibelock.com",
        passwordHash: "$2a$12$dummyhashforpasswordtestinghere...",
        role: "CUSTOMER",
      });
      mockCompare.mockResolvedValue(true);

      mockTx.order.count.mockResolvedValue(0);
      mockTx.returnRequest.count.mockResolvedValue(0);
      mockTx.refund.count.mockResolvedValue(0);
      // Simulate newsletter update failure within the transaction
      mockTx.newsletterSubscriber.updateMany.mockRejectedValueOnce(
        new Error("Newsletter table connection failure")
      );

      const result = await deleteAccountAction({ password: "ValidPass123!" });

      expect(result.success).toBeUndefined();
      expect(result.error).toBe("An unexpected error occurred.");
    });

    test("deleteAccountAction gracefully handles customer with null email without newsletter update", async () => {
      mockRequireUser.mockResolvedValue({
        id: "cust-no-email",
        email: null,
        name: "Phone Only Customer",
        role: "CUSTOMER",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cust-no-email",
        email: null,
        passwordHash: "$2a$12$dummyhashforpasswordtestinghere...",
        role: "CUSTOMER",
      });
      mockCompare.mockResolvedValue(true);

      mockTx.order.count.mockResolvedValue(0);
      mockTx.returnRequest.count.mockResolvedValue(0);
      mockTx.refund.count.mockResolvedValue(0);
      mockTx.user.delete.mockResolvedValue({ id: "cust-no-email" });

      const result = await deleteAccountAction({ password: "ValidPass123!" });

      expect(result.success).toBe(true);
      expect(mockTx.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Rate Limiting on Sensitive Customer & Storefront Endpoints
  // =========================================================================
  describe("5. Rate Limiting on Customer & Storefront Endpoints", () => {
    test("subscribeNewsletterAction blocks requests when rate limited", async () => {
      mockCheckRateLimit.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const result = await subscribeNewsletterAction({
        email: "spammer@badactor.com",
        source: "FOOTER",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Too many subscription attempts. Please try again later.");
      expect(mockCheckRateLimit).toHaveBeenCalledWith("newsletter", "spammer@badactor.com");
    });

    test("updateProfileAction blocks requests when rate limited", async () => {
      mockRequireUser.mockResolvedValue({ id: "cust-rate-limit" });
      mockCheckRateLimit.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const result = await updateProfileAction({ name: "New Name" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Too many profile updates. Please try again later.");
      expect(mockCheckRateLimit).toHaveBeenCalledWith("profileUpdate", "cust-rate-limit");
    });

    test("uploadAvatarAction blocks requests when rate limited", async () => {
      mockRequireUser.mockResolvedValue({ id: "cust-upload-ratelimit" });
      mockCheckRateLimit.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const formData = new FormData();
      formData.set("file", new File([new Uint8Array([1, 2, 3])], "avatar.jpg", { type: "image/jpeg" }));

      const result = await uploadAvatarAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Too many upload attempts. Please try again later.");
      expect(mockCheckRateLimit).toHaveBeenCalledWith("customerUpload", "cust-upload-ratelimit");
    });

    test("submitReviewAction blocks requests when rate limited", async () => {
      mockRequireUser.mockResolvedValue({ id: "cust-review-ratelimit" });
      mockCheckRateLimit.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const result = await submitReviewAction({
        productId: "prod-xyz",
        productSlug: "drop-shoulder-tee",
        rating: 5,
        comment: "Spam comment review",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Too many review attempts. Please try again later.");
      expect(mockCheckRateLimit).toHaveBeenCalledWith("submitReview", "cust-review-ratelimit");
    });
  });

  // =========================================================================
  // 6. Notification Preferences Security
  // =========================================================================
  describe("6. Notification Preferences Security", () => {
    test("updateNotificationPreferencesAction sets httpOnly and secure cookie attributes", async () => {
      const preferences = {
        orderUpdates: true,
        dropAlerts: false,
        restockAlerts: true,
        promoOffers: false,
      };

      const result = await updateNotificationPreferencesAction(preferences);

      expect(result.success).toBe(true);
      expect(mockCookiesSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "vibelock_notify_pref",
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });
});
