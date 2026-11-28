import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const DEFAULT_EXPIRATION_BATCH_SIZE = 50;
export const MAX_EXPIRATION_BATCH_SIZE = 100;
export const DEFAULT_ABANDONED_TIMEOUT_MINUTES = 15;
export const PAYMENT_IN_FLIGHT_GRACE_MINUTES = 15;

export type ExpireOrderOptions = {
  tx?: Prisma.TransactionClient;
  reason?: string;
  force?: boolean;
};

export type ExpireOrderResult = {
  success: boolean;
  orderId: string;
  orderNumber?: string;
  alreadyCancelled?: boolean;
  releasedCoupon?: string;
  reason?: string;
  error?: string;
};

export type CleanupOptions = {
  batchSize?: number;
  olderThanMinutes?: number;
  cutoffTime?: Date;
};

export type CleanupResult = {
  scanned: number;
  expired: number;
  skipped: number;
  errors: Array<{ orderId: string; error: string }>;
};

/**
 * Atomically expires a single abandoned or unpaid online order.
 * Row locks the order, verifies eligibility, cancels inventory reservations,
 * and releases any applied coupon so the code is restored for future use.
 *
 * Idempotent and concurrency-safe against competing payment verification or cleanup tasks.
 */
export async function expireOrder(
  orderId: string,
  options?: ExpireOrderOptions
): Promise<ExpireOrderResult> {
  const execute = async (tx: Prisma.TransactionClient): Promise<ExpireOrderResult> => {
    // 1. Serialize using pessimistic row lock on Order (fail-closed: lock failure aborts transaction)
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    // 2. Fetch fresh order state under lock
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        inventoryReservations: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        orderId,
        reason: "ORDER_NOT_FOUND",
      };
    }

    // If order is already cancelled, succeed idempotently without mutating state
    if (order.status === "CANCELLED" && order.paymentStatus === "CANCELLED") {
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        alreadyCancelled: true,
      };
    }

    // FINANCIAL & FULFILLMENT IMMUNITY: Never expire or cancel successfully paid orders
    const isPaid =
      order.paymentStatus === "SUCCESS" || order.payments?.some((p) => p.status === "SUCCESS");

    if (isPaid) {
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "ORDER_ALREADY_PAID",
      };
    }

    // Safety: Only pending orders are eligible for timeout expiration
    if (order.status !== "PENDING") {
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "ORDER_NOT_PENDING",
      };
    }

    // Safety: Only ONLINE unpaid orders are subject to abandonment expiration
    if (order.paymentMethod !== "ONLINE") {
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "ORDER_NOT_ONLINE",
      };
    }

    const now = new Date();

    // Safety: Check if order still has unexpired active reservations (unless forced)
    if (!options?.force) {
      const hasActiveUnexpiredReservation = order.inventoryReservations?.some(
        (r) => r.status === "RESERVED" && r.expiresAt && new Date(r.expiresAt) > now
      );

      if (hasActiveUnexpiredReservation) {
        return {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: "RESERVATION_NOT_EXPIRED",
        };
      }
    }

    // Safety: Check if an online payment attempt is actively unresolved (e.g. INITIATED or PENDING within grace window)
    const graceMs = PAYMENT_IN_FLIGHT_GRACE_MINUTES * 60 * 1000;
    const hasPaymentInFlight = order.payments?.some((p) => {
      if (p.status !== "INITIATED" && p.status !== "PENDING") return false;
      const ageMs = now.getTime() - new Date(p.createdAt).getTime();
      return ageMs < graceMs;
    });

    if (hasPaymentInFlight && !options?.force) {
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "PAYMENT_IN_FLIGHT",
      };
    }

    // 3. Mark order as CANCELLED
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
      },
    });

    // 4. Release inventory reservations (idempotent, releases RESERVED/COMMITTED and restocks if needed)
    const { InventoryService } = await import("@/lib/inventory/service");
    await InventoryService.cancelOrderInventory(order.id, tx);

    // 5. Release redeemed coupon (idempotent, decrements usageCount, reactivates if limit was exhausted)
    const { releaseOrderCoupon } = await import("@/lib/checkout/coupons");
    const couponResult = await releaseOrderCoupon(order.id, tx);

    if (!couponResult.success && couponResult.reason !== "NO_COUPON") {
      throw new Error(
        `Failed to release coupon for order ${order.id}: ${couponResult.reason || "Unknown coupon release failure"}`
      );
    }

    // 5.5. Reconcile any redeemed loyalty points (refund back to customer)
    const { reconcileCancelledOrderLoyalty } = await import("./loyalty-reconciliation");
    await reconcileCancelledOrderLoyalty(order, tx, "expired");

    const expirationReason =
      options?.reason ||
      "Order expired due to unpaid checkout timeout. Reserved inventory and coupon released.";

    // 6. Record order history (fail-closed, part of transactional consistency)
    await tx.orderHistory.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        notes: expirationReason,
      },
    });

    // 7. Record audit log (fail-closed, part of transactional consistency)
    await tx.auditLog.create({
      data: {
        actorId: order.userId ?? null,
        action: "ORDER_EXPIRED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          from: order.status,
          to: "CANCELLED",
          reason: options?.reason || "UNPAID_TIMEOUT",
          orderNumber: order.orderNumber,
          releasedCoupon: couponResult.releasedCoupon ?? null,
        },
      },
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      releasedCoupon: couponResult.releasedCoupon,
      reason: expirationReason,
    };
  };

  if (options?.tx) {
    return execute(options.tx);
  }

  return prisma.$transaction(execute);
}

/**
 * Scans and cleans up expired unpaid online orders in batches.
 * Each candidate order is processed in its own transactional row lock,
 * guaranteeing failure isolation and minimal lock durations.
 */
export async function cleanupExpiredOrders(options?: CleanupOptions): Promise<CleanupResult> {
  const batchSize = Math.min(
    Math.max(1, options?.batchSize ?? DEFAULT_EXPIRATION_BATCH_SIZE),
    MAX_EXPIRATION_BATCH_SIZE
  );

  const olderThanMinutes = Math.max(
    1,
    options?.olderThanMinutes ?? DEFAULT_ABANDONED_TIMEOUT_MINUTES
  );
  const now = new Date();
  const cutoffTime = options?.cutoffTime ?? new Date(now.getTime() - olderThanMinutes * 60 * 1000);

  // Find candidate orders eligible for expiration
  const candidates = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: { not: "SUCCESS" },
      createdAt: { lte: cutoffTime },
      // Must not have any active unexpired reservations
      inventoryReservations: {
        none: {
          status: "RESERVED",
          expiresAt: { gt: now },
        },
      },
      // Must not have any successful payments
      payments: {
        none: {
          status: "SUCCESS",
        },
      },
    },
    select: {
      id: true,
      orderNumber: true,
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const result: CleanupResult = {
    scanned: candidates.length,
    expired: 0,
    skipped: 0,
    errors: [],
  };

  for (const candidate of candidates) {
    try {
      const outcome = await expireOrder(candidate.id);
      if (outcome.success) {
        if (outcome.alreadyCancelled) {
          result.skipped += 1;
        } else {
          result.expired += 1;
        }
      } else {
        result.skipped += 1;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[cleanupExpiredOrders] Error expiring order ${candidate.id}:`, err);
      result.errors.push({
        orderId: candidate.id,
        error: errorMsg,
      });
    }
  }

  return result;
}
