import "server-only";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { mapOrderSummary, mapOrderDetail } from "./mappers";
import { OrderSummary, OrderDetail } from "./types";

export async function getCustomerOrders(
  page = 1,
  pageSize = 10
): Promise<{ orders: OrderSummary[]; total: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    orders: orders.map(mapOrderSummary),
    total,
  };
}

export async function getCustomerOrder(orderNumber: string): Promise<OrderDetail | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const order = await prisma.order.findUnique({
    where: {
      orderNumber,
      userId, // CRITICAL: Only fetch if it belongs to the authenticated user
    },
    include: {
      items: true,
      returns: {
        include: { items: true },
      },
      payments: {
        include: { refunds: true },
      },
    },
  });

  if (!order) {
    return null;
  }

  return mapOrderDetail(order);
}
