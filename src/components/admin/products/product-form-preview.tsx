"use client";

import {
  ProductBadge,
  type ProductBadgeProps,
} from "@/components/storefront/catalog/product-badge";
import { Eye, Heart, ImageOff } from "lucide-react";
import Image from "next/image";

export const COLOR_HEX: Record<string, string> = {
  black: "#101114",
  white: "#FFFFFF",
  grey: "#6B7280",
  gray: "#6B7280",
  navy: "#1E3A8A",
  blue: "#2563EB",
  red: "#DC2626",
  olive: "#556B2F",
  beige: "#F5F5DC",
  brown: "#8B4513",
  green: "#16A34A",
  yellow: "#EAB308",
  purple: "#9333EA",
  pink: "#EC4899",
  orange: "#EA580C",
  charcoal: "#262626",
  maroon: "#800000",
};

export interface ProductFormPreviewProps {
  name: string;
  primaryImageUrl?: string;
  secondaryImageUrl?: string;
  previewSelling: string;
  previewDiscount: string;
  hasDiscount: boolean;
  discountPercent: number;
  totalStockCount: number;
  selectedSizes: string[];
  selectedColors: string[];
  categoryName?: string;
  customBadgeLabel?: string;
  customBadgeVariant?: string;
}

export function ProductFormPreview({
  name,
  primaryImageUrl,
  secondaryImageUrl,
  previewSelling,
  previewDiscount,
  hasDiscount,
  discountPercent,
  totalStockCount,
  selectedSizes,
  selectedColors,
  categoryName = "STREETWEAR",
  customBadgeLabel,
  customBadgeVariant,
}: ProductFormPreviewProps) {
  return (
    <div className="border-vl-dark-900/15 overflow-hidden rounded-md border bg-white shadow-xs">
      <div className="border-vl-dark-900/10 bg-vl-white-100 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Eye className="text-vl-dark-900 size-4" />
          <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            Live Storefront Card Preview
          </span>
          <span className="text-muted-foreground text-[11px]">
            3:4 portrait aspect ratio (matches storefront catalog)
          </span>
        </div>
      </div>

      <div className="bg-vl-white-100 flex justify-center p-4 sm:p-6">
        {/* ── Product Card Canvas matching product-card.tsx ── */}
        <div className="group border-vl-dark-900/15 relative flex w-full max-w-67.5 flex-col overflow-hidden rounded-sm border bg-white p-3 shadow-xs transition-all hover:shadow-md">
          {/* ── Image Canvas with 3:4 Aspect Ratio ── */}
          <div
            className="bg-vl-white-300 relative block w-full overflow-hidden"
            style={{ aspectRatio: "3 / 4" }}
          >
            {primaryImageUrl ? (
              <>
                <Image
                  src={primaryImageUrl}
                  alt={name || "Product image preview"}
                  fill
                  sizes="270px"
                  className={`object-cover object-center transition-all duration-500 ease-out group-hover:scale-105 ${
                    secondaryImageUrl ? "group-hover:opacity-0" : ""
                  }`}
                  unoptimized
                />
                {secondaryImageUrl && (
                  <Image
                    src={secondaryImageUrl}
                    alt={`${name || "Product"} alternate view`}
                    fill
                    sizes="270px"
                    className="object-cover object-center opacity-0 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
                    unoptimized
                  />
                )}
              </>
            ) : (
              <div className="from-vl-white-200 via-vl-white-200 to-vl-white-300 absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b p-4 text-center">
                <div className="border-vl-dark-900/10 flex size-11 items-center justify-center rounded-full border bg-white shadow-2xs">
                  <ImageOff className="text-vl-dark-900/35 size-5" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-vl-dark-900/60 block font-mono text-[11px] font-bold tracking-wider uppercase">
                    Awaiting Media
                  </span>
                  <span className="text-vl-dark-900/40 mt-0.5 block text-[10px] leading-tight">
                    Add photos to view live storefront card lookbook
                  </span>
                </div>
              </div>
            )}

            {/* ── Badge (Top-Left) ── */}
            <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
              {customBadgeLabel ? (
                <ProductBadge
                  label={customBadgeLabel}
                  variant={(customBadgeVariant as ProductBadgeProps["variant"]) || "default"}
                />
              ) : null}
              {hasDiscount && discountPercent > 0 && (
                <ProductBadge label={`-${discountPercent}%`} variant="sale" />
              )}
            </div>

            {/* ── Wishlist Button Replica (Top-Right: Compact Frosted Glass Pill) ── */}
            <div className="text-vl-dark-900/75 absolute top-2 right-2 z-10 flex size-6.5 items-center justify-center rounded-full border border-black/10 bg-white/85 p-0 shadow-2xs backdrop-blur-md">
              <Heart className="size-3.5 stroke-[2.2]" />
            </div>
          </div>

          {/* ── Product Info ── */}
          <div className="space-y-1 pt-2.5">
            {/* Category */}
            <span className="text-muted-foreground block truncate text-[10px] font-semibold tracking-widest uppercase">
              {categoryName}
            </span>

            {/* Product Name */}
            <h4 className="text-vl-dark-900 line-clamp-2 block text-[13px] leading-snug font-bold">
              {name || "Untitled Streetwear Product"}
            </h4>

            {/* Price Row */}
            <div className="mt-1 flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-vl-dark-900 text-[13px] font-bold">৳{previewDiscount}</span>
                  <span className="text-muted-foreground text-xs line-through">
                    ৳{previewSelling}
                  </span>
                </>
              ) : (
                <span className="text-vl-dark-900 text-[13px] font-bold">
                  ৳{previewSelling || "0.00"}
                </span>
              )}
              {totalStockCount > 0 ? (
                <span className="ml-auto rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  {totalStockCount} in stock
                </span>
              ) : (
                <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                  Out of stock
                </span>
              )}
            </div>

            {/* Available sizes pills */}
            {selectedSizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1.5">
                {selectedSizes.map((s) => (
                  <span
                    key={s}
                    className="border-vl-dark-900/15 bg-vl-white-100 text-vl-dark-900 rounded border px-1.5 py-0.5 text-[9px] font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Available colors swatches */}
            {selectedColors.length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                {selectedColors.map((c) => {
                  const hex = COLOR_HEX[c.toLowerCase()] ?? "#9CA3AF";
                  const isLight =
                    hex.toLowerCase() === "#ffffff" ||
                    hex.toLowerCase() === "#f5f5dc" ||
                    hex.toLowerCase() === "#eab308";
                  return (
                    <span
                      key={c}
                      title={c}
                      className={`size-3 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
