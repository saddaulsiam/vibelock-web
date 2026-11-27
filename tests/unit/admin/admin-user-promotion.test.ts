/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Role } from "@prisma/client";

const {
  mockState,
  mockTx,
  mockPrisma,
  mockCheckRateLimit,
  mockRevalidatePath,
  MockAuthRequiredError,
  MockForbiddenError,
} = vi.hoisted(() => {
  class MockAuthRequiredError extends Error {
    constructor(message = "Authentication required") {
      super(message);
      this.name = "AuthRequiredError";
    }
  }

  class MockForbiddenError extends Error {
    constructor(message = "Forbidden") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  const mockState = {
    currentUser: null as { id: string; name?: string; email?: string; role: Role } | null,
  };

  const mockTx = {
    $executeRaw: vi.fn<any>(async () => 1),
    $queryRaw: vi.fn<any>(async () => []),
    user: {
      update: vi.fn(async () => ({})),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    passwordResetToken: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (cb: any) => cb(mockTx)),
    user: {
      findUnique: vi.fn(),
    },
  };

  const mockCheckRateLimit = vi.fn(async () => undefined);
  const mockRevalidatePath = vi.fn();

  return {
    mockState,
    mockTx,
    mockPrisma,
    mockCheckRateLimit,
    mockRevalidatePath,
    MockAuthRequiredError,
    MockForbiddenError,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/auth/authorization", () => ({
  AuthRequiredError: MockAuthRequiredError,
  ForbiddenError: MockForbiddenError,
  requireRole: vi.fn(async (...allowedRoles: Role[]) => {
    if (!mockState.currentUser) {
      throw new MockAuthRequiredError();
    }
    if (!allowedRoles.includes(mockState.currentUser.role)) {
      throw new MockForbiddenError();
    }
    return mockState.currentUser;
  }),
}));

import { AuthRequiredError, ForbiddenError } from "@/lib/auth/authorization";
import {
  lookupUserByEmailForPromotionAction,
  promoteExistingUserAction,
} from "@/lib/admin/users/admin-user-actions";

const ADMIN_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Super Admin",
  email: "admin@vibelock.bd",
  role: "ADMIN" as Role,
};

const MANAGER_USER = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Store Manager",
  email: "manager@vibelock.bd",
  role: "MANAGER" as Role,
};

const TARGET_CUSTOMER_ID = "33333333-3333-4333-8333-333333333333";

describe("Admin User Lookup & Promotion Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentUser = ADMIN_USER;
  });

  describe("lookupUserByEmailForPromotionAction", () => {
    test("rejects unauthenticated callers", async () => {
      mockState.currentUser = null;
      await expect(lookupUserByEmailForPromotionAction("user@example.com")).rejects.toThrow(
        AuthRequiredError
      );
    });

    test("rejects non-ADMIN callers (MANAGER)", async () => {
      mockState.currentUser = MANAGER_USER;
      await expect(lookupUserByEmailForPromotionAction("user@example.com")).rejects.toThrow(
        ForbiddenError
      );
    });

    test("returns error when rate limit is exceeded", async () => {
      mockCheckRateLimit.mockRejectedValueOnce(new Error("Rate limit exceeded"));
      const res = await lookupUserByEmailForPromotionAction("user@example.com");
      expect(res).toEqual({
        success: false,
        error: "Too many admin management attempts. Please try again later.",
      });
    });

    test("validates email format", async () => {
      const res = await lookupUserByEmailForPromotionAction("not-an-email");
      expect(res.success).toBe(false);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns error when no user exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const res = await lookupUserByEmailForPromotionAction("missing@example.com");
      expect(res).toEqual({
        success: false,
        error: "No registered user found with this email address.",
      });
    });

    test("normalizes email and returns safe user preview", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: TARGET_CUSTOMER_ID,
        name: "Saddaul Siam",
        email: "saddaul.siam1@gmail.com",
        role: "CUSTOMER",
        emailVerified: new Date("2026-01-01T00:00:00Z"),
      });

      const res = await lookupUserByEmailForPromotionAction("  Saddaul.Siam1@Gmail.com ");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "saddaul.siam1@gmail.com" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
        },
      });
      expect(res).toEqual({
        success: true,
        user: {
          id: TARGET_CUSTOMER_ID,
          name: "Saddaul Siam",
          email: "saddaul.siam1@gmail.com",
          role: "CUSTOMER",
          isEmailVerified: true,
        },
      });
    });
  });

  describe("promoteExistingUserAction", () => {
    test("rejects unauthenticated callers", async () => {
      mockState.currentUser = null;
      await expect(
        promoteExistingUserAction({ userId: TARGET_CUSTOMER_ID, newRole: "STAFF" })
      ).rejects.toThrow(AuthRequiredError);
    });

    test("rejects non-ADMIN callers", async () => {
      mockState.currentUser = MANAGER_USER;
      await expect(
        promoteExistingUserAction({ userId: TARGET_CUSTOMER_ID, newRole: "STAFF" })
      ).rejects.toThrow(ForbiddenError);
    });

    test("rejects unverified customer accounts", async () => {
      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_CUSTOMER_ID,
          role: "CUSTOMER",
          email: "unverified@example.com",
          name: "Unverified User",
          emailVerified: null,
        },
      ]);

      const res = await promoteExistingUserAction({
        userId: TARGET_CUSTOMER_ID,
        newRole: "ADMIN",
      });

      expect(res).toEqual({
        success: false,
        error:
          "Cannot promote an unverified customer account. The user must verify their email first.",
      });
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("rejects users who already have staff or admin access", async () => {
      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_CUSTOMER_ID,
          role: "STAFF",
          email: "staff@vibelock.bd",
          name: "Existing Staff",
          emailVerified: new Date(),
        },
      ]);

      const res = await promoteExistingUserAction({
        userId: TARGET_CUSTOMER_ID,
        newRole: "ADMIN",
      });

      expect(res).toEqual({
        success: false,
        error: "This user already has staff or administrator access.",
      });
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("promotes verified customer, invalidates sessions/tokens, and writes audit log", async () => {
      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_CUSTOMER_ID,
          role: "CUSTOMER",
          email: "saddaul.siam1@gmail.com",
          name: "Saddaul Siam",
          emailVerified: new Date("2026-01-01T00:00:00Z"),
        },
      ]);

      const res = await promoteExistingUserAction({
        userId: TARGET_CUSTOMER_ID,
        newRole: "ADMIN",
      });

      expect(res).toEqual({ success: true });
      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: TARGET_CUSTOMER_ID },
        data: { role: "ADMIN" },
      });
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: TARGET_CUSTOMER_ID },
      });
      expect(mockTx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: TARGET_CUSTOMER_ID },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ADMIN_USER.id,
          action: "ADMIN_USER_ROLE_UPDATED",
          entityType: "User",
          entityId: TARGET_CUSTOMER_ID,
          metadata: {
            targetEmail: "saddaul.siam1@gmail.com",
            previousRole: "CUSTOMER",
            newRole: "ADMIN",
            actorName: "Super Admin",
            promotionFlow: true,
          },
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/admins");
    });
  });
});
