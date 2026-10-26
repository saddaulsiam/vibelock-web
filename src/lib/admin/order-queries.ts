import "server-only";

import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  salesChannel: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingCity: string;
  itemCount: number;
  createdAt: string;
}

export interface AdminOrdersResult {
  orders: AdminOrderItem[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  statusCounts: Record<string, number>;
}

export async function getAdminOrders({
  status,
  paymentStatus,
  paymentMethod,
  search,
  page = 1,
  limit = 20,
}: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrdersResult> {
  await requireRole("ADMIN");

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { shippingCity: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total, statusGroups] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (page - 1) * limit),
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        salesChannel: true,
        total: true,
        subtotal: true,
        shippingCost: true,
        discount: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        shippingCity: true,
        createdAt: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0,
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };

  let allCount = 0;
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    allCount += group._count._all;
  }
  statusCounts.ALL = allCount;

  const mappedOrders: AdminOrderItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    salesChannel: order.salesChannel,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: Number(order.discount),
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    shippingCity: order.shippingCity,
    itemCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
  }));

  return {
    orders: mappedOrders,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    page,
    limit,
    statusCounts,
  };
}

export async function getAdminOrderById(id: string) {
  await requireRole("ADMIN");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          returnItems: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
      },
      payments: true,
      shipment: true,
      returns: {
        include: {
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return order;
}
