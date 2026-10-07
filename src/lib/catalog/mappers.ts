import { Product, ProductImage, ProductVariant, Category } from "@prisma/client";
import {
  ProductSummary,
  ProductDetail,
  ProductVariantSummary,
  CategorySummary,
  ProductImageSummary,
} from "./types";

type PrismaVariantWithInventory = ProductVariant & {
  inventoryTransactions?: { quantity: number }[];
  inventoryReservations?: { quantity: number; expiresAt: Date }[];
};

type PrismaProductWithIncludes = Product & {
  images: ProductImage[];
  variants: PrismaVariantWithInventory[];
  categories: Category[];
};

export function mapCategory(category: Category): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

export function mapImage(image: ProductImage): ProductImageSummary {
  return {
    url: image.url,
    alt: image.alt,
    isPrimary: image.isPrimary,
  };
}

export function mapVariant(variant: PrismaVariantWithInventory): ProductVariantSummary {
  const sellingPrice = Number(variant.sellingPrice);
  let discountPrice = variant.discountPrice ? Number(variant.discountPrice) : null;

  // Ensure discount price is logically valid (cannot be greater than or equal to selling price)
  if (discountPrice !== null && discountPrice >= sellingPrice) {
    discountPrice = null;
  }

  const effectivePrice = discountPrice !== null ? discountPrice : sellingPrice;

  let available = true; // Default to true if inventory info is missing

  if (variant.inventoryTransactions && variant.inventoryReservations) {
    const totalStock = variant.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0);

    // Only count reservations that have not yet expired
    const now = new Date();
    const reserved = variant.inventoryReservations.reduce((sum, r) => {
      if (r.expiresAt > now) {
        return sum + r.quantity;
      }
      return sum;
    }, 0);

    available = totalStock - reserved > 0;
  }

  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    sellingPrice,
    discountPrice,
    effectivePrice,
    available,
  };
}

export function mapProductSummary(product: PrismaProductWithIncludes): ProductSummary {
  const mappedVariants = product.variants.map(mapVariant);
  const minPrice = Math.min(...mappedVariants.map((v) => v.effectivePrice));
  const maxPrice = Math.max(...mappedVariants.map((v) => v.effectivePrice));
  const hasDiscount = mappedVariants.some((v) => v.discountPrice !== null);
  const available = mappedVariants.some((v) => v.available);

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0] || null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    primaryImage: primaryImage ? mapImage(primaryImage) : null,
    minPrice: mappedVariants.length > 0 ? minPrice : 0,
    maxPrice: mappedVariants.length > 0 ? maxPrice : 0,
    hasDiscount,
    categories: product.categories.map(mapCategory),
    available,
  };
}

export function mapProductDetail(product: PrismaProductWithIncludes): ProductDetail {
  const summary = mapProductSummary(product);

  return {
    ...summary,
    images: product.images.map(mapImage),
    variants: product.variants.map(mapVariant),
  };
}
