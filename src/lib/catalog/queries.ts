import "server-only";
import prisma from "@/lib/prisma/client";
import { mapProductSummary, mapProductDetail, mapCategory } from "./mappers";
import { ProductSummary, ProductDetail, CategorySummary } from "./types";
import { unstable_cache } from "next/cache";
import { ProductStatus } from "@prisma/client";

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
    "published-products",
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

      return products.map(mapProductSummary);
    },
    cacheKey,
    { tags: ["products"], revalidate: 3600 }
  );

  return queryFn();
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
export const getCategories = unstable_cache(
  async (): Promise<CategorySummary[]> => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return categories.map(mapCategory);
  },
  ["all-categories"],
  { tags: ["categories"], revalidate: 3600 }
);

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
