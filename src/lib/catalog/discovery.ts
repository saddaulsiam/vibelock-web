import "server-only";
import prisma from "@/lib/prisma/client";
import { ProductStatus, Prisma } from "@prisma/client";
import { DiscoverySearchParams } from "./validation";
import { mapProductSummary } from "./mappers";
import { ProductSummary } from "./types";
import { unstable_cache } from "next/cache";

// Max products per page
export const PAGE_SIZE = 12;

// Reusable standard includes
const PUBLIC_PRODUCT_INCLUDES = {
  images: true,
  categories: true,
  variants: {
    include: {
      inventoryTransactions: {
        select: { quantity: true },
      },
      inventoryReservations: {
        select: { quantity: true, expiresAt: true },
        where: { status: "RESERVED" as const },
      },
    },
  },
};

/**
 * Build Prisma where clause based on discovery search params
 */
function buildDiscoveryWhere(params: DiscoverySearchParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
  };

  const andConditions: Prisma.ProductWhereInput[] = [];

  // Search query
  if (params.q) {
    const searchStr = params.q;
    andConditions.push({
      OR: [
        { name: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
        { slug: { contains: searchStr, mode: "insensitive" } },
        { categories: { some: { name: { contains: searchStr, mode: "insensitive" } } } },
      ],
    });
  }

  // Category
  if (params.category) {
    const slugs = params.category
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length > 0) {
      andConditions.push({
        categories: { some: { slug: { in: slugs } } },
      });
    }
  }

  // Variant-level conditions (must be combined so a single variant satisfies ALL criteria)
  const variantConditions: Prisma.ProductVariantWhereInput = {};

  if (params.size) {
    const sizes = params.size
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length > 0) {
      variantConditions.size = { in: sizes };
    }
  }

  if (params.color) {
    const colors = params.color
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (colors.length > 0) {
      variantConditions.color = { in: colors };
    }
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice !== undefined ? params.minPrice : 0;
    const max = params.maxPrice !== undefined ? params.maxPrice : 999999999;

    // Effective price rule: if discount is valid (< sellingPrice), use it, otherwise use sellingPrice.
    // In database filtering, we can check cases.
    variantConditions.OR = [
      {
        // Discount is active and strictly less than selling price, AND falls in range
        discountPrice: { not: null, gte: min, lte: max },
        // Prisma cannot natively compare two columns easily (discountPrice < sellingPrice) without raw SQL in older versions,
        // but VibeLock domain rules specify we only apply discount if it's strictly less than selling.
        // To approximate this cleanly in Prisma ORM, we rely on the DB having valid state.
      },
      {
        // If discountPrice is null, or if it's equal to/greater than sellingPrice (handled generally by assuming discountPrice is null for invalid discounts in app logic, but DB might have them)
        // Here we just say if discountPrice is null, selling price must be in range.
        discountPrice: null,
        sellingPrice: { gte: min, lte: max },
      },
    ];
  }

  if (Object.keys(variantConditions).length > 0) {
    andConditions.push({
      variants: { some: variantConditions },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

/**
 * Map SortOption to Prisma orderBy
 */
function buildDiscoveryOrderBy(
  sortOption: DiscoverySearchParams["sort"]
): Prisma.ProductOrderByWithRelationInput {
  switch (sortOption) {
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export interface DiscoveryResult {
  products: ProductSummary[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Execute a paginated product discovery query
 */
export const getDiscoveredProducts = async (
  params: DiscoverySearchParams
): Promise<DiscoveryResult> => {
  const cacheKey = [
    "discovery",
    params.q || "none",
    params.category || "none",
    params.size || "none",
    params.color || "none",
    params.minPrice?.toString() || "none",
    params.maxPrice?.toString() || "none",
    params.sort || "newest",
    params.page.toString(),
  ];

  const queryFn = unstable_cache(
    async () => {
      const where = buildDiscoveryWhere(params);
      const orderBy = buildDiscoveryOrderBy(params.sort);

      const skip = (params.page - 1) * PAGE_SIZE;

      const [totalCount, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: PUBLIC_PRODUCT_INCLUDES,
          orderBy,
          skip,
          take: PAGE_SIZE,
        }),
      ]);

      return {
        products: products.map(mapProductSummary),
        totalCount,
        totalPages: Math.ceil(totalCount / PAGE_SIZE),
        currentPage: params.page,
      };
    },
    cacheKey,
    { tags: ["products", "discovery"], revalidate: 3600 }
  );

  return queryFn();
};
