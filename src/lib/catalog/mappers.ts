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
    imageUrl: category.imageUrl,
    metaTitle: category.metaTitle ?? null,
    metaDescription: category.metaDescription ?? null,
    parentId: category.parentId ?? null,
    sortOrder: category.sortOrder ?? 0,
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
  let stock: number | undefined;

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

    stock = Math.max(0, totalStock - reserved);
    available = stock > 0;
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
    stock,
  };
}

export function mapProductSummary(product: PrismaProductWithIncludes): ProductSummary {
  const mappedVariants = product.variants.map(mapVariant);
  const minPrice = Math.min(...mappedVariants.map((v) => v.effectivePrice));
  const maxPrice = Math.max(...mappedVariants.map((v) => v.effectivePrice));
  const hasDiscount = mappedVariants.some((v) => v.discountPrice !== null);
  const originalPrice = hasDiscount
    ? Math.max(...mappedVariants.map((v) => v.sellingPrice))
    : undefined;
  const available = mappedVariants.some((v) => v.available);

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0] || null;
  const secondaryImage =
    product.images.find((img) => !img.isPrimary && img.url !== primaryImage?.url) ||
    (product.images.length > 1 && product.images[1] ? product.images[1] : null);

  const badgeLabel = (product as unknown as { badgeLabel?: string | null }).badgeLabel ?? null;
  const badgeVariant =
    (product as unknown as { badgeVariant?: "default" | "sale" | "new" | "featured" | "hot" | null })
      .badgeVariant ?? null;
  const badge = badgeLabel
    ? {
        label: badgeLabel,
        variant: badgeVariant || "default",
      }
    : undefined;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    isFeatured: Boolean((product as unknown as { isFeatured?: boolean }).isFeatured),
    badgeLabel,
    badgeVariant,
    badge,
    primaryImage: primaryImage ? mapImage(primaryImage) : null,
    secondaryImage: secondaryImage ? mapImage(secondaryImage) : null,
    images: product.images.map(mapImage),
    minPrice: mappedVariants.length > 0 ? minPrice : 0,
    maxPrice: mappedVariants.length > 0 ? maxPrice : 0,
    originalPrice,
    hasDiscount,
    categories: product.categories.map(mapCategory),
    available,
  };
}

export function mapProductDetail(product: PrismaProductWithIncludes): ProductDetail {
  const summary = mapProductSummary(product);

  return {
    ...summary,
    specifications:
      "specifications" in product && product.specifications
        ? (product.specifications as unknown as ProductDetail["specifications"])
        : null,
    images: product.images.map(mapImage),
    variants: product.variants.map(mapVariant),
  };
}
