"use client";

import { CategoryMultiSelect } from "@/components/admin/categories";
import { AdminSaveForm } from "@/components/admin/shared";
import { saveProductAction } from "@/lib/admin/catalog/catalog-actions";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductBasicInfoSection, slugify } from "./product-basic-info-section";
import { ProductFormPreview } from "./product-form-preview";
import { ProductImageUploader } from "./product-image-uploader";
import {
  ProductVariantGenerator,
  calculateProfitMargin,
  generateSku,
  newVariant,
  type VariantFormValue,
} from "./product-variant-generator";

export { calculateProfitMargin };

export type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryIds: string[];
  variants: VariantFormValue[];
  images: { url: string; alt: string | null; isPrimary: boolean }[];
};

const fieldClass =
  "min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none transition-colors placeholder:text-[#101114]/35 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const initialName = product?.name ?? "";
  const initialSlug = product?.slug ?? "";
  const initialDescription = product?.description ?? "";

  const initialVariants: VariantFormValue[] = product?.variants.length
    ? product.variants.map((variant) => ({
        ...variant,
        stock: variant.stock ?? "0",
        weight: variant.weight ?? "",
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
  const [description, setDescription] = useState(initialDescription);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(product?.slug));

  const [uploadedImages, setUploadedImages] = useState<{ url: string; isPrimary: boolean }[]>(
    () => product?.images?.map((img) => ({ url: img.url, isPrimary: Boolean(img.isPrimary) })) ?? []
  );

  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Real-time name change handler: instantly generates slug unless manually edited
  const handleNameChange = (newName: string) => {
    setName(newName);
    setIsDirty(true);
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
    setIsDirty(true);
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
    setIsDirty(true);
    toast.success("Slug synced from product name!");
  };

  // Storefront preview calculations
  const primaryImageUrl =
    uploadedImages.find((img) => img.isPrimary)?.url || uploadedImages[0]?.url;
  const secondaryImageUrl = uploadedImages.find(
    (img) => !img.isPrimary && img.url !== primaryImageUrl
  )?.url;

  const previewSelling = variants[0]?.sellingPrice || "0.00";
  const previewDiscount = variants[0]?.discountPrice || "";
  const previewDiscountNum = previewDiscount ? parseFloat(previewDiscount) : null;
  const previewSellingNum = parseFloat(previewSelling) || 0;
  const hasDiscount =
    previewDiscountNum !== null &&
    !isNaN(previewDiscountNum) &&
    previewSellingNum > 0 &&
    previewDiscountNum < previewSellingNum;
  const discountPercent = hasDiscount
    ? Math.round(((previewSellingNum - previewDiscountNum) / previewSellingNum) * 100)
    : 0;
  const totalStockCount = variants.reduce(
    (acc, v) => acc + (parseInt(v.stock, 10) > 0 ? parseInt(v.stock, 10) : 0),
    0
  );

  return (
    <AdminSaveForm
      action={async (state, formData) => {
        setIsDirty(false);
        return saveProductAction(state, formData);
      }}
      submitLabel={product ? "Save product" : "Create product"}
      secondaryAction={
        <Link
          href="/admin/products"
          className="inline-flex min-h-10 items-center justify-center border border-[#101114]/20 bg-white px-4 text-sm font-medium text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          Cancel
        </Link>
      }
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* TOP CONTROLS BAR: PREVIEW TOGGLE & STATUS BADGES */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#101114]/10 bg-[#F9F8F6] p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#101114]">Product Form</span>
          {isDirty && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowLivePreview((prev) => !prev)}
          className="inline-flex items-center gap-1.5 font-semibold text-[#101114] hover:underline"
        >
          {showLivePreview ? (
            <>
              <EyeOff className="size-3.5" /> Hide live preview
            </>
          ) : (
            <>
              <Eye className="size-3.5" /> Show live storefront preview
            </>
          )}
        </button>
      </div>

      {/* LIVE STOREFRONT CARD PREVIEW */}
      {showLivePreview && (
        <ProductFormPreview
          name={name}
          primaryImageUrl={primaryImageUrl}
          secondaryImageUrl={secondaryImageUrl}
          previewSelling={previewSelling}
          previewDiscount={previewDiscount}
          hasDiscount={hasDiscount}
          discountPercent={discountPercent}
          totalStockCount={totalStockCount}
          selectedSizes={selectedSizes}
          selectedColors={selectedColors}
          categoryName={categories[0]?.name}
        />
      )}

      {/* SECTION 1: BASIC INFORMATION */}
      <ProductBasicInfoSection
        name={name}
        onNameChange={handleNameChange}
        slug={slug}
        onSlugChange={handleSlugChange}
        isSlugManuallyEdited={isSlugManuallyEdited}
        onGenerateSlug={handleGenerateSlug}
        description={description}
        onDescriptionChange={(newDesc) => {
          setDescription(newDesc);
          setIsDirty(true);
        }}
      />

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
      <ProductImageUploader
        initialImages={product?.images ?? []}
        onImagesChange={setUploadedImages}
      />

      {/* SECTION 4: VARIANT GENERATOR — SIZES, COLORS, STOCK, WEIGHT & PROFIT MARGIN */}
      <ProductVariantGenerator
        variants={variants}
        setVariants={setVariants}
        selectedSizes={selectedSizes}
        setSelectedSizes={setSelectedSizes}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        productIdentifier={slug || name}
        setIsDirty={setIsDirty}
      />

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
    </AdminSaveForm>
  );
}
