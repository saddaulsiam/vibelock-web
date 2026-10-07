"use client";

import { useState, useMemo } from "react";
import { ProductVariantSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VariantSelectorProps {
  variants: ProductVariantSummary[];
  defaultPrice: number;
  defaultHasDiscount: boolean;
  defaultOriginalPrice: number | null;
}

export function VariantSelector({
  variants,
  defaultPrice,
  defaultHasDiscount,
  defaultOriginalPrice,
}: VariantSelectorProps) {
  // Extract unique sizes and colors
  const sizes = useMemo(() => {
    const s = new Set<string>();
    variants.forEach(v => v.size && s.add(v.size));
    return Array.from(s);
  }, [variants]);

  const colors = useMemo(() => {
    const c = new Set<string>();
    variants.forEach(v => v.color && c.add(v.color));
    return Array.from(c);
  }, [variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes.length > 0 ? sizes[0] : null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colors.length > 0 ? colors[0] : null);

  // Find the matching variant based on selections
  const matchingVariant = useMemo(() => {
    if (variants.length === 0) return null;
    
    // If product has no size/color, return the first variant
    if (sizes.length === 0 && colors.length === 0) return variants[0];

    return variants.find(
      (v) => 
        (sizes.length === 0 || v.size === selectedSize) && 
        (colors.length === 0 || v.color === selectedColor)
    ) || null;
  }, [variants, sizes, colors, selectedSize, selectedColor]);

  // Determine what prices to show
  const displayPrice = matchingVariant ? matchingVariant.effectivePrice : defaultPrice;
  const isDiscounted = matchingVariant 
    ? matchingVariant.discountPrice !== null 
    : defaultHasDiscount;
  const originalPrice = matchingVariant 
    ? matchingVariant.sellingPrice 
    : defaultOriginalPrice;

  // Determine availability
  const isAvailable = matchingVariant ? matchingVariant.available : false;
  // If no matching variant (impossible combination), it's unavailable
  const showAvailability = matchingVariant !== null;

  // Helper to check if a size/color combination actually exists
  const isCombinationAvailable = (size: string | null, color: string | null) => {
    return variants.some(
      (v) => 
        (size === null || v.size === size) && 
        (color === null || v.color === color)
    );
  };

  return (
    <div className="space-y-8">
      {/* Price Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold tracking-tight">৳{displayPrice.toLocaleString()}</span>
          {isDiscounted && originalPrice && (
            <span className="text-xl text-muted-foreground line-through mb-1">
              ৳{originalPrice.toLocaleString()}
            </span>
          )}
        </div>
        
        {showAvailability && (
          <div>
            {isAvailable ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                In Stock
              </Badge>
            ) : (
              <Badge variant="destructive">
                Out of Stock
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selectors */}
      <div className="space-y-6">
        {colors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Color</h3>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const exists = isCombinationAvailable(selectedSize, color);
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    disabled={!exists}
                    className={cn(
                      "px-4 py-2 border rounded-md text-sm font-medium transition-colors",
                      selectedColor === color 
                        ? "border-brand-charcoal bg-brand-charcoal text-white" 
                        : "border-gray-200 hover:border-gray-400 bg-white",
                      !exists && "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Size</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const exists = isCombinationAvailable(size, selectedColor);
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={!exists}
                    className={cn(
                      "min-w-[3rem] px-4 py-2 border rounded-md text-sm font-medium transition-colors",
                      selectedSize === size 
                        ? "border-brand-charcoal bg-brand-charcoal text-white" 
                        : "border-gray-200 hover:border-gray-400 bg-white",
                      !exists && "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Phase 3D Cart Placeholder */}
      <div className="pt-4 border-t">
        <button 
          disabled
          className="w-full py-4 rounded-xl font-bold uppercase tracking-wider bg-brand-charcoal text-white opacity-50 cursor-not-allowed"
        >
          {isAvailable ? "Add to Cart (Coming Soon)" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}
