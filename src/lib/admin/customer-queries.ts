import "server-only";

import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import {
  getCustomerRiskProfile,
  type CombinedCustomerRiskProfile,
} from "@/lib/admin/customer-risk";

const DEFAULT_PAGE_SIZE = 20;
const paidStatuses: PaymentStatus[] = ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"];
const returnedStatuses: OrderStatus[] = ["RETURNED", "REFUNDED"];

export type CustomerSegment = "ALL" | "REPEAT" | "SINGLE" | "LEADS";
export type CustomerSortBy = "newest" | "orders" | "spent" | "oldest";

export interface AdminCustomerSummaryKPIs {
  totalCustomers: number;
  activeBuyers: number;
  repeatBuyers: number;
  retentionRate: number; // percentage, e.g. 5.5
  totalLtv: number; // sum of authoritative paid order totals
}

export interface AdminCustomerListItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orderCount: number;
  paidOrderValue: number;
  latestOrderDate: Date | null;
  latestOrderStatus: OrderStatus | null;
  latestOrderNumber: string | null;
  tier: "VIP" | "REPEAT" | "SINGLE" | "LEAD";
}

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

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
      where: { paymentStatus: { in: paidStatuses } },
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
          paymentStatus: { in: paidStatuses },
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
    formattedCustomers = formattedCustomers.sort(
      (a, b) => b.paidOrderValue - a.paidOrderValue
    );
  }

  return {
    customers: formattedCustomers,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: normalizedPage,
    segmentCounts,
  };
}

export interface AdminCustomerDetailOrder {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  salesChannel: string;
  shippingCity: string | null;
  total: unknown;
  itemCount: number;
  previewItems: Array<{ productName: string; size: string | null }>;
}

export interface AdminCustomerDetailResult {
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: Date;
    updatedAt: Date;
    addresses: Array<{
      id: string;
      label: string | null;
      street: string;
      city: string;
      state: string | null;
      zip: string | null;
      country: string;
      isDefault: boolean;
    }>;
  };
  orders: AdminCustomerDetailOrder[];
  riskProfile: CombinedCustomerRiskProfile | null;
  summary: {
    totalOrders: number;
    paidOrders: number;
    totalSpent: number;
    aov: number;
    cancelledOrders: number;
    returnedOrRefundedOrders: number;
  };
  totalOrderPages: number;
  page: number;
}

export async function getAdminCustomerById(
  id: string,
  page = 1
): Promise<AdminCustomerDetailResult | null> {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const customer = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
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
  const [
    ordersRaw,
    orderCount,
    paidSummary,
    cancelledCount,
    returnedCount,
    latestPhone,
    latestName,
  ] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        salesChannel: true,
        shippingCity: true,
        total: true,
        _count: { select: { items: true } },
        items: {
          take: 2,
          select: {
            productName: true,
            size: true,
          },
        },
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
        OR: [{ status: { in: returnedStatuses } }, { paymentStatus: "REFUNDED" }],
      },
    }),
    prisma.order.findFirst({
      where: { ...orderWhere, customerPhone: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { customerPhone: true },
    }),
    prisma.order.findFirst({
      where: { ...orderWhere, customerName: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { customerName: true },
    }),
  ]);

  const resolvedPhone = customer.phone || latestPhone?.customerPhone || null;
  const resolvedName = customer.name || latestName?.customerName || null;

  // Retrieve fraud intelligence & courier risk profile
  let riskProfile: CombinedCustomerRiskProfile | null = null;
  try {
    riskProfile = await getCustomerRiskProfile({
      phone: resolvedPhone,
      email: customer.email,
      userId: customer.id,
    });
  } catch (err) {
    console.warn("[AdminCustomer] Risk evaluation failed:", err);
    riskProfile = null;
  }

  const totalSpent = Number(paidSummary._sum.total ?? 0);
  const aov = paidSummary._count > 0 ? Math.round(totalSpent / paidSummary._count) : 0;

  const orders: AdminCustomerDetailOrder[] = ordersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: String(o.paymentMethod),
    salesChannel: String(o.salesChannel),
    shippingCity: o.shippingCity,
    total: o.total,
    itemCount: o._count.items,
    previewItems: o.items.map((item) => ({
      productName: item.productName,
      size: item.size,
    })),
  }));

  return {
    customer: {
      ...customer,
      name: resolvedName,
      phone: resolvedPhone,
    },
    orders,
    riskProfile,
    summary: {
      totalOrders: orderCount,
      paidOrders: paidSummary._count,
      totalSpent,
      aov,
      cancelledOrders: cancelledCount,
      returnedOrRefundedOrders: returnedCount,
    },
    totalOrderPages: Math.max(1, Math.ceil(orderCount / DEFAULT_PAGE_SIZE)),
    page: normalizedPage,
  };
}
