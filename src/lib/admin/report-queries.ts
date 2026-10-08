import "server-only";

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type ReportRange = "today" | "yesterday" | "7d" | "30d" | "this-month" | "last-month" | "custom";
export type ReportSort = "revenue" | "profit" | "units";

export type ReportFilters = {
  range?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  search?: string;
};

const validRanges = new Set<ReportRange>([
  "today",
  "yesterday",
  "7d",
  "30d",
  "this-month",
  "last-month",
  "custom",
]);

function utcDate(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function resolveReportRange(filters: ReportFilters) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const requestedRange = filters.range as ReportRange | undefined;
  const range = requestedRange && validRanges.has(requestedRange) ? requestedRange : "30d";
  let start = new Date(today);
  let end = new Date(today);

  if (range === "today") {
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (range === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    end = new Date(today);
  } else if (range === "7d") {
    start.setUTCDate(start.getUTCDate() - 6);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (range === "this-month") {
    start = startOfUtcMonth(today);
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  } else if (range === "last-month") {
    end = startOfUtcMonth(today);
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  } else if (range === "custom") {
    const customStart = filters.from ? utcDate(filters.from) : null;
    const customEnd = filters.to ? utcDate(filters.to) : null;
    if (customStart && customEnd && customStart <= customEnd) {
      start = customStart;
      end = new Date(customEnd);
      end.setUTCDate(end.getUTCDate() + 1);
    } else {
      start.setUTCDate(start.getUTCDate() - 29);
      end.setUTCDate(end.getUTCDate() + 1);
    }
  } else {
    start.setUTCDate(start.getUTCDate() - 29);
    end.setUTCDate(end.getUTCDate() + 1);
  }

  return { range: range satisfies ReportRange, start, end };
}

function money(value: unknown) {
  return Number(value ?? 0);
}

const financialCtes = (start: Date, end: Date) => Prisma.sql`
  WITH eligible_orders AS (
    SELECT o.*
    FROM "Order" o
    WHERE o."createdAt" >= ${start}
      AND o."createdAt" < ${end}
      AND o.status <> 'CANCELLED'::"OrderStatus"
  ),
  sold_items AS (
    SELECT oi.*, o."orderNumber", o."paymentMethod", o."customerName", o."customerEmail",
           o.status AS "orderStatus", o."paymentStatus", o."shippingCost", o."createdAt" AS "orderCreatedAt"
    FROM "OrderItem" oi
    INNER JOIN eligible_orders o ON o.id = oi."orderId"
  ),
  returned_items AS (
    SELECT ri."orderItemId", SUM(ri.quantity)::int AS quantity
    FROM "ReturnItem" ri
    INNER JOIN "ReturnRequest" rr ON rr.id = ri."returnRequestId"
    INNER JOIN eligible_orders o ON o.id = rr."orderId"
    WHERE rr.status <> 'REJECTED'::"ReturnRequestStatus"
    GROUP BY ri."orderItemId"
  ),
  item_financials AS (
    SELECT so.*,
      COALESCE(ri.quantity, 0) AS "returnedQuantity",
      so.quantity - COALESCE(ri.quantity, 0) AS "keptQuantity"
    FROM sold_items so
    LEFT JOIN returned_items ri ON ri."orderItemId" = so.id
  ),
  order_financials AS (
    SELECT "orderId",
      SUM("lineSubtotal") AS "grossSales",
      SUM("discountAmount") AS discounts,
      SUM("lineTotal") AS "lineTotal",
      SUM("costPrice" * "keptQuantity") AS cogs,
      SUM(quantity) AS "soldUnits",
      SUM("returnedQuantity") AS "returnedUnits",
      SUM(("lineTotal" / NULLIF(quantity, 0)) * "returnedQuantity") AS "returnedValue"
    FROM item_financials
    GROUP BY "orderId"
  ),
  successful_refunds AS (
    SELECT p."orderId", SUM(r.amount) AS amount
    FROM "Refund" r
    INNER JOIN "Payment" p ON p.id = r."paymentId"
    INNER JOIN eligible_orders o ON o.id = p."orderId"
    WHERE r.status = 'SUCCESS'::"RefundStatus"
    GROUP BY p."orderId"
  )
`;

export async function getAdminReport(filters: ReportFilters = {}) {
  await requireRole("ADMIN");
  const { start, end, range } = resolveReportRange(filters);
  const ctes = financialCtes(start, end);

  const [summary, trend, products, payments, returns] = await Promise.all([
    prisma.$queryRaw<
      [{ orders: bigint; grossSales: number; discounts: number; netSales: number; refunds: number; cogs: number; soldUnits: bigint; returnedUnits: bigint; returnedValue: number; returnCount: bigint; shippingCharged: number }]
    >(Prisma.sql`${ctes}
      SELECT
        COUNT(DISTINCT of."orderId")::bigint AS orders,
        COALESCE(SUM(of."grossSales"), 0)::float8 AS "grossSales",
        COALESCE(SUM(of.discounts), 0)::float8 AS discounts,
        COALESCE(SUM(of."lineTotal"), 0)::float8 - COALESCE(SUM(sr.amount), 0)::float8 AS "netSales",
        COALESCE(SUM(sr.amount), 0)::float8 AS refunds,
        COALESCE(SUM(of.cogs), 0)::float8 AS cogs,
        COALESCE(SUM(of."soldUnits"), 0)::bigint AS "soldUnits",
        COALESCE(SUM(of."returnedUnits"), 0)::bigint AS "returnedUnits",
        COALESCE(SUM(of."returnedValue"), 0)::float8 AS "returnedValue",
        COUNT(DISTINCT CASE WHEN of."returnedUnits" > 0 THEN of."orderId" END)::bigint AS "returnCount",
        COALESCE(SUM(o."shippingCost"), 0)::float8 AS "shippingCharged"
      FROM order_financials of
      INNER JOIN eligible_orders o ON o.id = of."orderId"
      LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"`),
    prisma.$queryRaw<
      { date: Date; orders: bigint; grossSales: number; discounts: number; netSales: number; refunds: number; cogs: number }[]
    >(Prisma.sql`${ctes}
      SELECT DATE_TRUNC('day', o."createdAt") AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(of."grossSales"), 0)::float8 AS "grossSales",
        COALESCE(SUM(of.discounts), 0)::float8 AS discounts,
        COALESCE(SUM(of."lineTotal"), 0)::float8 - COALESCE(SUM(sr.amount), 0)::float8 AS "netSales",
        COALESCE(SUM(sr.amount), 0)::float8 AS refunds,
        COALESCE(SUM(of.cogs), 0)::float8 AS cogs
      FROM order_financials of
      INNER JOIN eligible_orders o ON o.id = of."orderId"
      LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY date ASC`),
    prisma.$queryRaw<
      { productName: string; sku: string; units: bigint; grossSales: number; discounts: number; netSales: number; returnedUnits: bigint; cogs: number; profit: number }[]
    >(Prisma.sql`${ctes}
      SELECT so."productName", so.sku,
        SUM(so.quantity - COALESCE(ri.quantity, 0))::bigint AS units,
        COALESCE(SUM(so."lineSubtotal"), 0)::float8 AS "grossSales",
        COALESCE(SUM(so."discountAmount"), 0)::float8 AS discounts,
        COALESCE(SUM(so."lineTotal" - (so."lineTotal" / NULLIF(so.quantity, 0)) * COALESCE(ri.quantity, 0)), 0)::float8 AS "netSales",
        COALESCE(SUM(ri.quantity), 0)::bigint AS "returnedUnits",
        COALESCE(SUM(so."costPrice" * (so.quantity - COALESCE(ri.quantity, 0))), 0)::float8 AS cogs,
        COALESCE(SUM(so."lineTotal" - (so."lineTotal" / NULLIF(so.quantity, 0)) * COALESCE(ri.quantity, 0) - so."costPrice" * (so.quantity - COALESCE(ri.quantity, 0))), 0)::float8 AS profit
      FROM sold_items so
      LEFT JOIN returned_items ri ON ri."orderItemId" = so.id
      GROUP BY so."productName", so.sku
      ORDER BY ${filters.sort === "units" ? Prisma.sql`units DESC` : filters.sort === "profit" ? Prisma.sql`profit DESC` : Prisma.sql`"netSales" DESC`}, so."productName" ASC
      LIMIT 100`),
    prisma.$queryRaw<
      { method: string; orders: bigint; sales: number; refunds: number }[]
    >(Prisma.sql`${ctes}
      SELECT o."paymentMethod"::text AS method, COUNT(*)::bigint AS orders,
        COALESCE(SUM(of."lineTotal" + o."shippingCost"), 0)::float8 AS sales,
        COALESCE(SUM(sr.amount), 0)::float8 AS refunds
      FROM order_financials of
      INNER JOIN eligible_orders o ON o.id = of."orderId"
      LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"
      GROUP BY o."paymentMethod"
      ORDER BY sales DESC`),
    prisma.$queryRaw<
      { count: bigint; units: bigint; value: number }[]
    >(Prisma.sql`${ctes}
      SELECT COUNT(DISTINCT rr.id)::bigint AS count,
        COALESCE(SUM(ri.quantity), 0)::bigint AS units,
        COALESCE(SUM(ri.quantity * (oi."lineTotal" / NULLIF(oi.quantity, 0))), 0)::float8 AS value
      FROM "ReturnRequest" rr
      INNER JOIN eligible_orders o ON o.id = rr."orderId"
      INNER JOIN "ReturnItem" ri ON ri."returnRequestId" = rr.id
      INNER JOIN "OrderItem" oi ON oi.id = ri."orderItemId"
      WHERE rr.status <> 'REJECTED'::"ReturnRequestStatus"`),
  ]);

  const row = summary[0];
  const grossSales = money(row?.grossSales);
  const discounts = money(row?.discounts);
  const refunds = money(row?.refunds);
  const netSales = money(row?.netSales);
  const cogs = money(row?.cogs);
  const soldUnits = Number(row?.soldUnits ?? 0);
  const returnedUnits = Number(row?.returnedUnits ?? 0);
  const orders = Number(row?.orders ?? 0);

  return {
    range,
    start,
    end,
    summary: {
      orders,
      grossSales,
      discounts,
      netSales,
      refunds,
      cogs,
      grossProfit: netSales - cogs,
      grossMargin: netSales > 0 ? ((netSales - cogs) / netSales) * 100 : null,
      averageOrderValue: orders > 0 ? netSales / orders : 0,
      soldUnits,
      returnedUnits,
      returnedValue: money(row?.returnedValue),
      returnCount: Number(row?.returnCount ?? 0),
      returnRate: soldUnits > 0 ? (returnedUnits / soldUnits) * 100 : 0,
      shippingCharged: money(row?.shippingCharged),
      shippingExpense: null,
      paymentFees: null,
      operatingExpense: null,
      netProfit: null,
      netMargin: null,
    },
    trend: trend.map((item) => ({
      ...item,
      orders: Number(item.orders),
      grossSales: money(item.grossSales),
      discounts: money(item.discounts),
      netSales: money(item.netSales),
      refunds: money(item.refunds),
      cogs: money(item.cogs),
      grossProfit: money(item.netSales) - money(item.cogs),
    })),
    products: products.map((item) => ({
      ...item,
      units: Number(item.units),
      returnedUnits: Number(item.returnedUnits),
      grossSales: money(item.grossSales),
      discounts: money(item.discounts),
      netSales: money(item.netSales),
      cogs: money(item.cogs),
      profit: money(item.profit),
      margin: money(item.netSales) > 0 ? (money(item.profit) / money(item.netSales)) * 100 : null,
    })),
    payments: payments.map((item) => ({
      ...item,
      orders: Number(item.orders),
      sales: money(item.sales),
      refunds: money(item.refunds),
    })),
    returns: {
      count: Number(returns[0]?.count ?? 0),
      units: Number(returns[0]?.units ?? 0),
      value: money(returns[0]?.value),
    },
  };
}

export async function getAdminOrderProfitability(filters: ReportFilters = {}) {
  await requireRole("ADMIN");
  const { start, end } = resolveReportRange(filters);
  const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page! : 1;
  const limit = 20;
  const search = filters.search?.trim();
  const searchSql = search
    ? Prisma.sql`AND (o."orderNumber" ILIKE ${`%${search}%`} OR COALESCE(o."customerName", '') ILIKE ${`%${search}%`} OR o."customerEmail" ILIKE ${`%${search}%`})`
    : Prisma.empty;
  const where = Prisma.sql`
    WHERE o."createdAt" >= ${start} AND o."createdAt" < ${end}
      AND o.status <> 'CANCELLED'::"OrderStatus" ${searchSql}
  `;
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      { id: string; orderNumber: string; createdAt: Date; customerName: string | null; status: string; paymentStatus: string; paymentMethod: string; itemCount: bigint; grossSales: number; discount: number; shipping: number; refunds: number; cogs: number; profit: number }[]
    >(Prisma.sql`
      SELECT o.id, o."orderNumber", o."createdAt", o."customerName", o.status::text, o."paymentStatus"::text, o."paymentMethod"::text,
        COUNT(oi.id)::bigint AS "itemCount",
        COALESCE(SUM(oi."lineSubtotal"), 0)::float8 AS "grossSales",
        COALESCE(SUM(oi."discountAmount"), 0)::float8 AS discount,
        o."shippingCost"::float8 AS shipping,
        COALESCE((SELECT SUM(r.amount) FROM "Refund" r INNER JOIN "Payment" p ON p.id = r."paymentId" WHERE p."orderId" = o.id AND r.status = 'SUCCESS'::"RefundStatus"), 0)::float8 AS refunds,
        COALESCE(SUM(oi."costPrice" * oi.quantity), 0)::float8 AS cogs,
        COALESCE(SUM(oi."lineTotal" - oi."costPrice" * oi.quantity), 0)::float8 AS profit
      FROM "Order" o
      LEFT JOIN "OrderItem" oi ON oi."orderId" = o.id
      ${where}
      GROUP BY o.id
      ORDER BY o."createdAt" DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Order" o ${where}`),
  ]);
  return {
    orders: rows.map((row) => ({ ...row, itemCount: Number(row.itemCount), grossSales: money(row.grossSales), discount: money(row.discount), shipping: money(row.shipping), refunds: money(row.refunds), cogs: money(row.cogs), profit: money(row.profit), margin: money(row.grossSales) - money(row.discount) > 0 ? (money(row.profit) / (money(row.grossSales) - money(row.discount))) * 100 : null })),
    total: Number(count[0]?.count ?? 0),
    totalPages: Math.ceil(Number(count[0]?.count ?? 0) / limit),
    page,
  };
}
