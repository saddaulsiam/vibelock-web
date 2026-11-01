"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import type {
  PosShiftSummary,
  PosZReportData,
  OpenShiftInput,
  RecordCashDropInput,
  CloseShiftInput,
} from "./pos-shift-types";
import type { PosActionResult } from "./pos-types";

/**
 * Fetches the currently active shift for the cashier, including real-time drawer calculations.
 */
export async function getCurrentShiftAction(): Promise<PosActionResult<PosShiftSummary | null>> {
  try {
    const cashier = await requireRole("STAFF", { throw: true });

    // 1. Find the latest OPEN_SHIFT log for this cashier
    const lastOpen = await prisma.auditLog.findFirst({
      where: {
        entityType: "PosRegisterShift",
        action: "OPEN_SHIFT",
        actorId: cashier.id,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastOpen) {
      return { success: true, data: null };
    }

    // 2. Check if a CLOSE_SHIFT log exists after or at that open log
    const matchingClose = await prisma.auditLog.findFirst({
      where: {
        entityType: "PosRegisterShift",
        action: "CLOSE_SHIFT",
        actorId: cashier.id,
        createdAt: { gte: lastOpen.createdAt },
      },
    });

    if (matchingClose) {
      // Shift is closed
      return { success: true, data: null };
    }

    // 3. Shift is ACTIVE! Compute live sales during this shift window
    const openMetadata = (lastOpen.metadata as Record<string, unknown>) || {};
    const openingFloat = Number(openMetadata.openingFloat) || 0;
    const notes = typeof openMetadata.notes === "string" ? openMetadata.notes : null;

    // Fetch POS sales made by this cashier during this shift
    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: lastOpen.createdAt },
        order: {
          salesChannel: "POS",
          userId: cashier.id,
        },
      },
      select: {
        amount: true,
        gateway: true,
      },
    });

    let cashSales = 0;
    let bkashSales = 0;
    let cardSales = 0;

    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.gateway === "CASH") {
        cashSales += amt;
      } else if (p.gateway === "BKASH") {
        bkashSales += amt;
      } else if (p.gateway === "CARD") {
        cardSales += amt;
      }
    }

    const totalSales = cashSales + bkashSales + cardSales;
    const ordersCount = payments.length;

    // Fetch cash drops / payouts recorded during this shift
    const dropLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "PosRegisterShift",
        action: "CASH_DROP",
        actorId: cashier.id,
        createdAt: { gte: lastOpen.createdAt },
      },
    });

    const cashDrops = dropLogs.reduce((sum, log) => {
      const meta = (log.metadata as Record<string, unknown>) || {};
      return sum + (Number(meta.amount) || 0);
    }, 0);

    const expectedCash = Math.max(0, openingFloat + cashSales - cashDrops);

    const summary: PosShiftSummary = {
      shiftId: lastOpen.entityId,
      isOpen: true,
      openedAt: lastOpen.createdAt.toISOString(),
      closedAt: null,
      cashierId: cashier.id,
      cashierName: cashier.name || cashier.email || "Cashier",
      openingFloat,
      cashSales,
      bkashSales,
      cardSales,
      totalSales,
      cashDrops,
      ordersCount,
      expectedCash,
      notes,
    };

    return { success: true, data: summary };
  } catch (error: unknown) {
    console.error("Error fetching current shift:", error);
    const msg = error instanceof Error ? error.message : "Failed to load register shift";
    return { success: false, error: msg };
  }
}

/**
 * Opens a new register shift with an opening cash float.
 */
export async function openRegisterShiftAction(
  input: OpenShiftInput
): Promise<PosActionResult<PosShiftSummary>> {
  try {
    const cashier = await requireRole("STAFF", { throw: true });

    // Ensure no shift is currently open
    const current = await getCurrentShiftAction();
    if (current.success && current.data && current.data.isOpen) {
      return {
        success: false,
        error: "A register shift is already open. Please close the active shift first.",
      };
    }

    const floatAmt = Math.max(0, Number(input.openingFloat) || 0);
    const shiftId = `VL-SHIFT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const openedAt = new Date();

    await prisma.auditLog.create({
      data: {
        actorId: cashier.id,
        action: "OPEN_SHIFT",
        entityType: "PosRegisterShift",
        entityId: shiftId,
        metadata: {
          openingFloat: floatAmt,
          openedAt: openedAt.toISOString(),
          notes: input.notes?.trim() || null,
        },
      },
    });

    revalidatePath("/pos");

    const summary: PosShiftSummary = {
      shiftId,
      isOpen: true,
      openedAt: openedAt.toISOString(),
      closedAt: null,
      cashierId: cashier.id,
      cashierName: cashier.name || cashier.email || "Cashier",
      openingFloat: floatAmt,
      cashSales: 0,
      bkashSales: 0,
      cardSales: 0,
      totalSales: 0,
      cashDrops: 0,
      ordersCount: 0,
      expectedCash: floatAmt,
      notes: input.notes?.trim() || null,
    };

    return { success: true, data: summary };
  } catch (error: unknown) {
    console.error("Error opening register shift:", error);
    const msg = error instanceof Error ? error.message : "Failed to open register shift";
    return { success: false, error: msg };
  }
}

/**
 * Records a petty cash drop / cash payout from the active drawer.
 */
export async function recordCashDropAction(
  input: RecordCashDropInput
): Promise<PosActionResult<{ newExpectedCash: number }>> {
  try {
    const cashier = await requireRole("STAFF", { throw: true });

    const current = await getCurrentShiftAction();
    if (!current.success || !current.data || !current.data.isOpen) {
      return { success: false, error: "No active register shift found." };
    }

    const amount = Number(input.amount);
    if (!amount || amount <= 0) {
      return { success: false, error: "Please enter a valid cash drop amount." };
    }

    if (!input.reason || !input.reason.trim()) {
      return { success: false, error: "Please provide a reason for the cash payout." };
    }

    if (amount > current.data.expectedCash) {
      return {
        success: false,
        error: `Cannot payout ৳${amount.toFixed(0)}. Drawer only has ৳${current.data.expectedCash.toFixed(0)}.`,
      };
    }

    await prisma.auditLog.create({
      data: {
        actorId: cashier.id,
        action: "CASH_DROP",
        entityType: "PosRegisterShift",
        entityId: current.data.shiftId,
        metadata: {
          amount,
          reason: input.reason.trim(),
          recordedAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath("/pos");

    return {
      success: true,
      data: {
        newExpectedCash: Math.max(0, current.data.expectedCash - amount),
      },
    };
  } catch (error: unknown) {
    console.error("Error recording cash drop:", error);
    const msg = error instanceof Error ? error.message : "Failed to record cash drop";
    return { success: false, error: msg };
  }
}

/**
 * Closes the active shift, calculates cash discrepancy, and returns official Z-Report data.
 */
export async function closeRegisterShiftAction(
  input: CloseShiftInput
): Promise<PosActionResult<PosZReportData>> {
  try {
    const cashier = await requireRole("STAFF", { throw: true });

    const current = await getCurrentShiftAction();
    if (!current.success || !current.data || !current.data.isOpen) {
      return { success: false, error: "No active shift found to close." };
    }

    const shift = current.data;
    const countedCash = Math.max(0, Number(input.countedCash) || 0);
    const variance = countedCash - shift.expectedCash;

    let varianceStatus: "EXACT" | "SHORTAGE" | "SURPLUS" = "EXACT";
    if (variance < 0) varianceStatus = "SHORTAGE";
    else if (variance > 0) varianceStatus = "SURPLUS";

    const reportId = `VL-ZREPORT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const closedAt = new Date().toISOString();

    await prisma.auditLog.create({
      data: {
        actorId: cashier.id,
        action: "CLOSE_SHIFT",
        entityType: "PosRegisterShift",
        entityId: shift.shiftId,
        metadata: {
          reportId,
          openingFloat: shift.openingFloat,
          cashSales: shift.cashSales,
          bkashSales: shift.bkashSales,
          cardSales: shift.cardSales,
          totalSales: shift.totalSales,
          totalOrders: shift.ordersCount,
          cashDrops: shift.cashDrops,
          expectedCash: shift.expectedCash,
          countedCash,
          variance,
          varianceStatus,
          closedAt,
          notes: input.notes?.trim() || null,
        },
      },
    });

    revalidatePath("/pos");

    const zReport: PosZReportData = {
      reportId,
      shiftId: shift.shiftId,
      cashierName: cashier.name || cashier.email || "Cashier",
      cashierEmail: cashier.email || "",
      openedAt: shift.openedAt,
      closedAt,
      openingFloat: shift.openingFloat,
      cashSales: shift.cashSales,
      bkashSales: shift.bkashSales,
      cardSales: shift.cardSales,
      totalSales: shift.totalSales,
      totalOrders: shift.ordersCount,
      cashDrops: shift.cashDrops,
      expectedCash: shift.expectedCash,
      countedCash,
      variance,
      varianceStatus,
      closingNotes: input.notes?.trim() || null,
    };

    return { success: true, data: zReport };
  } catch (error: unknown) {
    console.error("Error closing register shift:", error);
    const msg = error instanceof Error ? error.message : "Failed to close register shift";
    return { success: false, error: msg };
  }
}
