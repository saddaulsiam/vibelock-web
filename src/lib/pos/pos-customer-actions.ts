"use server";

import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { normalizeBdPhoneNumber } from "@/lib/validations/auth";
import type { PosActionResult } from "./pos-types";
import type {
  PosCustomerProfile,
  PosCustomerTier,
  PosCustomerRecentOrder,
} from "./pos-customer-types";

/**
 * Rapid customer profile lookup by phone number for in-store POS counter.
 * Returns order history, lifetime spend, customer tier, and available loyalty points.
 */
export async function lookupPosCustomerByPhoneAction(
  rawPhone: string
): Promise<PosActionResult<PosCustomerProfile | null>> {
  try {
    await requireRole("STAFF", { throw: true });

    if (!rawPhone || typeof rawPhone !== "string") {
      return { success: true, data: null };
    }

    const normalized = normalizeBdPhoneNumber(rawPhone.trim());
    // Only search if at least 11 digits (e.g. 01XXXXXXXXX)
    if (normalized.length < 11) {
      return { success: true, data: null };
    }

    // Match last 10 digits to handle local 01... vs +8801... variations safely
    const searchSuffix = normalized.slice(-10);

    const [matchedUser, pastOrders, loyaltyAccount, loyaltyConfig] = await Promise.all([
      prisma.user.findFirst({
        where: {
          phone: {
            endsWith: searchSuffix,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: {
          customerPhone: {
            endsWith: searchSuffix,
          },
          status: {
            notIn: ["CANCELLED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          total: true,
          salesChannel: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),
      // Fetch loyalty account directly from the ledger table (O(1), graceful fallback)
      prisma.loyaltyAccount
        .findFirst({
          where: { phone: { endsWith: searchSuffix } },
          select: { points: true, lifetimeSpend: true, tier: true },
        })
        .catch(() => null),
      // Load live loyalty config from LoyaltySetting table (graceful fallback)
      prisma.loyaltySetting.findFirst().catch(() => null),
    ]);

    // If no past orders and no registered user and no loyalty account, customer is completely new
    if (!matchedUser && pastOrders.length === 0 && !loyaltyAccount) {
      return { success: true, data: null };
    }

    // Resolve loyalty config (use DB row or fall back to hardcoded defaults)
    const spendAmountPerPoint = loyaltyConfig?.spendAmountPerPoint ?? 100;
    const pointRedemptionValue = loyaltyConfig ? Number(loyaltyConfig.pointRedemptionValue) : 1;
    const minPointsToRedeem = loyaltyConfig?.minPointsToRedeem ?? 0;
    const silverThreshold = loyaltyConfig ? Number(loyaltyConfig.silverThreshold) : 5000;
    const goldThreshold = loyaltyConfig ? Number(loyaltyConfig.goldThreshold) : 20000;
    const platinumThreshold = loyaltyConfig ? Number(loyaltyConfig.platinumThreshold) : 50000;
    const isLoyaltyActive = (loyaltyConfig?.enabled ?? true) && (loyaltyConfig?.enableInPos ?? true);

    // Aggregate lifetime financial data from order history
    const totalSpent = pastOrders.reduce((sum, ord) => sum + Number(ord.total), 0);
    const ordersCount = pastOrders.length;
    const lastVisitedAt = pastOrders[0]?.createdAt ? pastOrders[0].createdAt.toISOString() : null;

    // Customer Name resolution
    const resolvedName =
      matchedUser?.name ||
      pastOrders.find((o) => o.customerName && o.customerName !== "Walk-in Customer")
        ?.customerName ||
      "Valued Shopper";

    // Loyalty points: use LoyaltyAccount balance if available (accurate ledger),
    // otherwise fall back to computing from order spend history (new customers without an account yet)
    let loyaltyPoints: number;
    if (loyaltyAccount) {
      loyaltyPoints = loyaltyAccount.points;
    } else {
      const spendPerPoint = Math.max(1, spendAmountPerPoint);
      const earnedPoints = isLoyaltyActive ? Math.floor(totalSpent / spendPerPoint) : 0;
      loyaltyPoints = Math.max(0, earnedPoints);
    }
    const isRedemptionEligible =
      isLoyaltyActive && loyaltyPoints >= minPointsToRedeem && loyaltyPoints > 0;
    const pointsDiscountValue = isRedemptionEligible
      ? Math.floor(loyaltyPoints * pointRedemptionValue)
      : 0;

    // Tier: use LoyaltyAccount tier if available, otherwise derive from spend
    let tier: PosCustomerTier;
    if (loyaltyAccount) {
      tier = loyaltyAccount.tier as PosCustomerTier;
    } else if (totalSpent >= platinumThreshold) {
      tier = "PLATINUM";
    } else if (totalSpent >= goldThreshold) {
      tier = "GOLD";
    } else if (totalSpent >= silverThreshold) {
      tier = "SILVER";
    } else {
      tier = "BRONZE";
    }

    const recentOrders: PosCustomerRecentOrder[] = pastOrders.slice(0, 5).map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      total: Number(o.total),
      salesChannel: o.salesChannel,
      itemsCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
    }));

    const profile: PosCustomerProfile = {
      id: matchedUser?.id,
      phone: normalized,
      name: resolvedName,
      email: matchedUser?.email || null,
      ordersCount,
      totalSpent,
      lastVisitedAt,
      tier,
      loyaltyPoints,
      pointsDiscountValue,
      minPointsToRedeem,
      isRedemptionEligible,
      recentOrders,
    };

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error("Error looking up POS customer by phone:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to lookup customer.",
    };
  }
}
