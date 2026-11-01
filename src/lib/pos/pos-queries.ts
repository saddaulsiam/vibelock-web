import prisma from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";
import type { PosCategory, PosProductSummary, PosProductVariant } from "./pos-types";

/**
 * Fetches all active categories for POS quick-filter tabs.
 */
export async function getPosCategories(): Promise<PosCategory[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching POS categories:", error);
    return [];
  }
}

/**
 * Fetches published products with live variant stock for the POS counter grid.
 */
export async function getPosCatalog(options?: {
  categoryId?: string;
  search?: string;
}): Promise<PosProductSummary[]> {
  try {
    const now = new Date();
    const where: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
    };

    if (options?.categoryId && options.categoryId !== "all") {
      where.categories = {
        some: { id: options.categoryId },
      };
    }

    if (options?.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        categories: {
          select: { id: true, name: true },
        },
        variants: {
          include: {
            inventoryTransactions: { select: { quantity: true } },
            inventoryReservations: {
              where: {
                status: "RESERVED",
                expiresAt: { gt: now },
              },
              select: { quantity: true },
            },
          },
        },
      },
      take: 100, // Safe batch limit for fast touch interaction
    });

    return products.map((prod) => {
      const primaryImage = prod.images[0]?.url ?? null;
      const variants: PosProductVariant[] = prod.variants.map((v) => {
        const totalStock = v.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
        const reservedStock = v.inventoryReservations.reduce((sum, r) => sum + r.quantity, 0);
        const availableStock = Math.max(0, totalStock - reservedStock);

        const sellingPrice = Number(v.sellingPrice);
        let discountPrice = v.discountPrice ? Number(v.discountPrice) : null;
        if (discountPrice !== null && discountPrice >= sellingPrice) {
          discountPrice = null;
        }
        const effectivePrice = discountPrice !== null ? discountPrice : sellingPrice;

        return {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          costPrice: Number(v.costPrice),
          sellingPrice,
          discountPrice,
          effectivePrice,
          availableStock,
        };
      });

      const effectivePrices = variants.map((v) => v.effectivePrice);
      const minPrice = effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0;
      const maxPrice = effectivePrices.length > 0 ? Math.max(...effectivePrices) : 0;
      const totalAvailableStock = variants.reduce((sum, v) => sum + v.availableStock, 0);

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        imageUrl: primaryImage,
        categoryIds: prod.categories.map((c) => c.id),
        categoryNames: prod.categories.map((c) => c.name),
        variants,
        minPrice,
        maxPrice,
        totalAvailableStock,
      };
    });
  } catch (error) {
    console.error("Error fetching POS catalog:", error);
    return [];
  }
}

/**
 * Rapid SKU/Barcode lookup for barcode scanner hardware and instant input.
 */
export async function searchPosProductByBarcodeOrSku(
  term: string
): Promise<{
  product: PosProductSummary;
  matchedVariant: PosProductVariant;
} | null> {
  const cleaned = term.trim();
  if (!cleaned) return null;

  try {
    const now = new Date();
    // 1. Find variant by exact SKU (case-insensitive)
    const variant = await prisma.productVariant.findFirst({
      where: {
        sku: { equals: cleaned, mode: "insensitive" },
      },
      include: {
        inventoryTransactions: { select: { quantity: true } },
        inventoryReservations: {
          where: {
            status: "RESERVED",
            expiresAt: { gt: now },
          },
          select: { quantity: true },
        },
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            categories: { select: { id: true, name: true } },
            variants: {
              include: {
                inventoryTransactions: { select: { quantity: true } },
                inventoryReservations: {
                  where: {
                    status: "RESERVED",
                    expiresAt: { gt: now },
                  },
                  select: { quantity: true },
                },
              },
            },
          },
        },
      },
    });

    if (!variant || !variant.product || variant.product.status !== "PUBLISHED") {
      return null;
    }

    const prod = variant.product;
    const primaryImage = prod.images[0]?.url ?? null;

    const mappedVariants: PosProductVariant[] = prod.variants.map((v) => {
      const totalStock = v.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
      const reservedStock = v.inventoryReservations.reduce((sum, r) => sum + r.quantity, 0);
      const availableStock = Math.max(0, totalStock - reservedStock);

      const sellingPrice = Number(v.sellingPrice);
      let discountPrice = v.discountPrice ? Number(v.discountPrice) : null;
      if (discountPrice !== null && discountPrice >= sellingPrice) {
        discountPrice = null;
      }
      const effectivePrice = discountPrice !== null ? discountPrice : sellingPrice;

      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        costPrice: Number(v.costPrice),
        sellingPrice,
        discountPrice,
        effectivePrice,
        availableStock,
      };
    });

    const matched = mappedVariants.find((v) => v.id === variant.id);
    if (!matched) return null;

    const effectivePrices = mappedVariants.map((v) => v.effectivePrice);
    const minPrice = effectivePrices.length > 0 ? Math.min(...effectivePrices) : 0;
    const maxPrice = effectivePrices.length > 0 ? Math.max(...effectivePrices) : 0;
    const totalAvailableStock = mappedVariants.reduce((sum, v) => sum + v.availableStock, 0);

    const productSummary: PosProductSummary = {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      imageUrl: primaryImage,
      categoryIds: prod.categories.map((c) => c.id),
      categoryNames: prod.categories.map((c) => c.name),
      variants: mappedVariants,
      minPrice,
      maxPrice,
      totalAvailableStock,
    };

    return {
      product: productSummary,
      matchedVariant: matched,
    };
  } catch (error) {
    console.error("Error searching POS barcode:", error);
    return null;
  }
}
