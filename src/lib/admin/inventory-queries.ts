import "server-only";

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export type InventoryFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

export async function getAdminInventory({
  search,
  filter = "all",
  page = 1,
}: {
  search?: string;
  filter?: InventoryFilter;
  page?: number;
}) {
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
      WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > NOW()
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
        productName: string;
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
        "Product"."name" AS "productName",
        COALESCE(stock.total_stock, 0)::int AS "totalStock",
        COALESCE(reserved.reserved_stock, 0)::int AS reserved,
        (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0))::int AS available
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
      product: { name: item.productName },
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
