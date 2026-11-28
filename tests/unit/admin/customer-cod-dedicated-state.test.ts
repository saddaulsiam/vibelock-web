/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
  },
}));

const { mockPrismaTx, mockManagerUser } = vi.hoisted(() => {
  const mockPrismaTx = {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockManagerUser = {
    id: "admin-mgr-uuid",
    name: "Store Manager",
    email: "manager@vibelock.bd",
    role: "MANAGER",
  };

  return { mockPrismaTx, mockManagerUser };
});

vi.mock("@/lib/prisma/client", () => ({
  default: {
    ...mockPrismaTx,
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrismaTx)),
  },
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn(async () => mockManagerUser),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { backfillCustomerCodRestrictions } from "@/lib/admin/customers/cod-migration";
import { toggleCustomerCodBlockAction } from "@/lib/admin/customers/customer-actions";

describe("Phase 5B-2 — Dedicated Customer COD State & Migration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Admin Action: toggleCustomerCodBlockAction with Dedicated State", () => {
    test("atomically locks User row with SELECT FOR UPDATE and updates codBlocked to true", async () => {
      mockPrismaTx.$queryRaw.mockResolvedValueOnce([{ id: "cust-cod-1" }]);
      mockPrismaTx.user.update.mockResolvedValueOnce({ id: "cust-cod-1", codBlocked: true });
      mockPrismaTx.auditLog.create.mockResolvedValueOnce({ id: "audit-1" });

      const result = await toggleCustomerCodBlockAction("cust-cod-1", true, "High RTO risk");

      expect(result.success).toBe(true);

      // Verify parameterized row lock
      expect(mockPrismaTx.$queryRaw).toHaveBeenCalledTimes(1);
      const call = vi.mocked(mockPrismaTx.$queryRaw).mock.calls[0];
      const queryStrings = (call[0] as unknown as string[]).join(" ");
      expect(queryStrings).toContain('SELECT "id"');
      expect(queryStrings).toContain('FROM "User"');
      expect(queryStrings).toContain("'CUSTOMER'::\"Role\"");
      expect(queryStrings).toContain("FOR UPDATE");

      // Verify User table update with dedicated fields
      expect(mockPrismaTx.user.update).toHaveBeenCalledWith({
        where: { id: "cust-cod-1" },
        data: {
          codBlocked: true,
          codBlockedAt: expect.any(Date),
          codBlockedById: mockManagerUser.id,
        },
      });

      // Verify AuditLog creation
      expect(mockPrismaTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockManagerUser.id,
          action: "CUSTOMER_COD_RESTRICTED",
          entityType: "Customer",
          entityId: "cust-cod-1",
          metadata: expect.objectContaining({
            blocked: true,
            reason: "High RTO risk",
          }),
        },
      });
    });

    test("atomically locks User row and clears codBlocked to false when restoring COD privileges", async () => {
      mockPrismaTx.$queryRaw.mockResolvedValueOnce([{ id: "cust-cod-2" }]);
      mockPrismaTx.user.update.mockResolvedValueOnce({ id: "cust-cod-2", codBlocked: false });
      mockPrismaTx.auditLog.create.mockResolvedValueOnce({ id: "audit-2" });

      const result = await toggleCustomerCodBlockAction(
        "cust-cod-2",
        false,
        "VIP customer restored"
      );

      expect(result.success).toBe(true);

      expect(mockPrismaTx.user.update).toHaveBeenCalledWith({
        where: { id: "cust-cod-2" },
        data: {
          codBlocked: false,
          codBlockedAt: null,
          codBlockedById: null,
        },
      });

      expect(mockPrismaTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockManagerUser.id,
          action: "CUSTOMER_COD_ALLOWED",
          entityType: "Customer",
          entityId: "cust-cod-2",
          metadata: expect.objectContaining({
            blocked: false,
            reason: "VIP customer restored",
          }),
        },
      });
    });

    test("atomic rollback: if AuditLog creation fails, User update rolls back with transaction", async () => {
      mockPrismaTx.$queryRaw.mockResolvedValueOnce([{ id: "cust-cod-fail" }]);
      mockPrismaTx.user.update.mockResolvedValueOnce({ id: "cust-cod-fail", codBlocked: true });
      mockPrismaTx.auditLog.create.mockRejectedValueOnce(new Error("Audit log insert failure"));

      const result = await toggleCustomerCodBlockAction("cust-cod-fail", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Audit log insert failure");
    });

    test("rejects non-customer users when FOR UPDATE lock returns empty", async () => {
      mockPrismaTx.$queryRaw.mockResolvedValueOnce([]); // No CUSTOMER with this id found

      const result = await toggleCustomerCodBlockAction("admin-id-123", true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Customer profile not found.");
      expect(mockPrismaTx.user.update).not.toHaveBeenCalled();
      expect(mockPrismaTx.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe("2. Data Migration Backfill: backfillCustomerCodRestrictions", () => {
    test("backfills codBlocked from latest CUSTOMER_COD_RESTRICTED event", async () => {
      mockPrismaTx.auditLog.findMany.mockResolvedValueOnce([
        {
          id: "log-1",
          entityId: "cust-1",
          action: "CUSTOMER_COD_RESTRICTED",
          createdAt: new Date("2026-11-10T12:00:00Z"),
          actorId: "admin-1",
        },
      ]);

      const result = await backfillCustomerCodRestrictions();

      expect(result.updatedCount).toBe(1);
      expect(result.blockedCount).toBe(1);
      expect(result.unblockedCount).toBe(0);

      expect(mockPrismaTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: "cust-1", role: "CUSTOMER" },
        data: {
          codBlocked: true,
          codBlockedAt: new Date("2026-11-10T12:00:00Z"),
          codBlockedById: "admin-1",
        },
      });
    });

    test("latest AuditLog event wins: customer with ALLOWED after RESTRICTED remains unblocked", async () => {
      // Returned sorted by createdAt desc, id desc
      mockPrismaTx.auditLog.findMany.mockResolvedValueOnce([
        {
          id: "log-2",
          entityId: "cust-2",
          action: "CUSTOMER_COD_ALLOWED",
          createdAt: new Date("2026-11-12T15:00:00Z"),
          actorId: "admin-2",
        },
        {
          id: "log-1",
          entityId: "cust-2",
          action: "CUSTOMER_COD_RESTRICTED",
          createdAt: new Date("2026-11-10T12:00:00Z"),
          actorId: "admin-1",
        },
      ]);

      const result = await backfillCustomerCodRestrictions();

      expect(result.updatedCount).toBe(1);
      expect(result.blockedCount).toBe(0);
      expect(result.unblockedCount).toBe(1);

      expect(mockPrismaTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: "cust-2", role: "CUSTOMER" },
        data: {
          codBlocked: false,
          codBlockedAt: null,
          codBlockedById: null,
        },
      });
    });

    test("deterministic tie-breaking: id DESC breaks tie when timestamps are identical", async () => {
      const sameTimestamp = new Date("2026-11-14T10:00:00Z");

      // Sorted by createdAt desc, id desc -> log-b comes before log-a
      mockPrismaTx.auditLog.findMany.mockResolvedValueOnce([
        {
          id: "log-b",
          entityId: "cust-tie",
          action: "CUSTOMER_COD_RESTRICTED",
          createdAt: sameTimestamp,
          actorId: "admin-1",
        },
        {
          id: "log-a",
          entityId: "cust-tie",
          action: "CUSTOMER_COD_ALLOWED",
          createdAt: sameTimestamp,
          actorId: "admin-2",
        },
      ]);

      const result = await backfillCustomerCodRestrictions();

      // First event seen (log-b) wins deterministically
      expect(result.blockedCount).toBe(1);
      expect(mockPrismaTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: "cust-tie", role: "CUSTOMER" },
        data: {
          codBlocked: true,
          codBlockedAt: sameTimestamp,
          codBlockedById: "admin-1",
        },
      });
    });

    test("handles empty audit logs gracefully with zero updates", async () => {
      mockPrismaTx.auditLog.findMany.mockResolvedValueOnce([]);

      const result = await backfillCustomerCodRestrictions();

      expect(result.updatedCount).toBe(0);
      expect(result.blockedCount).toBe(0);
      expect(result.unblockedCount).toBe(0);
      expect(mockPrismaTx.user.updateMany).not.toHaveBeenCalled();
    });
  });
});
