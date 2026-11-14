/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma/client";
import { authConfig } from "@/auth";
import {
  getActiveSessionsAction,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
  revokeAllSessionsAction,
} from "@/app/actions/session";
import { changePasswordAction, resetPasswordAction } from "@/app/actions/account-security";
import { deleteAccountAction } from "@/app/actions/account-deletion";
import { logoutAction } from "@/app/actions/auth";
import { updateAdminUserRoleAction } from "@/lib/admin/users/admin-user-actions";

// Hoist mocks
const { mockCompare, mockHash, mockAuth, mockRequireUser, mockRequireRole } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockAuth: vi.fn(),
  mockRequireUser: vi.fn(),
  mockRequireRole: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
  hash: mockHash,
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
}));

vi.mock("@/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth")>();
  return {
    ...actual,
    auth: mockAuth,
    signOut: vi.fn(),
    signIn: vi.fn(),
  };
});

vi.mock("@/lib/auth/authorization", () => ({
  requireUser: mockRequireUser,
  requireRole: mockRequireRole,
  requireRoles: vi.fn(),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  ROLE_HIERARCHY: { CUSTOMER: 0, STAFF: 1, MANAGER: 2, ADMIN: 3 },
  hasRequiredRole: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => undefined),
  checkLoginRateLimit: vi.fn(async () => undefined),
  clearLoginRateLimit: vi.fn(async () => undefined),
  getIp: vi.fn(async () => "127.0.0.1"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Phase 4C: Session-Backed JWT & Reliable Session Revocation (V-01)", () => {
  const jwtCallback = authConfig.callbacks?.jwt;
  const sessionCallback = authConfig.callbacks?.session;
  const signOutEvent = authConfig.events?.signOut;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Session Creation on Sign-in", () => {
    test("Credentials sign-in creates exactly one Prisma Session record with secure identifier", async () => {
      const mockUser = {
        id: "cust-uuid-101",
        role: "CUSTOMER" as const,
        emailVerified: null,
      };

      const createSpy = vi.spyOn(prisma.session, "create").mockResolvedValue({
        id: "mock-session-id-1",
        sessionToken: "mock-hex-token-1",
        userId: "cust-uuid-101",
        expires: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = (await jwtCallback!({
        token: { sub: "cust-uuid-101" },
        user: mockUser as any,
        account: { provider: "credentials", type: "credentials" } as any,
      })) as any;

      expect(createSpy).toHaveBeenCalledTimes(1);
      const createArgs = createSpy.mock.calls[0][0].data;
      expect(createArgs.userId).toBe("cust-uuid-101");
      expect(typeof createArgs.id).toBe("string");
      expect(typeof createArgs.sessionToken).toBe("string");
      expect(createArgs.sessionToken.length).toBeGreaterThanOrEqual(32);
      expect(new Date(createArgs.expires).getTime()).toBeGreaterThan(Date.now());

      expect(token).toBeDefined();
      expect(token.id).toBe("cust-uuid-101");
      expect(token.role).toBe("CUSTOMER");
      expect(token.sessionToken).toBe(createArgs.sessionToken);
      expect(token.currentSessionId).toBe(createArgs.id);
    });

    test("Google OAuth sign-in creates exactly one Prisma Session record", async () => {
      const mockOAuthUser = {
        id: "oauth-user-777",
        role: "CUSTOMER" as const,
        emailVerified: new Date(),
      };

      const createSpy = vi.spyOn(prisma.session, "create").mockResolvedValue({
        id: "mock-oauth-session-1",
        sessionToken: "mock-oauth-hex-1",
        userId: "oauth-user-777",
        expires: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = (await jwtCallback!({
        token: { sub: "oauth-user-777" },
        user: mockOAuthUser as any,
        account: { provider: "google", type: "oauth" } as any,
      })) as any;

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0].data.userId).toBe("oauth-user-777");
      expect(token.sessionToken).toBeDefined();
      expect(token.currentSessionId).toBeDefined();
    });

    test("JWT refresh/update does NOT create duplicate Session records", async () => {
      const createSpy = vi.spyOn(prisma.session, "create");

      // Case A: User object present, but token already has sessionToken (e.g. repeated callback call)
      const existingToken = {
        sub: "user-101",
        id: "user-101",
        sessionToken: "already-created-token",
        currentSessionId: "already-created-id",
        role: "CUSTOMER" as const,
      };

      const tokenA = await jwtCallback!({
        token: existingToken,
        user: { id: "user-101", role: "CUSTOMER" } as any,
        account: null,
      });

      expect(createSpy).not.toHaveBeenCalled();
      expect(tokenA).toEqual(existingToken);

      // Case B: User object undefined (normal subsequent request token refresh / update trigger)
      vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
        id: "already-created-id",
        userId: "user-101",
        expires: new Date(Date.now() + 3600000),
        user: {
          id: "user-101",
          role: "CUSTOMER",
          emailVerified: null,
        },
      } as any);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValue(null);

      const tokenB = await jwtCallback!({
        token: existingToken,
        user: undefined as any,
        account: null,
      });

      expect(createSpy).not.toHaveBeenCalled();
      expect(tokenB).toEqual(existingToken);
    });
  });

  describe("2. JWT Verification & Session Validation", () => {
    test("Accepts valid, non-expired session matching the correct user", async () => {
      const validToken = {
        sub: "user-202",
        id: "user-202",
        sessionToken: "active-session-token-202",
        currentSessionId: "session-id-202",
        role: "CUSTOMER" as const,
      };

      vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
        id: "session-id-202",
        userId: "user-202",
        expires: new Date(Date.now() + 86400000),
        user: {
          id: "user-202",
          role: "CUSTOMER",
          emailVerified: null,
        },
      } as any);
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValue(null);

      const verified = await jwtCallback!({
        token: validToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeDefined();
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe("user-202");
    });

    test("Rejects session when Session record is missing (revoked)", async () => {
      const revokedToken = {
        sub: "user-202",
        id: "user-202",
        sessionToken: "revoked-token-xyz",
        currentSessionId: "session-id-xyz",
      };

      // Session record deleted from database
      vi.spyOn(prisma.session, "findUnique").mockResolvedValue(null);

      const verified = await jwtCallback!({
        token: revokedToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });

    test("Rejects session when Session record has expired", async () => {
      const expiredToken = {
        sub: "user-202",
        id: "user-202",
        sessionToken: "expired-token-xyz",
        currentSessionId: "session-id-xyz",
      };

      vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
        id: "session-id-xyz",
        userId: "user-202",
        expires: new Date(Date.now() - 5000), // Expired 5 seconds ago
        user: {
          id: "user-202",
          role: "CUSTOMER",
          emailVerified: null,
        },
      } as any);

      const verified = await jwtCallback!({
        token: expiredToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });

    test("Rejects session if record belongs to a different user (wrong user rejection)", async () => {
      const spoofedToken = {
        sub: "user-victim",
        id: "user-victim",
        sessionToken: "attacker-session-token",
        currentSessionId: "session-id-attacker",
      };

      // Session in DB belongs to user-attacker, not user-victim
      vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
        id: "session-id-attacker",
        userId: "user-attacker",
        expires: new Date(Date.now() + 86400000),
        user: {
          id: "user-attacker",
          role: "CUSTOMER",
          emailVerified: null,
        },
      } as any);

      const verified = await jwtCallback!({
        token: spoofedToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });

    test("Fails closed (returns null) on database query error", async () => {
      const testToken = {
        sub: "user-202",
        id: "user-202",
        sessionToken: "some-token",
        currentSessionId: "some-id",
      };

      vi.spyOn(prisma.session, "findUnique").mockRejectedValue(new Error("DB connection timeout"));

      const verified = await jwtCallback!({
        token: testToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });

    test("Legacy JWT lacking sessionToken is safely rejected", async () => {
      const legacyToken = {
        sub: "user-legacy",
        id: "user-legacy",
        role: "CUSTOMER" as const,
        emailVerified: null,
        // No sessionToken
      };

      const verified = await jwtCallback!({
        token: legacyToken,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });

    test("Suspended customer session is rejected in jwt callback", async () => {
      const token = {
        sub: "suspended-cust",
        id: "suspended-cust",
        sessionToken: "token-suspended",
        currentSessionId: "sess-suspended",
      };

      vi.spyOn(prisma.session, "findUnique").mockResolvedValue({
        id: "sess-suspended",
        userId: "suspended-cust",
        expires: new Date(Date.now() + 86400000),
        user: {
          id: "suspended-cust",
          role: "CUSTOMER",
          emailVerified: null,
        },
      } as any);

      // Audit log has suspension record
      vi.spyOn(prisma.auditLog, "findFirst").mockResolvedValue({
        id: "audit-1",
        action: "CUSTOMER_ACCOUNT_SUSPENDED",
        createdAt: new Date(),
      } as any);

      const verified = await jwtCallback!({
        token,
        user: undefined as any,
        account: null,
      });

      expect(verified).toBeNull();
    });
  });

  describe("3. Client Session Payload & Identification", () => {
    test("Session callback exposes currentSessionId but does NOT expose sensitive sessionToken", async () => {
      const mockSession = {
        user: {
          name: "Test User",
          email: "test@example.com",
        },
        expires: new Date().toISOString(),
      };

      const mockToken = {
        sub: "user-303",
        id: "user-303",
        role: "CUSTOMER" as const,
        emailVerified: null,
        sessionToken: "super-secret-hex-token-never-expose",
        currentSessionId: "public-session-uuid-303",
      };

      const session = (await (sessionCallback as any)({
        session: mockSession as any,
        token: mockToken as any,
        user: undefined as any,
      })) as any;

      expect(session.user.id).toBe("user-303");
      expect(session.user.role).toBe("CUSTOMER");
      expect(session.currentSessionId).toBe("public-session-uuid-303");
      // Verify sessionToken is NEVER on session or session.user
      expect(session.sessionToken).toBeUndefined();
      expect(session.user.sessionToken).toBeUndefined();
    });
  });

  describe("4. Session Management Server Actions", () => {
    test("getActiveSessionsAction returns active sessions with correct isCurrent flag", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-404", role: "CUSTOMER" });
      mockAuth.mockResolvedValue({
        user: { id: "user-404" },
        currentSessionId: "session-2",
      });

      vi.spyOn(prisma.session, "findMany").mockResolvedValue([
        { id: "session-1", expires: new Date(Date.now() + 86400000) },
        { id: "session-2", expires: new Date(Date.now() + 86400000) },
      ] as any);

      const result = await getActiveSessionsAction();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "session-1",
        isCurrent: false,
        expires: expect.any(Date),
      });
      expect(result[1]).toEqual({
        id: "session-2",
        isCurrent: true,
        expires: expect.any(Date),
      });
    });

    test("revokeSessionAction deletes specific session proving ownership (IDOR defense)", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-404", role: "CUSTOMER" });

      const deleteSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 1 });

      const result = await revokeSessionAction("target-session-id");

      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          id: "target-session-id",
          userId: "user-404",
        },
      });
      expect(result).toEqual({ success: true });
    });

    test("revokeSessionAction returns error if session does not belong to caller", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-404", role: "CUSTOMER" });

      vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 0 });

      const result = await revokeSessionAction("other-user-session");

      expect(result).toEqual({ error: "Session not found or already revoked." });
    });

    test("revokeAllOtherSessionsAction deletes all sessions except current", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-404", role: "CUSTOMER" });
      mockAuth.mockResolvedValue({
        user: { id: "user-404" },
        currentSessionId: "current-session-id",
      });

      const deleteSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 3 });

      const result = await revokeAllOtherSessionsAction();

      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          userId: "user-404",
          id: {
            not: "current-session-id",
          },
        },
      });
      expect(result).toEqual({ success: true });
    });

    test("revokeAllSessionsAction deletes all sessions for the user", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-404", role: "CUSTOMER" });

      const deleteSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 4 });

      const result = await revokeAllSessionsAction();

      expect(deleteSpy).toHaveBeenCalledWith({
        where: {
          userId: "user-404",
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("5. Lifecycle Revocation (Password Change, Reset, Logout, Demotion, Account Deletion)", () => {
    test("changePasswordAction deletes all sessions for the user", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-pwd-change", role: "CUSTOMER" });
      mockCompare.mockResolvedValue(true);
      mockHash.mockResolvedValue("new-hashed-password");

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        passwordHash: "old-hashed-password",
      } as any);

      const txSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (fns: any) => {
        return Promise.all(fns);
      });
      const deleteSessionsSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 2 });
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

      const result = await changePasswordAction({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmNewPassword: "NewPassword123!",
      });

      expect(result).toEqual({ success: true });
      expect(txSpy).toHaveBeenCalled();
      expect(deleteSessionsSpy).toHaveBeenCalledWith({
        where: { userId: "user-pwd-change" },
      });
    });

    test("resetPasswordAction deletes all sessions for the user", async () => {
      mockHash.mockResolvedValue("reset-new-hash");

      vi.spyOn(prisma.passwordResetToken, "findUnique").mockResolvedValue({
        id: "token-rec-1",
        userId: "user-reset-1",
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      } as any);
      vi.spyOn(prisma.passwordResetToken, "updateMany").mockResolvedValue({ count: 1 });

      const txSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (fns: any) => {
        return Promise.all(fns);
      });
      const deleteSessionsSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 2 });
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

      const result = await resetPasswordAction({
        token: "valid-raw-reset-token",
        newPassword: "NewSecurePassword123!",
        confirmNewPassword: "NewSecurePassword123!",
      });

      expect(result).toEqual({ success: true });
      expect(txSpy).toHaveBeenCalled();
      expect(deleteSessionsSpy).toHaveBeenCalledWith({
        where: { userId: "user-reset-1" },
      });
    });

    test("logoutAction deletes current session in database", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-logout" },
        currentSessionId: "session-to-logout",
      });

      const deleteSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 1 });

      await logoutAction({ redirect: false });

      expect(deleteSpy).toHaveBeenCalledWith({
        where: { id: "session-to-logout" },
      });
    });

    test("events.signOut deletes session matching sessionToken", async () => {
      const deleteSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 1 });

      await signOutEvent!({
        token: {
          sessionToken: "signout-event-token-hex",
        },
      } as any);

      expect(deleteSpy).toHaveBeenCalledWith({
        where: { sessionToken: "signout-event-token-hex" },
      });
    });

    test("deleteAccountAction deletes all sessions for the user", async () => {
      mockRequireUser.mockResolvedValue({ id: "user-delete", role: "CUSTOMER" });
      mockCompare.mockResolvedValue(true);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        passwordHash: "valid-hash",
      } as any);

      const txSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (fns: any) => {
        return Promise.all(fns);
      });
      const deleteSessionsSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 3 });
      vi.spyOn(prisma.user, "delete").mockResolvedValue({} as any);

      const result = await deleteAccountAction({ password: "ValidPassword123!" });

      expect(result).toEqual({ success: true });
      expect(txSpy).toHaveBeenCalled();
      expect(deleteSessionsSpy).toHaveBeenCalledWith({
        where: { userId: "user-delete" },
      });
    });

    test("updateAdminUserRoleAction deletes all sessions when user role is modified", async () => {
      mockRequireRole.mockResolvedValue({ id: "admin-root", role: "ADMIN" });

      const txSpy = vi.spyOn(prisma, "$transaction").mockImplementation(async (fns: any) => {
        return Promise.all(fns);
      });
      const deleteSessionsSpy = vi.spyOn(prisma.session, "deleteMany").mockResolvedValue({ count: 2 });
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as any);

      const result = await updateAdminUserRoleAction({
        userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        newRole: "CUSTOMER",
      });

      expect(result).toEqual({ success: true });
      expect(txSpy).toHaveBeenCalled();
      expect(deleteSessionsSpy).toHaveBeenCalledWith({
        where: { userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
      });
    });
  });
});
