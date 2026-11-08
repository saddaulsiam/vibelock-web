"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLOR_HEX } from "./product-form-preview";

export type VariantFormValue = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  costPrice: string;
  sellingPrice: string;
  discountPrice: string;
  stock: string;
  weight?: string;
};

export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const generateSku = (productIdentifier: string, size = "", color = "") => {
  const base = (slugify(productIdentifier) || "PROD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .slice(0, 14)
    .replace(/^-+|-+$/g, "");
  const colorCode = color
    ? color
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
    : "";
  const sizeCode = size
    ? size
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
    : "";
  const parts = [base, colorCode, sizeCode].filter(Boolean);
  return parts.length ? parts.join("-") : "PROD-VAR";
};

export const calculateProfitMargin = (
  costPrice: string,
  sellingPrice: string,
  discountPrice: string
) => {
  const cost = parseFloat(costPrice || "0");
  const selling = parseFloat(sellingPrice || "0");
  const discount = discountPrice ? parseFloat(discountPrice) : null;
  const effective = discount !== null && !isNaN(discount) ? discount : selling;

  if (isNaN(cost) || isNaN(effective) || effective <= 0) {
    return null;
  }

  const profit = effective - cost;
  const margin = (profit / effective) * 100;
  return {
    profit,
    margin,
    effective,
    cost,
    isLoss: profit < 0,
    isBreakEven: Math.abs(profit) < 0.01,
  };
};

export const newVariant = (
  size = "",
  color = "",
  base?: VariantFormValue,
  productIdentifier = ""
): VariantFormValue => ({
  sku: generateSku(productIdentifier, size, color),
  size,
  color,
  costPrice: base?.costPrice ?? "0.00",
  sellingPrice: base?.sellingPrice ?? "",
  discountPrice: base?.discountPrice ?? "",
  stock: base?.stock ?? "0",
  weight: base?.weight ?? "",
});

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Grey",
  "Navy",
  "Blue",
  "Red",
  "Olive",
  "Beige",
  "Brown",
];

export const comboKey = (size: string, color: string) =>
  `${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;

export interface ProductVariantGeneratorProps {
  variants: VariantFormValue[];
  setVariants: React.Dispatch<React.SetStateAction<VariantFormValue[]>>;
  selectedSizes: string[];
  setSelectedSizes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedColors: string[];
  setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>;
  productIdentifier: string;
  setIsDirty: (val: boolean) => void;
}

export function ProductVariantGenerator({
  variants,
  setVariants,
  selectedSizes,
  setSelectedSizes,
  selectedColors,
  setSelectedColors,
  productIdentifier,
  setIsDirty,
}: ProductVariantGeneratorProps) {
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");
  const [bulkSellingPrice, setBulkSellingPrice] = useState("");
  const [bulkDiscountPrice, setBulkDiscountPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkWeight, setBulkWeight] = useState("");

  const availableSizes = [...new Set([...SIZE_OPTIONS, ...selectedSizes])];
  const availableColors = [...new Set([...COLOR_OPTIONS, ...selectedColors])];

  const updateVariant = (index: number, field: keyof VariantFormValue, value: string) => {
    setIsDirty(true);
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant))
    );
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.error("A product must have at least one variant.");
      return;
    }
    setIsDirty(true);
    setVariants((current) => current.filter((_, i) => i !== index));
    toast.success("Variant removed from list.");
  };

  const rebuildVariants = (sizes: string[], colors: string[]) => {
    setIsDirty(true);
    const sizeAxis = sizes.length ? sizes : [""];
    const colorAxis = colors.length ? colors : [""];
    const currentKey = productIdentifier;
    const existingByCombo = new Map(
      variants.map((variant) => [comboKey(variant.size, variant.color), variant])
    );
    const legacyDefault = variants.find((variant) => !variant.size && !variant.color);
    const base = variants[0];
    const next: VariantFormValue[] = [];

    for (const size of sizeAxis) {
      for (const color of colorAxis) {
        const existing =
          existingByCombo.get(comboKey(size, color)) ??
          (next.length === 0 ? legacyDefault : undefined);
        if (existing) {
          const sku = existing.sku || generateSku(currentKey, size, color);
          next.push({ ...existing, size, color, sku });
        } else {
          next.push(newVariant(size, color, base, currentKey));
        }
      }
    }
    setVariants(next.length ? next : [newVariant("", "", base, currentKey)]);
  };

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((value) => value !== size)
      : [...selectedSizes, size];
    if ((next.length || 1) * (selectedColors.length || 1) > 100) {
      toast.error("A product can have at most 100 variants.");
      return;
    }
    setSelectedSizes(next);
    rebuildVariants(next, selectedColors);
  };

  const selectAllSizes = () => {
    const next = [...new Set([...selectedSizes, ...SIZE_OPTIONS])];
    if ((next.length || 1) * (selectedColors.length || 1) > 100) {
      toast.error("A product can have at most 100 variants.");
      return;
    }
    setSelectedSizes(next);
    rebuildVariants(next, selectedColors);
  };

  const clearSizes = () => {
    setSelectedSizes([]);
    rebuildVariants([], selectedColors);
  };

  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((value) => value !== color)
      : [...selectedColors, color];
    if ((selectedSizes.length || 1) * (next.length || 1) > 100) {
      toast.error("A product can have at most 100 variants.");
      return;
    }
    setSelectedColors(next);
    rebuildVariants(selectedSizes, next);
  };

  const clearColors = () => {
    setSelectedColors([]);
    rebuildVariants(selectedSizes, []);
  };

  const addCustomColor = () => {
    const color = customColor.trim();
    if (!color) return;
    const existing = availableColors.find((item) => item.toLowerCase() === color.toLowerCase());
    if (existing) {
      if (!selectedColors.includes(existing)) toggleColor(existing);
    } else if ((selectedSizes.length || 1) * (selectedColors.length + 1) <= 100) {
      const next = [...selectedColors, color];
      setSelectedColors(next);
      rebuildVariants(selectedSizes, next);
    } else {
      toast.error("A product can have at most 100 variants.");
    }
    setCustomColor("");
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    const existing = availableSizes.find((item) => item.toLowerCase() === size.toLowerCase());
    if (existing) {
      if (!selectedSizes.includes(existing)) toggleSize(existing);
    } else if ((selectedSizes.length + 1) * (selectedColors.length || 1) <= 100) {
      const next = [...selectedSizes, size];
      setSelectedSizes(next);
      rebuildVariants(next, selectedColors);
    } else {
      toast.error("A product can have at most 100 variants.");
    }
    setCustomSize("");
  };

  const handleApplyBulkValues = () => {
    if (
      !bulkCostPrice &&
      !bulkSellingPrice &&
      !bulkDiscountPrice &&
      bulkStock === "" &&
      bulkWeight === ""
    ) {
      toast.error("Enter at least one price, stock, or weight value to apply to all variants.");
      return;
    }
    setIsDirty(true);
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        ...(bulkCostPrice ? { costPrice: bulkCostPrice } : {}),
        ...(bulkSellingPrice ? { sellingPrice: bulkSellingPrice } : {}),
        ...(bulkDiscountPrice !== "" ? { discountPrice: bulkDiscountPrice } : {}),
        ...(bulkStock !== "" ? { stock: bulkStock } : {}),
        ...(bulkWeight !== "" ? { weight: bulkWeight } : {}),
      }))
    );
    toast.success(`Applied values across all ${variants.length} variant(s)!`);
  };

  const handleRegenerateAllSkus = () => {
    const key = productIdentifier;
    if (!key.trim()) {
      toast.error("Please enter a product name or slug first to generate SKUs.");
      return;
    }
    setIsDirty(true);
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        sku: generateSku(key, variant.size, variant.color),
      }))
    );
    toast.success(`Generated SKUs for all ${variants.length} variant(s)!`);
  };

  return (
    <div className="space-y-5 border border-vl-dark-900/10 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vl-dark-900/10 pb-4">
        <div>
          <h3 className="text-base font-semibold text-vl-dark-900">
            Variant Generator — Sizes, Colors, Stock &amp; Weight
          </h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Select sizes and colors to generate all combinations automatically. SKUs and profit
            margins calculate instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-vl-dark-900/15 bg-vl-white-100 px-3 py-1 text-xs font-semibold text-vl-dark-900">
            <span className="size-2 rounded-full bg-vl-dark-900" />
            {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
          </span>
        </div>
      </div>

      {/* Sizes Selection */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
            1. Select Sizes
          </label>
          <div className="flex items-center gap-2 text-xs">
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={selectAllSizes}
              className="h-auto p-0 font-medium text-vl-dark-900 underline underline-offset-2 hover:opacity-70"
            >
              Select standard sizes
            </Button>
            {selectedSizes.length > 0 && (
              <>
                <span className="text-vl-dark-900/30">·</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={clearSizes}
                  className="h-auto p-0 text-muted-foreground hover:text-red-600"
                >
                  Clear sizes
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <Button
                key={size}
                type="button"
                variant={isSelected ? "primary" : "outline"}
                size="sm"
                onClick={() => toggleSize(size)}
                className={`min-h-9 px-3 text-xs font-semibold ${
                  isSelected
                    ? "bg-vl-dark-900 text-white shadow-xs"
                    : "bg-white text-vl-dark-900 hover:bg-vl-white-100"
                }`}
              >
                {size}
              </Button>
            );
          })}
        </div>
        <div className="flex max-w-sm items-center gap-2 pt-1">
          <Input
            size="default"
            className="w-full text-xs"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSize();
              }
            }}
            placeholder="Add custom size (e.g. 42, 3XL)"
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={addCustomSize}
            className="shrink-0"
          >
            Add Size
          </Button>
        </div>
      </div>

      {/* Colors Selection */}
      <div className="space-y-2.5 border-t border-vl-dark-900/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
            2. Select Colors
          </label>
          {selectedColors.length > 0 && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={clearColors}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-red-600"
            >
              Clear colors
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => {
            const isSelected = selectedColors.includes(color);
            const hex = COLOR_HEX[color.toLowerCase()] ?? "#9CA3AF";
            const isLight =
              hex.toLowerCase() === "#ffffff" ||
              hex.toLowerCase() === "#f5f5dc" ||
              hex.toLowerCase() === "#eab308";
            return (
              <Button
                key={color}
                type="button"
                variant={isSelected ? "primary" : "outline"}
                size="sm"
                onClick={() => toggleColor(color)}
                className={`min-h-9 gap-2 px-3 text-xs font-semibold ${
                  isSelected
                    ? "bg-vl-dark-900 text-white shadow-xs"
                    : "bg-white text-vl-dark-900 hover:bg-vl-white-100"
                }`}
              >
                <span
                  className={`size-3 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                  style={{ backgroundColor: hex }}
                />
                <span>{color}</span>
              </Button>
            );
          })}
        </div>
        <div className="flex max-w-sm items-center gap-2 pt-1">
          <Input
            size="default"
            className="w-full text-xs"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomColor();
              }
            }}
            placeholder="Add custom color (e.g. Lavender)"
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={addCustomColor}
            className="shrink-0"
          >
            Add Color
          </Button>
        </div>
      </div>

      {/* BULK APPLICATOR BAR WITH WEIGHT */}
      <div className="space-y-3 rounded-md border border-vl-dark-900/15 bg-vl-white-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-vl-dark-900" />
            <p className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
              Quick Fill All Variants
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={handleRegenerateAllSkus}
              className="h-auto p-0 font-medium text-xs text-muted-foreground underline underline-offset-2 hover:text-vl-dark-900"
            >
              <RefreshCw className="size-3 text-vl-dark-900/60" />
              Regenerate all SKUs
            </Button>
            <span className="text-muted-foreground hidden text-xs sm:inline">·</span>
            <p className="text-muted-foreground hidden text-xs sm:inline">
              Apply common pricing, stock &amp; weight across all {variants.length} variant(s)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium">
              Cost Price (৳)
            </label>
            <div className="mt-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={bulkCostPrice}
                onChange={(e) => setBulkCostPrice(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium">
              Selling Price (৳) *
            </label>
            <div className="mt-1">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={bulkSellingPrice}
                onChange={(e) => setBulkSellingPrice(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium">
              Discount Price (৳)
            </label>
            <div className="mt-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={bulkDiscountPrice}
                onChange={(e) => setBulkDiscountPrice(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium">
              Initial Stock (Qty)
            </label>
            <div className="mt-1">
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium">
              Weight (kg)
            </label>
            <div className="mt-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 0.40"
                value={bulkWeight}
                onChange={(e) => setBulkWeight(e.target.value)}
                size="sm"
              />
            </div>
          </div>
          <div className="col-span-2 flex items-end sm:col-span-1 md:col-span-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyBulkValues}
              className="min-h-9 w-full text-xs font-semibold"
            >
              Apply to all
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Form Value */}
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />

      {/* GENERATED VARIANTS LIST WITH LIVE PROFIT MARGIN & WEIGHT */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
            Variant Details ({variants.length})
          </h4>
          <span className="text-muted-foreground text-xs">
            {selectedSizes.length || 1} size(s) × {selectedColors.length || 1} color(s)
          </span>
        </div>

        <div className="space-y-3">
          {variants.map((variant, index) => {
            const hex = COLOR_HEX[(variant.color || "").toLowerCase()] ?? "#9CA3AF";
            const isLight =
              hex.toLowerCase() === "#ffffff" ||
              hex.toLowerCase() === "#f5f5dc" ||
              hex.toLowerCase() === "#eab308";
            const profitData = calculateProfitMargin(
              variant.costPrice,
              variant.sellingPrice,
              variant.discountPrice
            );

            return (
              <div
                key={variant.id ?? `${comboKey(variant.size, variant.color)}-${index}`}
                className="rounded-sm border border-vl-dark-900/15 bg-white p-4 shadow-2xs transition-colors hover:border-vl-dark-900/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vl-dark-900/10 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {variant.color && (
                      <span
                        className={`size-3.5 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                        style={{ backgroundColor: hex }}
                        title={variant.color}
                      />
                    )}
                    <span className="text-sm font-semibold text-vl-dark-900">
                      {variant.color || "Default color"} · {variant.size || "Default size"}
                    </span>
                    {variant.id ? (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                        Existing
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        New
                      </span>
                    )}

                    {/* LIVE PROFIT MARGIN & LOSS WARNING BADGE */}
                    {profitData ? (
                      profitData.isLoss ? (
                        <span className="inline-flex animate-pulse items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          <AlertTriangle className="size-3" />
                          Loss Warning: -৳{Math.abs(profitData.profit).toFixed(2)} (Selling below
                          cost!)
                        </span>
                      ) : profitData.isBreakEven ? (
                        <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                          Break-even (0% margin)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <TrendingUp className="size-3 text-emerald-600" />
                          Profit: +৳{profitData.profit.toFixed(2)} ({profitData.margin.toFixed(1)}%
                          margin)
                        </span>
                      )
                    ) : null}
                  </div>

                  {variants.length > 1 && (
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={() => removeVariant(index)}
                      className="h-auto p-0 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-muted-foreground block text-xs font-medium">SKU</label>
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() => {
                          const gen = generateSku(productIdentifier, variant.size, variant.color);
                          updateVariant(index, "sku", gen);
                        }}
                        className="h-auto p-0 text-muted-foreground text-[10px] underline hover:text-vl-dark-900"
                        title="Generate SKU for this variant"
                      >
                        Auto
                      </Button>
                    </div>
                    <div className="mt-1">
                      <Input
                        value={variant.sku}
                        onChange={(event) => updateVariant(index, "sku", event.target.value)}
                        maxLength={100}
                        placeholder={generateSku(productIdentifier, variant.size, variant.color)}
                        size="default"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block text-xs font-medium">
                      Cost price (৳)
                    </label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={variant.costPrice}
                        onChange={(event) => updateVariant(index, "costPrice", event.target.value)}
                        size="default"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block text-xs font-medium">
                      Selling price (৳) *
                    </label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={variant.sellingPrice}
                        onChange={(event) => updateVariant(index, "sellingPrice", event.target.value)}
                        size="default"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block text-xs font-medium">
                      Discount price (৳)
                    </label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={variant.discountPrice}
                        onChange={(event) =>
                          updateVariant(index, "discountPrice", event.target.value)
                        }
                        size="default"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-vl-dark-900">
                      Initial Stock (Qty)
                    </label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={variant.stock ?? "0"}
                        onChange={(event) => updateVariant(index, "stock", event.target.value)}
                        size="default"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block text-xs font-medium">
                      Weight (kg)
                    </label>
                    <div className="mt-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 0.40"
                        value={variant.weight ?? ""}
                        onChange={(event) => updateVariant(index, "weight", event.target.value)}
                        size="default"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
