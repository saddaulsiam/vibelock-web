import { ProductStatus } from "@prisma/client";

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  parentId?: string | null;
}

export interface ProductImageSummary {
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface ProductVariantSummary {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  sellingPrice: number;
  discountPrice: number | null;
  effectivePrice: number;
  available: boolean;
  stock?: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  isFeatured?: boolean;
  primaryImage: ProductImageSummary | null;
  secondaryImage?: ProductImageSummary | null;
  images?: ProductImageSummary[];
  minPrice: number; // Lowest effective price among variants
  maxPrice: number;
  hasDiscount: boolean;
  categories: CategorySummary[];
  available: boolean;
  badgeLabel?: string | null;
  badgeVariant?: "default" | "sale" | "new" | "featured" | "hot" | null;
  badge?: {
    label: string;
    variant: "default" | "sale" | "new" | "featured" | "hot";
  };
}

export interface ProductDetail extends ProductSummary {
  specifications?: unknown | null;
  images: ProductImageSummary[];
  variants: ProductVariantSummary[];
}
