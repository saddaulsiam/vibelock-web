import "server-only";

import { OrderStatus, PaymentStatus, ProductStatus, Role } from "@prisma/client";
import prisma from "@/lib/prisma/client";
import { getAdminReport } from "./report-queries";
import { requireRole } from "@/lib/auth/authorization";
import { hasRequiredRole } from "@/lib/auth/roles";

const LOW_STOCK_THRESHOLD = 5;

export type DashboardFilters = {
  range?: string;
};

export async function getAdminDashboardData(filters: DashboardFilters = {}) {
  const currentUser = await requireRole("STAFF");
  const isManagerOrAdmin = hasRequiredRole(currentUser.role, "MANAGER");
  const range = filters.range ?? "30d";
  const now = new Date();

  const [
    publishedProductCount,
    categoryCount,
    customerCount,
    orderCount,
    recentOrders,
    orderStatusGroups,
    paymentStatusGroups,
    variants,
    transactionGroups,
    reservationGroups,
    report,
  ] = await Promise.all([
    prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
    prisma.category.count(),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.order.count(),
    prisma.order.findMany({
      take: 6,
      orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["paymentStatus"],
      _count: { _all: true },
    }),
    prisma.productVariant.findMany({
      where: { product: { status: ProductStatus.PUBLISHED } },
      select: { id: true, productId: true },
    }),
    prisma.inventoryTransaction.groupBy({
      by: ["variantId"],
      where: { variant: { product: { status: ProductStatus.PUBLISHED } } },
      _sum: { quantity: true },
    }),
    prisma.inventoryReservation.groupBy({
      by: ["variantId"],
      where: {
        status: "RESERVED",
        expiresAt: { gt: now },
        variant: { product: { status: ProductStatus.PUBLISHED } },
      },
      _sum: { quantity: true },
    }),
    isManagerOrAdmin ? getAdminReport({ range, summaryOnly: true }) : Promise.resolve(null),
  ]);

  const transactionQuantityByVariant = new Map(
    transactionGroups.map((group) => [group.variantId, group._sum.quantity ?? 0])
  );
  const reservedQuantityByVariant = new Map(
    reservationGroups.map((group) => [group.variantId, group._sum.quantity ?? 0])
  );
  const productsWithLowStock = new Set<string>();
  const productsOutOfStock = new Set<string>();
  let lowStockVariantCount = 0;
  let outOfStockVariantCount = 0;

  for (const variant of variants) {
    const availableQuantity =
      (transactionQuantityByVariant.get(variant.id) ?? 0) -
      (reservedQuantityByVariant.get(variant.id) ?? 0);

    if (availableQuantity <= 0) {
      outOfStockVariantCount += 1;
      productsOutOfStock.add(variant.productId);
    } else if (availableQuantity <= LOW_STOCK_THRESHOLD) {
      lowStockVariantCount += 1;
      productsWithLowStock.add(variant.productId);
    }
  }

  return {
    publishedProductCount,
    categoryCount,
    customerCount,
    orderCount,
    recentOrders,
    orderStatuses: orderStatusGroups.map(({ status, _count }) => ({
      status: status satisfies OrderStatus,
      count: _count._all,
    })),
    paymentStatuses: paymentStatusGroups.map(({ paymentStatus, _count }) => ({
      status: paymentStatus satisfies PaymentStatus,
      count: _count._all,
    })),
    inventory: {
      lowStockVariantCount,
      outOfStockVariantCount,
      productsWithLowStockCount: productsWithLowStock.size,
      productsOutOfStockCount: productsOutOfStock.size,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    },
    financials: report
      ? {
          range: report.range,
          start: report.start,
          end: report.end,
          netSales: report.summary.netSales,
          grossProfit: report.summary.grossProfit,
          grossMargin: report.summary.grossMargin,
          soldUnits: report.summary.soldUnits,
          returnedUnits: report.summary.returnedUnits,
          retainedUnits: Math.max(0, report.summary.soldUnits - report.summary.returnedUnits),
          orders: report.summary.orders,
          returnRate: report.summary.returnRate,
          refunds: report.summary.refunds,
          cogs: report.summary.cogs,
          discounts: report.summary.discounts,
          grossSales: report.summary.grossSales,
        }
      : {
          range,
          start: now,
          end: now,
          netSales: 0,
          grossProfit: 0,
          grossMargin: 0,
          soldUnits: 0,
          returnedUnits: 0,
          retainedUnits: 0,
          orders: 0,
          returnRate: 0,
          refunds: 0,
          cogs: 0,
          discounts: 0,
          grossSales: 0,
        },
  };
}
