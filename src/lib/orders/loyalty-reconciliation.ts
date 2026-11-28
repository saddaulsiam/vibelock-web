import type { Prisma } from "@prisma/client";

/**
 * Authoritatively reconciles loyalty points on cancelled, expired, or refunded orders.
 * - Reverses earned points and adjusts lifetime spend.
 * - Refunds redeemed points back to the customer's balance.
 * - Concurrency-safe and idempotent (sets order points to 0 after reconciliation).
 */
export async function reconcileCancelledOrderLoyalty(
  order: {
    id: string;
    orderNumber: string;
    customerPhone?: string | null;
    userId?: string | null;
    total: unknown;
    loyaltyPointsEarned?: number | null;
    loyaltyPointsRedeemed?: number | null;
  },
  tx: Prisma.TransactionClient,
  reasonPrefix = "cancelled"
) {
  const earned = order.loyaltyPointsEarned ?? 0;
  const redeemed = order.loyaltyPointsRedeemed ?? 0;

  if (earned === 0 && redeemed === 0) return;

  try {
    let account = null;
    if (order.customerPhone) {
      const { normalizeBdPhoneNumber } = await import("@/lib/validations/auth");
      const normalizedPhone = normalizeBdPhoneNumber(order.customerPhone);
      account = await tx.loyaltyAccount.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            ...(order.userId ? [{ userId: order.userId }] : []),
          ],
        },
      });
    } else if (order.userId) {
      account = await tx.loyaltyAccount.findFirst({
        where: { userId: order.userId },
      });
    }

    if (!account) return;

    let currentPoints = account.points;
    let lifetimePoints = account.lifetimePoints;
    let lifetimeSpend = Number(account.lifetimeSpend);

    // 1. If points were earned on this order, reverse them
    if (earned > 0) {
      const pointsToReverse = Math.min(currentPoints, earned);
      currentPoints = Math.max(0, currentPoints - earned);
      lifetimePoints = Math.max(0, lifetimePoints - earned);
      lifetimeSpend = Math.max(0, lifetimeSpend - Number(order.total));

      await tx.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          orderId: order.id,
          type: "ADJUSTED",
          points: -pointsToReverse,
          balanceAfter: currentPoints,
          reason: `Reversal of earned points on ${reasonPrefix} order #${order.orderNumber}`,
        },
      });
    }

    // 2. If points were redeemed on this order, refund them back to customer
    if (redeemed > 0) {
      currentPoints = currentPoints + redeemed;

      await tx.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          orderId: order.id,
          type: "REFUNDED",
          points: redeemed,
          balanceAfter: currentPoints,
          reason: `Refund of redeemed points on ${reasonPrefix} order #${order.orderNumber}`,
        },
      });
    }

    // Recalculate Tier
    const loyaltyConfig = await tx.loyaltySetting.findFirst();
    const plat = Number(loyaltyConfig?.platinumThreshold ?? 50000);
    const gold = Number(loyaltyConfig?.goldThreshold ?? 20000);
    const silv = Number(loyaltyConfig?.silverThreshold ?? 5000);
    let tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" = "BRONZE";
    if (lifetimeSpend >= plat) tier = "PLATINUM";
    else if (lifetimeSpend >= gold) tier = "GOLD";
    else if (lifetimeSpend >= silv) tier = "SILVER";

    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: currentPoints,
        lifetimePoints,
        lifetimeSpend,
        tier,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        loyaltyPointsEarned: 0,
        loyaltyPointsRedeemed: 0,
      },
    });
  } catch (err) {
    console.warn(`Non-blocking loyalty ${reasonPrefix} reconciliation failed:`, err);
  }
}
