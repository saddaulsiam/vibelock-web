import "server-only";
import prisma from "@/lib/prisma/client";
import { mapProductSummary, mapProductDetail, mapCategory } from "./mappers";
import { ProductSummary, ProductDetail, CategorySummary } from "./types";
import { unstable_cache } from "next/cache";
import { ProductStatus } from "@prisma/client";

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
    { tags: ["products"], revalidate: 3600 }
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
  { tags: ["products"], revalidate: 3600 }
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
    { tags: ["products"], revalidate: 3600 }
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
