import "server-only";

import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import type {
  AdminCustomerListItem,
  AdminCustomerSummaryKPIs,
  CustomerSegment,
  CustomerSortBy,
} from "./customer-query-types";
import { normalizePage } from "./customer-detail-helpers";

export * from "./customer-query-types";
export { getAdminCustomerById } from "./customer-detail-query";

const DEFAULT_PAGE_SIZE = 20;
const paidStatuses = ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/**
 * Fetch executive overview KPIs for customer intelligence
 */
export async function getAdminCustomerSummaryKPIs(): Promise<AdminCustomerSummaryKPIs> {
  await requireRole("ADMIN");

  const [totalCustomers, activeBuyers, repeatGroup, paidAggregate] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({
      where: { role: "CUSTOMER", orders: { some: {} } },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { gte: 2 } } },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: { in: [...paidStatuses] } },
      _sum: { total: true },
    }),
  ]);

  const repeatBuyers = repeatGroup.length;
  const retentionRate =
    activeBuyers > 0 ? Math.round((repeatBuyers / activeBuyers) * 1000) / 10 : 0;
  const totalLtv = Number(paidAggregate._sum.total ?? 0);

  return {
    totalCustomers,
    activeBuyers,
    repeatBuyers,
    retentionRate,
    totalLtv,
  };
}

/**
 * Get paginated customers list with rich search, segmentation tabs, and sorting
 */
export async function getAdminCustomers({
  search,
  page = 1,
  segment = "ALL",
  sortBy = "newest",
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  search?: string;
  page?: number;
  segment?: CustomerSegment;
  sortBy?: CustomerSortBy;
  pageSize?: number;
}) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };

  // 1. Text Search across user and order snapshot fields
  if (search?.trim()) {
    const value = search.trim();
    where.OR = [
      { name: { contains: value, mode: "insensitive" } },
      { email: { contains: value, mode: "insensitive" } },
      { phone: { contains: value, mode: "insensitive" } },
      { orders: { some: { customerPhone: { contains: value, mode: "insensitive" } } } },
      { orders: { some: { customerName: { contains: value, mode: "insensitive" } } } },
    ];
  }

  // 2. Segment filter handling
  if (segment === "REPEAT") {
    const repeatGroup = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { gte: 2 } } },
    });
    const repeatUserIds = repeatGroup.map((g) => g.userId).filter(Boolean) as string[];
    where.id = { in: repeatUserIds };
  } else if (segment === "SINGLE") {
    const singleGroup = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { equals: 1 } } },
    });
    const singleUserIds = singleGroup.map((g) => g.userId).filter(Boolean) as string[];
    where.id = { in: singleUserIds };
  } else if (segment === "LEADS") {
    where.orders = { none: {} };
  }

  // 3. Sorting configuration
  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };
  if (sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sortBy === "orders") {
    orderBy = { orders: { _count: "desc" } };
  }

  const [users, total, segmentCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            customerPhone: true,
            customerName: true,
            createdAt: true,
            status: true,
            orderNumber: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order
        .groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          having: { userId: { _count: { gte: 2 } } },
        })
        .then((res) => res.length),
      prisma.order
        .groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          having: { userId: { _count: { equals: 1 } } },
        })
        .then((res) => res.length),
      prisma.user.count({ where: { role: "CUSTOMER", orders: { none: {} } } }),
    ]).then(([allCount, repeatCount, singleCount, leadsCount]) => ({
      ALL: allCount,
      REPEAT: repeatCount,
      SINGLE: singleCount,
      LEADS: leadsCount,
    })),
  ]);

  // If sorted by spent, let's sort the loaded slice or sort in-memory
  const paidTotals = users.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: users.map((user) => user.id) },
          paymentStatus: { in: [...paidStatuses] },
        },
        _sum: { total: true },
      })
    : [];

  const totalsByUserId = new Map(
    paidTotals.map((entry) => [entry.userId, Number(entry._sum.total ?? 0)])
  );

  let formattedCustomers: AdminCustomerListItem[] = users.map((user) => {
    const orderCount = user._count.orders;
    const paidOrderValue = totalsByUserId.get(user.id) ?? 0;
    const resolvedPhone = user.phone || user.orders[0]?.customerPhone || null;
    const resolvedName = user.name || user.orders[0]?.customerName || null;

    let tier: AdminCustomerListItem["tier"] = "LEAD";
    if (orderCount >= 3 || paidOrderValue >= 10000) {
      tier = "VIP";
    } else if (orderCount >= 2) {
      tier = "REPEAT";
    } else if (orderCount === 1) {
      tier = "SINGLE";
    }

    return {
      id: user.id,
      name: resolvedName,
      email: user.email,
      phone: resolvedPhone,
      createdAt: user.createdAt,
      orderCount,
      paidOrderValue,
      latestOrderDate: user.orders[0]?.createdAt ?? null,
      latestOrderStatus: user.orders[0]?.status ?? null,
      latestOrderNumber: user.orders[0]?.orderNumber ?? null,
      tier,
    };
  });

  if (sortBy === "spent") {
    formattedCustomers = formattedCustomers.sort((a, b) => b.paidOrderValue - a.paidOrderValue);
  }

  return {
    customers: formattedCustomers,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: normalizedPage,
    segmentCounts,
  };
}
