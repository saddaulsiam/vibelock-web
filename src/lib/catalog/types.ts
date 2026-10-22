import { ProductStatus } from "@prisma/client";

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
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
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  primaryImage: ProductImageSummary | null;
  minPrice: number; // Lowest effective price among variants
  maxPrice: number;
  hasDiscount: boolean;
  categories: CategorySummary[];
  available: boolean;
}

export interface ProductDetail extends ProductSummary {
  images: ProductImageSummary[];
  variants: ProductVariantSummary[];
}
