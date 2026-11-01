"use server";

import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import type { PosActionResult, PosPaymentMethod, PosReceiptItem } from "./pos-types";
import type { PosOrderSummaryItem, PosTodayOrdersStats } from "./pos-order-history-types";

/**
 * Fetches recent POS counter sales with aggregated stats and receipt data
 * Allows instant search by Invoice #, customer phone, or name, and 1-click reprint
 */
export async function getPosTodayOrdersAction(
  searchQuery?: string
): Promise<PosActionResult<{ orders: PosOrderSummaryItem[]; stats: PosTodayOrdersStats }>> {
  try {
    await requireRole("STAFF");

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
          take: 1,
          orderBy: { createdAt: "desc" },
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

    const formattedOrders: PosOrderSummaryItem[] = orders.map((o) => {
      const payment = o.payments[0];
      const gatewayStr = (payment?.gateway || "CASH").toUpperCase();
      const paymentMethod: PosPaymentMethod =
        gatewayStr === "BKASH" ? "BKASH" : gatewayStr === "CARD" ? "CARD" : "CASH";

      const totalVal = Number(o.total);
      const subtotalVal = Number(o.subtotal);
      const discountVal = Number(o.discount);

      totalRevenue += totalVal;
      if (paymentMethod === "CASH") {
        cashTotal += totalVal;
      } else {
        digitalTotal += totalVal;
      }

      const payload = payment?.gatewayPayload as Record<string, unknown> | null;
      const amountPaid =
        typeof payload?.tenderAmount === "number" ? payload.tenderAmount : totalVal;
      const changeDue = typeof payload?.changeReturned === "number" ? payload.changeReturned : 0;

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
