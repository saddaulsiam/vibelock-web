import "server-only";

import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export async function getAccountOverview() {
  const user = await requireUser();
  const now = new Date();

  const [profile, orderCount, returnCount, addresses, recentOrders, totalSpentAgg, activeCoupons] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          createdAt: true,
          emailVerified: true,
          image: true,
        },
      }),
      prisma.order.count({ where: { userId: user.id } }),
      prisma.returnRequest.count({ where: { order: { userId: user.id } } }),
      prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 2,
      }),
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              sku: true,
              unitPrice: true,
            },
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          userId: user.id,
          status: { notIn: ["CANCELLED"] },
        },
        _sum: {
          total: true,
        },
      }),
      prisma.coupon.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          minOrderValue: true,
          usageLimit: true,
          usageCount: true,
          endDate: true,
        },
      }),
    ]);

  const unredeemedCoupons = activeCoupons.filter(
    (c) => c.usageLimit === null || c.usageCount < c.usageLimit
  );

  return {
    profile: {
      name: profile?.name ?? user.name ?? null,
      email: profile?.email ?? user.email ?? "",
      createdAt: profile?.createdAt ?? new Date(),
      emailVerified: profile?.emailVerified ?? null,
      image: profile?.image ?? null,
    },
    orderCount,
    returnCount,
    addressCount: addresses.length,
    addresses: addresses.map((addr) => ({
      ...addr,
    })),
    totalSpent: Number(totalSpentAgg._sum.total ?? 0),
    activeCouponsCount: unredeemedCoupons.length,
    coupons: unredeemedCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
      endDate: c.endDate,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      itemCount: order.items.reduce((sum, it) => sum + it.quantity, 0),
      items: order.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
      })),
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
