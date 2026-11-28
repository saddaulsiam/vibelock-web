"use server";

import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import type { PosActionResult } from "./pos-types";

export interface PosVoidOrderInput {
  orderId: string;
  reason?: string;
}

/**
 * Voids a POS counter order completed today:
 * - Requires MANAGER or ADMIN role
 * - Enforces order was created today (within 24 hours) and was not already cancelled or returned
 * - Reverts physical stock via RESTOCK InventoryTransaction records for all items
 * - Updates order status to CANCELLED and paymentStatus to REFUNDED
 * - Logs audit trail with manager identity and reason
 */
export async function voidPosOrderAction(
  input: PosVoidOrderInput
): Promise<PosActionResult<{ orderNumber: string; pointsRefunded?: number; pointsReversed?: number }>> {
  try {
    const manager = await requireRole("MANAGER", { throw: true });

    if (!input.orderId || typeof input.orderId !== "string") {
      return { success: false, error: "Order ID is required to void." };
    }

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: true,
        payments: true,
        returns: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (order.salesChannel !== "POS") {
      return { success: false, error: "Only in-store POS counter orders can be voided via POS." };
    }

    if (order.status === "CANCELLED") {
      return { success: false, error: `Order ${order.orderNumber} is already voided/cancelled.` };
    }

    if (order.status === "RETURNED" || order.status === "REFUNDED") {
      return {
        success: false,
        error: `Cannot void order ${order.orderNumber} because it already has returns or refunds.`,
      };
    }

    if (order.returns && order.returns.length > 0) {
      return {
        success: false,
        error: `Cannot void order ${order.orderNumber} because it already has associated return/exchange requests.`,
      };
    }

    // Ensure order was made within today (same day / 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (order.createdAt < twentyFourHoursAgo) {
      return {
        success: false,
        error:
          "Same-day void policy: Only orders created within the last 24 hours can be voided. Use the Returns workflow for older sales.",
      };
    }

    const voidReason = input.reason?.trim() || "Same-day counter void by manager";
    let pointsRefunded = 0;
    let pointsReversed = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Mark order as CANCELLED and paymentStatus as REFUNDED
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
        },
      });

      // 2. Mark payments as REFUNDED
      for (const payment of order.payments) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
          },
        });
      }

      // 3. Revert physical inventory for each item in the order
      const skus = Array.from(new Set(order.items.map((i) => i.sku)));
      const variants = await tx.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { id: true, sku: true },
      });
      const skuMap = new Map(variants.map((v) => [v.sku, v.id]));

      // Aggregate restock quantities by variantId to prevent @@unique([type, referenceId, variantId]) collision
      const restockQtyMap = new Map<string, number>();
      for (const item of order.items) {
        const variantId = skuMap.get(item.sku);
        if (variantId) {
          restockQtyMap.set(variantId, (restockQtyMap.get(variantId) || 0) + item.quantity);
        }
      }

      for (const [variantId, qty] of restockQtyMap.entries()) {
        await tx.inventoryTransaction.create({
          data: {
            variantId,
            type: "RESTOCK",
            quantity: qty,
            salesChannel: "POS",
            referenceId: order.id,
            notes: `POS Void Restock - ${order.orderNumber}: ${voidReason}`,
          },
        });
      }

      // 4. Settle loyalty points: refund redeemed points and reverse earned points
      let redeemedPoints = 0;
      if (Array.isArray(order.payments)) {
        for (const payment of order.payments) {
          const payload = payment.gatewayPayload as Record<string, unknown> | null;
          if (
            typeof payload?.loyaltyPointsRedeemed === "number" &&
            payload.loyaltyPointsRedeemed > 0
          ) {
            redeemedPoints += payload.loyaltyPointsRedeemed;
          }
        }
      }
      if (redeemedPoints === 0 && typeof (order as { loyaltyPointsRedeemed?: number }).loyaltyPointsRedeemed === "number") {
        redeemedPoints = (order as { loyaltyPointsRedeemed?: number }).loyaltyPointsRedeemed ?? 0;
      }
      pointsRefunded = redeemedPoints;

      const earnedPoints =
        typeof (order as { loyaltyPointsEarned?: number }).loyaltyPointsEarned === "number"
          ? (order as { loyaltyPointsEarned?: number }).loyaltyPointsEarned ?? 0
          : 0;
      pointsReversed = earnedPoints;

      if (
        (redeemedPoints > 0 || earnedPoints > 0) &&
        order.customerPhone &&
        order.customerPhone !== "N/A"
      ) {
        const { normalizeBdPhoneNumber } = await import("@/lib/validations/auth");
        const normalizedPhone = normalizeBdPhoneNumber(order.customerPhone);
        const account = await tx.loyaltyAccount.findFirst({
          where: { phone: { endsWith: normalizedPhone.slice(-10) } },
          select: { id: true, points: true, lifetimePoints: true, lifetimeSpend: true },
        });

        if (account) {
          let runningBalance = account.points;

          // 4a. Refund redeemed points
          if (redeemedPoints > 0) {
            runningBalance += redeemedPoints;
            await tx.loyaltyTransaction.create({
              data: {
                loyaltyAccountId: account.id,
                orderId: order.id,
                type: "REFUNDED",
                points: redeemedPoints,
                balanceAfter: runningBalance,
                reason: `POS Void Refund - ${order.orderNumber}: ${voidReason}`,
              },
            });
          }

          // 4b. Revert earned points
          if (earnedPoints > 0) {
            runningBalance = Math.max(0, runningBalance - earnedPoints);
            await tx.loyaltyTransaction.create({
              data: {
                loyaltyAccountId: account.id,
                orderId: order.id,
                type: "ADJUSTED",
                points: -earnedPoints,
                balanceAfter: runningBalance,
                reason: `POS Void Reversal - earned points deducted for ${order.orderNumber}`,
              },
            });
          }

          const newLifetimePoints = Math.max(0, (account.lifetimePoints ?? 0) - earnedPoints);
          const newLifetimeSpend = Math.max(0, Number(account.lifetimeSpend ?? 0) - Number(order.total));

          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              points: runningBalance,
              lifetimePoints: newLifetimePoints,
              lifetimeSpend: newLifetimeSpend,
            },
          });
        }
      }

      // 5. Create Order History snapshot
      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          notes: `POS Order voided by ${manager.name || manager.email} (${manager.role}). Reason: ${voidReason}. All items restocked.`,
        },
      });

      // 6. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: manager.id,
          action: "POS_ORDER_VOIDED",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            orderNumber: order.orderNumber,
            total: Number(order.total),
            reason: voidReason,
            itemsCount: order.items.length,
            voidedByRole: manager.role,
            pointsRefunded,
            pointsReversed,
          },
        },
      });
    });

    revalidatePath("/pos");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/reports");

    return {
      success: true,
      data: { orderNumber: order.orderNumber, pointsRefunded, pointsReversed },
    };
  } catch (error) {
    console.error("Error voiding POS order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to void POS order.",
    };
  }
}
