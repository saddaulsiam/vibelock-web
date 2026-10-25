import "server-only";

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export type InventoryFilter = "all" | "in-stock" | "low-stock" | "out-of-stock" | "negative";

export type AdminInventoryItem = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  costPrice: number;
  sellingPrice: number;
  discountPrice: number | null;
  productId: string;
  productSlug: string;
  primaryImage: string | null;
  product: { id: string; name: string; slug: string };
  totalStock: number;
  reserved: number;
  available: number;
};

export type AdminInventoryResult = {
  variants: AdminInventoryItem[];
  total: number;
  totalPages: number;
  page: number;
};

export async function getAdminInventory({
  search,
  filter = "all",
  page = 1,
}: {
  search?: string;
  filter?: InventoryFilter;
  page?: number;
}): Promise<AdminInventoryResult> {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const searchSql = search?.trim()
    ? Prisma.sql`AND ("ProductVariant"."sku" ILIKE ${`%${search.trim()}%`} OR "Product"."name" ILIKE ${`%${search.trim()}%`})`
    : Prisma.empty;
  const filterSql =
    filter === "in-stock"
      ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) > 0`
      : filter === "low-stock"
        ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) BETWEEN 1 AND 5`
        : filter === "out-of-stock"
          ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) <= 0`
          : filter === "negative"
            ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) < 0 OR (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) < 0)`
            : Prisma.empty;
  const offset = (normalizedPage - 1) * pageSize;
  const inventoryCte = Prisma.sql`
    FROM "ProductVariant"
    INNER JOIN "Product" ON "Product"."id" = "ProductVariant"."productId"
    LEFT JOIN (
      SELECT "variantId", SUM(quantity)::int AS total_stock
      FROM "InventoryTransaction"
      GROUP BY "variantId"
    ) stock ON stock."variantId" = "ProductVariant"."id"
    LEFT JOIN (
      SELECT "variantId", SUM(quantity)::int AS reserved_stock
      FROM "InventoryReservation"
      WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > (NOW() AT TIME ZONE 'UTC')
      GROUP BY "variantId"
    ) reserved ON reserved."variantId" = "ProductVariant"."id"
    WHERE 1 = 1 ${searchSql} ${filterSql}
  `;
  const [inventory, countResult] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        sku: string;
        size: string | null;
        color: string | null;
        costPrice: number | null;
        sellingPrice: number | null;
        discountPrice: number | null;
        productId: string;
        productName: string;
        productSlug: string;
        primaryImage: string | null;
        totalStock: number;
        reserved: number;
        available: number;
      }[]
    >(Prisma.sql`
      SELECT
        "ProductVariant"."id",
        "ProductVariant"."sku",
        "ProductVariant"."size",
        "ProductVariant"."color",
        "ProductVariant"."costPrice"::float AS "costPrice",
        "ProductVariant"."sellingPrice"::float AS "sellingPrice",
        "ProductVariant"."discountPrice"::float AS "discountPrice",
        "Product"."id" AS "productId",
        "Product"."name" AS "productName",
        "Product"."slug" AS "productSlug",
        COALESCE(stock.total_stock, 0)::int AS "totalStock",
        COALESCE(reserved.reserved_stock, 0)::int AS reserved,
        (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0))::int AS available,
        (
          SELECT "url" FROM "ProductImage"
          WHERE "ProductImage"."productId" = "Product"."id"
          ORDER BY "isPrimary" DESC, "createdAt" ASC
          LIMIT 1
        ) AS "primaryImage"
      ${inventoryCte}
      ORDER BY "Product"."name" ASC, "ProductVariant"."sku" ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${inventoryCte}
    `),
  ]);
  const total = Number(countResult[0]?.count ?? 0);

  return {
    variants: inventory.map((item) => ({
      id: item.id,
      sku: item.sku,
      size: item.size,
      color: item.color,
      costPrice: item.costPrice ?? 0,
      sellingPrice: item.sellingPrice ?? 0,
      discountPrice: item.discountPrice,
      productId: item.productId,
      productSlug: item.productSlug,
      primaryImage: item.primaryImage,
      product: { id: item.productId, name: item.productName, slug: item.productSlug },
      totalStock: item.totalStock,
      reserved: item.reserved,
      available: item.available,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page: normalizedPage,
  };
}

export async function getAdminInventoryDetail(variantId: string, page = 1) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      weight: true,
      costPrice: true,
      sellingPrice: true,
      discountPrice: true,
      product: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!variant) return null;

  const [stock, reserved, transactions, transactionCount] = await Promise.all([
    prisma.inventoryTransaction.aggregate({
      where: { variantId },
      _sum: { quantity: true },
    }),
    prisma.inventoryReservation.aggregate({
      where: {
        variantId,
        status: "RESERVED",
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    }),
    prisma.inventoryTransaction.findMany({
      where: { variantId },
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        quantity: true,
        referenceId: true,
        notes: true,
        salesChannel: true,
        createdAt: true,
      },
    }),
    prisma.inventoryTransaction.count({ where: { variantId } }),
  ]);

  const totalStock = stock._sum.quantity ?? 0;
  const reservedStock = reserved._sum.quantity ?? 0;

  return {
    variant,
    totalStock,
    reservedStock,
    availableStock: totalStock - reservedStock,
    transactions,
    totalPages: Math.ceil(transactionCount / pageSize),
    page: normalizedPage,
  };
}

export type InventorySummary = {
  totalPhysicalStock: number;
  totalReservedStock: number;
  totalAvailableStock: number;
  estimatedCostValue: number;
  estimatedRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  negativeStockCount: number;
  totalVariants: number;
};

export const INVENTORY_EXPORT_LIMIT = 5000;

export type InventoryExportItem = {
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
  estimatedCostValue: number;
  estimatedRetailValue: number;
  status: "In stock" | "Low stock" | "Out of stock";
};

export type InventoryExportResult = {
  items: InventoryExportItem[];
  totalCount: number;
  isTruncated: boolean;
  limit: number;
};

export async function getAdminInventorySummary(): Promise<InventorySummary> {
  await requireRole("ADMIN");

  const [summary] = await prisma.$queryRaw<
    {
      totalPhysicalStock: number;
      totalReservedStock: number;
      totalAvailableStock: number;
      estimatedCostValue: number;
      estimatedRetailValue: number;
      lowStockCount: number;
      outOfStockCount: number;
      negativeStockCount: number;
      totalVariants: number;
    }[]
  >(Prisma.sql`
    WITH variant_stock AS (
      SELECT
        pv.id,
        pv."costPrice",
        pv."sellingPrice",
        COALESCE(stock.total_stock, 0)::int AS physical_stock,
        COALESCE(reserved.reserved_stock, 0)::int AS reserved_stock,
        (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0))::int AS available_stock
      FROM "ProductVariant" pv
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS total_stock
        FROM "InventoryTransaction"
        GROUP BY "variantId"
      ) stock ON stock."variantId" = pv.id
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS reserved_stock
        FROM "InventoryReservation"
        WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > (NOW() AT TIME ZONE 'UTC')
        GROUP BY "variantId"
      ) reserved ON reserved."variantId" = pv.id
    )
    SELECT
      COALESCE(SUM(physical_stock), 0)::int AS "totalPhysicalStock",
      COALESCE(SUM(reserved_stock), 0)::int AS "totalReservedStock",
      COALESCE(SUM(available_stock), 0)::int AS "totalAvailableStock",
      COALESCE(SUM(CASE WHEN physical_stock > 0 THEN physical_stock * "costPrice" ELSE 0 END), 0)::float8 AS "estimatedCostValue",
      COALESCE(SUM(CASE WHEN physical_stock > 0 THEN physical_stock * "sellingPrice" ELSE 0 END), 0)::float8 AS "estimatedRetailValue",
      COALESCE(COUNT(*) FILTER (WHERE available_stock BETWEEN 1 AND 5), 0)::int AS "lowStockCount",
      COALESCE(COUNT(*) FILTER (WHERE available_stock <= 0), 0)::int AS "outOfStockCount",
      COALESCE(COUNT(*) FILTER (WHERE physical_stock < 0 OR available_stock < 0), 0)::int AS "negativeStockCount",
      COUNT(*)::int AS "totalVariants"
    FROM variant_stock;
  `);

  return {
    totalPhysicalStock: Number(summary?.totalPhysicalStock ?? 0),
    totalReservedStock: Number(summary?.totalReservedStock ?? 0),
    totalAvailableStock: Number(summary?.totalAvailableStock ?? 0),
    estimatedCostValue: Number(summary?.estimatedCostValue ?? 0),
    estimatedRetailValue: Number(summary?.estimatedRetailValue ?? 0),
    lowStockCount: Number(summary?.lowStockCount ?? 0),
    outOfStockCount: Number(summary?.outOfStockCount ?? 0),
    negativeStockCount: Number(summary?.negativeStockCount ?? 0),
    totalVariants: Number(summary?.totalVariants ?? 0),
  };
}

export async function getAdminInventoryForExport({
  search,
  filter = "all",
}: {
  search?: string;
  filter?: InventoryFilter;
} = {}): Promise<InventoryExportResult> {
  await requireRole("ADMIN");

  const searchSql = search?.trim()
    ? Prisma.sql`AND ("ProductVariant"."sku" ILIKE ${`%${search.trim()}%`} OR "Product"."name" ILIKE ${`%${search.trim()}%`})`
    : Prisma.empty;
  const filterSql =
    filter === "in-stock"
      ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) > 0`
      : filter === "low-stock"
        ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) BETWEEN 1 AND 5`
        : filter === "out-of-stock"
          ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) <= 0`
          : filter === "negative"
            ? Prisma.sql`AND (COALESCE(stock.total_stock, 0) < 0 OR (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) < 0)`
            : Prisma.empty;

  const inventoryCte = Prisma.sql`
    FROM "ProductVariant"
    INNER JOIN "Product" ON "Product"."id" = "ProductVariant"."productId"
    LEFT JOIN (
      SELECT "variantId", SUM(quantity)::int AS total_stock
      FROM "InventoryTransaction"
      GROUP BY "variantId"
    ) stock ON stock."variantId" = "ProductVariant"."id"
    LEFT JOIN (
      SELECT "variantId", SUM(quantity)::int AS reserved_stock
      FROM "InventoryReservation"
      WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > (NOW() AT TIME ZONE 'UTC')
      GROUP BY "variantId"
    ) reserved ON reserved."variantId" = "ProductVariant"."id"
    WHERE 1 = 1 ${searchSql} ${filterSql}
  `;

  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        sku: string;
        size: string | null;
        color: string | null;
        productName: string;
        costPrice: number;
        sellingPrice: number;
        physicalStock: number;
        reservedStock: number;
        availableStock: number;
      }[]
    >(Prisma.sql`
      SELECT
        "ProductVariant"."id",
        "ProductVariant"."sku",
        "ProductVariant"."size",
        "ProductVariant"."color",
        "ProductVariant"."costPrice"::float8 AS "costPrice",
        "ProductVariant"."sellingPrice"::float8 AS "sellingPrice",
        "Product"."name" AS "productName",
        COALESCE(stock.total_stock, 0)::int AS "physicalStock",
        COALESCE(reserved.reserved_stock, 0)::int AS "reservedStock",
        (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0))::int AS "availableStock"
      ${inventoryCte}
      ORDER BY "Product"."name" ASC, "ProductVariant"."sku" ASC
      LIMIT ${INVENTORY_EXPORT_LIMIT}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${inventoryCte}
    `),
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);
  const isTruncated = totalCount > INVENTORY_EXPORT_LIMIT;

  return {
    items: items.map((item) => {
      const physical = Number(item.physicalStock ?? 0);
      const reserved = Number(item.reservedStock ?? 0);
      const available = Number(item.availableStock ?? 0);
      const costPrice = Number(item.costPrice ?? 0);
      const sellingPrice = Number(item.sellingPrice ?? 0);
      const status: "In stock" | "Low stock" | "Out of stock" =
        available <= 0 ? "Out of stock" : available <= 5 ? "Low stock" : "In stock";

      return {
        id: item.id,
        sku: item.sku,
        size: item.size,
        color: item.color,
        productName: item.productName,
        physicalStock: physical,
        reservedStock: reserved,
        availableStock: available,
        costPrice,
        sellingPrice,
        estimatedCostValue: physical > 0 ? physical * costPrice : 0,
        estimatedRetailValue: physical > 0 ? physical * sellingPrice : 0,
        status,
      };
    }),
    totalCount,
    isTruncated,
    limit: INVENTORY_EXPORT_LIMIT,
  };
}
