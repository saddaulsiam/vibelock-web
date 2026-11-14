/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";

const { mockPrismaTx, mockManagerUser } = vi.hoisted(() => {
  const mockPrismaTx = {
    $queryRaw: vi.fn(),
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    cart: {
      deleteMany: vi.fn(),
    },
    review: {
      deleteMany: vi.fn(),
    },
    account: {
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const mockManagerUser = {
    id: "manager-admin-id-999",
    name: "Operations Manager",
    email: "manager@vibelock.bd",
    role: "MANAGER" as const,
  };

  return { mockPrismaTx, mockManagerUser };
});

vi.mock("@/lib/config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vibelock_test",
    AUTH_SECRET: "12345678901234567890123456789012",
  },
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn(async () => mockManagerUser),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({
  sendPasswordResetEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/config/app", () => ({
  appConfig: {
    url: "https://vibelock.bd",
  },
}));

vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      ...mockPrismaTx,
      $transaction: vi.fn(async (cb: unknown) => {
        if (typeof cb === "function") {
          return cb(mockPrismaTx);
        }
        if (Array.isArray(cb)) {
          return Promise.all(cb);
        }
        return cb;
      }),
    },
  };
});

import prisma from "@/lib/prisma/client";
import {
  adminGenerateCustomerPasswordResetLinkAction,
  updateAdminCustomerAction,
  deleteAdminCustomerAction,
  toggleCustomerAccountSuspensionAction,
  adminSendCustomerPasswordResetEmailAction,
  toggleCustomerCodBlockAction,
  addCustomerStaffNoteAction,
} from "@/lib/admin/customers/customer-actions";

describe("Phase 5A RBAC Isolation: Customer Management Action Role Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Reusable helper to configure user lookup response based on role query
  function setupMockUserLookup(targetId: string, role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" | null) {
    // Mock row-level lock $queryRaw
    (mockPrismaTx.$queryRaw as any).mockImplementation(async () => {
      if (role === "CUSTOMER") {
        return [
          {
            id: targetId,
            email: "target-customer@example.com",
            name: "Target Customer",
            role: "CUSTOMER",
          },
        ];
      }
      return [];
    });

    (prisma.user.findFirst as any).mockImplementation(async (args: any) => {
      // If query requires role: "CUSTOMER", only return a record when the target's actual role is CUSTOMER
      if (args?.where?.role === "CUSTOMER") {
        if (role === "CUSTOMER" && (!args.where.id || args.where.id === targetId)) {
          return {
            id: targetId,
            email: "target-customer@example.com",
            name: "Target Customer",
            phone: "01700000001",
            role: "CUSTOMER",
            passwordHash: "$2a$12$fakeHashForTesting",
            _count: { orders: 0 },
          };
        }
        return null; // Non-customers or non-matching IDs return null
      }

      // For conflict checks (e.g. where: { id: { not: id }, OR: ... })
      if (args?.where?.id?.not) {
        return null;
      }

      // General fallback lookup without role: "CUSTOMER" requirement
      if (role && (!args?.where?.id || args?.where?.id === targetId)) {
        return {
          id: targetId,
          email: `target-${role.toLowerCase()}@example.com`,
          name: `Target ${role}`,
          phone: "01700000002",
          role,
          passwordHash: "$2a$12$fakeHashForTesting",
          _count: { orders: 0 },
        };
      }
      return null;
    });
  }

  // =========================================================================
  // 1. adminGenerateCustomerPasswordResetLinkAction
  // =========================================================================
  describe("1. adminGenerateCustomerPasswordResetLinkAction", () => {
    test("MANAGER generates a reset link for a valid CUSTOMER target", async () => {
      setupMockUserLookup("cust-valid-1", "CUSTOMER");
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: "token-1" } as any);

      const result = await adminGenerateCustomerPasswordResetLinkAction("cust-valid-1");

      expect(result.success).toBe(true);
      expect(result.resetLink).toBeDefined();
      expect(result.resetLink).toContain("https://vibelock.bd/reset-password?token=");
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const tokenCreateArg = vi.mocked(prisma.passwordResetToken.create).mock.calls[0][0].data;
      expect(tokenCreateArg.userId).toBe("cust-valid-1");
    });

    test("locks target CUSTOMER row using FOR UPDATE during token generation", async () => {
      setupMockUserLookup("cust-lock-1", "CUSTOMER");
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: "token-1" } as any);

      await adminGenerateCustomerPasswordResetLinkAction("cust-lock-1");

      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("FOR UPDATE");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: no token created and no reset link returned",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-1`, rejectedRole);

        const result = await adminGenerateCustomerPasswordResetLinkAction(`user-${rejectedRole.toLowerCase()}-1`);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(result.resetLink).toBeUndefined();
        expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      }
    );

    test("REJECTS missing target ID or empty whitespace", async () => {
      const resultEmpty = await adminGenerateCustomerPasswordResetLinkAction("");
      expect(resultEmpty.success).toBe(false);
      expect(resultEmpty.error).toBe("Customer ID is required.");
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();

      const resultWhitespace = await adminGenerateCustomerPasswordResetLinkAction("   ");
      expect(resultWhitespace.success).toBe(false);
      expect(resultWhitespace.error).toBe("Customer ID is required.");
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    test("REJECTS non-existent customer ID", async () => {
      setupMockUserLookup("missing-user-id", null);

      const result = await adminGenerateCustomerPasswordResetLinkAction("missing-user-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer profile not found.");
      expect(result.resetLink).toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. updateAdminCustomerAction
  // =========================================================================
  describe("2. updateAdminCustomerAction", () => {
    test("MANAGER updates a valid CUSTOMER account", async () => {
      setupMockUserLookup("cust-update-1", "CUSTOMER");
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });

      const result = await updateAdminCustomerAction({
        id: "cust-update-1",
        name: "Updated Customer Name",
        email: "updated.customer@example.com",
        phone: "01799999999",
      });

      expect(result.success).toBe(true);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: "cust-update-1", role: "CUSTOMER" },
        data: {
          name: "Updated Customer Name",
          email: "updated.customer@example.com",
          phone: "01799999999",
        },
      });
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: cannot modify non-customer profile",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-2`, rejectedRole);

        const result = await updateAdminCustomerAction({
          id: `user-${rejectedRole.toLowerCase()}-2`,
          name: "Attacker Rename",
          email: "hijacked@example.com",
          phone: "01788888888",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.user.updateMany).not.toHaveBeenCalled();
      }
    );

    test("REJECTS update when updateMany count is 0 (atomic role change race defense)", async () => {
      setupMockUserLookup("cust-race-1", "CUSTOMER");
      // Simulate race: initial lookup succeeded, but role changed before updateMany ran
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

      const result = await updateAdminCustomerAction({
        id: "cust-race-1",
        name: "Race Test Name",
        email: "race@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer profile not found.");
    });

    test("REJECTS update when ID is missing or empty", async () => {
      const result = await updateAdminCustomerAction({
        id: "",
        name: "No ID Name",
        email: "noid@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. deleteAdminCustomerAction
  // =========================================================================
  describe("3. deleteAdminCustomerAction", () => {
    test("MANAGER deletes a zero-order CUSTOMER account", async () => {
      setupMockUserLookup("cust-delete-1", "CUSTOMER");
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteAdminCustomerAction("cust-delete-1");

      expect(result.success).toBe(true);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { id: "cust-delete-1", role: "CUSTOMER" },
      });
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "cust-delete-1" } });
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    test("REJECTS deletion of a CUSTOMER with past orders", async () => {
      // Setup customer with past orders
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-with-orders-1",
        email: "buyer@example.com",
        name: "Buyer Customer",
        phone: "01712345678",
        role: "CUSTOMER",
        _count: { orders: 3 },
      } as any);

      const result = await deleteAdminCustomerAction("cust-with-orders-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot permanently delete customer");
      expect(result.error).toContain("3 order record(s)");
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: non-customer accounts cannot be deleted",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-delete`, rejectedRole);

        const result = await deleteAdminCustomerAction(`user-${rejectedRole.toLowerCase()}-delete`);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.user.deleteMany).not.toHaveBeenCalled();
        expect(prisma.session.deleteMany).not.toHaveBeenCalled();
        expect(prisma.auditLog.create).not.toHaveBeenCalled();
      }
    );

    test("REJECTS manager attempting to delete their own account", async () => {
      const result = await deleteAdminCustomerAction(mockManagerUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("You cannot delete your own admin account.");
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });

    test("REJECTS missing or empty customerId", async () => {
      const result = await deleteAdminCustomerAction("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. toggleCustomerAccountSuspensionAction
  // =========================================================================
  describe("4. toggleCustomerAccountSuspensionAction", () => {
    test("MANAGER suspends a valid CUSTOMER account", async () => {
      setupMockUserLookup("cust-suspend-1", "CUSTOMER");

      const result = await toggleCustomerAccountSuspensionAction("cust-suspend-1", true, "Fraud check");

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
      expect(auditArg.action).toBe("CUSTOMER_ACCOUNT_SUSPENDED");
      expect(auditArg.entityId).toBe("cust-suspend-1");
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "cust-suspend-1" } });
    });

    test("MANAGER activates a suspended CUSTOMER account", async () => {
      setupMockUserLookup("cust-activate-1", "CUSTOMER");

      const result = await toggleCustomerAccountSuspensionAction("cust-activate-1", false, "Cleared review");

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
      expect(auditArg.action).toBe("CUSTOMER_ACCOUNT_ACTIVATED");
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });

    test("locks target CUSTOMER row using FOR UPDATE before audit log and session deletion", async () => {
      setupMockUserLookup("cust-lock-suspend", "CUSTOMER");

      const result = await toggleCustomerAccountSuspensionAction("cust-lock-suspend", true);

      expect(result.success).toBe(true);
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("FOR UPDATE");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: cannot suspend or terminate sessions for non-customer",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-suspend`, rejectedRole);

        const result = await toggleCustomerAccountSuspensionAction(
          `user-${rejectedRole.toLowerCase()}-suspend`,
          true,
          "Attempt lockout"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.auditLog.create).not.toHaveBeenCalled();
        expect(prisma.session.deleteMany).not.toHaveBeenCalled();
      }
    );

    test("REJECTS manager attempting to suspend their own account", async () => {
      const result = await toggleCustomerAccountSuspensionAction(mockManagerUser.id, true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("You cannot suspend your own admin account.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    test("REJECTS missing or whitespace ID", async () => {
      const result = await toggleCustomerAccountSuspensionAction("  ", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. adminSendCustomerPasswordResetEmailAction
  // =========================================================================
  describe("5. adminSendCustomerPasswordResetEmailAction", () => {
    test("MANAGER sends password reset email to a valid CUSTOMER", async () => {
      setupMockUserLookup("cust-email-1", "CUSTOMER");
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: "token-email-1" } as any);

      const result = await adminSendCustomerPasswordResetEmailAction("cust-email-1");

      expect(result.success).toBe(true);
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const { sendPasswordResetEmail } = await import("@/lib/email/client");
      expect(sendPasswordResetEmail).toHaveBeenCalledWith("target-customer@example.com", expect.any(String));
    });

    test("locks target CUSTOMER row using FOR UPDATE and reads recipient email directly from locked row", async () => {
      (mockPrismaTx.$queryRaw as any).mockResolvedValueOnce([
        {
          id: "cust-locked-email",
          email: "locked.recipient@example.com",
          name: "Locked Customer",
          role: "CUSTOMER",
        },
      ]);
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({ id: "token-email-lock" } as any);
      const { sendPasswordResetEmail } = await import("@/lib/email/client");

      const result = await adminSendCustomerPasswordResetEmailAction("cust-locked-email");

      expect(result.success).toBe(true);
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("FOR UPDATE");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
      expect(sendPasswordResetEmail).toHaveBeenCalledWith("locked.recipient@example.com", expect.any(String));
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: no reset email or token created",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-email`, rejectedRole);

        const result = await adminSendCustomerPasswordResetEmailAction(`user-${rejectedRole.toLowerCase()}-email`);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
        const { sendPasswordResetEmail } = await import("@/lib/email/client");
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      }
    );

    test("REJECTS customer with placeholder POS email address", async () => {
      (mockPrismaTx.$queryRaw as any).mockResolvedValueOnce([
        {
          id: "cust-pos-lead",
          email: "customer-01700000000@pos.vibelock.com",
          name: "POS Walk-in",
          role: "CUSTOMER",
        },
      ]);
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "cust-pos-lead",
        email: "customer-01700000000@pos.vibelock.com",
        name: "POS Walk-in",
        phone: "01700000000",
        role: "CUSTOMER",
      } as any);

      const result = await adminSendCustomerPasswordResetEmailAction("cust-pos-lead");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer does not have a valid email address on file.");
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    test("REJECTS missing target ID", async () => {
      const result = await adminSendCustomerPasswordResetEmailAction("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. toggleCustomerCodBlockAction (AUTH-5A-02)
  // =========================================================================
  describe("6. toggleCustomerCodBlockAction", () => {
    test("MANAGER restricts COD for a valid CUSTOMER", async () => {
      setupMockUserLookup("cust-cod-1", "CUSTOMER");

      const result = await toggleCustomerCodBlockAction("cust-cod-1", true, "High return history");

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
      expect(auditArg.action).toBe("CUSTOMER_COD_RESTRICTED");
      expect(auditArg.entityId).toBe("cust-cod-1");
    });

    test("MANAGER allows COD for a valid CUSTOMER", async () => {
      setupMockUserLookup("cust-cod-2", "CUSTOMER");

      const result = await toggleCustomerCodBlockAction("cust-cod-2", false, "Whitelist restored");

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
      expect(auditArg.action).toBe("CUSTOMER_COD_ALLOWED");
      expect(auditArg.entityId).toBe("cust-cod-2");
    });

    test("locks target CUSTOMER row using FOR UPDATE before COD audit log creation", async () => {
      setupMockUserLookup("cust-cod-lock", "CUSTOMER");

      const result = await toggleCustomerCodBlockAction("cust-cod-lock", true, "High return risk");

      expect(result.success).toBe(true);
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("FOR UPDATE");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: no audit log is created for non-customer",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-cod`, rejectedRole);

        const result = await toggleCustomerCodBlockAction(`user-${rejectedRole.toLowerCase()}-cod`, true);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.auditLog.create).not.toHaveBeenCalled();
      }
    );

    test("REJECTS non-existent customer ID without creating audit log", async () => {
      setupMockUserLookup("missing-cod-id", null);

      const result = await toggleCustomerCodBlockAction("missing-cod-id", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer profile not found.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    test("REJECTS missing or empty customerId without creating audit log", async () => {
      const result = await toggleCustomerCodBlockAction("", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. addCustomerStaffNoteAction (AUTH-5A-02)
  // =========================================================================
  describe("7. addCustomerStaffNoteAction", () => {
    test("MANAGER adds note for a valid CUSTOMER", async () => {
      setupMockUserLookup("cust-note-1", "CUSTOMER");

      const result = await addCustomerStaffNoteAction("cust-note-1", "Preferred delivery time after 5 PM");

      expect(result.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditArg = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
      expect(auditArg.action).toBe("CUSTOMER_STAFF_NOTE");
      expect(auditArg.entityId).toBe("cust-note-1");
      expect((auditArg.metadata as any).note).toBe("Preferred delivery time after 5 PM");
    });

    test("locks target CUSTOMER row using FOR UPDATE before note audit log creation", async () => {
      setupMockUserLookup("cust-note-lock", "CUSTOMER");

      const result = await addCustomerStaffNoteAction("cust-note-lock", "Internal fraud warning note");

      expect(result.success).toBe(true);
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain("FOR UPDATE");
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
    });

    test.each(["STAFF", "MANAGER", "ADMIN"] as const)(
      "REJECTS %s target: no note audit log is created for non-customer",
      async (rejectedRole) => {
        setupMockUserLookup(`user-${rejectedRole.toLowerCase()}-note`, rejectedRole);

        const result = await addCustomerStaffNoteAction(`user-${rejectedRole.toLowerCase()}-note`, "Internal review");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Customer profile not found.");
        expect(prisma.auditLog.create).not.toHaveBeenCalled();
      }
    );

    test("REJECTS non-existent customer ID without creating audit log", async () => {
      setupMockUserLookup("missing-note-id", null);

      const result = await addCustomerStaffNoteAction("missing-note-id", "Random note");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer profile not found.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    test("REJECTS empty note content without creating audit log", async () => {
      setupMockUserLookup("cust-note-2", "CUSTOMER");

      const result = await addCustomerStaffNoteAction("cust-note-2", "   ");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Note content cannot be empty.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    test("REJECTS missing customerId without creating audit log", async () => {
      const result = await addCustomerStaffNoteAction("", "Note without ID");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer ID is required.");
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
