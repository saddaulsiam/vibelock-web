"use client";

import { useState } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
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
  hasHistory?: boolean;
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

export const LIFESTYLE_SIZE_GROUPS = {
  apparel: {
    id: "apparel",
    label: "Apparel (Tops/Hoodies)",
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  },
  bottoms: {
    id: "bottoms",
    label: "Bottoms (Pants/Denim)",
    sizes: ["28", "30", "32", "34", "36", "38"],
  },
  footwear: {
    id: "footwear",
    label: "Footwear (EU/BD)",
    sizes: ["39", "40", "41", "42", "43", "44", "45"],
  },
  accessories: {
    id: "accessories",
    label: "One Size / Accessories",
    sizes: ["One Size", "Free Size"],
  },
} as const;

export type LifestyleSizeGroupId = keyof typeof LIFESTYLE_SIZE_GROUPS;

export const SIZE_OPTIONS = [
  ...LIFESTYLE_SIZE_GROUPS.apparel.sizes,
  ...LIFESTYLE_SIZE_GROUPS.bottoms.sizes,
  ...LIFESTYLE_SIZE_GROUPS.footwear.sizes,
  ...LIFESTYLE_SIZE_GROUPS.accessories.sizes,
];
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
  const [activeSizeGroup, setActiveSizeGroup] = useState<LifestyleSizeGroupId>("apparel");
  const [bulkCostPrice, setBulkCostPrice] = useState("");
  const [bulkSellingPrice, setBulkSellingPrice] = useState("");
  const [bulkDiscountPrice, setBulkDiscountPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkWeight, setBulkWeight] = useState("");
  const [bulkTarget, setBulkTarget] = useState<string>("ALL");
  const [variantViewMode, setVariantViewMode] = useState<"matrix" | "cards">("cards");

  const currentGroupSizes = LIFESTYLE_SIZE_GROUPS[activeSizeGroup].sizes;
  const availableSizes = [...new Set([...currentGroupSizes, ...selectedSizes])];
  const availableColors = [...new Set([...COLOR_OPTIONS, ...selectedColors])];

  const updateVariant = (index: number, field: keyof VariantFormValue, value: string) => {
    setIsDirty(true);
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant))
    );
  };

  const removeVariant = (index: number) => {
    if (variants[index]?.hasHistory) {
      toast.error(
        "This variant has active order or inventory history and cannot be deleted. Set stock to 0 to discontinue."
      );
      return;
    }
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

    // Preserve existing variants that have active order/inventory history so they are never purged
    for (const v of variants) {
      if (v.hasHistory && !next.some((n) => n.id === v.id)) {
        next.push(v);
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

  const selectGroupSizes = (groupId: LifestyleSizeGroupId) => {
    const groupSizes = LIFESTYLE_SIZE_GROUPS[groupId].sizes;
    const next = [...new Set([...selectedSizes, ...groupSizes])];
    if ((next.length || 1) * (selectedColors.length || 1) > 100) {
      toast.error("A product can have at most 100 variants.");
      return;
    }
    setSelectedSizes(next);
    rebuildVariants(next, selectedColors);
  };

  const selectAllSizes = () => {
    selectGroupSizes(activeSizeGroup);
  };

  const setOnlyOneSize = () => {
    const next = ["One Size"];
    setSelectedSizes(next);
    rebuildVariants(next, selectedColors);
    toast.success("Set to One Size (Accessories / Caps / Leather).");
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
      toast.error("Enter at least one price, stock, or weight value to apply.");
      return;
    }
    setIsDirty(true);
    let count = 0;
    setVariants((current) =>
      current.map((variant) => {
        let matches = true;
        if (bulkTarget !== "ALL") {
          if (bulkTarget.startsWith("color:")) {
            const targetColor = bulkTarget.replace("color:", "").toLowerCase();
            matches = variant.color.trim().toLowerCase() === targetColor;
          } else if (bulkTarget.startsWith("size:")) {
            const targetSize = bulkTarget.replace("size:", "").toLowerCase();
            matches = variant.size.trim().toLowerCase() === targetSize;
          }
        }
        if (!matches) return variant;

        count++;
        return {
          ...variant,
          ...(bulkCostPrice ? { costPrice: bulkCostPrice } : {}),
          ...(bulkSellingPrice ? { sellingPrice: bulkSellingPrice } : {}),
          ...(bulkDiscountPrice !== "" ? { discountPrice: bulkDiscountPrice } : {}),
          ...(bulkStock !== "" ? { stock: bulkStock } : {}),
          ...(bulkWeight !== "" ? { weight: bulkWeight } : {}),
        };
      })
    );
    toast.success(
      count > 0
        ? `Applied values across ${count} matching variant(s)!`
        : "No variants matched the selected filter."
    );
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
    <div id="variants" className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6 scroll-mt-20">
      <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-vl-dark-900 flex size-6.5 items-center justify-center rounded-sm font-mono text-[11px] font-bold text-white shadow-2xs">
            03
          </span>
          <div>
            <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
              Variant Generator — Sizes, Colors, Stock &amp; Weight
            </h3>
            <p className="text-muted-foreground text-xs">
              Select sizes and colors to generate all combinations automatically. SKUs and profit
              margins calculate instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="border-vl-dark-900/15 bg-vl-white-100 text-vl-dark-900 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
            <span className="bg-vl-dark-900 size-2 rounded-full" />
            {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
          </span>
        </div>
      </div>

      {/* Sizes Selection */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            1. Select Sizes
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={selectAllSizes}
              className="text-vl-dark-900 h-auto p-0 font-medium underline underline-offset-2 hover:opacity-70"
            >
              + Add all {LIFESTYLE_SIZE_GROUPS[activeSizeGroup].label.split(" ")[0]}
            </Button>
            <span className="text-vl-dark-900/30">·</span>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={setOnlyOneSize}
              className="text-vl-dark-900 h-auto p-0 font-medium underline underline-offset-2 hover:opacity-70"
            >
              Set One Size
            </Button>
            {selectedSizes.length > 0 && (
              <>
                <span className="text-vl-dark-900/30">·</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={clearSizes}
                  className="text-muted-foreground h-auto p-0 hover:text-red-600"
                >
                  Clear sizes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Lifestyle Category Size Group Tabs */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center gap-1.5 border-b pb-2">
          <span className="text-muted-foreground mr-1 text-[11px] font-medium">Category:</span>
          {(Object.keys(LIFESTYLE_SIZE_GROUPS) as LifestyleSizeGroupId[]).map((groupId) => (
            <button
              key={groupId}
              type="button"
              onClick={() => setActiveSizeGroup(groupId)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeSizeGroup === groupId
                  ? "bg-vl-dark-900 text-white shadow-2xs"
                  : "bg-vl-white-200 text-vl-dark-900 hover:bg-vl-white-300 border-vl-dark-900/10 border"
              }`}
            >
              {LIFESTYLE_SIZE_GROUPS[groupId].label}
            </button>
          ))}
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
                    : "text-vl-dark-900 hover:bg-vl-white-100 bg-white"
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
      <div className="border-vl-dark-900/10 space-y-2.5 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            2. Select Colors
          </label>
          {selectedColors.length > 0 && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={clearColors}
              className="text-muted-foreground h-auto p-0 text-xs hover:text-red-600"
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
                    : "text-vl-dark-900 hover:bg-vl-white-100 bg-white"
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

      {/* BULK APPLICATOR BAR WITH WEIGHT & TARGET FILTER */}
      <div className="border-vl-dark-900/15 bg-vl-white-100 space-y-3 rounded-md border p-4">
        <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-vl-dark-900 size-4" />
              <p className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
                Quick Fill All Variants
              </p>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-muted-foreground text-[11px] font-medium">Target:</span>
              <select
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value)}
                className="border-vl-dark-900/15 text-vl-dark-900 shadow-2xs focus:border-vl-cyan h-7 rounded border bg-white px-2 text-xs font-semibold"
              >
                <option value="ALL">All {variants.length} Variants</option>
                {selectedColors.length > 0 && (
                  <optgroup label="Filter by Color">
                    {selectedColors.map((c) => (
                      <option key={`c-${c}`} value={`color:${c}`}>
                        Only {c}
                      </option>
                    ))}
                  </optgroup>
                )}
                {selectedSizes.length > 0 && (
                  <optgroup label="Filter by Size">
                    {selectedSizes.map((s) => (
                      <option key={`s-${s}`} value={`size:${s}`}>
                        Only {s}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={handleRegenerateAllSkus}
              className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 text-xs font-medium underline underline-offset-2"
            >
              <RefreshCw className="text-vl-dark-900/60 size-3" />
              Regenerate all SKUs
            </Button>
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

        {/* 1-CLICK COURIER SHIPPING WEIGHT PRESETS */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center gap-1.5 border-t pt-2.5 text-[11px]">
          <span className="text-vl-dark-900 font-semibold">⚡ Courier Weight Presets:</span>
          <button
            type="button"
            onClick={() => {
              setBulkWeight("0.25");
              toast.info("Set bulk weight to 0.25 kg (T-Shirt)");
            }}
            className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 rounded border bg-white px-2 py-0.5 font-medium transition-colors hover:text-white"
          >
            👕 Tee (0.25 kg)
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkWeight("0.75");
              toast.info("Set bulk weight to 0.75 kg (Hoodie/Sweatshirt)");
            }}
            className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 rounded border bg-white px-2 py-0.5 font-medium transition-colors hover:text-white"
          >
            🧥 Hoodie (0.75 kg)
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkWeight("1.10");
              toast.info("Set bulk weight to 1.10 kg (Denim/Jacket)");
            }}
            className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 rounded border bg-white px-2 py-0.5 font-medium transition-colors hover:text-white"
          >
            👖 Denim/Jacket (1.10 kg)
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkWeight("0.15");
              toast.info("Set bulk weight to 0.15 kg (Cap/Wallet/Jewelry)");
            }}
            className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 rounded border bg-white px-2 py-0.5 font-medium transition-colors hover:text-white"
          >
            🧢 Cap/Wallet (0.15 kg)
          </button>
        </div>
      </div>

      {/* Hidden Form Value */}
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />

      {/* GENERATED VARIANTS LIST WITH LIVE PROFIT MARGIN & WEIGHT */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vl-dark-900/10 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
              Variant Details ({variants.length})
            </h4>
            <div className="flex items-center gap-1 rounded-sm border border-vl-dark-900/10 bg-vl-white-200 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVariantViewMode("matrix")}
                className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-semibold transition-colors ${
                  variantViewMode === "matrix"
                    ? "bg-vl-dark-900 text-white shadow-2xs"
                    : "text-vl-dark-900/70 hover:text-vl-dark-900"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span>Matrix Stock Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setVariantViewMode("cards")}
                className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-semibold transition-colors ${
                  variantViewMode === "cards"
                    ? "bg-vl-dark-900 text-white shadow-2xs"
                    : "text-vl-dark-900/70 hover:text-vl-dark-900"
                }`}
              >
                <List className="size-3.5" />
                <span>Detailed Cards</span>
              </button>
            </div>
          </div>
          <span className="text-muted-foreground text-xs">
            {selectedSizes.length || 1} size(s) × {selectedColors.length || 1} color(s)
          </span>
        </div>

        {variantViewMode === "matrix" ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-sm border border-vl-dark-900/15 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-vl-dark-900/10 bg-vl-white-100 text-vl-dark-900">
                    <th className="p-3 font-bold uppercase tracking-wider">Colorway</th>
                    {(selectedSizes.length > 0 ? selectedSizes : ["Default Size"]).map((size) => (
                      <th key={size} className="p-3 text-center font-bold uppercase tracking-wider">
                        {size}
                      </th>
                    ))}
                    <th className="p-3 text-center font-bold uppercase tracking-wider">Color Total</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Row Selling (৳)</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Row Discount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vl-dark-900/10">
                  {(selectedColors.length > 0 ? selectedColors : ["Default Color"]).map((colorName) => {
                    const actualColor = colorName === "Default Color" ? "" : colorName;
                    const hex = COLOR_HEX[actualColor.toLowerCase()] ?? "#9CA3AF";
                    const isLight =
                      hex.toLowerCase() === "#ffffff" ||
                      hex.toLowerCase() === "#f5f5dc" ||
                      hex.toLowerCase() === "#eab308";

                    const colorVariants = variants.filter(
                      (v) => (v.color || "").trim().toLowerCase() === actualColor.trim().toLowerCase()
                    );
                    const colorStockSum = colorVariants.reduce(
                      (acc, v) => acc + (parseInt(v.stock, 10) > 0 ? parseInt(v.stock, 10) : 0),
                      0
                    );
                    const firstVariant = colorVariants[0];

                    return (
                      <tr key={colorName} className="hover:bg-vl-white-100/50 transition-colors">
                        <td className="p-3 font-semibold text-vl-dark-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {actualColor ? (
                              <span
                                className={`size-3 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                                style={{ backgroundColor: hex }}
                              />
                            ) : null}
                            <span>{colorName}</span>
                          </div>
                        </td>

                        {(selectedSizes.length > 0 ? selectedSizes : [""]).map((sizeName) => {
                          const actualSize = sizeName === "Default Size" ? "" : sizeName;
                          const variantIndex = variants.findIndex(
                            (v) =>
                              (v.size || "").trim().toLowerCase() === actualSize.trim().toLowerCase() &&
                              (v.color || "").trim().toLowerCase() === actualColor.trim().toLowerCase()
                          );
                          const v = variants[variantIndex];
                          if (!v) {
                            return (
                              <td key={sizeName} className="p-2 text-center text-muted-foreground">
                                —
                              </td>
                            );
                          }
                          const stockInt = parseInt(v.stock || "0", 10);
                          const isZero = isNaN(stockInt) || stockInt <= 0;
                          const isLow = !isZero && stockInt <= 5;

                          return (
                            <td key={sizeName} className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={v.stock}
                                onChange={(e) => updateVariant(variantIndex, "stock", e.target.value)}
                                className={`w-16 rounded border py-1 text-center font-mono text-xs font-bold transition-all focus:border-vl-cyan focus:ring-1 focus:ring-vl-cyan focus:outline-none ${
                                  isZero
                                    ? "border-neutral-300 bg-neutral-50 text-neutral-500"
                                    : isLow
                                      ? "border-amber-300 bg-amber-50 text-amber-900"
                                      : "border-vl-dark-900/20 bg-white text-vl-dark-900"
                                }`}
                                title={`Stock for ${colorName} - ${sizeName || "Default"}`}
                              />
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-mono font-bold text-vl-dark-900 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs ${
                              colorStockSum > 0
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {colorStockSum} pcs
                          </span>
                        </td>

                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Row Price"
                            value={firstVariant?.sellingPrice ?? ""}
                            onChange={(e) => {
                              const newPrice = e.target.value;
                              setIsDirty(true);
                              setVariants((curr) =>
                                curr.map((v) =>
                                  (v.color || "").trim().toLowerCase() === actualColor.trim().toLowerCase()
                                    ? { ...v, sellingPrice: newPrice }
                                    : v
                                )
                              );
                            }}
                            className="w-24 rounded border border-vl-dark-900/20 bg-white px-2 py-1 text-right font-mono text-xs focus:border-vl-cyan focus:ring-1 focus:ring-vl-cyan focus:outline-none"
                            title={`Update selling price across all sizes in ${colorName}`}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Optional"
                            value={firstVariant?.discountPrice ?? ""}
                            onChange={(e) => {
                              const newDiscount = e.target.value;
                              setIsDirty(true);
                              setVariants((curr) =>
                                curr.map((v) =>
                                  (v.color || "").trim().toLowerCase() === actualColor.trim().toLowerCase()
                                    ? { ...v, discountPrice: newDiscount }
                                    : v
                                )
                              );
                            }}
                            className="w-24 rounded border border-vl-dark-900/20 bg-white px-2 py-1 text-right font-mono text-xs focus:border-vl-cyan focus:ring-1 focus:ring-vl-cyan focus:outline-none"
                            title={`Update discount price across all sizes in ${colorName}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-vl-dark-900/20 bg-vl-white-200 font-bold text-vl-dark-900">
                    <td className="p-3">Size Totals:</td>
                    {(selectedSizes.length > 0 ? selectedSizes : ["Default Size"]).map((sizeName) => {
                      const actualSize = sizeName === "Default Size" ? "" : sizeName;
                      const sizeTotal = variants
                        .filter(
                          (v) => (v.size || "").trim().toLowerCase() === actualSize.trim().toLowerCase()
                        )
                        .reduce(
                          (acc, v) => acc + (parseInt(v.stock, 10) > 0 ? parseInt(v.stock, 10) : 0),
                          0
                        );
                      return (
                        <td key={sizeName} className="p-3 text-center font-mono text-xs">
                          {sizeTotal}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-mono text-xs font-bold text-emerald-800">
                      {variants.reduce(
                        (acc, v) => acc + (parseInt(v.stock, 10) > 0 ? parseInt(v.stock, 10) : 0),
                        0
                      )}{" "}
                      Total
                    </td>
                    <td colSpan={2} className="p-3 text-right text-[11px] font-normal text-muted-foreground">
                      Press Tab to jump between stock inputs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
              <p>
                💡 <strong>Speed Tip:</strong> Press <kbd className="rounded border bg-vl-white-200 px-1 py-0.5 font-mono text-[10px]">Tab</kbd> to rapidly enter stock across sizes. Row price fields update all sizes for that color simultaneously.
              </p>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => setVariantViewMode("cards")}
                className="text-vl-dark-900 h-auto p-0 font-medium underline"
              >
                Switch to Detailed Cards to customize individual SKUs or weights
              </Button>
            </div>
          </div>
        ) : (
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

              const discountNum = variant.discountPrice ? parseFloat(variant.discountPrice) : null;
              const sellingNum = variant.sellingPrice ? parseFloat(variant.sellingPrice) : null;
              const isDiscountInvalid =
                discountNum !== null &&
                !isNaN(discountNum) &&
                sellingNum !== null &&
                !isNaN(sellingNum) &&
                discountNum >= sellingNum;

              const isDuplicateSku = Boolean(
                variant.sku.trim() &&
                  variants.filter(
                    (v) => v.sku.trim().toLowerCase() === variant.sku.trim().toLowerCase()
                  ).length > 1
              );

              const stockNum = parseInt(variant.stock || "0", 10);
              const isStockEmpty = isNaN(stockNum) || stockNum <= 0;
              const isStockLow = !isStockEmpty && stockNum <= 5;

              return (
                <div
                  key={variant.id ?? `${comboKey(variant.size, variant.color)}-${index}`}
                  className={`rounded-sm border p-4 shadow-2xs transition-colors ${
                    isDiscountInvalid || isDuplicateSku
                      ? "border-red-400 bg-red-50/20 ring-1 ring-red-300"
                      : "border-vl-dark-900/15 hover:border-vl-dark-900/30 bg-white"
                  }`}
                >
                  <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {variant.color && (
                        <span
                          className={`size-3.5 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                          style={{ backgroundColor: hex }}
                          title={variant.color}
                        />
                      )}
                      <span className="text-vl-dark-900 text-sm font-semibold">
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

                      {/* STOCK LEVEL HEALTH PILL */}
                      {isStockEmpty ? (
                        <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                          🔴 Out of stock
                        </span>
                      ) : isStockLow ? (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          🟡 Low: {stockNum} left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          🟢 In stock: {stockNum}
                        </span>
                      )}

                      {/* INLINE VALIDATION WARNINGS */}
                      {isDiscountInvalid && (
                        <span className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                          <AlertTriangle className="size-3" />
                          Discount (৳{variant.discountPrice}) must be less than Selling (৳{variant.sellingPrice})
                        </span>
                      )}
                      {isDuplicateSku && (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="size-3" />
                          Duplicate SKU ({variant.sku})
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

                    {variant.hasHistory ? (
                      <span
                        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                        title="This variant has past order or inventory history and cannot be deleted. Set stock to 0 to discontinue."
                      >
                        <Lock className="size-2.5" />
                        In orders (Locked)
                      </span>
                    ) : variants.length > 1 ? (
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() => removeVariant(index)}
                        className="h-auto p-0 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                      >
                        Remove
                      </Button>
                    ) : null}
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
                          className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 text-[10px] underline"
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
                          className={isDuplicateSku ? "border-amber-500 bg-amber-50/50 focus-visible:ring-amber-500" : ""}
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
                          placeholder="0.00"
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
                          onChange={(event) =>
                            updateVariant(index, "sellingPrice", event.target.value)
                          }
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
                          className={isDiscountInvalid ? "border-red-500 bg-red-50/50 focus-visible:ring-red-500" : ""}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-vl-dark-900 block text-xs font-medium">
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
        )}
      </div>
    </div>
  );
}
