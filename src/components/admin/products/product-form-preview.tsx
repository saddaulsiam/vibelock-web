"use client";

import Image from "next/image";
import { Eye, Heart, ImageOff } from "lucide-react";

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
}: ProductFormPreviewProps) {
  return (
    <div className="border-vl-dark-900/15 overflow-hidden rounded-md border bg-white shadow-xs">
      <div className="border-vl-dark-900/10 bg-vl-white-100 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Eye className="text-vl-dark-900 size-4" />
          <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            Live Storefront Card Preview
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">
          2:3 portrait aspect ratio (matches storefront catalog)
        </span>
      </div>

      <div className="bg-vl-white-100 flex justify-center p-4 sm:p-6">
        {/* ── Product Card Canvas matching product-card.tsx ── */}
        <div className="group border-vl-dark-900/15 relative flex w-full max-w-67.5 flex-col overflow-hidden rounded-sm border bg-white p-3 shadow-xs transition-all hover:shadow-md">
          {/* ── Image Canvas with 2:3 Aspect Ratio ── */}
          <div
            className="bg-vl-white-300 relative block w-full overflow-hidden"
            style={{ aspectRatio: "2 / 3" }}
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
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <ImageOff className="text-vl-dark-900/20 size-8" aria-hidden="true" />
                <span className="text-vl-dark-900/40 text-[11px] font-medium">
                  No image uploaded
                </span>
              </span>
            )}

            {/* ── Badge (Top-Left) ── */}
            <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
              {hasDiscount && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* ── Wishlist Button Replica (Top-Right) ── */}
            <div className="text-vl-dark-900/50 absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/80 shadow-xs backdrop-blur-xs">
              <Heart className="size-4" />
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
