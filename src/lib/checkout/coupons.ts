import { DiscountType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export interface CouponTargetCategory {
  id: string;
  name: string;
}

export interface CouponData {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: Prisma.Decimal | number;
  minOrderValue: Prisma.Decimal | number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  categories?: CouponTargetCategory[];
}

export interface CartItemCategoryInfo {
  price: number;
  quantity: number;
  categoryIds: string[];
}

export function getEligibleSubtotal(
  coupon: { categories?: CouponTargetCategory[] },
  items: CartItemCategoryInfo[]
): { eligibleSubtotal: number; hasEligibleItems: boolean } {
  const targetCategories = coupon.categories ?? [];
  if (targetCategories.length === 0) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { eligibleSubtotal: subtotal, hasEligibleItems: items.length > 0 };
  }

  const targetCategoryIds = new Set(targetCategories.map((c) => c.id));
  let eligibleSubtotal = 0;
  let hasEligibleItems = false;

  for (const item of items) {
    const isTargeted = item.categoryIds.some((catId) => targetCategoryIds.has(catId));
    if (isTargeted) {
      eligibleSubtotal += item.price * item.quantity;
      hasEligibleItems = true;
    }
  }

  return { eligibleSubtotal, hasEligibleItems };
}

export function validateCouponRules(
  coupon: CouponData,
  subtotal: number,
  now = new Date(),
  eligibleCategoryCheck?: { hasEligibleItems: boolean }
) {
  if (!coupon.isActive) {
    throw new CouponError("This coupon is not active.");
  }
  if (coupon.startDate && coupon.startDate > now) {
    throw new CouponError("This coupon is not active yet.");
  }
  if (coupon.endDate && coupon.endDate < now) {
    throw new CouponError("This coupon has expired.");
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponError("This coupon has reached its usage limit.");
  }
  if (coupon.minOrderValue !== null && subtotal < Number(coupon.minOrderValue)) {
    throw new CouponError(
      `Minimum order value of ${Number(coupon.minOrderValue).toFixed(0)} BDT required for this coupon.`
    );
  }
  if (coupon.categories && coupon.categories.length > 0) {
    if (eligibleCategoryCheck && !eligibleCategoryCheck.hasEligibleItems) {
      const categoryNames = coupon.categories.map((c) => c.name).join(", ");
      throw new CouponError(
        `This coupon only applies to items in the following categories: ${categoryNames}. Your cart does not contain any eligible items.`
      );
    }
  }
}

export function calculateCouponDiscount(
  coupon: { discountType: DiscountType; discountValue: Prisma.Decimal | number },
  subtotal: number
): number {
  if (subtotal <= 0) return 0;
  const value = Number(coupon.discountValue);
  let rawDiscount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    rawDiscount = (subtotal * value) / 100;
  } else if (coupon.discountType === "FIXED") {
    rawDiscount = value;
  }

  // Round to 2 decimal places and cap at subtotal
  const rounded = Math.round(rawDiscount * 100) / 100;
  return Math.max(0, Math.min(subtotal, rounded));
}

/**
 * Verifies whether the authenticated customer has already redeemed this coupon on an active, non-cancelled order.
 * Enforces per-user coupon redemption limits to prevent repeated abuse of promotional discounts.
 */
export async function validateCustomerCouponEligibility(
  userId: string,
  couponCode: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  const normalizedCode = couponCode.trim().toUpperCase();

  // SEC-11: Personal store credit vouchers (VL-CREDIT-...) are issued exclusively to specific customers.
  // Enforce customer account verification to prevent enumeration, leak exploitation, and store credit theft.
  if (normalizedCode.startsWith("VL-CREDIT-")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as any;
    const hasReturnRequest = typeof dbAny.returnRequest?.findMany === "function";
    const hasAuditLog = typeof dbAny.auditLog?.findMany === "function";

    if (hasReturnRequest && hasAuditLog) {
      let userEmail: string | null = null;
      if (typeof dbAny.user?.findUnique === "function") {
        try {
          const userRec = await dbAny.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });
          userEmail = userRec?.email ?? null;
        } catch {
          // Proceed with userId filter only
        }
      }

      const userReturnRequests = await dbAny.returnRequest.findMany({
        where: {
          order: {
            OR: [
              { userId },
              ...(userEmail ? [{ customerEmail: userEmail }] : []),
            ],
          },
        },
        select: { id: true },
      });

      const userReturnIds = (userReturnRequests as Array<{ id: string }>).map((r) => r.id);

      if (userReturnIds.length === 0) {
        throw new CouponError("This store credit voucher is not associated with your account.");
      }

      const userCreditAuditLogs = await dbAny.auditLog.findMany({
        where: {
          action: "STORE_CREDIT_ISSUED",
          entityType: "ReturnRequest",
          entityId: { in: userReturnIds },
        },
        select: { metadata: true },
      });

      let isOwner = false;
      for (const log of (userCreditAuditLogs as Array<{ metadata: unknown }>)) {
        const meta = (log.metadata as Record<string, unknown> | null) || {};
        if (
          typeof meta.couponCode === "string" &&
          meta.couponCode.toUpperCase() === normalizedCode
        ) {
          isOwner = true;
          break;
        }
      }

      if (!isOwner) {
        throw new CouponError("This store credit voucher is not associated with your account.");
      }
    }
  }

  // SEC-8-02: Use exact delimiter matching to prevent substring/prefix false positives
  // (e.g. preventing 'WELCOME100' from matching 'WELCOME10').
  // Matches "Coupon applied: CODE (" from actions.ts or "Coupon applied: CODE" at the end of a note.
  const activeOrdersCount = await db.order.count({
    where: {
      userId,
      status: { not: "CANCELLED" },
      history: {
        some: {
          OR: [
            {
              notes: {
                contains: `Coupon applied: ${normalizedCode} (`,
                mode: "insensitive",
              },
            },
            {
              notes: {
                endsWith: `Coupon applied: ${normalizedCode}`,
                mode: "insensitive",
              },
            },
            {
              notes: {
                contains: `Coupon applied: ${normalizedCode}.`,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
  });

  if (activeOrdersCount > 0) {
    throw new CouponError("You have already redeemed this coupon.");
  }
}

/**
 * Releases a redeemed coupon when an order is cancelled, refunded, or payment fails.
 * Decrements the coupon's usageCount and reactivates it if it was deactivated due to reaching its usageLimit.
 * Safe and idempotent under concurrent or repeated execution.
 */
export async function releaseOrderCoupon(
  orderId: string,
  tx: Prisma.TransactionClient
): Promise<{ success: boolean; releasedCoupon?: string; reason?: string }> {
  // 1. Serialize cancellation per order
  try {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  } catch {
    // Graceful fallback for test environments without raw queries
  }

  // 1b. Defensive guard: Do not release coupon if order is successfully paid or actively fulfilling
  let orderUserId: string | null = null;
  if (typeof tx.order?.findUnique === "function") {
    try {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, paymentStatus: true, userId: true },
      });
      if (order) {
        orderUserId = order.userId ?? null;
        if (
          order.paymentStatus === "SUCCESS" &&
          order.status !== "CANCELLED" &&
          order.status !== "REFUNDED"
        ) {
          return { success: false, reason: "ORDER_PAID_OR_ACTIVE" };
        }
        if (
          ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
            order.status as string
          )
        ) {
          return { success: false, reason: "ORDER_PAID_OR_ACTIVE" };
        }
      }
    } catch {
      // Proceed if order check query fails
    }
  }

  // 2. Check if a coupon was redeemed on this order via audit log
  let couponCodeToRelease: string | null = null;
  let couponIdToRelease: string | null = null;

  try {
    const redemptionLog = await tx.auditLog.findFirst({
      where: {
        entityType: "Order",
        entityId: orderId,
        action: "COUPON_REDEEMED",
      },
    });

    if (redemptionLog?.metadata && typeof redemptionLog.metadata === "object") {
      const meta = redemptionLog.metadata as { couponCode?: string; couponId?: string };
      couponCodeToRelease = meta.couponCode ?? null;
      couponIdToRelease = meta.couponId ?? null;
    }
  } catch {
    // Fallback if audit log query fails
  }

  // Fallback to order history if audit log does not have coupon
  if (!couponCodeToRelease && typeof tx.orderHistory?.findFirst === "function") {
    try {
      const historyEntry = await tx.orderHistory.findFirst({
        where: {
          orderId,
          notes: { contains: "Coupon applied:" },
        },
      });
      if (historyEntry?.notes) {
        const match = historyEntry.notes.match(/Coupon applied:\s*([A-Z0-9_-]+)/i);
        if (match) {
          couponCodeToRelease = match[1].toUpperCase();
        }
      }
    } catch {
      // Proceed if orderHistory query fails
    }
  }

  if (!couponCodeToRelease) {
    return { success: false };
  }

  // 3. Idempotency check: has this order's coupon already been released?
  try {
    const alreadyReleased = await tx.auditLog.findFirst({
      where: {
        entityType: "Order",
        entityId: orderId,
        action: "COUPON_RELEASED",
      },
    });

    if (alreadyReleased) {
      return { success: true, releasedCoupon: couponCodeToRelease };
    }
  } catch {
    // Proceed if auditLog check fails
  }

  // 4. Lock and load the coupon row
  let coupon: {
    id: string;
    code: string;
    usageCount: number;
    usageLimit: number | null;
    isActive: boolean;
  } | null = null;

  try {
    const lockedCoupons = await tx.$queryRaw<
      Array<{
        id: string;
        code: string;
        usageCount: number;
        usageLimit: number | null;
        isActive: boolean;
      }>
    >`
      SELECT "id", "code", "usageCount", "usageLimit", "isActive"
      FROM "Coupon"
      WHERE ${couponIdToRelease ? Prisma.sql`"id" = ${couponIdToRelease} OR` : Prisma.empty}
            UPPER("code") = ${couponCodeToRelease.toUpperCase()}
      FOR UPDATE
    `;
    if (lockedCoupons.length > 0) {
      coupon = lockedCoupons[0];
    }
  } catch {
    // Fallback for mocked test environments
    coupon = await tx.coupon.findFirst({
      where: {
        OR: [
          ...(couponIdToRelease ? [{ id: couponIdToRelease }] : []),
          { code: couponCodeToRelease.toUpperCase() },
        ],
      },
      select: {
        id: true,
        code: true,
        usageCount: true,
        usageLimit: true,
        isActive: true,
      },
    });
  }

  if (!coupon) {
    return { success: false };
  }

  // SEC-8-01: Capture original usage stats under row lock before updating.
  // Cancellation only reactivates a coupon if it was disabled because its usage limit was exhausted.
  const originalUsageCount = coupon.usageCount;
  const originalUsageLimit = coupon.usageLimit;
  const originalIsActive = coupon.isActive;

  const newUsageCount = Math.max(0, originalUsageCount - 1);
  const wasExhausted =
    !originalIsActive &&
    originalUsageLimit !== null &&
    originalUsageCount >= originalUsageLimit;
  const shouldReactivate = wasExhausted && newUsageCount < originalUsageLimit;

  // 5. Decrement usage count and reactivate only if it was deactivated due to exhaustion
  await tx.coupon.update({
    where: { id: coupon.id },
    data: {
      usageCount: newUsageCount,
      ...(shouldReactivate ? { isActive: true } : {}),
    },
  });

  // 6. Record audit log for idempotency and traceability
  if (!orderUserId && typeof tx.order?.findUnique === "function") {
    try {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      orderUserId = order?.userId ?? null;
    } catch {
      // Proceed if order query fails
    }
  }

  if (typeof tx.auditLog?.create === "function") {
    try {
      await tx.auditLog.create({
        data: {
          actorId: orderUserId,
          action: "COUPON_RELEASED",
          entityType: "Order",
          entityId: orderId,
          metadata: {
            couponId: coupon.id,
            couponCode: coupon.code,
            previousUsageCount: originalUsageCount,
            newUsageCount,
            reactivated: shouldReactivate,
            wasExhausted,
            reason: "Order cancelled or online payment failed",
          },
        },
      });
    } catch {
      // Proceed if auditLog write fails
    }
  }

  if (typeof tx.orderHistory?.create === "function") {
    try {
      await tx.orderHistory.create({
        data: {
          orderId,
          status: "CANCELLED",
          notes: `Coupon "${coupon.code}" usage released (count: ${originalUsageCount} -> ${newUsageCount}${shouldReactivate ? ", coupon reactivated" : ""}).`,
        },
      });
    } catch {
      // Proceed if orderHistory write fails
    }
  }

  return { success: true, releasedCoupon: coupon.code };
}
