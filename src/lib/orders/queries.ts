import "server-only";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { mapOrderSummary, mapOrderDetail } from "./mappers";
import { OrderSummary, OrderDetail, OrderConfirmation } from "./types";

export async function getCustomerOrders(
  page = 1,
  pageSize = 10
): Promise<{ orders: OrderSummary[]; total: number }> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
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

/**
 * Read only the order and item snapshot needed by the public confirmation page.
 * This avoids coupling that page to optional order relations such as shipment,
 * returns, and payments while retaining the same authenticated ownership check.
 */
export async function getCustomerOrderConfirmation(
  orderNumber: string
): Promise<OrderConfirmation | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId: session.user.id,
    },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      shippingCost: true,
      taxAmount: true,
      discount: true,
      total: true,
      items: {
        select: {
          productName: true,
          size: true,
          color: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((item) => ({
      productName: item.productName,
      size: item.size,
      color: item.color,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
    })),
  };
}
