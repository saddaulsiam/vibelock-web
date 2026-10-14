"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { saveProductAction } from "@/lib/admin/catalog-actions";

type VariantFormValue = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  costPrice: string;
  sellingPrice: string;
  discountPrice: string;
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

const newVariant = (size = "", color = "", base?: VariantFormValue): VariantFormValue => ({
  sku: "",
  size,
  color,
  costPrice: base?.costPrice ?? "0.00",
  sellingPrice: base?.sellingPrice ?? "",
  discountPrice: base?.discountPrice ?? "",
});

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
const COLOR_OPTIONS = ["Black", "White", "Grey", "Navy", "Blue", "Red", "Olive", "Beige", "Brown"];
const comboKey = (size: string, color: string) => `${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const initialVariants = product?.variants.length ? product.variants.map((variant) => ({ ...variant })) : [newVariant()];
  const [variants, setVariants] = useState<VariantFormValue[]>(initialVariants);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([...new Set(initialVariants.map((v) => v.size).filter(Boolean))]);
  const [selectedColors, setSelectedColors] = useState<string[]>([...new Set(initialVariants.map((v) => v.color).filter(Boolean))]);
  const [customColor, setCustomColor] = useState("");
  const [imageUrls, setImageUrls] = useState(
    product?.images.map((image) => image.url).join("\n") ?? "",
  );
  const fieldClass = "mt-1.5 min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]";
  const updateVariant = (index: number, field: keyof VariantFormValue, value: string) => {
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
  };
  const rebuildVariants = (sizes: string[], colors: string[]) => {
    const sizeAxis = sizes.length ? sizes : [""];
    const colorAxis = colors.length ? colors : [""];
    const existingByCombo = new Map(variants.map((variant) => [comboKey(variant.size, variant.color), variant]));
    const legacyDefault = variants.find((variant) => !variant.size && !variant.color);
    const base = variants[0];
    const next: VariantFormValue[] = [];
    for (const size of sizeAxis) {
      for (const color of colorAxis) {
        const existing = existingByCombo.get(comboKey(size, color)) ?? (next.length === 0 ? legacyDefault : undefined);
        next.push(existing ? { ...existing, size, color } : newVariant(size, color, base));
      }
    }
    setVariants(next.length ? next : [newVariant()]);
  };
  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size) ? selectedSizes.filter((value) => value !== size) : [...selectedSizes, size];
    if ((next.length || 1) * (selectedColors.length || 1) > 100) return;
    setSelectedSizes(next);
    rebuildVariants(next, selectedColors);
  };
  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color) ? selectedColors.filter((value) => value !== color) : [...selectedColors, color];
    if ((selectedSizes.length || 1) * (next.length || 1) > 100) return;
    setSelectedColors(next);
    rebuildVariants(selectedSizes, next);
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
    }
    setCustomColor("");
  };
  const availableColors = [...new Set([...COLOR_OPTIONS, ...selectedColors])];

  return (
    <AdminSaveForm action={saveProductAction} submitLabel={product ? "Save product" : "Create product"}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className="block text-sm font-medium text-[#101114]">
        Name <span aria-hidden="true" className="text-red-700">*</span>
        <input className={fieldClass} name="name" required maxLength={120} defaultValue={product?.name ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Slug <span className="font-normal text-muted-foreground">(leave blank to generate from name)</span>
        <input className={fieldClass} name="slug" maxLength={160} defaultValue={product?.slug ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Description / details
        <textarea className={`${fieldClass} min-h-36 resize-y`} name="description" maxLength={5000} defaultValue={product?.description ?? ""} />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[#101114]">Categories</legend>
        <p className="text-xs text-muted-foreground">Select all categories that apply.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label key={category.id} className="flex min-h-11 items-center gap-3 border border-[#101114]/10 bg-white px-3 text-sm text-[#101114]">
              <input type="checkbox" name="categoryIds" value={category.id} defaultChecked={product?.categoryIds.includes(category.id)} className="size-4 accent-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]" />
              {category.name}
            </label>
          ))}
          {categories.length === 0 ? <p className="text-sm text-muted-foreground">Create a category before assigning one.</p> : null}
        </div>
      </fieldset>

      <fieldset className="space-y-3 border border-[#101114]/10 bg-white p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-[#101114]">Product images</legend>
        <p className="text-xs leading-5 text-muted-foreground">Add one image URL per line. The first URL is used as the primary image. Use public HTTPS image URLs; this form does not upload local files.</p>
        <label className="block text-sm font-medium text-[#101114]">
          Image URLs
          <textarea className={`${fieldClass} min-h-28 resize-y`} name="imageUrls" value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} placeholder="https://example.com/vibelock-tee-front.webp&#10;https://example.com/vibelock-tee-back.webp" />
        </label>
        {imageUrls.split("\n").map((url) => url.trim()).filter((url) => /^https?:\/\//i.test(url)).slice(0, 6).length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imageUrls.split("\n").map((url) => url.trim()).filter((url) => /^https?:\/\//i.test(url)).slice(0, 6).map((url, index) => (
              <div key={`${url}-${index}`} className="overflow-hidden border border-[#101114]/10 bg-[#F3F0E8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Product image preview ${index + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
                <p className="px-2 py-1 text-xs text-[#101114]">{index === 0 ? "Primary image" : `Gallery image ${index + 1}`}</p>
              </div>
            ))}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4 border border-[#101114]/10 bg-white p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-[#101114]">Variant generator — select sizes and colors</legend>
        <p className="text-xs leading-5 text-muted-foreground">Select multiple sizes and colors once. The form automatically creates every combination. For example, 4 sizes × 3 colors = 12 variants. Each combination gets its own SKU and can have its own pricing. Stock stays managed in Inventory.</p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#101114]">Sizes</p>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((size) => (
              <label key={size} className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-sm ${selectedSizes.includes(size) ? "border-[#101114] bg-[#F3F0E8]" : "border-[#101114]/15 bg-white"}`}>
                <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => toggleSize(size)} className="size-4 accent-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]" />
                {size}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#101114]">Colors</p>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <label key={color} className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-sm ${selectedColors.includes(color) ? "border-[#101114] bg-[#F3F0E8]" : "border-[#101114]/15 bg-white"}`}>
                <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => toggleColor(color)} className="size-4 accent-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]" />
                {color}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={`${fieldClass} sm:max-w-sm`} value={customColor} onChange={(event) => setCustomColor(event.target.value)} maxLength={60} placeholder="Custom color, e.g. Charcoal" aria-label="Custom color name" />
            <button type="button" onClick={addCustomColor} className="min-h-11 border border-[#101114]/20 px-4 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">Add color</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[#101114]/10 py-3">
          <p className="text-sm font-semibold text-[#101114]">Generated variants: {variants.length}</p>
          <p className="text-xs text-muted-foreground">{(selectedSizes.length || 1)} size option(s) × {(selectedColors.length || 1)} color option(s)</p>
        </div>
        <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div key={variant.id ?? `${comboKey(variant.size, variant.color)}-${index}`} className="space-y-3 border border-[#101114]/10 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#101114]">{variant.color || "Default color"} · {variant.size || "Default size"}</p>
                {variant.id ? <span className="text-xs text-muted-foreground">Existing variant</span> : <span className="text-xs text-muted-foreground">New variant</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium text-[#101114]">SKU
                  <input className={fieldClass} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} maxLength={100} placeholder="Auto-generated if blank" />
                </label>
                <label className="block text-sm font-medium text-[#101114]">Cost price (admin only)
                  <input className={fieldClass} type="number" min="0" step="0.01" required value={variant.costPrice} onChange={(event) => updateVariant(index, "costPrice", event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-[#101114]">Selling price *
                  <input className={fieldClass} type="number" min="0.01" step="0.01" required value={variant.sellingPrice} onChange={(event) => updateVariant(index, "sellingPrice", event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-[#101114]">Discount price (optional)
                  <input className={fieldClass} type="number" min="0" step="0.01" value={variant.discountPrice} onChange={(event) => updateVariant(index, "discountPrice", event.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium text-[#101114]">
        Publication status
        <select className={fieldClass} name="status" defaultValue={product?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="inline-flex min-h-10 items-center border border-[#101114]/20 px-4 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
          Back to products
        </Link>
      </div>
    </AdminSaveForm>
  );
}
