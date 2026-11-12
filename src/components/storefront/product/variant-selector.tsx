"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const MAX_QUANTITY = 10;

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
  if (c.includes("black")) return "bg-vl-dark-900 ring-1 ring-black/10";
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
  const [quantity, setQuantity] = useState(1);

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
    <div className="space-y-6 sm:space-y-7">
      {/* ── 1. Price Block & Stock Status ── */}
      <div aria-live="polite" className="space-y-2">
        {matchingVariant ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-heading text-3xl font-black tracking-tight text-vl-dark-900 sm:text-4xl">
              {formatPrice(matchingVariant.effectivePrice)}
            </span>
            {discount && (
              <>
                <span className="text-base sm:text-lg text-vl-dark-900/40 line-through">
                  {formatPrice(matchingVariant.sellingPrice)}
                </span>
                <Badge variant="cyan" size="sm" className="font-bold">
                  Save {discountPercent}%
                </Badge>
              </>
            )}
          </div>
        ) : (
          <p className="text-lg font-medium text-vl-dark-900/50">Price unavailable</p>
        )}

        {/* Live Stock Signal */}
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              In Stock (Ready for Dispatch)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
              <span className="size-2 rounded-full bg-rose-500" />
              {productAvailable ? "Selected variant out of stock" : "Currently Unavailable"}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Color Selection ── */}
      {colors.length > 0 && (
        <fieldset className="space-y-2.5">
          <legend className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
            Color: <span className="font-bold text-vl-cyan-dark">{selectedColor || "Select"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
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
                  className={`group relative flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none cursor-pointer ${
                    selected
                      ? "border-vl-dark-900 bg-vl-dark-900 text-white shadow-2xs"
                      : "border-vl-dark-900/20 bg-white text-vl-dark-900 hover:border-vl-dark-900"
                  } disabled:border-dashed disabled:text-vl-dark-900/35 disabled:cursor-not-allowed disabled:bg-vl-white-300/60 disabled:opacity-60`}
                >
                  <span className={`size-3 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
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
        <fieldset className="space-y-2.5">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
              Size: <span className="font-bold text-vl-cyan-dark">{selectedSize || "Select"}</span>
            </legend>
            <SizeGuideModal />
          </div>

          <div className="flex flex-wrap gap-2">
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
                  className={`flex min-h-11 min-w-12 items-center justify-center rounded-xl border px-4 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none cursor-pointer ${
                    selected
                      ? "border-vl-dark-900 bg-vl-dark-900 text-white shadow-2xs"
                      : "border-vl-dark-900/20 bg-white text-vl-dark-900 hover:border-vl-dark-900"
                  } disabled:border-dashed disabled:text-vl-dark-900/35 disabled:line-through disabled:cursor-not-allowed disabled:bg-vl-white-300/60 disabled:opacity-60`}
                >
                  {size}
                  {!available && <span className="sr-only">, unavailable</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── 4. Quantity & Action Buttons ── */}
      <div className="space-y-4 border-t border-vl-dark-900/10 pt-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="product-quantity"
            className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase"
          >
            Quantity
          </label>
          <div className="flex h-10 w-32 items-center rounded-xl border border-vl-dark-900/20 bg-white shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="size-9 rounded-l-xl hover:bg-vl-white-300 focus-visible:ring-2 focus-visible:ring-vl-cyan"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <Input
              id="product-quantity"
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= MAX_QUANTITY) {
                  setQuantity(value);
                }
              }}
              variant="brand"
              size="sm"
              className="h-full w-14 border-0 bg-transparent p-0 text-center font-mono text-xs font-bold shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))}
              disabled={quantity >= MAX_QUANTITY}
              aria-label="Increase quantity"
              className="size-9 rounded-r-xl hover:bg-vl-white-300 focus-visible:ring-2 focus-visible:ring-vl-cyan"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Action Button Row 1: Add to Cart + Wishlist + Share */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex-1 min-w-0">
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
