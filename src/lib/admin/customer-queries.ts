import "server-only";

import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;
const paidStatuses: PaymentStatus[] = ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"];
const returnedStatuses: OrderStatus[] = ["RETURNED", "REFUNDED"];

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function getAdminCustomers({
  search,
  page = 1,
}: {
  search?: string;
  page?: number;
}) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };

  if (search?.trim()) {
    const value = search.trim();
    where.OR = [
      { name: { contains: value, mode: "insensitive" } },
      { email: { contains: value, mode: "insensitive" } },
      { orders: { some: { customerPhone: { contains: value, mode: "insensitive" } } } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            customerPhone: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const paidTotals = users.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: users.map((user) => user.id) },
          paymentStatus: { in: paidStatuses },
        },
        _sum: { total: true },
      })
    : [];

  const totalsByUserId = new Map(
    paidTotals.map((entry) => [entry.userId, entry._sum.total])
  );

  return {
    customers: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.orders[0]?.customerPhone ?? null,
      createdAt: user.createdAt,
      orderCount: user._count.orders,
      paidOrderValue: totalsByUserId.get(user.id) ?? 0,
      latestOrderDate: user.orders[0]?.createdAt ?? null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page: normalizedPage,
  };
}

export async function getAdminCustomerById(id: string, page = 1) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const customer = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          street: true,
          city: true,
          state: true,
          zip: true,
          country: true,
          isDefault: true,
        },
      },
    },
  });

  if (!customer) return null;

  const orderWhere: Prisma.OrderWhereInput = { userId: customer.id };
  const [orders, orderCount, paidSummary, cancelledCount, returnedCount, latestPhone] =
    await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        skip: (normalizedPage - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          total: true,
        },
      }),
      prisma.order.count({ where: orderWhere }),
      prisma.order.aggregate({
        where: { ...orderWhere, paymentStatus: { in: paidStatuses } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.order.count({ where: { ...orderWhere, status: "CANCELLED" } }),
      prisma.order.count({
        where: {
          ...orderWhere,
          OR: [
            { status: { in: returnedStatuses } },
            { paymentStatus: "REFUNDED" },
          ],
        },
      }),
      prisma.order.findFirst({
        where: { ...orderWhere, customerPhone: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { customerPhone: true },
      }),
    ]);

  return {
    customer: {
      ...customer,
      phone: latestPhone?.customerPhone ?? null,
    },
    orders,
    summary: {
      totalOrders: orderCount,
      paidOrders: paidSummary._count,
      totalSpent: paidSummary._sum.total ?? 0,
      cancelledOrders: cancelledCount,
      returnedOrRefundedOrders: returnedCount,
    },
    totalOrderPages: Math.ceil(orderCount / pageSize),
    page: normalizedPage,
  };
}
