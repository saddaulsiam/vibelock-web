import "server-only";

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export const DEAD_STOCK_GRACE_DAYS = 14;
export const SLOW_MOVING_DAYS_OF_SUPPLY = 180;
export const INVENTORY_INTELLIGENCE_EXPORT_LIMIT = 5000;

export type InventoryIntelligenceWindow = "30d" | "60d" | "90d";
export type InventoryIntelligenceStatusFilter =
  | "all"
  | "negative"
  | "out-of-stock"
  | "dead"
  | "slow"
  | "healthy";

export type InventoryIntelligenceSort =
  | "valuation"
  | "stock"
  | "velocity"
  | "age"
  | "runout";

export type InventoryIntelligenceStatus =
  | "NEGATIVE"
  | "OUT_OF_STOCK"
  | "DEAD"
  | "SLOW"
  | "HEALTHY";

const WINDOW_DAYS: Record<InventoryIntelligenceWindow, number> = {
  "30d": 30,
  "60d": 60,
  "90d": 90,
};

export interface InventoryIntelligenceSummary {
  totalPhysicalStock: number;
  totalAvailableStock: number;
  totalPhysicalCostValue: number;
  totalAvailableCostValue: number;
  negativeStockCount: number;
  outOfStockCount: number;
  deadStockCount: number;
  slowMovingCount: number;
  healthyCount: number;
  totalVariants: number;
  missingCostCount: number;
}

export interface InventoryIntelligenceItem {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  productName: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  costPrice: number;
  sellingPrice: number;
  costUnavailable: boolean;
  physicalCostValue: number;
  availableCostValue: number;
  soldUnits: number;
  returnedUnits: number;
  netRetainedUnits: number;
  dailyVelocity: number;
  lastSaleAt: Date | null;
  lastInflowAt: Date | null;
  daysSinceLastInflow: number | null;
  daysOfSupply: number | null;
  status: InventoryIntelligenceStatus;
}

export interface InventoryIntelligenceResult {
  items: InventoryIntelligenceItem[];
  summary: InventoryIntelligenceSummary;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  window: InventoryIntelligenceWindow;
}

export interface InventoryIntelligenceExportResult {
  items: InventoryIntelligenceItem[];
  totalCount: number;
  isTruncated: boolean;
  limit: number;
  window: InventoryIntelligenceWindow;
}

function parseWindow(window?: string): InventoryIntelligenceWindow {
  if (window === "30d" || window === "60d" || window === "90d") {
    return window;
  }
  return "90d";
}

function parseStatusFilter(status?: string): InventoryIntelligenceStatusFilter {
  if (
    status === "negative" ||
    status === "out-of-stock" ||
    status === "dead" ||
    status === "slow" ||
    status === "healthy"
  ) {
    return status;
  }
  return "all";
}

function parseSort(sort?: string): InventoryIntelligenceSort {
  if (
    sort === "valuation" ||
    sort === "stock" ||
    sort === "velocity" ||
    sort === "age" ||
    sort === "runout"
  ) {
    return sort;
  }
  return "valuation";
}

interface RawIntelligenceRow {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  productName: string;
  costPrice: number | null;
  sellingPrice: number | null;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  soldUnits: number;
  returnedUnits: number;
  lastSaleAt: Date | null;
  lastInflowAt: Date | null;
}

function processIntelligenceRow(
  row: RawIntelligenceRow,
  asOf: Date,
  windowDays: number
): InventoryIntelligenceItem {
  const physical = Number(row.physicalStock ?? 0);
  const reserved = Number(row.reservedStock ?? 0);
  const available = Number(row.availableStock ?? 0);

  // Defensive cost checking
  const rawCost = Number(row.costPrice);
  const costUnavailable = row.costPrice === null || !Number.isFinite(rawCost) || rawCost < 0;
  const costPrice = costUnavailable ? 0 : rawCost;

  const rawSelling = Number(row.sellingPrice);
  const sellingPrice = Number.isFinite(rawSelling) && rawSelling >= 0 ? rawSelling : 0;

  // Valuation clamps quantities at zero
  const physicalCostValue = physical > 0 && !costUnavailable ? physical * costPrice : 0;
  const availableCostValue = available > 0 && !costUnavailable ? available * costPrice : 0;

  const soldUnits = Math.max(0, Number(row.soldUnits ?? 0));
  const returnedUnits = Math.max(0, Number(row.returnedUnits ?? 0));
  const netRetainedUnits = Math.max(0, soldUnits - returnedUnits);

  const dailyVelocity = netRetainedUnits / windowDays;

  // Days of supply is calculated only when both available stock and daily velocity are strictly positive
  const daysOfSupply =
    available > 0 && dailyVelocity > 0 ? available / dailyVelocity : null;

  let daysSinceLastInflow: number | null = null;
  if (row.lastInflowAt) {
    const diffMs = Math.max(0, asOf.getTime() - new Date(row.lastInflowAt).getTime());
    daysSinceLastInflow = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Explicit priority order:
  // 1. Negative physical stock
  // 2. Out of stock (availableStock <= 0)
  // 3. Dead stock (available > 0, netRetained == 0, reliable inflow > 14 days)
  // 4. Slow moving (available > 0, daysOfSupply > 180)
  // 5. Healthy
  let status: InventoryIntelligenceStatus = "HEALTHY";
  if (physical < 0) {
    status = "NEGATIVE";
  } else if (available <= 0) {
    status = "OUT_OF_STOCK";
  } else if (
    netRetainedUnits === 0 &&
    row.lastInflowAt !== null &&
    daysSinceLastInflow !== null &&
    daysSinceLastInflow > DEAD_STOCK_GRACE_DAYS
  ) {
    status = "DEAD";
  } else if (
    daysOfSupply !== null &&
    daysOfSupply > SLOW_MOVING_DAYS_OF_SUPPLY
  ) {
    status = "SLOW";
  } else {
    status = "HEALTHY";
  }

  return {
    id: row.id,
    sku: row.sku,
    size: row.size,
    color: row.color,
    productName: row.productName,
    physicalStock: physical,
    reservedStock: reserved,
    availableStock: available,
    costPrice,
    sellingPrice,
    costUnavailable,
    physicalCostValue,
    availableCostValue,
    soldUnits,
    returnedUnits,
    netRetainedUnits,
    dailyVelocity,
    lastSaleAt: row.lastSaleAt ? new Date(row.lastSaleAt) : null,
    lastInflowAt: row.lastInflowAt ? new Date(row.lastInflowAt) : null,
    daysSinceLastInflow,
    daysOfSupply,
    status,
  };
}

async function fetchRawIntelligenceData(asOf: Date, windowDays: number) {
  const windowStart = new Date(asOf.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const query = Prisma.sql`
    WITH variant_stock AS (
      SELECT
        pv.id,
        pv."productId",
        pv.sku,
        pv.size,
        pv.color,
        pv."costPrice",
        pv."sellingPrice",
        COALESCE(stock.total_stock, 0)::int AS physical_stock,
        COALESCE(reserved.reserved_stock, 0)::int AS reserved_stock
      FROM "ProductVariant" pv
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS total_stock
        FROM "InventoryTransaction"
        GROUP BY "variantId"
      ) stock ON stock."variantId" = pv.id
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS reserved_stock
        FROM "InventoryReservation"
        WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > ${asOf}
        GROUP BY "variantId"
      ) reserved ON reserved."variantId" = pv.id
    ),
    variant_velocity AS (
      SELECT
        it."variantId",
        COALESCE(SUM(CASE WHEN it.type = 'SALE' THEN -it.quantity ELSE 0 END) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM "Order" o WHERE o.id = it."referenceId" AND o.status = 'CANCELLED'
          )
        ), 0)::int AS sold_units,
        COALESCE(SUM(CASE WHEN it.type = 'RETURN' THEN it.quantity ELSE 0 END), 0)::int AS returned_units
      FROM "InventoryTransaction" it
      WHERE it."createdAt" >= ${windowStart} AND it."createdAt" <= ${asOf}
      GROUP BY it."variantId"
    ),
    variant_inflow AS (
      SELECT
        "variantId",
        MAX("createdAt") AS last_inflow_at
      FROM "InventoryTransaction"
      WHERE quantity > 0 AND type IN ('RESTOCK', 'RETURN', 'ADJUSTMENT') AND "createdAt" <= ${asOf}
      GROUP BY "variantId"
    ),
    variant_last_sale AS (
      SELECT
        it."variantId",
        MAX(it."createdAt") AS last_sale_at
      FROM "InventoryTransaction" it
      WHERE it.type = 'SALE' AND it."createdAt" <= ${asOf}
      AND NOT EXISTS (
        SELECT 1 FROM "Order" o WHERE o.id = it."referenceId" AND o.status = 'CANCELLED'
      )
      GROUP BY it."variantId"
    )
    SELECT
      vs.id,
      vs.sku,
      vs.size,
      vs.color,
      p.name AS "productName",
      vs."costPrice"::float8 AS "costPrice",
      vs."sellingPrice"::float8 AS "sellingPrice",
      vs.physical_stock AS "physicalStock",
      vs.reserved_stock AS "reservedStock",
      (vs.physical_stock - vs.reserved_stock)::int AS "availableStock",
      COALESCE(vv.sold_units, 0)::int AS "soldUnits",
      COALESCE(vv.returned_units, 0)::int AS "returnedUnits",
      vls.last_sale_at AS "lastSaleAt",
      vi.last_inflow_at AS "lastInflowAt"
    FROM variant_stock vs
    JOIN "Product" p ON vs."productId" = p.id
    LEFT JOIN variant_velocity vv ON vs.id = vv."variantId"
    LEFT JOIN variant_inflow vi ON vs.id = vi."variantId"
    LEFT JOIN variant_last_sale vls ON vs.id = vls."variantId"
    ORDER BY p.name ASC, vs.sku ASC
  `;

  return prisma.$queryRaw<RawIntelligenceRow[]>(query);
}

function calculateSummary(items: InventoryIntelligenceItem[]): InventoryIntelligenceSummary {
  return items.reduce(
    (acc, item) => {
      acc.totalPhysicalStock += item.physicalStock;
      acc.totalAvailableStock += item.availableStock;
      acc.totalPhysicalCostValue += item.physicalCostValue;
      acc.totalAvailableCostValue += item.availableCostValue;

      if (item.status === "NEGATIVE") acc.negativeStockCount++;
      if (item.status === "OUT_OF_STOCK") acc.outOfStockCount++;
      if (item.status === "DEAD") acc.deadStockCount++;
      if (item.status === "SLOW") acc.slowMovingCount++;
      if (item.status === "HEALTHY") acc.healthyCount++;
      if (item.costUnavailable) acc.missingCostCount++;

      return acc;
    },
    {
      totalPhysicalStock: 0,
      totalAvailableStock: 0,
      totalPhysicalCostValue: 0,
      totalAvailableCostValue: 0,
      negativeStockCount: 0,
      outOfStockCount: 0,
      deadStockCount: 0,
      slowMovingCount: 0,
      healthyCount: 0,
      totalVariants: items.length,
      missingCostCount: 0,
    }
  );
}

function filterAndSortItems(
  items: InventoryIntelligenceItem[],
  options: {
    search?: string;
    statusFilter: InventoryIntelligenceStatusFilter;
    sort: InventoryIntelligenceSort;
  }
): InventoryIntelligenceItem[] {
  let filtered = items;

  // Search filter
  if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q)
    );
  }

  // Status filter
  const statusFilter = options.statusFilter;
  if (statusFilter !== "all") {
    const targetStatus: Record<
      Exclude<InventoryIntelligenceStatusFilter, "all">,
      InventoryIntelligenceStatus
    > = {
      negative: "NEGATIVE",
      "out-of-stock": "OUT_OF_STOCK",
      dead: "DEAD",
      slow: "SLOW",
      healthy: "HEALTHY",
    };
    filtered = filtered.filter(
      (item) => item.status === targetStatus[statusFilter]
    );
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (options.sort) {
      case "valuation":
        return b.availableCostValue - a.availableCostValue;
      case "stock":
        return b.availableStock - a.availableStock;
      case "velocity":
        return b.dailyVelocity - a.dailyVelocity;
      case "age":
        // Nulls last for age
        if (a.daysSinceLastInflow === null && b.daysSinceLastInflow === null) return 0;
        if (a.daysSinceLastInflow === null) return 1;
        if (b.daysSinceLastInflow === null) return -1;
        return b.daysSinceLastInflow - a.daysSinceLastInflow;
      case "runout":
        // Nulls last for daysOfSupply
        if (a.daysOfSupply === null && b.daysOfSupply === null) return 0;
        if (a.daysOfSupply === null) return 1;
        if (b.daysOfSupply === null) return -1;
        return b.daysOfSupply - a.daysOfSupply;
      default:
        return b.availableCostValue - a.availableCostValue;
    }
  });

  return sorted;
}

export async function getAdminInventoryIntelligence({
  window = "90d",
  status = "all",
  search,
  sort = "valuation",
  page = 1,
  pageSize = 20,
}: {
  window?: InventoryIntelligenceWindow | string;
  status?: InventoryIntelligenceStatusFilter | string;
  search?: string;
  sort?: InventoryIntelligenceSort | string;
  page?: number;
  pageSize?: number;
} = {}): Promise<InventoryIntelligenceResult> {
  await requireRole("ADMIN");

  const validatedWindow = parseWindow(window);
  const validatedStatus = parseStatusFilter(status);
  const validatedSort = parseSort(sort);
  const windowDays = WINDOW_DAYS[validatedWindow];
  const asOf = new Date();

  const rawRows = await fetchRawIntelligenceData(asOf, windowDays);
  const allItems = rawRows.map((row) =>
    processIntelligenceRow(row, asOf, windowDays)
  );

  // Global summary across whole catalog (before table filters)
  const summary = calculateSummary(allItems);

  // Apply filters and sorting for table presentation
  const filteredAndSorted = filterAndSortItems(allItems, {
    search,
    statusFilter: validatedStatus,
    sort: validatedSort,
  });

  const total = filteredAndSorted.length;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  const totalPages = Math.ceil(total / safePageSize) || 1;
  const safePage = Math.max(1, Math.min(Number.isInteger(page) ? page : 1, totalPages));
  const offset = (safePage - 1) * safePageSize;
  const paginatedItems = filteredAndSorted.slice(offset, offset + safePageSize);

  return {
    items: paginatedItems,
    summary,
    total,
    totalPages,
    page: safePage,
    pageSize: safePageSize,
    window: validatedWindow,
  };
}

export async function getAdminInventoryIntelligenceForExport({
  window = "90d",
  status = "all",
  search,
  sort = "valuation",
}: {
  window?: InventoryIntelligenceWindow | string;
  status?: InventoryIntelligenceStatusFilter | string;
  search?: string;
  sort?: InventoryIntelligenceSort | string;
} = {}): Promise<InventoryIntelligenceExportResult> {
  await requireRole("ADMIN");

  const validatedWindow = parseWindow(window);
  const validatedStatus = parseStatusFilter(status);
  const validatedSort = parseSort(sort);
  const windowDays = WINDOW_DAYS[validatedWindow];
  const asOf = new Date();

  const rawRows = await fetchRawIntelligenceData(asOf, windowDays);
  const allItems = rawRows.map((row) =>
    processIntelligenceRow(row, asOf, windowDays)
  );

  const filteredAndSorted = filterAndSortItems(allItems, {
    search,
    statusFilter: validatedStatus,
    sort: validatedSort,
  });

  const totalCount = filteredAndSorted.length;
  const isTruncated = totalCount > INVENTORY_INTELLIGENCE_EXPORT_LIMIT;
  const exportedItems = filteredAndSorted.slice(
    0,
    INVENTORY_INTELLIGENCE_EXPORT_LIMIT
  );

  return {
    items: exportedItems,
    totalCount,
    isTruncated,
    limit: INVENTORY_INTELLIGENCE_EXPORT_LIMIT,
    window: validatedWindow,
  };
}
