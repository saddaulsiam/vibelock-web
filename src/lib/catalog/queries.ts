import "server-only";
import prisma from "@/lib/prisma/client";
import { mapProductSummary, mapProductDetail, mapCategory } from "./mappers";
import { ProductSummary, ProductDetail, CategorySummary } from "./types";
import { unstable_cache } from "next/cache";
import { InventoryTransactionType, ProductStatus } from "@prisma/client";

class EmptyPublishedProductsError extends Error {}
class EmptyCategoriesError extends Error {}

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
 * Get all published products (e.g. for new arrivals, category grids)
 */
export const getPublishedProducts = async (options?: {
  categorySlug?: string;
  take?: number;
}): Promise<ProductSummary[]> => {
  const cacheKey = [
    "published-products-v2",
    options?.categorySlug || "all",
    options?.take ? options.take.toString() : "all",
  ];

  const queryFn = unstable_cache(
    async () => {
      const products = await prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
          ...(options?.categorySlug && {
            categories: { some: { slug: options.categorySlug } },
          }),
        },
        include: PUBLIC_PRODUCT_INCLUDES,
        orderBy: { createdAt: "desc" },
        take: options?.take,
      });

      // Do not persist an empty catalog snapshot. Products can be added by the
      // seed/admin workflow without running inside a Next.js request that can
      // invalidate this tag. A later request should see the newly published data.
      if (products.length === 0) {
        throw new EmptyPublishedProductsError();
      }

      return products.map(mapProductSummary);
    },
    cacheKey,
    { tags: ["products"], revalidate: 120 }
  );

  try {
    return await queryFn();
  } catch (error) {
    if (error instanceof EmptyPublishedProductsError) return [];
    throw error;
  }
};

/**
 * Get a specific published product by slug
 */
export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.PUBLISHED,
      },
      include: PUBLIC_PRODUCT_INCLUDES,
    });

    if (!product) return null;
    return mapProductDetail(product);
  },
  ["product-by-slug"],
  { tags: ["products"], revalidate: 120 }
);

/**
 * Get all active/public categories
 * Currently, there is no "status" on Category, so we assume all categories are public.
 * If a category should be hidden when empty, we can filter it.
 */
export const getCategories = async (): Promise<CategorySummary[]> => {
  const queryFn = unstable_cache(
    async (): Promise<CategorySummary[]> => {
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
      });

      // As with the published catalog, an empty result may predate data being
      // seeded. Avoid persisting that negative result across requests.
      if (categories.length === 0) {
        throw new EmptyCategoriesError();
      }

      return categories.map(mapCategory);
    },
    ["all-categories-v2"],
    { tags: ["categories"], revalidate: 3600 }
  );

  try {
    return await queryFn();
  } catch (error) {
    if (error instanceof EmptyCategoriesError) return [];
    throw error;
  }
};

export const getCatalogFilterOptions = async (): Promise<{ sizes: string[]; colors: string[] }> => {
  const queryFn = unstable_cache(
    async () => {
      const [sizes, colors] = await Promise.all([
        prisma.productVariant.findMany({
          where: { product: { status: ProductStatus.PUBLISHED }, size: { not: null } },
          select: { size: true },
          distinct: ["size"],
          orderBy: { size: "asc" },
        }),
        prisma.productVariant.findMany({
          where: { product: { status: ProductStatus.PUBLISHED }, color: { not: null } },
          select: { color: true },
          distinct: ["color"],
          orderBy: { color: "asc" },
        }),
      ]);

      return {
        sizes: sizes.flatMap((variant) => (variant.size ? [variant.size] : [])),
        colors: colors.flatMap((variant) => (variant.color ? [variant.color] : [])),
      };
    },
    ["catalog-filter-options"],
    { tags: ["products"], revalidate: 120 }
  );

  return queryFn();
};

/**
 * Get a specific category by slug
 */
export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<CategorySummary | null> => {
    const category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) return null;
    return mapCategory(category);
  },
  ["category-by-slug"],
  { tags: ["categories"], revalidate: 3600 }
);

/**
 * Get best-selling published products ranked by total units sold.
 * Uses InventoryTransaction (type=SALE) records to count sold units per product.
 * Falls back to the most-recently-published products when no sale data exists yet.
 */
export const getBestSellingProducts = async (options?: {
  take?: number;
}): Promise<ProductSummary[]> => {
  const take = options?.take ?? 8;

  const queryFn = unstable_cache(
    async () => {
      // Group SALE transactions by variantId and sum absolute quantities sold
      const saleTotals = await prisma.inventoryTransaction.groupBy({
        by: ["variantId"],
        where: { type: InventoryTransactionType.SALE },
        _sum: { quantity: true },
      });

      // Map variantId → productId
      if (saleTotals.length > 0) {
        const variantIds = saleTotals.map((s) => s.variantId);

        const variants = await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, productId: true },
        });

        // Aggregate sold units per productId (SALE quantities are negative)
        const soldByProduct = new Map<string, number>();
        for (const s of saleTotals) {
          const variant = variants.find((v) => v.id === s.variantId);
          if (!variant) continue;
          const units = Math.abs(s._sum.quantity ?? 0);
          soldByProduct.set(variant.productId, (soldByProduct.get(variant.productId) ?? 0) + units);
        }

        // Sort productIds by sold units desc and take top N
        const topProductIds = [...soldByProduct.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, take)
          .map(([id]) => id);

        if (topProductIds.length > 0) {
          const products = await prisma.product.findMany({
            where: {
              id: { in: topProductIds },
              status: ProductStatus.PUBLISHED,
            },
            include: PUBLIC_PRODUCT_INCLUDES,
          });

          // Re-sort by sold-unit rank
          const sorted = topProductIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined);

          return sorted.map(mapProductSummary);
        }
      }

      // Fallback: no sale data yet — return most recently published
      const fallbackProducts = await prisma.product.findMany({
        where: { status: ProductStatus.PUBLISHED },
        include: PUBLIC_PRODUCT_INCLUDES,
        orderBy: { createdAt: "desc" },
        take,
      });

      return fallbackProducts.map(mapProductSummary);
    },
    ["best-selling-products-v1", take.toString()],
    { tags: ["products"], revalidate: 300 }
  );

  return queryFn();
};
