"use server";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import type { PosOrderSummaryItem, PosTodayOrdersStats } from "./pos-order-history-types";
import type { PosActionResult, PosPaymentMethod, PosReceiptItem } from "./pos-types";

/**
 * Fetches recent POS counter sales with aggregated stats and receipt data
 * Allows instant search by Invoice #, customer phone, or name, and 1-click reprint
 */
export async function getPosTodayOrdersAction(
  searchQuery?: string
): Promise<PosActionResult<{ orders: PosOrderSummaryItem[]; stats: PosTodayOrdersStats }>> {
  try {
    await requireRole("STAFF", { throw: true });

    // Fetch orders from the start of today (or past 24 hours to cover overnight shifts)
    const todayCutoff = new Date();
    todayCutoff.setHours(0, 0, 0, 0);

    const whereClause: Prisma.OrderWhereInput = {
      salesChannel: "POS",
      createdAt: {
        gte: todayCutoff,
      },
    };

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      whereClause.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: "asc" },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let cashTotal = 0;
    let digitalTotal = 0;
    let totalLoyaltyPointsRedeemed = 0;
    let totalLoyaltyDiscount = 0;

    const formattedOrders: PosOrderSummaryItem[] = orders.map((o) => {
      const isSplitOrder = o.payments.length > 1;
      const primaryPayment = o.payments[0];
      const gatewayStr = (primaryPayment?.gateway || "CASH").toUpperCase();
      const paymentMethod: PosPaymentMethod = isSplitOrder
        ? "SPLIT"
        : gatewayStr === "BANGLA_QR" || gatewayStr === "BKASH"
          ? "BANGLA_QR"
          : gatewayStr === "CARD"
            ? "CARD"
            : "CASH";

      const totalVal = Number(o.total);
      const subtotalVal = Number(o.subtotal);
      const discountVal = Number(o.discount);

      if (o.status !== "CANCELLED") {
        totalRevenue += totalVal;
        const pts =
          typeof (o as { loyaltyPointsRedeemed?: number }).loyaltyPointsRedeemed === "number"
            ? ((o as { loyaltyPointsRedeemed?: number }).loyaltyPointsRedeemed ?? 0)
            : 0;
        if (pts > 0) {
          totalLoyaltyPointsRedeemed += pts;
          totalLoyaltyDiscount += Math.min(discountVal, pts);
        }

        if (o.payments.length > 0) {
          for (const p of o.payments) {
            const pAmt =
              p.amount !== undefined && p.amount !== null
                ? Number(p.amount)
                : isSplitOrder
                  ? 0
                  : totalVal;
            if ((p.gateway || "").toUpperCase() === "CASH") {
              cashTotal += pAmt;
            } else {
              digitalTotal += pAmt;
            }
          }
        } else {
          cashTotal += totalVal;
        }
      }

      const payload = primaryPayment?.gatewayPayload as Record<string, unknown> | null;
      const amountPaid = isSplitOrder
        ? o.payments.reduce((sum, p) => {
            const pLoad = p.gatewayPayload as Record<string, unknown> | null;
            return (
              sum +
              (typeof pLoad?.tenderAmount === "number" ? pLoad.tenderAmount : Number(p.amount))
            );
          }, 0)
        : typeof payload?.tenderAmount === "number"
          ? payload.tenderAmount
          : totalVal;
      const changeDue = isSplitOrder
        ? o.payments.reduce((sum, p) => {
            const pLoad = p.gatewayPayload as Record<string, unknown> | null;
            return sum + (typeof pLoad?.changeReturned === "number" ? pLoad.changeReturned : 0);
          }, 0)
        : typeof payload?.changeReturned === "number"
          ? payload.changeReturned
          : 0;

      const splits = isSplitOrder
        ? o.payments.map((p) => {
            const pLoad = p.gatewayPayload as Record<string, unknown> | null;
            const g = (p.gateway || "CASH").toUpperCase();
            const method: "CASH" | "BANGLA_QR" | "CARD" =
              g === "BANGLA_QR" || g === "BKASH" ? "BANGLA_QR" : g === "CARD" ? "CARD" : "CASH";
            const amt = Number(p.amount);
            const tender = typeof pLoad?.tenderAmount === "number" ? pLoad.tenderAmount : amt;
            const chg = typeof pLoad?.changeReturned === "number" ? pLoad.changeReturned : 0;
            return {
              method,
              amount: amt,
              tenderAmount: tender,
              changeDue: chg,
              reference: typeof pLoad?.reference === "string" ? pLoad.reference : undefined,
            };
          })
        : undefined;

      const itemsCount = o.items.reduce((sum, item) => sum + item.quantity, 0);

      const cashierName =
        o.user?.name ||
        (typeof payload?.cashierName === "string" ? payload.cashierName : null) ||
        "Cashier";
      const cashierEmail = o.user?.email || "pos@vibelock.com";

      const receiptItems: PosReceiptItem[] = o.items.map((it) => ({
        name: it.productName,
        sku: it.sku,
        size: it.size,
        color: it.color,
        unitPrice: Number(it.unitPrice),
        quantity: it.quantity,
        lineTotal: Number(it.lineTotal),
      }));

      const receiptData = {
        orderId: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        cashierName,
        cashierEmail,
        customerName: o.customerName || "Walk-in Customer",
        customerPhone: o.customerPhone || "N/A",
        items: receiptItems,
        subtotal: subtotalVal,
        discount: discountVal,
        total: totalVal,
        paymentMethod,
        amountPaid,
        changeDue,
        splits,
      };

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        customerName: o.customerName || "Walk-in Customer",
        customerPhone: o.customerPhone || "N/A",
        itemsCount,
        subtotal: subtotalVal,
        discount: discountVal,
        total: totalVal,
        paymentMethod,
        amountPaid,
        changeDue,
        cashierName,
        cashierEmail,
        items: receiptItems,
        status: o.status,
        receiptData,
      };
    });

    return {
      success: true,
      data: {
        orders: formattedOrders,
        stats: {
          totalOrders: orders.length,
          totalRevenue,
          cashTotal,
          digitalTotal,
          totalLoyaltyPointsRedeemed,
          totalLoyaltyDiscount,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching today's POS orders:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load today's orders.",
    };
  }
}
