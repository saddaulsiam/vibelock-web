import "server-only";

import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export async function getAccountOverview() {
  const user = await requireUser();
  const [profile, orderCount, returnCount, addresses, recentOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.returnRequest.count({ where: { order: { userId: user.id } } }),
    prisma.address.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        total: true,
      },
    }),
  ]);

  return {
    profile: profile ?? { name: user.name ?? null, email: user.email, createdAt: new Date() },
    orderCount,
    returnCount,
    addressCount: addresses,
    recentOrders: recentOrders.map((order) => ({
      ...order,
      total: Number(order.total),
    })),
  };
}

export async function getCustomerAddresses() {
  const user = await requireUser();
  return prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function getCustomerReturns(page = 1, pageSize = 10) {
  const user = await requireUser();
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 10;
  const where = { order: { userId: user.id } };

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      include: {
        order: { select: { orderNumber: true, createdAt: true } },
        items: { include: { orderItem: { select: { unitPrice: true } } } },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns: returns.map((request) => ({
      id: request.id,
      status: request.status,
      reason: request.reason,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      order: request.order,
      itemCount: request.items.reduce((sum, item) => sum + item.quantity, 0),
      requestedAmount: request.items.reduce(
        (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
        0
      ),
    })),
    total,
    totalPages: Math.ceil(total / safePageSize),
  };
}

export async function getCustomerReturnById(id: string) {
  const user = await requireUser();
  const request = await prisma.returnRequest.findFirst({
    where: { id, order: { userId: user.id } },
    include: {
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          payments: {
            select: {
              refunds: {
                orderBy: { createdAt: "desc" },
                select: { id: true, amount: true, status: true, createdAt: true },
              },
            },
          },
        },
      },
      items: {
        include: {
          orderItem: {
            select: { productName: true, sku: true, size: true, color: true, unitPrice: true },
          },
        },
      },
    },
  });

  if (!request) return null;

  return {
    id: request.id,
    status: request.status,
    reason: request.reason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    order: request.order,
    items: request.items.map((item) => ({
      ...item,
      orderItem: { ...item.orderItem, unitPrice: Number(item.orderItem.unitPrice) },
    })),
    requestedAmount: request.items.reduce(
      (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
      0
    ),
    refunds: request.order.payments.flatMap((payment) =>
      payment.refunds.map((refund) => ({ ...refund, amount: Number(refund.amount) }))
    ),
  };
}
