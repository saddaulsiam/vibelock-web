"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { ProductVariantSummary } from "@/lib/catalog/types";
import { AddToCartButton } from "./add-to-cart-button";

interface VariantSelectorProps {
  variants: ProductVariantSummary[];
  productAvailable: boolean;
}

const MAX_QUANTITY = 10;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function VariantSelector({ variants, productAvailable }: VariantSelectorProps) {
  const sizes = useMemo(
    () => Array.from(new Set(variants.flatMap((variant) => (variant.size ? [variant.size] : [])))),
    [variants]
  );
  const colors = useMemo(
    () => Array.from(new Set(variants.flatMap((variant) => (variant.color ? [variant.color] : [])))),
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
    const availableVariant = variants.find((variant) => variant.available && variant.color === color);
    if (sizes.length > 0 && !selectedSizeAvailable && availableVariant) {
      setSelectedSize(availableVariant.size);
    }
  };

  const discount =
    matchingVariant?.discountPrice !== null && matchingVariant?.discountPrice !== undefined;
  const discountPercent = discount && matchingVariant
    ? Math.round((1 - matchingVariant.effectivePrice / matchingVariant.sellingPrice) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <div aria-live="polite" className="space-y-2">
        {matchingVariant ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
              {formatPrice(matchingVariant.effectivePrice)}
            </span>
            {discount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(matchingVariant.sellingPrice)}
                </span>
                <span className="bg-[#00D9FF] px-2 py-1 text-xs font-semibold text-[#101114]">
                  {discountPercent}% off
                </span>
              </>
            )}
          </div>
        ) : (
          <p className="text-lg font-medium text-muted-foreground">Price unavailable</p>
        )}

        <p className={`text-sm font-medium ${isAvailable ? "text-emerald-700" : "text-muted-foreground"}`}>
          {isAvailable
            ? "In stock"
            : productAvailable
              ? "Choose an available option"
              : "Currently unavailable"}
        </p>
      </div>

      {colors.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Color</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const available = variants.some((variant) => variant.available && variant.color === color);
              const selected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={`min-h-11 rounded-sm border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 ${
                    selected
                      ? "border-[#101114] bg-[#101114] text-white"
                      : "border-[#101114]/20 bg-white text-[#101114] hover:border-[#101114]"
                  } disabled:cursor-not-allowed disabled:border-border disabled:bg-[#F3F0E8] disabled:text-muted-foreground disabled:opacity-60`}
                >
                  {color}
                  {!available && <span className="sr-only">, unavailable</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Size</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = variants.some((variant) => variant.available && variant.size === size);
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => selectSize(size)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={`min-h-11 min-w-12 rounded-sm border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 ${
                    selected
                      ? "border-[#101114] bg-[#101114] text-white"
                      : "border-[#101114]/20 bg-white text-[#101114] hover:border-[#101114]"
                  } disabled:cursor-not-allowed disabled:border-border disabled:bg-[#F3F0E8] disabled:text-muted-foreground disabled:opacity-60`}
                >
                  {size}
                  {!available && <span className="sr-only">, unavailable</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="space-y-3 border-t border-border pt-5">
        <label htmlFor="product-quantity" className="block text-sm font-semibold">Quantity</label>
        <div className="flex h-12 w-36 items-center border border-[#101114]/20">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D9FF]"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <input
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
            className="h-full w-12 border-0 bg-transparent p-0 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D9FF]"
          />
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))}
            disabled={quantity >= MAX_QUANTITY}
            aria-label="Increase quantity"
            className="inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00D9FF]"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        <AddToCartButton
          variantId={matchingVariant?.id ?? null}
          quantity={quantity}
          isAvailable={isAvailable}
        />
      </div>
    </div>
  );
}
