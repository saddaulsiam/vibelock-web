"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Globe } from "lucide-react";
import { toast } from "sonner";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { CategoryMultiSelect } from "@/components/admin/category-multiselect";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { saveProductAction } from "@/lib/admin/catalog-actions";

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateSku = (productIdentifier: string, size = "", color = "") => {
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

type VariantFormValue = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  costPrice: string;
  sellingPrice: string;
  discountPrice: string;
  stock: string;
};

type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryIds: string[];
  variants: VariantFormValue[];
  images: { url: string; alt: string | null; isPrimary: boolean }[];
};

const newVariant = (
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
});

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
const COLOR_OPTIONS = ["Black", "White", "Grey", "Navy", "Blue", "Red", "Olive", "Beige", "Brown"];
const COLOR_HEX: Record<string, string> = {
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

const comboKey = (size: string, color: string) =>
  `${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const initialName = product?.name ?? "";
  const initialSlug = product?.slug ?? "";

  const initialVariants = product?.variants.length
    ? product.variants.map((variant) => ({
        ...variant,
        stock: variant.stock ?? "0",
      }))
    : [newVariant("", "", undefined, initialSlug || initialName)];

  const [variants, setVariants] = useState<VariantFormValue[]>(initialVariants);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([
    ...new Set(initialVariants.map((v) => v.size).filter(Boolean)),
  ]);
  const [selectedColors, setSelectedColors] = useState<string[]>([
    ...new Set(initialVariants.map((v) => v.color).filter(Boolean)),
  ]);

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(product?.slug));

  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");
  const [bulkSellingPrice, setBulkSellingPrice] = useState("");
  const [bulkDiscountPrice, setBulkDiscountPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const fieldClass =
    "min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none transition-colors placeholder:text-[#101114]/35 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

  // Real-time name change handler: instantly generates slug unless manually edited
  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!isSlugManuallyEdited) {
      const autoSlug = slugify(newName);
      setSlug(autoSlug);

      // Also update SKU for variants without a custom SKU if this is a new product
      if (!product?.id) {
        const currentKey = autoSlug || newName;
        const oldKey = slug || name;
        setVariants((current) =>
          current.map((v) => {
            const oldAutoSku = generateSku(oldKey, v.size, v.color);
            if (!v.sku || v.sku === oldAutoSku) {
              return { ...v, sku: generateSku(currentKey, v.size, v.color) };
            }
            return v;
          })
        );
      }
    }
  };

  // Manual slug edit handler
  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setIsSlugManuallyEdited(true);
  };

  // Re-sync slug with current name
  const handleGenerateSlug = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a product name first to generate a slug.");
      return;
    }
    const generated = slugify(trimmed);
    setSlug(generated);
    setIsSlugManuallyEdited(false);
    toast.success("Slug synced from product name!");
  };

  const updateVariant = (index: number, field: keyof VariantFormValue, value: string) => {
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant))
    );
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.error("A product must have at least one variant.");
      return;
    }
    setVariants((current) => current.filter((_, i) => i !== index));
    toast.success("Variant removed from list.");
  };

  const rebuildVariants = (sizes: string[], colors: string[]) => {
    const sizeAxis = sizes.length ? sizes : [""];
    const colorAxis = colors.length ? colors : [""];
    const currentKey = slug || name;
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
          // If existing variant has an empty SKU, auto-generate it
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
    if (!bulkCostPrice && !bulkSellingPrice && !bulkDiscountPrice && bulkStock === "") {
      toast.error("Enter at least one price or stock value to apply to all variants.");
      return;
    }
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        ...(bulkCostPrice ? { costPrice: bulkCostPrice } : {}),
        ...(bulkSellingPrice ? { sellingPrice: bulkSellingPrice } : {}),
        ...(bulkDiscountPrice !== "" ? { discountPrice: bulkDiscountPrice } : {}),
        ...(bulkStock !== "" ? { stock: bulkStock } : {}),
      }))
    );
    toast.success(`Applied values across all ${variants.length} variant(s)!`);
  };

  const handleRegenerateAllSkus = () => {
    const key = slug || name;
    if (!key.trim()) {
      toast.error("Please enter a product name or slug first to generate SKUs.");
      return;
    }
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        sku: generateSku(key, variant.size, variant.color),
      }))
    );
    toast.success(`Generated SKUs for all ${variants.length} variant(s)!`);
  };

  const availableSizes = [...new Set([...SIZE_OPTIONS, ...selectedSizes])];
  const availableColors = [...new Set([...COLOR_OPTIONS, ...selectedColors])];

  return (
    <AdminSaveForm
      action={saveProductAction}
      submitLabel={product ? "Save product" : "Create product"}
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* SECTION 1: BASIC INFORMATION */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <h3 className="text-base font-semibold text-[#101114]">Basic Information</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Title, live auto-generating URL handle, and catalog description.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-[#101114]">
              Product Title / Name{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
            </label>
            <input
              id="product-name"
              className={`${fieldClass} mt-1.5`}
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. VibeLock Oversized Heavyweight Hoodie"
              autoComplete="off"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="product-slug" className="block text-sm font-medium text-[#101114]">
                Product Slug{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (unique storefront URL handle)
                </span>
              </label>
              <div className="flex items-center gap-2">
                {!isSlugManuallyEdited && name.trim() ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Auto-syncing
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 transition-colors hover:text-[#101114]"
                >
                  <Sparkles className="size-3.5 text-[#00D9FF]" />
                  Generate from name
                </button>
              </div>
            </div>
            <input
              id="product-slug"
              className={`${fieldClass} mt-1.5 font-mono text-xs`}
              name="slug"
              maxLength={160}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="vibelock-oversized-heavyweight-hoodie"
              autoComplete="off"
            />
            <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
              <Globe className="size-3.5 text-[#101114]/40" />
              <span>Preview:</span>
              <span className="font-mono text-[#101114]">
                vibelock.bd/products/
                <strong className="font-semibold text-[#101114]">{slug || "product-slug"}</strong>
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="product-description"
              className="block text-sm font-medium text-[#101114]"
            >
              Description / Details
            </label>
            <textarea
              id="product-description"
              className={`${fieldClass} mt-1.5 min-h-32 resize-y`}
              name="description"
              maxLength={5000}
              placeholder="Provide a detailed description of fit, fabric, care instructions, and styling notes..."
              defaultValue={product?.description ?? ""}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: CATEGORIES */}
      <div className="space-y-4 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <h3 className="text-base font-semibold text-[#101114]">Product Categories</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Select one or more store categories to help shoppers discover this product.
          </p>
        </div>
        <CategoryMultiSelect
          categories={categories}
          initialSelectedIds={product?.categoryIds ?? []}
        />
      </div>

      {/* SECTION 3: PRODUCT IMAGES */}
      <ProductImageUploader initialImages={product?.images ?? []} />

      {/* SECTION 4: VARIANT GENERATOR — SIZES, COLORS & INITIAL STOCK */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#101114]">
              Variant Generator — Sizes, Colors &amp; Initial Stock
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Select sizes and colors to generate all combinations automatically. SKUs are generated
              instantly and can be edited anytime.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#101114]/15 bg-[#F9F8F6] px-3 py-1 text-xs font-semibold text-[#101114]">
              <span className="size-2 rounded-full bg-[#101114]" />
              {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
            </span>
          </div>
        </div>

        {/* Sizes Selection */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold tracking-wider text-[#101114] uppercase">
              1. Select Sizes
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllSizes}
                className="font-medium text-[#101114] underline underline-offset-2 hover:opacity-70"
              >
                Select standard sizes
              </button>
              {selectedSizes.length > 0 && (
                <>
                  <span className="text-[#101114]/30">·</span>
                  <button
                    type="button"
                    onClick={clearSizes}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    Clear sizes
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`inline-flex min-h-9 items-center justify-center rounded border px-3 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-[#101114] bg-[#101114] text-white shadow-xs"
                      : "border-[#101114]/20 bg-white text-[#101114] hover:border-[#101114]/40 hover:bg-[#F9F8F6]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
          <div className="flex max-w-sm items-center gap-2 pt-1">
            <input
              className="min-h-9 w-full border border-[#101114]/20 bg-white px-3 text-xs text-[#101114] outline-none placeholder:text-[#101114]/40 focus:border-[#101114] focus-visible:ring-1 focus-visible:ring-[#101114]"
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
            <button
              type="button"
              onClick={addCustomSize}
              className="min-h-9 shrink-0 border border-[#101114]/20 bg-[#F9F8F6] px-3 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
            >
              Add Size
            </button>
          </div>
        </div>

        {/* Colors Selection */}
        <div className="space-y-2.5 border-t border-[#101114]/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold tracking-wider text-[#101114] uppercase">
              2. Select Colors
            </label>
            {selectedColors.length > 0 && (
              <button
                type="button"
                onClick={clearColors}
                className="text-muted-foreground text-xs hover:text-red-600"
              >
                Clear colors
              </button>
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
                <button
                  key={color}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded border px-3 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-[#101114] bg-[#101114] text-white shadow-xs"
                      : "border-[#101114]/20 bg-white text-[#101114] hover:border-[#101114]/40 hover:bg-[#F9F8F6]"
                  }`}
                >
                  <span
                    className={`size-3 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                    style={{ backgroundColor: hex }}
                  />
                  <span>{color}</span>
                </button>
              );
            })}
          </div>
          <div className="flex max-w-sm items-center gap-2 pt-1">
            <input
              className="min-h-9 w-full border border-[#101114]/20 bg-white px-3 text-xs text-[#101114] outline-none placeholder:text-[#101114]/40 focus:border-[#101114] focus-visible:ring-1 focus-visible:ring-[#101114]"
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
            <button
              type="button"
              onClick={addCustomColor}
              className="min-h-9 shrink-0 border border-[#101114]/20 bg-[#F9F8F6] px-3 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
            >
              Add Color
            </button>
          </div>
        </div>

        {/* Bulk Applicator Bar */}
        <div className="space-y-3 rounded-md border border-[#101114]/15 bg-[#F9F8F6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-[#101114]" />
              <p className="text-xs font-bold tracking-wider text-[#101114] uppercase">
                Quick Fill All Variants
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRegenerateAllSkus}
                className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:text-[#101114]"
              >
                <RefreshCw className="size-3 text-[#101114]/60" />
                Regenerate all SKUs
              </button>
              <span className="text-muted-foreground hidden text-xs sm:inline">·</span>
              <p className="text-muted-foreground hidden text-xs sm:inline">
                Apply common pricing &amp; stock to all {variants.length} variant(s)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium">
                Cost Price (৳)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={bulkCostPrice}
                onChange={(e) => setBulkCostPrice(e.target.value)}
                className="mt-1 min-h-9 w-full border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] outline-none focus:border-[#101114]"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium">
                Selling Price (৳) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={bulkSellingPrice}
                onChange={(e) => setBulkSellingPrice(e.target.value)}
                className="mt-1 min-h-9 w-full border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] outline-none focus:border-[#101114]"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium">
                Discount Price (৳)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={bulkDiscountPrice}
                onChange={(e) => setBulkDiscountPrice(e.target.value)}
                className="mt-1 min-h-9 w-full border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] outline-none focus:border-[#101114]"
              />
            </div>
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium">
                Initial Stock (Qty)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                className="mt-1 min-h-9 w-full border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] outline-none focus:border-[#101114]"
              />
            </div>
            <div className="col-span-2 flex items-end sm:col-span-4 md:col-span-1">
              <button
                type="button"
                onClick={handleApplyBulkValues}
                className="min-h-9 w-full border border-[#101114] bg-[#101114] px-3 text-xs font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
              >
                Apply to all
              </button>
            </div>
          </div>
        </div>

        {/* Hidden Form Value */}
        <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />

        {/* Generated Variants List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-wider text-[#101114] uppercase">
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
              return (
                <div
                  key={variant.id ?? `${comboKey(variant.size, variant.color)}-${index}`}
                  className="rounded-sm border border-[#101114]/15 bg-white p-4 shadow-2xs transition-colors hover:border-[#101114]/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#101114]/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      {variant.color && (
                        <span
                          className={`size-3.5 shrink-0 rounded-full ${isLight ? "border border-black/20" : ""}`}
                          style={{ backgroundColor: hex }}
                          title={variant.color}
                        />
                      )}
                      <span className="text-sm font-semibold text-[#101114]">
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
                    </div>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-muted-foreground block text-xs font-medium">
                          SKU
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = generateSku(slug || name, variant.size, variant.color);
                            updateVariant(index, "sku", gen);
                          }}
                          className="text-muted-foreground text-[10px] underline hover:text-[#101114]"
                          title="Generate SKU for this variant"
                        >
                          Auto
                        </button>
                      </div>
                      <input
                        className={fieldClass}
                        value={variant.sku}
                        onChange={(event) => updateVariant(index, "sku", event.target.value)}
                        maxLength={100}
                        placeholder={generateSku(slug || name, variant.size, variant.color)}
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block text-xs font-medium">
                        Cost price (৳)
                      </label>
                      <input
                        className={fieldClass}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={variant.costPrice}
                        onChange={(event) => updateVariant(index, "costPrice", event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block text-xs font-medium">
                        Selling price (৳) *
                      </label>
                      <input
                        className={fieldClass}
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={variant.sellingPrice}
                        onChange={(event) =>
                          updateVariant(index, "sellingPrice", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block text-xs font-medium">
                        Discount price (৳)
                      </label>
                      <input
                        className={fieldClass}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={variant.discountPrice}
                        onChange={(event) =>
                          updateVariant(index, "discountPrice", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#101114]">
                        Initial Stock (Qty)
                      </label>
                      <input
                        className={fieldClass}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={variant.stock ?? "0"}
                        onChange={(event) => updateVariant(index, "stock", event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 5: PUBLICATION & VISIBILITY */}
      <div className="space-y-4 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <h3 className="text-base font-semibold text-[#101114]">Publishing Status</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Control whether this product is visible to customers on the online storefront.
          </p>
        </div>
        <div className="max-w-md">
          <label htmlFor="product-status" className="block text-sm font-medium text-[#101114]">
            Storefront Visibility
          </label>
          <select
            id="product-status"
            className={`${fieldClass} mt-1.5 cursor-pointer font-medium`}
            name="status"
            defaultValue={product?.status ?? "DRAFT"}
          >
            <option value="DRAFT">Draft — Hidden from store, save for later</option>
            <option value="PUBLISHED">Published — Live and purchasable in store</option>
            <option value="ARCHIVED">Archived — Hidden from store and discontinued</option>
          </select>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          href="/admin/products"
          className="inline-flex min-h-10 items-center justify-center border border-[#101114]/20 bg-white px-4 text-sm font-medium text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          Back to products
        </Link>
      </div>
    </AdminSaveForm>
  );
}
