import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  getCurrentShiftAction,
  openRegisterShiftAction,
  recordCashDropAction,
  closeRegisterShiftAction,
} from "@/lib/pos/pos-shift-actions";
import prisma from "@/lib/prisma/client";

// Mock authorization
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "cashier-101",
    name: "Siam Ahmed",
    email: "siam@vibelock.com",
    role: "STAFF",
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      auditLog: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
      },
    },
  };
});

describe("POS Shift & Cash Drawer Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentShiftAction", () => {
    test("returns null when no shift has been opened", async () => {
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getCurrentShiftAction();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test("returns null when the last shift is already closed", async () => {
      const openTime = new Date("2026-11-01T09:00:00Z");
      const closeTime = new Date("2026-11-01T17:00:00Z");

      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-1",
          createdAt: openTime,
          metadata: { openingFloat: 2000 },
        })
        .mockResolvedValueOnce({
          id: "log-close-1",
          entityId: "shift-1",
          createdAt: closeTime,
        });

      const result = await getCurrentShiftAction();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test("accurately calculates active shift expected cash from payments and cash drops", async () => {
      const openTime = new Date("2026-11-01T09:00:00Z");

      // Last open exists, no matching close
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-100",
          createdAt: openTime,
          metadata: { openingFloat: 2000, notes: "Morning register" },
        })
        .mockResolvedValueOnce(null);

      // Payments: Cash (3000), bKash (1200), Card (2500)
      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { amount: 2000, gateway: "CASH" },
        { amount: 1000, gateway: "CASH" },
        { amount: 1200, gateway: "BKASH" },
        { amount: 2500, gateway: "CARD" },
      ]);

      // Cash Drop: 500 (staff tea/snacks)
      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { metadata: { amount: 500, reason: "Store supplies" } },
      ]);

      const result = await getCurrentShiftAction();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const shift = result.data!;
      expect(shift.isOpen).toBe(true);
      expect(shift.shiftId).toBe("shift-100");
      expect(shift.openingFloat).toBe(2000);
      expect(shift.cashSales).toBe(3000);
      expect(shift.bkashSales).toBe(1200);
      expect(shift.cardSales).toBe(2500);
      expect(shift.totalSales).toBe(6700);
      expect(shift.cashDrops).toBe(500);
      expect(shift.ordersCount).toBe(4);

      // Expected Cash in Drawer: 2000 (float) + 3000 (cash sales) - 500 (drop) = 4500
      expect(shift.expectedCash).toBe(4500);
    });
  });

  describe("openRegisterShiftAction", () => {
    test("creates OPEN_SHIFT audit log with opening float", async () => {
      // No active shift
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "log-new" });

      const result = await openRegisterShiftAction({
        openingFloat: 2500,
        notes: "Starting counter float",
      });

      expect(result.success).toBe(true);
      expect(result.data?.openingFloat).toBe(2500);
      expect(result.data?.expectedCash).toBe(2500);
      expect(result.data?.isOpen).toBe(true);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "OPEN_SHIFT",
            entityType: "PosRegisterShift",
            metadata: expect.objectContaining({
              openingFloat: 2500,
              notes: "Starting counter float",
            }),
          }),
        })
      );
    });

    test("rejects opening when another shift is already active", async () => {
      // Active shift already exists
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-active",
          createdAt: new Date(),
          metadata: { openingFloat: 1000 },
        })
        .mockResolvedValueOnce(null);

      const result = await openRegisterShiftAction({
        openingFloat: 1500,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already open");
    });
  });

  describe("recordCashDropAction", () => {
    test("rejects when payout amount exceeds current expected cash in drawer", async () => {
      // Active shift has expected cash = 1000
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-1",
          createdAt: new Date(),
          metadata: { openingFloat: 1000 },
        })
        .mockResolvedValueOnce(null);

      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // Attempt to drop 1500 when drawer only has 1000
      const result = await recordCashDropAction({
        amount: 1500,
        reason: "Excessive drop",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot payout ৳1500");
    });

    test("successfully logs valid cash drop and calculates new expected balance", async () => {
      // Active shift has expected cash = 2000
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-1",
          createdAt: new Date(),
          metadata: { openingFloat: 2000 },
        })
        .mockResolvedValueOnce(null);

      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "drop-log-1" });

      const result = await recordCashDropAction({
        amount: 300,
        reason: "Cleaner payment",
      });

      expect(result.success).toBe(true);
      expect(result.data?.newExpectedCash).toBe(1700);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CASH_DROP",
            entityType: "PosRegisterShift",
            metadata: expect.objectContaining({
              amount: 300,
              reason: "Cleaner payment",
            }),
          }),
        })
      );
    });
  });

  describe("closeRegisterShiftAction", () => {
    test("computes shortage when counted cash is less than expected drawer cash", async () => {
      // Expected cash in drawer is 3000 (1000 float + 2000 cash sales)
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-closing",
          createdAt: new Date(),
          metadata: { openingFloat: 1000 },
        })
        .mockResolvedValueOnce(null);

      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { amount: 2000, gateway: "CASH" },
      ]);
      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "close-log-1" });

      // Cashier counted 2950 (Shortage of -50)
      const result = await closeRegisterShiftAction({
        countedCash: 2950,
        notes: "Missing 50 BDT, customer changed small bill",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const report = result.data!;
      expect(report.expectedCash).toBe(3000);
      expect(report.countedCash).toBe(2950);
      expect(report.variance).toBe(-50);
      expect(report.varianceStatus).toBe("SHORTAGE");
      expect(report.closingNotes).toBe("Missing 50 BDT, customer changed small bill");

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CLOSE_SHIFT",
            entityType: "PosRegisterShift",
            metadata: expect.objectContaining({
              expectedCash: 3000,
              countedCash: 2950,
              variance: -50,
              varianceStatus: "SHORTAGE",
            }),
          }),
        })
      );
    });

    test("computes exact balanced status when counted cash matches expected cash", async () => {
      (prisma.auditLog.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: "log-open-1",
          entityId: "shift-closing-exact",
          createdAt: new Date(),
          metadata: { openingFloat: 1500 },
        })
        .mockResolvedValueOnce(null);

      (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { amount: 500, gateway: "CASH" },
      ]);
      (prisma.auditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "close-log-exact" });

      // Expected = 1500 + 500 = 2000, Counted = 2000
      const result = await closeRegisterShiftAction({
        countedCash: 2000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.variance).toBe(0);
      expect(result.data?.varianceStatus).toBe("EXACT");
    });
  });
});

