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
    await requireRole("STAFF");

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

    const [matchedUser, pastOrders] = await Promise.all([
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
    ]);

    // If no past orders and no registered user, customer is completely new
    if (!matchedUser && pastOrders.length === 0) {
      return { success: true, data: null };
    }

    // Aggregate lifetime financial data
    const totalSpent = pastOrders.reduce((sum, ord) => sum + Number(ord.total), 0);
    const ordersCount = pastOrders.length;
    const lastVisitedAt = pastOrders[0]?.createdAt ? pastOrders[0].createdAt.toISOString() : null;

    // Customer Name resolution
    const resolvedName =
      matchedUser?.name ||
      pastOrders.find((o) => o.customerName && o.customerName !== "Walk-in Customer")
        ?.customerName ||
      "Valued Shopper";

    // Tier determination
    let tier: PosCustomerTier = "BRONZE";
    if (totalSpent >= 50000) {
      tier = "PLATINUM";
    } else if (totalSpent >= 20000) {
      tier = "GOLD";
    } else if (totalSpent >= 5000) {
      tier = "SILVER";
    }

    // Loyalty points: 1 point per ৳100 spent (৳1 discount per point)
    const loyaltyPoints = Math.floor(totalSpent / 100);
    const pointsDiscountValue = loyaltyPoints;

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
