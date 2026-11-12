"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ProductVariantSummary } from "@/lib/catalog/types";
import { AddToCartButton } from "./add-to-cart-button";
import { BuyNowButton } from "./buy-now-button";
import { ProductWishlistButton } from "./product-wishlist-button";
import { ProductShareButton } from "./product-share-button";
import { SizeGuideModal } from "./size-guide-modal";
import { ProductTrustBadges } from "./product-trust-badges";
import { ProductInfoAccordion } from "./product-info-accordion";

interface VariantSelectorProps {
  variants: ProductVariantSummary[];
  productAvailable: boolean;
  productSlug: string;
  productName: string;
  description: string | null;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Visual color dots for common streetwear palette names without arbitrary hex
function getColorDotClass(colorName: string): string {
  const c = colorName.toLowerCase().trim();
  if (c.includes("black")) return "bg-vl-dark-900 ring-1 ring-black/20";
  if (c.includes("white")) return "bg-white ring-1 ring-vl-dark-900/30";
  if (c.includes("grey") || c.includes("gray") || c.includes("ash")) return "bg-stone-400";
  if (c.includes("charcoal")) return "bg-stone-800";
  if (c.includes("navy")) return "bg-slate-900";
  if (c.includes("blue")) return "bg-blue-600";
  if (c.includes("beige") || c.includes("cream")) return "bg-stone-200 ring-1 ring-stone-300";
  if (c.includes("olive") || c.includes("army")) return "bg-stone-600";
  if (c.includes("green")) return "bg-emerald-700";
  if (c.includes("brown") || c.includes("chocolate") || c.includes("coffee")) return "bg-amber-950";
  if (c.includes("red") || c.includes("maroon") || c.includes("burgundy")) return "bg-rose-700";
  if (c.includes("cyan")) return "bg-vl-cyan-500";
  return "bg-vl-dark-400";
}

export function VariantSelector({
  variants,
  productAvailable,
  productSlug,
  productName,
  description,
}: VariantSelectorProps) {
  const sizes = useMemo(
    () => Array.from(new Set(variants.flatMap((variant) => (variant.size ? [variant.size] : [])))),
    [variants]
  );
  const colors = useMemo(
    () =>
      Array.from(new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))),
    [variants]
  );
  const initialVariant = variants.find((variant) => variant.available) ?? variants[0] ?? null;
  const [selectedSize, setSelectedSize] = useState<string | null>(initialVariant?.size ?? null);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialVariant?.color ?? null);
  const quantity = 1;

  const findVariant = (size: string | null, color: string | null) =>
    variants.find(
      (variant) =>
        variant.available &&
        (sizes.length === 0 || variant.size === size) &&
        (colors.length === 0 || variant.color === color)
    ) ??
    variants.find(
      (variant) =>
        (sizes.length === 0 || variant.size === size) &&
        (colors.length === 0 || variant.color === color)
    ) ??
    null;

  const matchingVariant = findVariant(selectedSize, selectedColor);
  const isAvailable = Boolean(matchingVariant?.available);

  const hasAvailableVariant = (size: string | null, color: string | null) =>
    variants.some(
      (variant) =>
        variant.available &&
        (sizes.length === 0 || variant.size === size) &&
        (colors.length === 0 || variant.color === color)
    );

  const selectSize = (size: string) => {
    setSelectedSize(size);
    const selectedColorAvailable = hasAvailableVariant(size, selectedColor);
    const availableVariant = variants.find((variant) => variant.available && variant.size === size);
    if (colors.length > 0 && !selectedColorAvailable && availableVariant) {
      setSelectedColor(availableVariant.color);
    }
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);
    const selectedSizeAvailable = hasAvailableVariant(selectedSize, color);
    const availableVariant = variants.find(
      (variant) => variant.available && variant.color === color
    );
    if (sizes.length > 0 && !selectedSizeAvailable && availableVariant) {
      setSelectedSize(availableVariant.size);
    }
  };

  const discount =
    matchingVariant?.discountPrice !== null && matchingVariant?.discountPrice !== undefined;
  const discountPercent =
    discount && matchingVariant
      ? Math.round((1 - matchingVariant.effectivePrice / matchingVariant.sellingPrice) * 100)
      : 0;

  return (
    <div className="space-y-5.5 sm:space-y-7">
      {/* ── 1. Price Block & Stock Status ── */}
      <div aria-live="polite" className="space-y-1">
        {matchingVariant ? (
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 sm:gap-x-3">
            <span className="font-heading text-vl-dark-900 text-2xl font-black tracking-tight md:text-3xl lg:text-4xl">
              {formatPrice(matchingVariant.effectivePrice)}
            </span>
            {discount && (
              <>
                <span className="text-vl-dark-900/40 text-xs font-medium line-through sm:text-sm lg:text-base">
                  {formatPrice(matchingVariant.sellingPrice)}
                </span>
                <Badge
                  variant="cyan"
                  size="sm"
                  className="h-4.5 rounded-xs px-1.5 text-[9px] font-black tracking-wider uppercase sm:h-5 sm:px-2 sm:text-[10px]"
                >
                  Save {discountPercent}%
                </Badge>
              </>
            )}
          </div>
        ) : (
          <p className="text-vl-dark-900/50 text-sm font-medium sm:text-base">Price unavailable</p>
        )}

        {/* Live Stock Signal */}
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 sm:text-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              In Stock (Ready for Dispatch)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 sm:text-xs">
              <span className="size-2 rounded-full bg-rose-500" />
              {productAvailable ? "Selected variant out of stock" : "Currently Unavailable"}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Color Selection ── */}
      {colors.length > 0 && (
        <fieldset className="space-y-1.5 sm:space-y-2">
          <legend className="text-vl-dark-900 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase sm:text-xs">
            <span>Color</span>
            <span className="text-vl-dark-900/30">•</span>
            <span className="text-vl-cyan-dark">{selectedColor || "Select"}</span>
          </legend>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {colors.map((color) => {
              const available = variants.some(
                (variant) => variant.available && variant.color === color
              );
              const selected = selectedColor === color;
              const dotClass = getColorDotClass(color);

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={`group focus-visible:ring-vl-cyan relative flex h-7.5 items-center gap-1.5 rounded-xs border px-2.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none sm:h-8 sm:gap-2 sm:px-3 sm:text-xs ${
                    selected
                      ? "border-vl-dark-900 bg-vl-dark-900 text-white shadow-xs"
                      : available
                        ? "border-vl-dark-900/15 text-vl-dark-900/80 hover:border-vl-dark-900 hover:text-vl-dark-900 bg-white"
                        : "border-vl-dark-900/10 bg-vl-white-300/40 text-vl-dark-900/35 cursor-not-allowed line-through"
                  }`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full sm:size-2.5 ${dotClass} ${
                      selected && color.toLowerCase().includes("black")
                        ? "ring-1 ring-white/60"
                        : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span>{color}</span>
                  {!available && <span className="sr-only">, unavailable</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── 3. Size Selection with Size Guide Trigger ── */}
      {sizes.length > 0 && (
        <fieldset className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <legend className="text-vl-dark-900 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase sm:text-xs">
              <span>Size</span>
              <span className="text-vl-dark-900/30">•</span>
              <span className="text-vl-cyan-dark">{selectedSize || "Select"}</span>
            </legend>
            <SizeGuideModal />
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {sizes.map((size) => {
              const available = variants.some(
                (variant) => variant.available && variant.size === size
              );
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => selectSize(size)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={`focus-visible:ring-vl-cyan flex h-8 min-w-8.5 items-center justify-center rounded-xs border px-2 font-mono text-[11px] font-bold tracking-wider uppercase transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none sm:h-8.5 sm:min-w-9 sm:px-2.5 sm:text-xs ${
                    selected
                      ? "border-vl-dark-900 bg-vl-dark-900 text-white shadow-xs"
                      : available
                        ? "border-vl-dark-900/15 text-vl-dark-900/80 hover:border-vl-dark-900 hover:text-vl-dark-900 bg-white"
                        : "border-vl-dark-900/10 bg-vl-white-300/40 text-vl-dark-900/35 cursor-not-allowed border-dashed line-through"
                  }`}
                >
                  <span>{size}</span>
                  {!available && <span className="sr-only">, unavailable</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── 4. Action Buttons ── */}
      <div className="border-vl-dark-900/10 space-y-2 border-t pt-3 sm:space-y-2.5 sm:pt-3.5">
        {/* Action Button Row 1: Add to Cart + Wishlist + Share */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <AddToCartButton
              variantId={matchingVariant?.id ?? null}
              quantity={quantity}
              isAvailable={isAvailable}
            />
          </div>
          <ProductWishlistButton productSlug={productSlug} productName={productName} />
          <ProductShareButton productName={productName} />
        </div>

        {/* Action Button Row 2: Instant Buy Now */}
        <BuyNowButton
          variantId={matchingVariant?.id ?? null}
          quantity={quantity}
          isAvailable={isAvailable}
        />
      </div>

      {/* ── 5. Trust Badges ── */}
      <ProductTrustBadges />

      {/* ── 6. Product Story & Specifications Accordion ── */}
      <ProductInfoAccordion description={description} productName={productName} />
    </div>
  );
}
