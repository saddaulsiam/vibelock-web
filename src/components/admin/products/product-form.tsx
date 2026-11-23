"use client";

import { CategoryMultiSelect } from "@/components/admin/categories";
import { AdminSaveForm } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select-native";
import { saveProductAction } from "@/lib/admin/catalog/catalog-actions";
import {
  LIFESTYLE_PRESETS,
  parseProductSpecifications,
  type LifestyleCategoryPreset,
  type ProductSpecifications,
} from "@/lib/catalog/specifications";
import { ArrowLeft, Copy, ExternalLink, Eye, EyeOff, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductBasicInfoSection, slugify } from "./product-basic-info-section";
import { ProductFormPreview } from "./product-form-preview";
import { ProductImageUploader } from "./product-image-uploader";
import { ProductSpecificationsSection } from "./product-specifications-section";
import {
  LIFESTYLE_SIZE_GROUPS,
  ProductVariantGenerator,
  calculateProfitMargin,
  comboKey,
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
  specifications?: unknown | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured?: boolean;
  categoryIds: string[];
  variants: VariantFormValue[];
  images: { url: string; alt: string | null; isPrimary: boolean }[];
};

export function ProductForm({
  product,
  categories,
  isDuplicate = false,
  duplicateFromName,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string }[];
  isDuplicate?: boolean;
  duplicateFromName?: string;
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
  const [specifications, setSpecifications] = useState<ProductSpecifications | null>(() =>
    parseProductSpecifications(product?.specifications)
  );
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(product?.slug));

  const [uploadedImages, setUploadedImages] = useState<{ url: string; isPrimary: boolean }[]>(
    () => product?.images?.map((img) => ({ url: img.url, isPrimary: Boolean(img.isPrimary) })) ?? []
  );

  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(
    product?.status ?? "DRAFT"
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(product?.isFeatured));

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => product?.categoryIds ?? []
  );

  const router = useRouter();
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<"save" | "save_and_add_another">("save");

  // Global keyboard shortcut: Ctrl+S or Cmd+S triggers instant product save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const form = document.getElementById("product-form") as HTMLFormElement | null;
        if (form) {
          toast.info("Saving product…");
          form.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Derive smart specification preset suggestion from selected categories
  const suggestedCategoryPreset = useMemo<LifestyleCategoryPreset | null>(() => {
    const selected = categories.filter((c) => selectedCategoryIds.includes(c.id));
    const text = selected.map((c) => c.name.toLowerCase()).join(" ");
    if (/leather|wallet|bag|belt|tote|purse|backpack/i.test(text)) return "leather";
    if (/headwear|cap|hat|beanie|bucket/i.test(text)) return "headwear";
    if (/accessories|accessory|jewelry|necklace|bracelet|eyewear|sunglasses|living/i.test(text))
      return "accessories";
    if (
      /shirt|tee|t-shirt|hoodie|sweatshirt|jacket|outerwear|denim|pant|trouser|apparel/i.test(text)
    )
      return "apparel";
    return null;
  }, [categories, selectedCategoryIds]);

  // Unsaved changes warning for both browser close/refresh AND Next.js client-side link navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleDocumentClick = (e: MouseEvent) => {
      if (!isDirty) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const confirmed = window.confirm(
        "You have unsaved product changes. Are you sure you want to leave without saving?"
      );
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
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

  // 1-Click Drop Preset handler: auto-populates title, story, specs, sizes, and courier weight
  const handleApplyDropPreset = (presetKey: "tee" | "hoodie" | "bottoms" | "accessories") => {
    setIsDirty(true);
    let targetSizes: string[] = [];
    let defaultWeight = "";

    if (presetKey === "tee") {
      if (!name.trim()) {
        setName("VibeLock Heavyweight Boxy Tee");
        setSlug(slugify("VibeLock Heavyweight Boxy Tee"));
      }
      setDescription(
        "### The Signature Heavyweight Boxy Tee\n\nEngineered for everyday streetwear rotation. Cut with an exaggerated drop-shoulder and wide boxy torso.\n\n• 100% Combed Compact Cotton, 260 GSM French Terry\n• High-density ribbed crewneck collar (anti-sag)\n• Pre-shrunk fabric to minimize shrinkage\n• Cold machine wash inside out; hang dry in shade\n• Model is 5'11\" wearing Size L for relaxed streetwear silhouette"
      );
      setSpecifications(LIFESTYLE_PRESETS.apparel);
      targetSizes = [...LIFESTYLE_SIZE_GROUPS.apparel.sizes];
      defaultWeight = "0.25";
      toast.success("Applied Heavyweight Boxy Tee template!");
    } else if (presetKey === "hoodie") {
      if (!name.trim()) {
        setName("VibeLock Heavyweight Streetwear Hoodie");
        setSlug(slugify("VibeLock Heavyweight Streetwear Hoodie"));
      }
      setDescription(
        "### Winter Heavyweight Pullover Hoodie\n\nBuilt with 380 GSM brushed fleece cotton for cold streetwear comfort and thermal retention.\n\n• 100% Brushed Fleece Cotton, 380 GSM Heavyweight\n• Double-layered hood with drawless aesthetic\n• Deep kangaroo front pocket with reinforced bar-tacks\n• Ribbed cuffs and hem with shape-memory elastic\n• Hand or machine wash gentle; lay flat to dry"
      );
      setSpecifications({
        categoryPreset: "apparel",
        attributes: [
          { label: "Fabric", value: "100% Brushed Fleece Cotton" },
          { label: "Weight", value: "380 GSM Heavyweight Fleece" },
          { label: "Fit Type", value: "Boxy Streetwear Silhouette" },
          { label: "Origin", value: "Crafted in Dhaka, BD" },
        ],
        careInstructions: [
          "Machine wash cold inside out with similar colors.",
          "Do not tumble dry. Lay flat to dry.",
          "Do not iron directly on fleece or embroidery.",
        ],
      });
      targetSizes = ["S", "M", "L", "XL", "XXL"];
      defaultWeight = "0.75";
      toast.success("Applied Winter Heavyweight Hoodie template!");
    } else if (presetKey === "bottoms") {
      if (!name.trim()) {
        setName("VibeLock Relaxed Cargo Denim");
        setSlug(slugify("VibeLock Relaxed Cargo Denim"));
      }
      setDescription(
        "### Relaxed Wide-Leg Denim / Cargo Pants\n\nCut from 13.5 oz raw cotton denim for structured streetwear stacking.\n\n• 100% Rigid Heavyweight Cotton Denim (13.5 oz)\n• Reinforced double-needle construction at stress points\n• Relaxed wide-leg drape tailored for sneaker stacks\n• Machine wash inside out with cold water"
      );
      setSpecifications({
        categoryPreset: "apparel",
        attributes: [
          { label: "Fabric", value: "100% Rigid Heavyweight Cotton Denim" },
          { label: "Weight", value: "13.5 oz Raw Denim" },
          { label: "Fit Type", value: "Relaxed Wide-Leg Sneaker Stack" },
          { label: "Origin", value: "Crafted in Dhaka, BD" },
        ],
        careInstructions: [
          "Wash inside-out in cold water to prevent dye fading.",
          "Hang dry; do not machine dry.",
        ],
      });
      targetSizes = [...LIFESTYLE_SIZE_GROUPS.bottoms.sizes];
      defaultWeight = "1.10";
      toast.success("Applied Cargo / Denim template!");
    } else if (presetKey === "accessories") {
      if (!name.trim()) {
        setName("VibeLock Leather Messenger Bag");
        setSlug(slugify("VibeLock Leather Messenger Bag"));
      }
      setDescription(
        "### VibeLock Streetwear Accessories & Leather\n\nCrafted with premium materials for longevity and utilitarian aesthetics.\n\n• Full Grain Cowhide Leather / Heavyweight Cotton Twill\n• Matte gunmetal hardware with custom laser etching\n• Water-resistant interior lining with organized compartments"
      );
      setSpecifications(LIFESTYLE_PRESETS.leather);
      targetSizes = ["One Size"];
      defaultWeight = "0.15";
      toast.success("Applied Cap / Leather Accessories template!");
    }

    if (targetSizes.length > 0) {
      setSelectedSizes(targetSizes);
      const colorAxis = selectedColors.length ? selectedColors : [""];
      const currentKey = slug || name;
      const nextVars: VariantFormValue[] = [];
      for (const s of targetSizes) {
        for (const c of colorAxis) {
          const existing = variants.find((v) => comboKey(v.size, v.color) === comboKey(s, c));
          if (existing) {
            nextVars.push({
              ...existing,
              size: s,
              color: c,
              weight: existing.weight || defaultWeight,
            });
          } else {
            nextVars.push({
              ...newVariant(s, c, variants[0], currentKey),
              weight: defaultWeight,
            });
          }
        }
      }
      setVariants(nextVars);
    }
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
      id="product-form"
      hideBottomBar={true}
      action={async (state, formData) => {
        const currentStatus = String(formData.get("status") ?? status);
        if (currentStatus === "PUBLISHED") {
          if (uploadedImages.length === 0) {
            toast.error(
              "Please add at least one product image before publishing live to the storefront."
            );
            return { error: "Please add at least one product image before publishing live." };
          }
          if (selectedCategoryIds.length === 0) {
            toast.error("Please select at least one store category before publishing live.");
            return { error: "Please select at least one store category before publishing live." };
          }
        }
        const intent = String(formData.get("_action_intent") || submitIntent || "save");
        const res = await saveProductAction(state, formData);
        if (!res.error) {
          setIsDirty(false);
          if (intent === "save_and_add_another") {
            toast.success("Product created! Opening new draft…");
            router.push("/admin/products/new");
            router.refresh();
          } else {
            toast.success(
              product ? "Product updated successfully!" : "Product created successfully!"
            );
            router.push("/admin/products");
            router.refresh();
          }
        }
        return res;
      }}
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* ── TOP HEADER BAR: TITLE, STATUS & PRIMARY ACTIONS ── */}
      <header className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            href="/admin/products"
            className="text-muted-foreground hover:text-vl-dark-900 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to products
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-vl-dark-900 text-2xl font-semibold tracking-tight sm:text-3xl">
              {product?.id ? product.name : isDuplicate ? "Duplicate product" : "Create product"}
            </h1>
            {product?.id && (
              <span
                className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                  product.status === "PUBLISHED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : product.status === "DRAFT"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-vl-dark-900/15 bg-vl-white-300 text-vl-dark-900"
                }`}
              >
                {product.status === "PUBLISHED"
                  ? "Published"
                  : product.status === "DRAFT"
                    ? "Draft"
                    : "Archived"}
              </span>
            )}
          </div>
          {isDuplicate && duplicateFromName && (
            <p className="text-muted-foreground text-xs">
              Cloned from <strong>{duplicateFromName}</strong>. Adjust details and save to create a
              new product.
            </p>
          )}
          {product?.id && (
            <p className="text-muted-foreground font-mono text-xs">Slug: /{product.slug}</p>
          )}
        </div>

        {/* ── TOP RIGHT UTILITY LINKS (VIEW IN STORE / DUPLICATE FOR EXISTING PRODUCTS) ── */}
        {product?.id ? (
          <div className="flex flex-wrap items-center gap-2">
            {product.status === "PUBLISHED" && (
              <a
                href={`/product/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-vl-dark-900/20 text-vl-dark-900/80 hover:bg-vl-white-300 hover:text-vl-dark-900 focus-visible:ring-vl-cyan inline-flex min-h-9 items-center gap-1.5 border bg-white px-3 text-xs font-semibold shadow-2xs transition-colors"
                title="View on live storefront"
              >
                <ExternalLink className="size-3.5" />
                <span>View in store</span>
              </a>
            )}

            <Link
              href={`/admin/products/new?duplicateFrom=${product.id}`}
              className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 focus-visible:ring-vl-cyan inline-flex min-h-9 items-center justify-center gap-1.5 border bg-white px-3 text-xs font-semibold transition-colors"
              title="Clone this product into a new draft"
            >
              <Copy className="size-3.5" />
              <span>Duplicate</span>
            </Link>
          </div>
        ) : null}
      </header>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* TWO-COLUMN MASTER-DETAIL WORKSPACE */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── LEFT MAIN WORKHORSE COLUMN (Content, Media & Variants) ── */}
        <div className="min-w-0 space-y-6">
          {/* SECTION 1: BASIC INFORMATION & STORY */}
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
            onApplyPreset={handleApplyDropPreset}
          />

          {/* SECTION 2: PRODUCT IMAGES & MEDIA */}
          <ProductImageUploader
            initialImages={product?.images ?? []}
            onImagesChange={setUploadedImages}
          />

          {/* SECTION 3: VARIANT GENERATOR — SIZES, COLORS, STOCK, WEIGHT & PROFIT MARGIN */}
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

          {/* SECTION 4: LIFESTYLE SPECIFICATIONS & CARE */}
          <input
            type="hidden"
            name="specifications"
            value={specifications ? JSON.stringify(specifications) : ""}
          />
          <ProductSpecificationsSection
            specifications={specifications}
            onSpecificationsChange={(newSpecs) => {
              setSpecifications(newSpecs);
              setIsDirty(true);
            }}
            suggestedCategoryPreset={suggestedCategoryPreset}
          />
        </div>

        {/* ── RIGHT STICKY CONTROL & PREVIEW SIDEBAR ── */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* STICKY PRIMARY ACTIONS CARD (ABOVE PUBLISHING STATUS) */}
          <div className="border-vl-dark-900/10 space-y-2.5 rounded-sm border bg-white p-4 shadow-xs">
            {isDirty && (
              <div className="flex items-center justify-between pb-0.5 text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                  <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
                <span className="text-muted-foreground font-mono text-[10px] tracking-wide">
                  Ctrl+S to save
                </span>
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              className="min-h-11 w-full text-xs font-bold tracking-wider uppercase shadow-xs"
            >
              {product?.id ? "Save product" : "Create product"}
            </Button>
            <div className="flex items-center gap-2">
              {!product?.id && (
                <Button
                  type="submit"
                  name="_action_intent"
                  value="save_and_add_another"
                  variant="outline"
                  onClick={() => setSubmitIntent("save_and_add_another")}
                  className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 min-h-9 flex-1 text-xs font-semibold"
                >
                  <Plus className="mr-1 size-3.5" /> Save &amp; Add Another
                </Button>
              )}
              <Link
                href="/admin/products"
                onClick={(e) => {
                  if (
                    isDirty &&
                    !window.confirm(
                      "You have unsaved product changes. Are you sure you want to cancel?"
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 inline-flex min-h-9 flex-1 items-center justify-center rounded-sm border bg-white px-3 text-xs font-semibold transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>

          {/* SIDEBAR CARD 1: LIVE STOREFRONT CARD PREVIEW */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground text-xs font-semibold">Storefront Card</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowLivePreview((prev) => !prev)}
                className="text-vl-dark-900 inline-flex h-6 items-center gap-1 px-1.5 text-xs font-semibold"
              >
                {showLivePreview ? (
                  <>
                    <EyeOff className="size-3.5" /> Hide preview
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" /> Show preview
                  </>
                )}
              </Button>
            </div>
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
          </div>

          {/* SIDEBAR CARD 2: PUBLICATION & VISIBILITY */}
          <div className="border-vl-dark-900/10 space-y-4 rounded-sm border bg-white p-5 shadow-xs">
            <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-tight">
                  Publishing Status
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Storefront visibility and discovery.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                  status === "PUBLISHED"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : status === "DRAFT"
                      ? "border border-amber-200 bg-amber-50 text-amber-800"
                      : "bg-vl-white-300 text-vl-dark-900 border-vl-dark-900/15 border"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    status === "PUBLISHED"
                      ? "bg-emerald-500"
                      : status === "DRAFT"
                        ? "bg-amber-500"
                        : "bg-vl-dark-900"
                  }`}
                />
                {status}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="product-status"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Storefront State
                </label>
                <div className="mt-1.5">
                  <NativeSelect
                    id="product-status"
                    name="status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED");
                      setIsDirty(true);
                    }}
                    size="sm"
                    className="text-xs font-medium"
                  >
                    <option value="DRAFT">Draft — Hidden from store, save for later</option>
                    <option value="PUBLISHED">Published — Live and purchasable in store</option>
                    <option value="ARCHIVED">Archived — Hidden from store and discontinued</option>
                  </NativeSelect>
                </div>
              </div>

              {/* FEATURED PRODUCT TOGGLE */}
              <div className="border-vl-dark-900/10 border-t pt-3.5">
                <label className="flex cursor-pointer items-start gap-2.5 select-none">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    value="true"
                    checked={isFeatured}
                    onChange={(e) => {
                      setIsFeatured(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="border-vl-dark-900/30 text-vl-dark-900 focus:ring-vl-cyan mt-0.5 size-4 rounded"
                  />
                  <div>
                    <span className="text-vl-dark-900 flex items-center gap-1 text-xs font-bold">
                      ⭐ Feature on Storefront
                    </span>
                    <span className="text-muted-foreground block text-[11px] leading-tight">
                      Highlight prominently on homepage hero and featured collection sliders.
                    </span>
                  </div>
                </label>
              </div>

              {status === "PUBLISHED" &&
                (uploadedImages.length === 0 || selectedCategoryIds.length === 0) && (
                  <div className="rounded border border-amber-200/90 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <p className="font-semibold">⚠️ Live Quality Gate Alert:</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px]">
                      {uploadedImages.length === 0 && (
                        <li>At least 1 product image must be added before going live.</li>
                      )}
                      {selectedCategoryIds.length === 0 && (
                        <li>At least 1 category must be selected before going live.</li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </div>

          {/* SIDEBAR CARD 3: CATEGORIES */}
          <div className="border-vl-dark-900/10 space-y-3.5 rounded-sm border bg-white p-5 shadow-xs">
            <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-tight">
                  Product Categories
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Collections for store navigation.
                </p>
              </div>
              <span className="bg-vl-white-200 text-vl-dark-900 border-vl-dark-900/10 rounded border px-2 py-0.5 font-mono text-[10px] font-bold">
                {selectedCategoryIds.length} selected
              </span>
            </div>
            <CategoryMultiSelect
              categories={categories}
              initialSelectedIds={product?.categoryIds ?? []}
              onChange={(ids) => {
                setSelectedCategoryIds(ids);
                setIsDirty(true);
              }}
            />
          </div>
        </div>
      </div>
    </AdminSaveForm>
  );
}
