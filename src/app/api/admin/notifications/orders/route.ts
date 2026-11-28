import { AuthRequiredError, ForbiddenError, requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("STAFF", { throw: true });

    // Fetch confirmed orders from the last 48 hours:
    // Either COD orders, or verified PAID online payment orders
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: fortyEightHoursAgo },
        OR: [{ paymentMethod: "COD" }, { paymentStatus: "SUCCESS" }],
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        customerName: true,
        shippingCity: true,
        createdAt: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total.toString(),
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        customerName: o.customerName || "Customer",
        city: o.shippingCity || "Bangladesh",
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: error instanceof AuthRequiredError ? 401 : 403 }
      );
    }
    console.error("[AdminNotificationsApi] Failed to fetch orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
