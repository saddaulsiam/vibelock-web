"use client";

import type { ProductSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  subscribeWishlist,
  toggleWishlistSlug,
} from "@/lib/wishlist";
import { Heart, ImageOff, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Price } from "./price";
import { ProductBadge } from "./product-badge";

export interface CustomProductCardItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image: string;
  secondaryImage?: string;
  category?: string;
  badge?: {
    label: string;
    variant: "default" | "sale" | "new" | "featured";
  };
  rating?: number;
  reviewCount?: number;
}

export type ProductCardItem = ProductSummary | CustomProductCardItem;

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  product: ProductCardItem;
  badge?: {
    label: string;
    variant: "default" | "sale" | "new" | "featured";
  };
}

export function toCardProduct(
  product: ProductCardItem,
  overrideBadge?: { label: string; variant: "default" | "sale" | "new" | "featured" }
): CustomProductCardItem {
  if ("minPrice" in product) {
    const primaryCategory = product.categories?.[0]?.name
      ? product.categories[0].name.replace(/^\d+[.\s-]+/, "").trim()
      : undefined;

    const secondaryImage =
      product.secondaryImage?.url ??
      ("images" in product &&
      Array.isArray((product as { images?: { url: string; isPrimary?: boolean }[] }).images)
        ? ((product as { images?: { url: string; isPrimary?: boolean }[] }).images?.find(
            (img) => !img.isPrimary && img.url !== product.primaryImage?.url
          )?.url ?? (product as { images?: { url: string }[] }).images?.[1]?.url)
        : undefined);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.minPrice,
      originalPrice: product.hasDiscount ? product.maxPrice : undefined,
      image: product.primaryImage?.url ?? "",
      secondaryImage,
      category: primaryCategory,
      badge:
        overrideBadge ??
        (product.hasDiscount
          ? { label: "Sale", variant: "sale" as const }
          : product.isFeatured
            ? { label: "Featured", variant: "featured" as const }
            : undefined),
    };
  }

  return {
    ...product,
    badge: overrideBadge ?? product.badge,
  };
}

export function ProductCard({ product, badge, className, ...props }: ProductCardProps) {
  const item = React.useMemo(() => toCardProduct(product, badge), [product, badge]);

  const [failedImage, setFailedImage] = React.useState<string | null>(null);
  const hasImage = Boolean(item.image) && failedImage !== item.image;
  const hasSecondaryImage = Boolean(item.secondaryImage) && failedImage !== item.secondaryImage;

  const discountPercent =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  const rawWishlist = React.useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const isWishlisted = React.useMemo(() => {
    try {
      const list = JSON.parse(rawWishlist);
      return Array.isArray(list) && list.includes(item.slug);
    } catch {
      return false;
    }
  }, [rawWishlist, item.slug]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isNowAdded = toggleWishlistSlug(item.slug);
    if (isNowAdded) {
      toast.success(`Saved "${item.name}" to wishlist`);
    } else {
      toast.info(`Removed "${item.name}" from wishlist`);
    }
  };

  return (
    <div className={cn("group relative flex flex-col", className)} {...props}>
      {/* ── Image Canvas ── */}
      <Link
        href={`/products/${item.slug}`}
        aria-label={`View ${item.name}`}
        className="focus-visible:ring-vl-cyan relative block overflow-hidden bg-[#f2f2f2] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        style={{ aspectRatio: "2 / 3" }}
      >
        {hasImage ? (
          <>
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className={cn(
                "object-cover object-center transition-all duration-500 ease-out group-hover:scale-105",
                hasSecondaryImage && "group-hover:opacity-0"
              )}
              onError={() => setFailedImage(item.image)}
            />
            {hasSecondaryImage && (
              <Image
                src={item.secondaryImage!}
                alt={`${item.name} alternate view`}
                fill
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover object-center opacity-0 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageOff className="size-8 text-[#101114]/20" aria-hidden="true" />
            <span className="text-[11px] font-medium text-[#101114]/40">No image</span>
          </span>
        )}

        {/* ── Badge (Top-Left) ── */}
        <div className="pointer-events-none absolute top-0 left-0 z-10 flex flex-col items-start gap-1">
          {item.badge && <ProductBadge label={item.badge.label} variant={item.badge.variant} />}
          {discountPercent !== null && discountPercent > 0 && item.badge?.variant !== "sale" && (
            <ProductBadge label={`-${discountPercent}%`} variant="sale" />
          )}
        </div>

        {/* ── Wishlist Button (Top-Right) ── */}
        <button
          type="button"
          aria-label={
            isWishlisted ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`
          }
          onClick={handleWishlistToggle}
          className={cn(
            "focus-visible:ring-vl-cyan absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none",
            isWishlisted ? "text-rose-500" : "text-[#101114]/30 hover:text-rose-500"
          )}
        >
          <Heart
            className={cn(
              "size-4 transition-all duration-200",
              isWishlisted && "fill-rose-500 text-rose-500"
            )}
            aria-hidden="true"
          />
        </button>
      </Link>

      {/* ── Product Info ── */}
      <div className="pt-2.5">
        {/* Category */}
        {item.category && (
          <span className="text-muted-foreground block truncate text-[10px] font-semibold tracking-widest uppercase">
            {item.category}
          </span>
        )}

        {/* Product Name */}
        <Link
          href={`/products/${item.slug}`}
          title={item.name}
          className="mt-0.5 line-clamp-2 block text-[13px] leading-snug font-bold text-[#101114] transition-colors hover:text-[#101114]/70"
        >
          {item.name}
        </Link>

        {/* Price Row */}
        <div className="mt-1 flex items-baseline gap-2">
          <Price
            amount={item.price}
            originalAmount={item.originalPrice}
            className="text-[13px] font-bold text-[#101114]"
          />
          {item.rating && item.rating > 0 ? (
            <span className="ml-auto flex items-center gap-0.5 text-[11px] text-[#101114]/50">
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {item.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
