import "server-only";

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type ReportRange =
  "today" | "yesterday" | "7d" | "30d" | "this-month" | "last-month" | "custom";
export type ReportSort = "revenue" | "profit" | "units" | "margin" | "returns";

export type ReportFilters = {
  range?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
  search?: string;
  limit?: number;
  summaryOnly?: boolean;
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
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0;
}

type SummaryRow = {
  orders: bigint;
  grossSales: number;
  discounts: number;
  netSales: number;
  refunds: number;
  cogs: number;
  soldUnits: bigint;
  returnedUnits: bigint;
  returnedValue: number;
  returnCount: bigint;
  shippingCharged: number;
};

function formatReportSummary(row: SummaryRow | undefined) {
  const grossSales = money(row?.grossSales);
  const discounts = money(row?.discounts);
  const refunds = money(row?.refunds);
  const netSales = money(row?.netSales);
  const cogs = money(row?.cogs);
  const soldUnits = Number(row?.soldUnits ?? 0);
  const returnedUnits = Number(row?.returnedUnits ?? 0);
  const orders = Number(row?.orders ?? 0);

  return {
    orders,
    grossSales,
    discounts,
    netSales,
    refunds,
    cogs,
    grossProfit: money(netSales - cogs),
    grossMargin: netSales > 0 ? Number((((netSales - cogs) / netSales) * 100).toFixed(2)) : null,
    averageOrderValue: orders > 0 ? money(netSales / orders) : 0,
    soldUnits,
    returnedUnits,
    returnedValue: money(row?.returnedValue),
    returnCount: Number(row?.returnCount ?? 0),
    returnRate: soldUnits > 0 ? Number(((returnedUnits / soldUnits) * 100).toFixed(2)) : 0,
    shippingCharged: money(row?.shippingCharged),
    shippingExpense: null,
    paymentFees: null,
    operatingExpense: null,
    netProfit: null,
    netMargin: null,
  };
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
           o.status AS "orderStatus", o."paymentStatus", o."shippingCost", o.discount AS "orderDiscount", o."createdAt" AS "orderCreatedAt"
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
      SUM("lineTotal" + "discountAmount") AS "grossSales",
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

  const summaryQuery = prisma.$queryRaw<[SummaryRow]>(Prisma.sql`${ctes}
    SELECT
      COUNT(DISTINCT of."orderId")::bigint AS orders,
      COALESCE(SUM(of."grossSales"), 0)::float8 AS "grossSales",
      COALESCE(SUM(of.discounts + COALESCE(o.discount, 0)), 0)::float8 AS discounts,
      COALESCE(SUM(of."lineTotal" - COALESCE(o.discount, 0)), 0)::float8 - COALESCE(SUM(sr.amount), 0)::float8 AS "netSales",
      COALESCE(SUM(sr.amount), 0)::float8 AS refunds,
      COALESCE(SUM(of.cogs), 0)::float8 AS cogs,
      COALESCE(SUM(of."soldUnits"), 0)::bigint AS "soldUnits",
      COALESCE(SUM(of."returnedUnits"), 0)::bigint AS "returnedUnits",
      COALESCE(SUM(of."returnedValue"), 0)::float8 AS "returnedValue",
      COUNT(DISTINCT CASE WHEN of."returnedUnits" > 0 THEN of."orderId" END)::bigint AS "returnCount",
      COALESCE(SUM(o."shippingCost"), 0)::float8 AS "shippingCharged"
    FROM order_financials of
    INNER JOIN eligible_orders o ON o.id = of."orderId"
    LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"`);

  if (filters.summaryOnly) {
    const summary = await summaryQuery;
    return {
      range,
      start,
      end,
      summary: formatReportSummary(summary[0]),
      trend: [],
      products: [],
      payments: [],
      returns: { count: 0, units: 0, value: 0 },
    };
  }

  const productSearch = filters.search?.trim();
  const productSearchSql = productSearch
    ? Prisma.sql`WHERE (so."productName" ILIKE ${`%${productSearch}%`} OR so.sku ILIKE ${`%${productSearch}%`})`
    : Prisma.empty;

  const productSort = filters.sort;
  const productSortSql =
    productSort === "profit"
      ? Prisma.sql`p.profit DESC`
      : productSort === "units"
        ? Prisma.sql`p."soldUnits" DESC`
        : productSort === "margin"
          ? Prisma.sql`CASE WHEN p."netSales" > 0 THEN (p.profit / p."netSales") ELSE -999999 END DESC`
          : productSort === "returns"
            ? Prisma.sql`p."returnedUnits" DESC`
            : Prisma.sql`p."netSales" DESC`;

  const productLimit =
    filters.limit && Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 100;

  const [summary, trend, products, payments, returns] = await Promise.all([
    summaryQuery,
    prisma.$queryRaw<
      {
        date: Date;
        orders: bigint;
        grossSales: number;
        discounts: number;
        netSales: number;
        refunds: number;
        cogs: number;
      }[]
    >(Prisma.sql`${ctes}
      SELECT DATE_TRUNC('day', o."createdAt") AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(of."grossSales"), 0)::float8 AS "grossSales",
        COALESCE(SUM(of.discounts + COALESCE(o.discount, 0)), 0)::float8 AS discounts,
        COALESCE(SUM(of."lineTotal" - COALESCE(o.discount, 0)), 0)::float8 - COALESCE(SUM(sr.amount), 0)::float8 AS "netSales",
        COALESCE(SUM(sr.amount), 0)::float8 AS refunds,
        COALESCE(SUM(of.cogs), 0)::float8 AS cogs
      FROM order_financials of
      INNER JOIN eligible_orders o ON o.id = of."orderId"
      LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY date ASC`),

    prisma.$queryRaw<
      {
        productName: string;
        sku: string;
        soldUnits: bigint;
        returnedUnits: bigint;
        grossSales: number;
        discounts: number;
        netSales: number;
        cogs: number;
        profit: number;
      }[]
    >(Prisma.sql`${ctes}
      SELECT *
      FROM (
        SELECT so."productName", so.sku,
          SUM(so.quantity)::bigint AS "soldUnits",
          COALESCE(SUM(ri.quantity), 0)::bigint AS "returnedUnits",
          COALESCE(SUM(so."lineTotal" + so."discountAmount"), 0)::float8 AS "grossSales",
          COALESCE(SUM(so."discountAmount"), 0)::float8 AS discounts,
          COALESCE(SUM(so."lineTotal" - (so."lineTotal" / NULLIF(so.quantity, 0)) * COALESCE(ri.quantity, 0)), 0)::float8 AS "netSales",
          COALESCE(SUM(so."costPrice" * GREATEST(0, so.quantity - COALESCE(ri.quantity, 0))), 0)::float8 AS cogs,
          COALESCE(SUM(so."lineTotal" - (so."lineTotal" / NULLIF(so.quantity, 0)) * COALESCE(ri.quantity, 0) - so."costPrice" * GREATEST(0, so.quantity - COALESCE(ri.quantity, 0))), 0)::float8 AS profit
        FROM sold_items so
        LEFT JOIN returned_items ri ON ri."orderItemId" = so.id
        ${productSearchSql}
        GROUP BY so."productName", so.sku
      ) p
      ORDER BY ${productSortSql}, p."productName" ASC
      LIMIT ${productLimit}`),
    prisma.$queryRaw<
      { method: string; orders: bigint; sales: number; refunds: number }[]
    >(Prisma.sql`${ctes}
      SELECT o."paymentMethod"::text AS method, COUNT(*)::bigint AS orders,
        COALESCE(SUM(of."lineTotal" - COALESCE(o.discount, 0) + o."shippingCost"), 0)::float8 AS sales,
        COALESCE(SUM(sr.amount), 0)::float8 AS refunds
      FROM order_financials of
      INNER JOIN eligible_orders o ON o.id = of."orderId"
      LEFT JOIN successful_refunds sr ON sr."orderId" = of."orderId"
      GROUP BY o."paymentMethod"
      ORDER BY sales DESC`),
    prisma.$queryRaw<{ count: bigint; units: bigint; value: number }[]>(Prisma.sql`${ctes}
      SELECT COUNT(DISTINCT rr.id)::bigint AS count,
        COALESCE(SUM(ri.quantity), 0)::bigint AS units,
        COALESCE(SUM(ri.quantity * (oi."lineTotal" / NULLIF(oi.quantity, 0))), 0)::float8 AS value
      FROM "ReturnRequest" rr
      INNER JOIN eligible_orders o ON o.id = rr."orderId"
      INNER JOIN "ReturnItem" ri ON ri."returnRequestId" = rr.id
      INNER JOIN "OrderItem" oi ON oi.id = ri."orderItemId"
      WHERE rr.status <> 'REJECTED'::"ReturnRequestStatus"`),
  ]);

  return {
    range,
    start,
    end,
    summary: formatReportSummary(summary[0]),
    trend: trend.map((item) => ({
      ...item,
      orders: Number(item.orders),
      grossSales: money(item.grossSales),
      discounts: money(item.discounts),
      netSales: money(item.netSales),
      refunds: money(item.refunds),
      cogs: money(item.cogs),
      grossProfit: money(money(item.netSales) - money(item.cogs)),
    })),
    products: products.map((item) => {
      const itemSoldUnits = Number(item.soldUnits);
      const itemReturnedUnits = Number(item.returnedUnits);
      const netUnits = Math.max(0, itemSoldUnits - itemReturnedUnits);
      const isAnomaly = itemReturnedUnits > itemSoldUnits;
      const returnRate =
        itemSoldUnits > 0 ? Number(((itemReturnedUnits / itemSoldUnits) * 100).toFixed(2)) : null;
      const itemNetSales = money(item.netSales);
      const itemProfit = money(item.profit);
      const margin =
        itemNetSales > 0 ? Number(((itemProfit / itemNetSales) * 100).toFixed(2)) : null;

      return {
        ...item,
        soldUnits: itemSoldUnits,
        returnedUnits: itemReturnedUnits,
        netUnits,
        units: netUnits,
        returnRate,
        isAnomaly,
        grossSales: money(item.grossSales),
        discounts: money(item.discounts),
        netSales: itemNetSales,
        cogs: money(item.cogs),
        profit: itemProfit,
        margin,
      };
    }),
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
    ? Prisma.sql`AND (
        o."orderNumber" ILIKE ${`%${search}%`}
        OR COALESCE(o."customerName", '') ILIKE ${`%${search}%`}
        OR o."customerEmail" ILIKE ${`%${search}%`}
        OR EXISTS (
          SELECT 1 FROM "OrderItem" oi_s
          WHERE oi_s."orderId" = o.id
            AND (oi_s."productName" ILIKE ${`%${search}%`} OR oi_s.sku ILIKE ${`%${search}%`})
        )
      )`
    : Prisma.empty;
  const where = Prisma.sql`
    WHERE o."createdAt" >= ${start} AND o."createdAt" < ${end}
      AND o.status <> 'CANCELLED'::"OrderStatus" ${searchSql}
  `;
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        orderNumber: string;
        createdAt: Date;
        customerName: string | null;
        status: string;
        paymentStatus: string;
        paymentMethod: string;
        itemCount: bigint;
        grossSales: number;
        discount: number;
        shipping: number;
        refunds: number;
        cogs: number;
        profit: number;
      }[]
    >(Prisma.sql`
      WITH item_returns AS (
        SELECT ri."orderItemId", SUM(ri.quantity)::int AS quantity
        FROM "ReturnItem" ri
        INNER JOIN "ReturnRequest" rr ON rr.id = ri."returnRequestId"
        WHERE rr.status <> 'REJECTED'::"ReturnRequestStatus"
        GROUP BY ri."orderItemId"
      ),
      order_item_financials AS (
        SELECT oi."orderId",
          COUNT(oi.id)::bigint AS "itemCount",
          COALESCE(SUM(oi."lineTotal" + oi."discountAmount"), 0)::float8 AS "grossSales",
          COALESCE(SUM(oi."discountAmount"), 0)::float8 AS "itemDiscounts",
          COALESCE(SUM(oi."lineTotal"), 0)::float8 AS "lineTotal",
          COALESCE(SUM(oi."costPrice" * GREATEST(0, oi.quantity - COALESCE(ir.quantity, 0))), 0)::float8 AS cogs
        FROM "OrderItem" oi
        LEFT JOIN item_returns ir ON ir."orderItemId" = oi.id
        GROUP BY oi."orderId"
      ),
      order_refunds AS (
        SELECT p."orderId", SUM(r.amount) AS amount
        FROM "Refund" r
        INNER JOIN "Payment" p ON p.id = r."paymentId"
        WHERE r.status = 'SUCCESS'::"RefundStatus"
        GROUP BY p."orderId"
      )
      SELECT o.id, o."orderNumber", o."createdAt", o."customerName", o.status::text, o."paymentStatus"::text, o."paymentMethod"::text,
        COALESCE(oif."itemCount", 0)::bigint AS "itemCount",
        COALESCE(oif."grossSales", 0)::float8 AS "grossSales",
        COALESCE(oif."itemDiscounts", 0)::float8 + COALESCE(o.discount, 0)::float8 AS discount,
        o."shippingCost"::float8 AS shipping,
        COALESCE(rf.amount, 0)::float8 AS refunds,
        COALESCE(oif.cogs, 0)::float8 AS cogs,
        (COALESCE(oif."lineTotal", 0)::float8 - COALESCE(o.discount, 0)::float8 - COALESCE(rf.amount, 0)::float8 - COALESCE(oif.cogs, 0)::float8) AS profit
      FROM "Order" o
      LEFT JOIN order_item_financials oif ON oif."orderId" = o.id
      LEFT JOIN order_refunds rf ON rf."orderId" = o.id
      ${where}
      ORDER BY o."createdAt" DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
    prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Order" o ${where}`
    ),
  ]);
  return {
    orders: rows.map((row) => {
      const grossSales = money(row.grossSales);
      const discount = money(row.discount);
      const refunds = money(row.refunds);
      const cogs = money(row.cogs);
      const netSales = money(grossSales - discount - refunds);
      const profit = money(row.profit);
      const margin = netSales > 0 ? Number(((profit / netSales) * 100).toFixed(2)) : null;
      return {
        ...row,
        itemCount: Number(row.itemCount),
        grossSales,
        discount,
        shipping: money(row.shipping),
        refunds,
        cogs,
        profit,
        margin,
      };
    }),
    total: Number(count[0]?.count ?? 0),
    totalPages: Math.ceil(Number(count[0]?.count ?? 0) / limit),
    page,
  };
}

export type ProductProfitabilityVariant = {
  sku: string;
  size: string | null;
  color: string | null;
  soldUnits: number;
  returnedUnits: number;
  retainedUnits: number;
  returnRate: number | null;
  isAnomaly: boolean;
  grossSales: number;
  totalDiscounts: number;
  orderDiscounts: number;
  netSales: number;
  cogs: number;
  profit: number;
  margin: number | null;
};

export type ProductProfitabilityProduct = {
  productId: string;
  productName: string;
  productSlug: string | null;
  variantCount: number;
  soldUnits: number;
  returnedUnits: number;
  retainedUnits: number;
  returnRate: number | null;
  isAnomaly: boolean;
  grossSales: number;
  totalDiscounts: number;
  orderDiscounts: number;
  netSales: number;
  cogs: number;
  profit: number;
  margin: number | null;
  variants: ProductProfitabilityVariant[];
};

export type ProductProfitabilityResult = {
  range: ReportRange;
  start: Date;
  end: Date;
  products: ProductProfitabilityProduct[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

export async function getAdminProductProfitability(
  filters: ReportFilters = {}
): Promise<ProductProfitabilityResult> {
  await requireRole("ADMIN");
  const { start, end, range } = resolveReportRange(filters);
  const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page! : 1;
  const limit = Number.isInteger(filters.limit) && (filters.limit ?? 0) > 0 ? filters.limit! : 20;

  const search = filters.search?.trim();
  const searchSql = search
    ? Prisma.sql`WHERE (
        pr."productName" ILIKE ${`%${search}%`}
        OR EXISTS (
          SELECT 1 FROM sku_financials sf
          WHERE sf."productId" = pr."productId" AND sf.sku ILIKE ${`%${search}%`}
        )
      )`
    : Prisma.empty;

  const sort = filters.sort;
  const sortSql =
    sort === "profit"
      ? Prisma.sql`ORDER BY pr."profit" DESC, pr."productName" ASC`
      : sort === "units"
        ? Prisma.sql`ORDER BY pr."soldUnits" DESC, pr."productName" ASC`
        : sort === "margin"
          ? Prisma.sql`ORDER BY CASE WHEN pr."netSales" > 0 THEN (pr.profit / pr."netSales") ELSE -999999 END DESC, pr."productName" ASC`
          : sort === "returns"
            ? Prisma.sql`ORDER BY pr."returnedUnits" DESC, pr."productName" ASC`
            : Prisma.sql`ORDER BY pr."netSales" DESC, pr."productName" ASC`;

  const ctes = Prisma.sql`
    WITH eligible_orders AS (
      SELECT o.*
      FROM "Order" o
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" < ${end}
        AND o.status <> 'CANCELLED'::"OrderStatus"
    ),
    sold_items AS (
      SELECT oi.*, o."orderNumber", o."paymentMethod", o."customerName", o."customerEmail",
             o.status AS "orderStatus", o."paymentStatus", o."shippingCost", o.discount AS "orderDiscount",
             o.subtotal AS "orderSubtotal", o."createdAt" AS "orderCreatedAt"
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
        GREATEST(0, so.quantity - COALESCE(ri.quantity, 0)) AS "keptQuantity",
        CASE 
          WHEN COALESCE(so."orderSubtotal", 0) > 0 THEN
            (COALESCE(so."orderDiscount", 0) * (so."lineTotal" / so."orderSubtotal"))
          ELSE 0
        END AS "allocatedOrderDiscount"
      FROM sold_items so
      LEFT JOIN returned_items ri ON ri."orderItemId" = so.id
    ),
    sku_financials AS (
      SELECT
        COALESCE(p.id, so."productName") AS "productId",
        COALESCE(p.name, so."productName") AS "productName",
        p.slug AS "productSlug",
        so.sku,
        so.size,
        so.color,
        SUM(so.quantity)::bigint AS "soldUnits",
        SUM(so."returnedQuantity")::bigint AS "returnedUnits",
        SUM(so."keptQuantity")::bigint AS "retainedUnits",
        COALESCE(SUM(so."lineTotal" + so."discountAmount"), 0)::float8 AS "grossSales",
        COALESCE(SUM(so."discountAmount" + so."allocatedOrderDiscount"), 0)::float8 AS "totalDiscounts",
        COALESCE(SUM(so."allocatedOrderDiscount"), 0)::float8 AS "orderDiscounts",
        COALESCE(SUM(
          CASE WHEN so.quantity > 0 THEN
            (so."lineTotal" - so."allocatedOrderDiscount") * (so."keptQuantity"::float8 / so.quantity::float8)
          ELSE 0 END
        ), 0)::float8 AS "netSales",
        COALESCE(SUM(so."costPrice" * so."keptQuantity"), 0)::float8 AS "cogs",
        COALESCE(SUM(
          CASE WHEN so.quantity > 0 THEN
            (so."lineTotal" - so."allocatedOrderDiscount") * (so."keptQuantity"::float8 / so.quantity::float8)
          ELSE 0 END
          - (so."costPrice" * so."keptQuantity")
        ), 0)::float8 AS "profit"
      FROM item_financials so
      LEFT JOIN "ProductVariant" pv ON pv.sku = so.sku
      LEFT JOIN "Product" p ON p.id = pv."productId"
      GROUP BY
        COALESCE(p.id, so."productName"),
        COALESCE(p.name, so."productName"),
        p.slug,
        so.sku,
        so.size,
        so.color
    ),
    product_rollups AS (
      SELECT
        "productId",
        "productName",
        "productSlug",
        COUNT(DISTINCT sku)::int AS "variantCount",
        SUM("soldUnits")::bigint AS "soldUnits",
        SUM("returnedUnits")::bigint AS "returnedUnits",
        SUM("retainedUnits")::bigint AS "retainedUnits",
        SUM("grossSales")::float8 AS "grossSales",
        SUM("totalDiscounts")::float8 AS "totalDiscounts",
        SUM("orderDiscounts")::float8 AS "orderDiscounts",
        SUM("netSales")::float8 AS "netSales",
        SUM("cogs")::float8 AS "cogs",
        SUM("profit")::float8 AS "profit"
      FROM sku_financials
      GROUP BY "productId", "productName", "productSlug"
    )
  `;

  const [productRows, countRows] = await Promise.all([
    prisma.$queryRaw<
      {
        productId: string;
        productName: string;
        productSlug: string | null;
        variantCount: number;
        soldUnits: bigint;
        returnedUnits: bigint;
        retainedUnits: bigint;
        grossSales: number;
        totalDiscounts: number;
        orderDiscounts: number;
        netSales: number;
        cogs: number;
        profit: number;
      }[]
    >(Prisma.sql`
      ${ctes}
      SELECT * FROM product_rollups pr
      ${searchSql}
      ${sortSql}
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      ${ctes}
      SELECT COUNT(*)::bigint AS count FROM product_rollups pr
      ${searchSql}
    `),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limit);

  const productIds = productRows.map((p) => p.productId);
  let variantRows: {
    productId: string;
    productName: string;
    productSlug: string | null;
    sku: string;
    size: string | null;
    color: string | null;
    soldUnits: bigint;
    returnedUnits: bigint;
    retainedUnits: bigint;
    grossSales: number;
    totalDiscounts: number;
    orderDiscounts: number;
    netSales: number;
    cogs: number;
    profit: number;
  }[] = [];

  if (productIds.length > 0) {
    variantRows = await prisma.$queryRaw(Prisma.sql`
      ${ctes}
      SELECT * FROM sku_financials
      WHERE "productId" IN (${Prisma.join(productIds)})
      ORDER BY "netSales" DESC, sku ASC
    `);
  }

  const variantsByProductId = new Map<string, ProductProfitabilityVariant[]>();
  for (const v of variantRows) {
    const sold = Number(v.soldUnits);
    const returned = Number(v.returnedUnits);
    const retained = Number(v.retainedUnits);
    const netSales = money(v.netSales);
    const profit = money(v.profit);
    const returnRate = sold > 0 ? Number(((returned / sold) * 100).toFixed(2)) : null;
    const margin = netSales > 0 ? Number(((profit / netSales) * 100).toFixed(2)) : null;

    const list = variantsByProductId.get(v.productId) ?? [];
    list.push({
      sku: v.sku,
      size: v.size ?? null,
      color: v.color ?? null,
      soldUnits: sold,
      returnedUnits: returned,
      retainedUnits: retained,
      returnRate,
      isAnomaly: returned > sold,
      grossSales: money(v.grossSales),
      totalDiscounts: money(v.totalDiscounts),
      orderDiscounts: money(v.orderDiscounts),
      netSales,
      cogs: money(v.cogs),
      profit,
      margin,
    });
    variantsByProductId.set(v.productId, list);
  }

  const products: ProductProfitabilityProduct[] = productRows.map((p) => {
    const sold = Number(p.soldUnits);
    const returned = Number(p.returnedUnits);
    const retained = Number(p.retainedUnits);
    const netSales = money(p.netSales);
    const profit = money(p.profit);
    const returnRate = sold > 0 ? Number(((returned / sold) * 100).toFixed(2)) : null;
    const margin = netSales > 0 ? Number(((profit / netSales) * 100).toFixed(2)) : null;

    return {
      productId: p.productId,
      productName: p.productName,
      productSlug: p.productSlug ?? null,
      variantCount: Number(p.variantCount),
      soldUnits: sold,
      returnedUnits: returned,
      retainedUnits: retained,
      returnRate,
      isAnomaly: returned > sold,
      grossSales: money(p.grossSales),
      totalDiscounts: money(p.totalDiscounts),
      orderDiscounts: money(p.orderDiscounts),
      netSales,
      cogs: money(p.cogs),
      profit,
      margin,
      variants: variantsByProductId.get(p.productId) ?? [],
    };
  });

  return {
    range,
    start,
    end,
    products,
    total,
    totalPages,
    page,
    limit,
  };
}
