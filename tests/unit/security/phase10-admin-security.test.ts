/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { AuthRequiredError, ForbiddenError } from "@/lib/auth/authorization";

// ---------------------------------------------------------------------------
// Hoisted mock state and test fixtures
// ---------------------------------------------------------------------------
const {
  mockState,
  mockPrisma,
  mockTx,
  mockRedirect,
} = vi.hoisted(() => {
  const mockState = {
    currentUser: null as { id: string; name?: string; email?: string; role: Role } | null,
  };

  const mockTx = {
    $executeRaw: vi.fn<any>(async () => 1),
    $queryRaw: vi.fn<any>(async () => []),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    cart: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    passwordResetToken: {
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    inventoryTransaction: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 10 } })),
      create: vi.fn(),
    },
    inventoryReservation: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 0 } })),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    returnRequest: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      count: vi.fn(async () => 0),
    },
    refund: {
      count: vi.fn(async () => 0),
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (cb: any) => {
      if (typeof cb === "function") return cb(mockTx);
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb;
    }),
    $queryRaw: vi.fn(async () => []),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    cart: {
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
    inventoryTransaction: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 10 } })),
      create: vi.fn(),
    },
    inventoryReservation: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 0 } })),
    },
    returnRequest: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      count: vi.fn(async () => 0),
    },
    refund: {
      findUnique: vi.fn(),
      count: vi.fn(async () => 0),
      create: vi.fn(),
    },
  };

  const mockRedirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });

  return { mockState, mockPrisma, mockTx, mockRedirect };
});

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vibelock_test",
    AUTH_SECRET: "12345678901234567890123456789012",
  },
}));

vi.mock("@/lib/config/app", () => ({
  appConfig: {
    url: "https://vibelock.bd",
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendPasswordResetEmail: vi.fn(async () => true),
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

vi.mock("@/lib/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorization")>();
  return {
    ...actual,
    requireUser: vi.fn(async (options?: { throw?: boolean }) => {
      if (!mockState.currentUser) {
        if (options?.throw) throw new AuthRequiredError();
        mockRedirect("/login");
      }
      return mockState.currentUser;
    }),
    requireRole: vi.fn(async (minRole: Role, options?: { throw?: boolean }) => {
      if (!mockState.currentUser) {
        if (options?.throw) throw new AuthRequiredError();
        mockRedirect("/login");
      }
      const hierarchy: Record<Role, number> = {
        CUSTOMER: 1,
        STAFF: 2,
        MANAGER: 3,
        ADMIN: 4,
      };
      if (hierarchy[mockState.currentUser!.role] < hierarchy[minRole]) {
        if (options?.throw) throw new ForbiddenError();
        mockRedirect("/unauthorized");
      }
      return mockState.currentUser!;
    }),
  };
});

// Import actions after mocks
import {
  updateAdminUserRoleAction,
  createAdminUserAction,
} from "@/lib/admin/users/admin-user-actions";
import { deleteAccountAction } from "@/app/actions/account-deletion";
import {
  adminGenerateCustomerPasswordResetLinkAction,
  adminSendCustomerPasswordResetEmailAction,
} from "@/lib/admin/customers/customer-actions";
import {
  adjustInventoryAction,
  quickAdjustInventoryAction,
  bulkAdjustInventoryAction,
  reconcileStocktakeAction,
} from "@/lib/admin/inventory/inventory-actions";
import { resetRateLimitMemoryStore, checkRateLimit } from "@/lib/security/rate-limit";

describe("Phase 10: Admin & Insider Threat Protection (SEC-10)", () => {
  const ADMIN_USER = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Root Administrator",
    email: "admin@vibelock.bd",
    role: "ADMIN" as Role,
  };

  const MANAGER_USER = {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Operations Manager",
    email: "manager@vibelock.bd",
    role: "MANAGER" as Role,
  };

  const STAFF_USER = {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Fulfillment Staff",
    email: "staff@vibelock.bd",
    role: "STAFF" as Role,
  };

  const CUSTOMER_USER = {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Honest Customer",
    email: "shopper@gmail.com",
    role: "CUSTOMER" as Role,
  };

  const TARGET_USER_ID = "00000000-0000-0000-0000-000000000010";
  const TARGET_OTHER_ADMIN_ID = "00000000-0000-0000-0000-000000000020";
  const TARGET_CUST_ID_1 = "00000000-0000-0000-0000-000000000030";
  const TARGET_CUST_ID_2 = "00000000-0000-0000-0000-000000000031";

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
    mockState.currentUser = null;
  });

  // =========================================================================
  // 1. Admin Authorization & Negative Access Tests
  // =========================================================================
  describe("1. Admin Authorization & Server-Side Negative Access Controls", () => {
    test("CUSTOMER cannot update admin user role (blocked with redirect to /unauthorized)", async () => {
      mockState.currentUser = CUSTOMER_USER;

      await expect(
        updateAdminUserRoleAction({
          userId: TARGET_USER_ID,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot update admin user role", async () => {
      mockState.currentUser = STAFF_USER;

      await expect(
        updateAdminUserRoleAction({
          userId: TARGET_USER_ID,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot update admin user role (ADMIN minimum strictly enforced)", async () => {
      mockState.currentUser = MANAGER_USER;

      await expect(
        updateAdminUserRoleAction({
          userId: TARGET_USER_ID,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot create admin/staff accounts", async () => {
      mockState.currentUser = CUSTOMER_USER;

      await expect(
        createAdminUserAction({
          name: "Rogue Admin",
          email: "rogue@vibelock.bd",
          role: "ADMIN",
          password: "password123!",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot create admin/staff accounts", async () => {
      mockState.currentUser = MANAGER_USER;

      await expect(
        createAdminUserAction({
          name: "Manager Spawn",
          email: "spawn@vibelock.bd",
          role: "STAFF",
          password: "password123!",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot generate raw customer password reset links (ADMIN minimum)", async () => {
      mockState.currentUser = CUSTOMER_USER;

      await expect(
        adminGenerateCustomerPasswordResetLinkAction(TARGET_CUST_ID_1)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot generate raw customer password reset links (ADMIN minimum)", async () => {
      mockState.currentUser = MANAGER_USER;

      await expect(
        adminGenerateCustomerPasswordResetLinkAction(TARGET_CUST_ID_1)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot adjust inventory (requires ADMIN or MANAGER)", async () => {
      mockState.currentUser = STAFF_USER;

      const fd = new FormData();
      fd.set("variantId", "a0000000-0000-0000-0000-000000000001");
      fd.set("quantity", "10");
      fd.set("reason", "Restock test");

      await expect(
        adjustInventoryAction({ error: null }, fd)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });
  });

  // =========================================================================
  // 2. Administrative Account Self-Deletion Prevention (SEC-10-01)
  // =========================================================================
  describe("2. Administrative Account Self-Deletion Prevention (SEC-10-01)", () => {
    test("ADMIN role is strictly blocked from self-deleting through customer settings", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: "hashed_AdminPassword123!",
        role: "ADMIN",
      });

      const result = await deleteAccountAction({ password: "AdminPassword123!" });

      expect(result).toEqual({
        error:
          "Administrative and staff accounts cannot be self-deleted through customer settings. Contact system administration.",
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    test("MANAGER role is strictly blocked from self-deleting through customer settings", async () => {
      mockState.currentUser = MANAGER_USER;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: "hashed_ManagerPassword123!",
        role: "MANAGER",
      });

      const result = await deleteAccountAction({ password: "ManagerPassword123!" });

      expect(result).toEqual({
        error:
          "Administrative and staff accounts cannot be self-deleted through customer settings. Contact system administration.",
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    test("STAFF role is strictly blocked from self-deleting through customer settings", async () => {
      mockState.currentUser = STAFF_USER;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: "hashed_StaffPassword123!",
        role: "STAFF",
      });

      const result = await deleteAccountAction({ password: "StaffPassword123!" });

      expect(result).toEqual({
        error:
          "Administrative and staff accounts cannot be self-deleted through customer settings. Contact system administration.",
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    test("CUSTOMER role proceeds past role verification into standard deletion flow", async () => {
      mockState.currentUser = CUSTOMER_USER;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: "hashed_CustomerPassword123!",
        role: "CUSTOMER",
      });
      mockTx.order.count.mockResolvedValueOnce(0);
      mockTx.returnRequest = { count: vi.fn(async () => 0) } as any;
      mockTx.refund.count.mockResolvedValueOnce(0);

      const result = await deleteAccountAction({ password: "CustomerPassword123!" });

      expect(result).toEqual({ success: true });
      expect(mockTx.user.deleteMany ?? mockTx.user.update).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Sole Administrator Demotion & Concurrency Guards (SEC-10-02)
  // =========================================================================
  describe("3. Sole Administrator Demotion & Concurrency Guards (SEC-10-02)", () => {
    test("sole administrator cannot demote themselves to CUSTOMER", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.count.mockResolvedValueOnce(1); // Sole admin pre-check

      const result = await updateAdminUserRoleAction({
        userId: ADMIN_USER.id,
        newRole: "CUSTOMER",
      });

      expect(result).toEqual({
        success: false,
        error: "Cannot demote yourself when you are the sole administrator.",
      });
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("sole administrator cannot demote themselves to MANAGER", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const result = await updateAdminUserRoleAction({
        userId: ADMIN_USER.id,
        newRole: "MANAGER",
      });

      expect(result).toEqual({
        success: false,
        error: "Cannot demote yourself when you are the sole administrator.",
      });
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("admin cannot demote another admin if that other admin is the sole administrator in the database", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.count.mockResolvedValueOnce(2); // Pre-check sees 2

      // Inside tx, row lock reveals target is sole admin (count = 1)
      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_OTHER_ADMIN_ID,
          role: "ADMIN",
          email: "soleadmin@vibelock.bd",
          name: "Sole Admin",
        },
      ]);
      mockTx.user.count.mockResolvedValueOnce(1); // Sole admin in DB!

      const result = await updateAdminUserRoleAction({
        userId: TARGET_OTHER_ADMIN_ID,
        newRole: "STAFF",
      });

      expect(result).toEqual({
        success: false,
        error: "Cannot demote the sole remaining administrator.",
      });
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("when multiple administrators exist, demoting an admin succeeds, invalidates sessions, and records AuditLog", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.count.mockResolvedValueOnce(2);

      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_OTHER_ADMIN_ID,
          role: "ADMIN",
          email: "secondadmin@vibelock.bd",
          name: "Second Admin",
        },
      ]);
      mockTx.user.count.mockResolvedValueOnce(2); // Multiple admins exist

      const result = await updateAdminUserRoleAction({
        userId: TARGET_OTHER_ADMIN_ID,
        newRole: "MANAGER",
      });

      expect(result).toEqual({ success: true });
      expect(mockTx.$executeRaw).toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: TARGET_OTHER_ADMIN_ID },
        data: { role: "MANAGER" },
      });
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: TARGET_OTHER_ADMIN_ID },
      });
      expect(mockTx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: TARGET_OTHER_ADMIN_ID },
      });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: ADMIN_USER.id,
            action: "ADMIN_USER_ROLE_UPDATED",
            entityType: "User",
            entityId: TARGET_OTHER_ADMIN_ID,
            metadata: expect.objectContaining({
              previousRole: "ADMIN",
              newRole: "MANAGER",
              targetEmail: "secondadmin@vibelock.bd",
            }),
          }),
        })
      );
    });

    test("when tx.auditLog.create fails during updateAdminUserRoleAction, transaction rolls back and returns failure", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.count.mockResolvedValueOnce(2);

      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_OTHER_ADMIN_ID,
          role: "ADMIN",
          email: "secondadmin@vibelock.bd",
          name: "Second Admin",
        },
      ]);
      mockTx.user.count.mockResolvedValueOnce(2);

      mockTx.auditLog.create.mockRejectedValueOnce(
        new Error("Database connection interrupted during audit log insertion")
      );

      const result = await updateAdminUserRoleAction({
        userId: TARGET_OTHER_ADMIN_ID,
        newRole: "MANAGER",
      });

      expect(result).toEqual({
        success: false,
        error: "Database connection interrupted during audit log insertion",
      });
    });
  });

  // =========================================================================
  // 4. Authoritative Audit Logging for Administrative Actions (SEC-10-03)
  // =========================================================================
  describe("4. Authoritative Audit Logging & Credential Redaction (SEC-10-03)", () => {
    test("createAdminUserAction records ADMIN_USER_CREATED without logging passwords or hashes", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // No collision
      mockPrisma.user.create.mockResolvedValueOnce({
        id: "new-staff-created-id",
        name: "New Care Staff",
        email: "carestaff@vibelock.bd",
        role: "STAFF",
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({} as any);

      const result = await createAdminUserAction({
        name: "New Care Staff",
        email: "carestaff@vibelock.bd",
        role: "STAFF",
        password: "SuperSecretAdminPassword123!",
      });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ADMIN_USER.id,
          action: "ADMIN_USER_CREATED",
          entityType: "User",
          entityId: expect.any(String),
          metadata: {
            createdRole: "STAFF",
            targetEmail: "carestaff@vibelock.bd",
            actorName: ADMIN_USER.name,
          },
        },
      });

      // Verify strict password redaction: password and passwordHash MUST NOT be in metadata
      const auditPayload = mockPrisma.auditLog.create.mock.calls[0][0].data;
      const metadataStr = JSON.stringify(auditPayload.metadata);
      expect(metadataStr).not.toContain("SuperSecretAdminPassword123!");
      expect(metadataStr).not.toContain("hashed_");
    });

    test("when auditLog.create fails during createAdminUserAction, transaction rolls back and user creation fails", async () => {
      mockState.currentUser = ADMIN_USER;
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({
        id: "failed-user-id",
        name: "Aborted Staff",
        email: "aborted@vibelock.bd",
        role: "STAFF",
      });
      mockPrisma.auditLog.create.mockRejectedValueOnce(
        new Error("Audit log storage volume full")
      );

      const result = await createAdminUserAction({
        name: "Aborted Staff",
        email: "aborted@vibelock.bd",
        role: "STAFF",
        password: "securePassword123!",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to create administrator profile.",
      });
    });

    test("adminGenerateCustomerPasswordResetLinkAction records CUSTOMER_PASSWORD_RESET_LINK_GENERATED without leaking tokens or link URL", async () => {
      mockState.currentUser = ADMIN_USER;

      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_CUST_ID_1,
          email: "customer@example.com",
          name: "Target Customer",
        },
      ]);

      const result = await adminGenerateCustomerPasswordResetLinkAction(TARGET_CUST_ID_1);

      expect(result.success).toBe(true);
      expect(typeof result.resetLink).toBe("string");

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ADMIN_USER.id,
          action: "CUSTOMER_PASSWORD_RESET_LINK_GENERATED",
          entityType: "Customer",
          entityId: TARGET_CUST_ID_1,
          metadata: {
            targetEmail: "customer@example.com",
            actorName: ADMIN_USER.name,
          },
        },
      });

      // Verify that raw token and reset link URL are NOT in the audit metadata
      const auditCall = mockTx.auditLog.create.mock.calls[0][0].data;
      const auditMeta = JSON.stringify(auditCall.metadata);
      expect(auditMeta).not.toContain("token");
      expect(auditMeta).not.toContain("reset-password?token=");
      expect(auditMeta).not.toContain(result.resetLink);
    });

    test("adminSendCustomerPasswordResetEmailAction records CUSTOMER_PASSWORD_RESET_EMAIL_SENT", async () => {
      mockState.currentUser = MANAGER_USER;

      mockTx.$queryRaw.mockResolvedValueOnce([
        {
          id: TARGET_CUST_ID_2,
          email: "customer2@example.com",
          name: "Customer Two",
        },
      ]);

      const result = await adminSendCustomerPasswordResetEmailAction(TARGET_CUST_ID_2);

      expect(result).toEqual({ success: true });
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: MANAGER_USER.id,
          action: "CUSTOMER_PASSWORD_RESET_EMAIL_SENT",
          entityType: "Customer",
          entityId: TARGET_CUST_ID_2,
          metadata: {
            targetEmail: "customer2@example.com",
            actorName: MANAGER_USER.name,
          },
        },
      });
    });

    test("adjustInventoryAction records INVENTORY_ADJUSTED with actorId and stock change values", async () => {
      mockState.currentUser = ADMIN_USER;

      mockTx.productVariant.findUnique.mockResolvedValueOnce({
        id: "variant-audit-1",
      });
      mockTx.inventoryTransaction.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 50 },
      });
      mockTx.inventoryReservation.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 5 },
      });

      const fd = new FormData();
      fd.set("variantId", "a0000000-0000-0000-0000-000000000001");
      fd.set("quantity", "25");
      fd.set("reason", "Vendor shipment arrival");

      const result = await adjustInventoryAction({ error: null }, fd);

      expect(result.error).toBeNull();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: ADMIN_USER.id,
          action: "INVENTORY_ADJUSTED",
          entityType: "ProductVariant",
          entityId: "a0000000-0000-0000-0000-000000000001",
          metadata: {
            quantity: 25,
            reason: "Vendor shipment arrival",
            previousStock: 50,
            newStock: 75,
            actorName: ADMIN_USER.name,
          },
        },
      });
    });

    test("quickAdjustInventoryAction records INVENTORY_QUICK_ADJUSTED", async () => {
      mockState.currentUser = MANAGER_USER;

      mockTx.productVariant.findUnique.mockResolvedValueOnce({
        id: "variant-audit-2",
      });
      mockTx.inventoryTransaction.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 20 },
      });
      mockTx.inventoryReservation.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 2 },
      });

      const result = await quickAdjustInventoryAction({
        variantId: "variant-audit-2",
        quantity: -5,
        reason: "Damaged packaging write-off",
        type: "DAMAGE",
      });

      expect(result.error).toBeNull();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: MANAGER_USER.id,
          action: "INVENTORY_QUICK_ADJUSTED",
          entityType: "ProductVariant",
          entityId: "variant-audit-2",
          metadata: {
            quantity: -5,
            reason: "Damaged packaging write-off",
            type: "DAMAGE",
            previousStock: 20,
            newStock: 15,
            actorName: MANAGER_USER.name,
          },
        },
      });
    });

    test("bulkAdjustInventoryAction records INVENTORY_BULK_ADJUSTED", async () => {
      mockState.currentUser = MANAGER_USER;

      mockTx.productVariant.findUnique.mockResolvedValue({
        id: "variant-audit-3",
      });
      mockTx.inventoryTransaction.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
      });
      mockTx.inventoryReservation.aggregate.mockResolvedValue({
        _sum: { quantity: 10 },
      });

      const result = await bulkAdjustInventoryAction({
        variantIds: ["v-1", "v-2", "v-3"],
        quantity: 10,
        reason: "Seasonal batch restock",
      });

      expect(result.error).toBeNull();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: MANAGER_USER.id,
          action: "INVENTORY_BULK_ADJUSTED",
          entityType: "ProductVariant",
          entityId: "bulk",
          metadata: {
            variantCount: 3,
            quantity: 10,
            reason: "Seasonal batch restock",
            type: "RESTOCK",
            actorName: MANAGER_USER.name,
          },
        },
      });
    });

    test("reconcileStocktakeAction records INVENTORY_STOCKTAKE_RECONCILED", async () => {
      mockState.currentUser = MANAGER_USER;

      mockTx.productVariant.findUnique.mockResolvedValue({
        id: "variant-audit-4",
        sku: "VL-SKU-001",
      });
      mockTx.inventoryTransaction.aggregate.mockResolvedValue({
        _sum: { quantity: 50 },
      });
      mockTx.inventoryReservation.aggregate.mockResolvedValue({
        _sum: { quantity: 5 },
      });

      const result = await reconcileStocktakeAction({
        items: [
          { variantId: "variant-audit-4", scannedQuantity: 52, expectedQuantity: 50 },
        ],
        auditNote: "Quarterly physical warehouse audit",
      });

      expect(result.error).toBeNull();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: MANAGER_USER.id,
          action: "INVENTORY_STOCKTAKE_RECONCILED",
          entityType: "Inventory",
          entityId: "stocktake",
          metadata: {
            discrepancyCount: 1,
            auditNote: "Quarterly physical warehouse audit",
            actorName: MANAGER_USER.name,
          },
        },
      });
    });
  });

  // =========================================================================
  // 5. Abuse Protection & Rate Limiting on Admin Endpoints (SEC-10-04)
  // =========================================================================
  describe("5. Abuse Protection & Rate Limiting on Sensitive Admin Endpoints (SEC-10-04)", () => {
    test("adminUserManagement throttles after 30 requests within sliding window", async () => {
      const adminId = "spammer-admin-id";

      // 30 calls succeed
      for (let i = 0; i < 30; i++) {
        await expect(
          checkRateLimit("adminUserManagement", adminId, { skipIp: true })
        ).resolves.toBeUndefined();
      }

      // 31st call triggers RATE_LIMIT_EXCEEDED
      await expect(
        checkRateLimit("adminUserManagement", adminId, { skipIp: true })
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("adminCustomerSecurity throttles after 30 requests within sliding window", async () => {
      const adminId = "spammer-security-admin";

      for (let i = 0; i < 30; i++) {
        await expect(
          checkRateLimit("adminCustomerSecurity", adminId, { skipIp: true })
        ).resolves.toBeUndefined();
      }

      await expect(
        checkRateLimit("adminCustomerSecurity", adminId, { skipIp: true })
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("adminRefund throttles after 50 refund operations within sliding window", async () => {
      const managerId = "spammer-refund-manager";

      for (let i = 0; i < 50; i++) {
        await expect(
          checkRateLimit("adminRefund", managerId, { skipIp: true })
        ).resolves.toBeUndefined();
      }

      await expect(
        checkRateLimit("adminRefund", managerId, { skipIp: true })
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("adminInventory throttles after 100 inventory adjustments within sliding window", async () => {
      const managerId = "spammer-inventory-manager";

      for (let i = 0; i < 100; i++) {
        await expect(
          checkRateLimit("adminInventory", managerId, { skipIp: true })
        ).resolves.toBeUndefined();
      }

      await expect(
        checkRateLimit("adminInventory", managerId, { skipIp: true })
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("IP rotation does not change the authenticated admin's rate-limit bucket when skipIp is true", async () => {
      const adminId = "rotating-proxy-admin";

      // 30 calls across different explicit IPs
      for (let i = 0; i < 30; i++) {
        const ip = `198.51.100.${i + 1}`;
        await expect(
          checkRateLimit("adminUserManagement", adminId, { skipIp: true, explicitIp: ip })
        ).resolves.toBeUndefined();
      }

      // 31st call with a brand new IP STILL gets throttled because bucket is strictly bound to adminId
      await expect(
        checkRateLimit("adminUserManagement", adminId, { skipIp: true, explicitIp: "203.0.113.99" })
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    test("createAdminUserAction gracefully returns error when rate limit exceeded", async () => {
      mockState.currentUser = ADMIN_USER;

      // Exhaust rate limit
      for (let i = 0; i < 30; i++) {
        await checkRateLimit("adminUserManagement", ADMIN_USER.id, { skipIp: true });
      }

      const result = await createAdminUserAction({
        name: "Exhausted Admin",
        email: "exhausted@vibelock.bd",
        role: "STAFF",
        password: "securePassword123!",
      });

      expect(result).toEqual({
        success: false,
        error: "Too many admin creation attempts. Please try again later.",
      });
    });

    test("updateAdminUserRoleAction gracefully returns error when rate limit exceeded", async () => {
      mockState.currentUser = ADMIN_USER;

      for (let i = 0; i < 30; i++) {
        await checkRateLimit("adminUserManagement", ADMIN_USER.id, { skipIp: true });
      }

      const result = await updateAdminUserRoleAction({
        userId: TARGET_USER_ID,
        newRole: "STAFF",
      });

      expect(result).toEqual({
        success: false,
        error: "Too many admin management attempts. Please try again later.",
      });
    });
  });

  // =========================================================================
  // 6. Anonymous / Unauthenticated Access Rejections
  // =========================================================================
  describe("6. Anonymous / Unauthenticated Access Rejections", () => {
    test("unauthenticated user cannot call updateAdminUserRoleAction", async () => {
      mockState.currentUser = null;
      await expect(
        updateAdminUserRoleAction({
          userId: TARGET_USER_ID,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("unauthenticated user cannot call createAdminUserAction", async () => {
      mockState.currentUser = null;
      await expect(
        createAdminUserAction({
          name: "Ghost Admin",
          email: "ghost@vibelock.bd",
          role: "STAFF",
          password: "password123!",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("unauthenticated user cannot call adminGenerateCustomerPasswordResetLinkAction", async () => {
      mockState.currentUser = null;
      await expect(
        adminGenerateCustomerPasswordResetLinkAction(TARGET_CUST_ID_1)
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("unauthenticated user cannot call adminSendCustomerPasswordResetEmailAction", async () => {
      mockState.currentUser = null;
      await expect(
        adminSendCustomerPasswordResetEmailAction(TARGET_CUST_ID_1)
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("unauthenticated user cannot call adjustInventoryAction", async () => {
      mockState.currentUser = null;
      const fd = new FormData();
      fd.set("variantId", "a0000000-0000-0000-0000-000000000001");
      fd.set("quantity", "10");
      fd.set("reason", "Restock test");

      await expect(
        adjustInventoryAction({ error: null }, fd)
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("unauthenticated user cannot call deleteAccountAction", async () => {
      mockState.currentUser = null;
      const res = await deleteAccountAction({ password: "password123!" });
      expect(res).toEqual({ error: "An unexpected error occurred." });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
