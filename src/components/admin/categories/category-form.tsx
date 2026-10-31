"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, ImagePlus, Layers, Megaphone, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminSaveForm } from "@/components/admin/shared";
import { CategorySearchableSelect } from "./category-select";
import { saveCategoryAction } from "@/lib/admin/catalog-actions";

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const STREETWEAR_CATEGORY_PRESETS = [
  {
    label: "T-Shirts",
    text: "Heavyweight 240+ GSM combed cotton oversized streetwear tees with dropped shoulders and reinforced collar ribs.",
  },
  {
    label: "Hoodies & Sweats",
    text: "Heavyweight 400+ GSM fleece hoodies built for cold urban nights. Boxy silhouette with double-layered thermal hood.",
  },
  {
    label: "Pants & Cargos",
    text: "Utilitarian cargo and relaxed trousers featuring multi-pocket ergonomics, durable canvas, and custom hardware.",
  },
  {
    label: "Jackets & Outerwear",
    text: "Technical outerwear engineered for layering. Weather-resistant fabrics, minimal branding, and tactical detailing.",
  },
  {
    label: "Accessories",
    text: "Curated streetwear essentials including bags, headwear, belts, and daily carry items designed to complete your fit.",
  },
];

type CategoryFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  parentId: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export function CategoryForm({
  category,
  categories,
}: {
  category: CategoryFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const [name, setName] = React.useState(category?.name ?? "");
  const [slug, setSlug] = React.useState(category?.slug ?? "");
  const [description, setDescription] = React.useState(category?.description ?? "");
  const [metaTitle, setMetaTitle] = React.useState(category?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = React.useState(category?.metaDescription ?? "");
  const [parentId, setParentId] = React.useState(category?.parentId ?? "");
  const [isActive, setIsActive] = React.useState(category?.isActive ?? true);
  const [sortOrder, setSortOrder] = React.useState(category?.sortOrder ?? 0);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(Boolean(category?.slug));
  const [isDirty, setIsDirty] = React.useState(false);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(category?.imageUrl ?? null);
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [useUrlInput, setUseUrlInput] = React.useState(false);
  const [externalUrl, setExternalUrl] = React.useState(category?.imageUrl ?? "");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setIsDirty(true);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setIsSlugManuallyEdited(true);
    setIsDirty(true);
  };

  const handleGenerateSlug = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a category name first to generate a slug.");
      return;
    }
    const generated = slugify(trimmed);
    setSlug(generated);
    setIsSlugManuallyEdited(false);
    setIsDirty(true);
    toast.success("Slug generated from category name!");
  };

  const processFile = (file: File) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedMimes.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, GIF, or AVIF image files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsRemoved(false);
    setIsDirty(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setIsRemoved(true);
    setExternalUrl("");
    setIsDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Image marked for removal on save.");
  };

  const fieldClass =
    "mt-1.5 min-h-11 w-full rounded-sm border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none transition-colors placeholder:text-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

  return (
    <AdminSaveForm
      action={async (state, formData) => {
        setIsDirty(false);
        return saveCategoryAction(state, formData);
      }}
      submitLabel={category ? "Save category" : "Create category"}
      secondaryAction={
        <Link
          href="/admin/categories"
          className="inline-flex min-h-10 items-center justify-center border border-[#101114]/20 bg-white px-4 text-sm font-medium text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          Cancel
        </Link>
      }
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      {isRemoved ? <input type="hidden" name="removeImage" value="true" /> : null}

      {/* STATUS & UNSAVED CHANGES INDICATOR */}
      {isDirty ? (
        <div className="flex items-center justify-between rounded-sm border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-amber-500" />
            <span className="font-semibold">Unsaved changes</span>
            <span className="text-amber-700/80">
              — remember to save this category before navigating away
            </span>
          </div>
          {category && (
            <span className="font-medium text-amber-900/70">Editing: {category.name}</span>
          )}
        </div>
      ) : null}

      {/* SECTION 1: BASIC INFORMATION */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <h3 className="text-base font-semibold text-[#101114]">Basic Information</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Category name, instant auto-syncing URL handle, and description presets for storefront
            SEO.
          </p>
        </div>

        <div className="space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-[#101114]">
              Category Name{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
            </label>
            <input
              id="category-name"
              className={fieldClass}
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Oversized Heavyweight Hoodies"
              autoComplete="off"
            />
          </div>

          {/* Category Slug with Auto-Sync & Manual Edit */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="category-slug" className="block text-sm font-medium text-[#101114]">
                Category Slug{" "}
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
              id="category-slug"
              className={`${fieldClass} font-mono text-xs`}
              name="slug"
              maxLength={160}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. oversized-heavyweight-hoodies"
              autoComplete="off"
            />
            <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
              <Globe className="size-3.5 text-[#101114]/40" />
              <span>Preview:</span>
              <span className="font-mono text-[#101114]">
                vibelock.bd/category/
                <strong className="font-semibold text-[#101114]">{slug || "category-slug"}</strong>
              </span>
            </div>
          </div>

          {/* Description with Quick Streetwear Presets */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="category-description"
                className="block text-sm font-medium text-[#101114]"
              >
                Description{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  ({description.length}/1000 characters)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Quick presets:</span>
                {STREETWEAR_CATEGORY_PRESETS.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => {
                      setDescription(tmpl.text);
                      setIsDirty(true);
                      toast.success(`Applied ${tmpl.label} description!`);
                    }}
                    className="border border-[#101114]/15 bg-[#F9F8F6] px-2 py-0.5 text-[11px] font-medium text-[#101114] transition-colors hover:border-[#101114] hover:bg-[#F3F0E8]"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="category-description"
              className={`${fieldClass} min-h-24 resize-y`}
              name="description"
              maxLength={1000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Enter a compelling description for catalog listing and search engine optimization..."
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: CATEGORY HERO / COVER IMAGE */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#101114]">
                Category Hero &amp; Cover Image
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Used in the storefront hero section, category grids, mobile drawer, and navigation
                cards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUseUrlInput((prev) => !prev);
                setIsDirty(true);
              }}
              className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 transition-colors hover:text-[#101114]"
            >
              {useUrlInput ? (
                <>
                  <Upload className="size-3.5" /> Upload local file instead
                </>
              ) : (
                <>
                  <Globe className="size-3.5 text-[#00D9FF]" /> Or use external image URL
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Image Card */}
        {previewUrl && !isRemoved ? (
          <div className="space-y-3">
            <div className="relative aspect-video max-w-md overflow-hidden rounded-sm border border-[#101114]/20 bg-black/5 shadow-xs">
              <Image
                src={previewUrl}
                alt="Category image preview"
                fill
                unoptimized={previewUrl.startsWith("blob:")}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between text-white">
                <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                  Active Cover Image
                </span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1 rounded bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-red-600"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              To replace this image, drop a new file below or select a new image.
            </p>
          </div>
        ) : null}

        {/* Upload Zone / URL Input */}
        {!useUrlInput ? (
          <div>
            <label
              htmlFor="category-image-file"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-[#00D9FF] bg-[#00D9FF]/5"
                  : "border-[#101114]/20 bg-[#FBF9F5] hover:border-[#101114] hover:bg-[#F3F0E8]"
              }`}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-xs">
                <ImagePlus className="size-6 text-[#101114]/70" />
              </div>
              <span className="mt-3 text-sm font-semibold text-[#101114]">
                {previewUrl && !isRemoved
                  ? "Choose a different image file"
                  : "Click or drag & drop to upload image"}
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                Uploads directly to Cloudinary CDN • Supports JPG, PNG, WebP, GIF, or AVIF (Max 5MB)
              </span>
              <input
                id="category-image-file"
                ref={fileInputRef}
                type="file"
                name="imageFile"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>
        ) : (
          <div>
            <label
              htmlFor="category-image-url"
              className="block text-xs font-semibold text-[#101114]"
            >
              Public Image URL (HTTPS or Cloudinary CDN)
            </label>
            <input
              id="category-image-url"
              type="url"
              name="imageUrl"
              value={externalUrl}
              onChange={(e) => {
                setExternalUrl(e.target.value);
                setPreviewUrl(e.target.value.trim() || null);
                setIsRemoved(false);
                setIsDirty(true);
              }}
              placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..."
              className={fieldClass}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Directly links an external CDN image without re-uploading.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: HIERARCHY & PLACEMENT */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[#101114]" />
            <h3 className="text-base font-semibold text-[#101114]">Hierarchy &amp; Placement</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Organize categories into parent-child nesting for multi-level navigation and catalog
            filters.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#101114]">
            Parent Category <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <CategorySearchableSelect
            categories={categories}
            currentCategoryId={category?.id}
            value={parentId}
            onChange={(newParentId) => {
              setParentId(newParentId);
              setIsDirty(true);
            }}
            name="parentId"
            placeholder="Search & choose parent category..."
          />
          <div className="text-muted-foreground mt-2 space-y-1 text-xs">
            <p>
              • <strong>Top-level category:</strong> Displays prominently in the main navigation bar
              and featured categories section.
            </p>
            <p>
              • <strong>Sub-category:</strong> Groups under the selected parent category in dropdown
              menus and filter drawers.
            </p>
          </div>
        </div>

        {/* Display Priority & Merchandising */}
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#101114]">
              Display Priority (Sort Order)
            </label>
            <input
              type="number"
              name="sortOrder"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(Number(e.target.value));
                setIsDirty(true);
              }}
              min="0"
              className={fieldClass}
              placeholder="0"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Lower numbers appear first in the navigation menu (0, 1, 2...).
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#101114]">
              Storefront Visibility
            </label>
            <div className="flex h-11 items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3.5">
              <span className="text-xs font-semibold text-neutral-800">
                {isActive ? "Active at Storefront" : "Hidden / Draft"}
              </span>
              <input
                type="hidden"
                name="isActive"
                value={isActive ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => {
                  setIsActive((prev) => !prev);
                  setIsDirty(true);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-emerald-600" : "bg-neutral-300"
                }`}
                role="switch"
                aria-checked={isActive}
              >
                <span
                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Toggle whether customers can view and filter this category.
            </p>
          </div>
        </div>
      </div>
      {/* SECTION 4: SEARCH ENGINE OPTIMIZATION (SEO) */}
      <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-[#101114]" />
            <h3 className="text-base font-semibold text-[#101114]">
              Search Engine Optimization (SEO)
            </h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Customize how this category appears in search engine results (Google, Bing) and social sharing cards.
          </p>
        </div>

        {/* Live Google Search Snippet Preview Box */}
        <div className="rounded-lg border border-neutral-200/90 bg-[#FBF9F5] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Google Search Result Preview
            </span>
            <span className="text-[10px] text-neutral-400">Live Simulation</span>
          </div>

          <div className="rounded-md border border-neutral-200/70 bg-white p-3.5 shadow-2xs">
            {/* Google SERP Breadcrumb / URL */}
            <div className="flex items-center gap-1.5 text-xs text-[#202124]">
              <span className="flex size-4 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-700">
                V
              </span>
              <div className="flex items-center gap-1 text-[11px] text-[#4d5156]">
                <span className="font-medium text-[#202124]">vibelock.bd</span>
                <span>›</span>
                <span>category</span>
                <span>›</span>
                <span className="font-semibold text-[#202124]">{slug || "category-slug"}</span>
              </div>
            </div>

            {/* Google Blue Link Title */}
            <div className="mt-1 text-base font-medium text-[#1a0dab] hover:underline cursor-pointer">
              {metaTitle.trim() || (name.trim() ? `${name.trim()} | VibeLock Streetwear` : "Category Title | VibeLock")}
            </div>

            {/* Google Description Snippet */}
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4d5156]">
              {metaDescription.trim() ||
                description.trim() ||
                `Explore the latest ${name.trim() || "streetwear"} collection at VibeLock. Premium fabrics, oversized silhouettes, and minimal aesthetics crafted for Dhaka youth.`}
            </p>
          </div>
        </div>

        {/* Meta Title Input */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="category-meta-title" className="block text-sm font-medium text-[#101114]">
              Page Title (Meta Title)
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono ${
                  metaTitle.length > 70
                    ? "font-bold text-amber-600"
                    : "text-muted-foreground"
                }`}
              >
                {metaTitle.length}/70 characters
              </span>
              {!metaTitle && name.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setMetaTitle(`${name.trim()} | VibeLock`);
                    setIsDirty(true);
                  }}
                  className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4 transition-colors hover:text-[#101114]"
                >
                  <Sparkles className="size-3 text-[#00D9FF]" />
                  Auto-fill
                </button>
              )}
            </div>
          </div>
          <input
            id="category-meta-title"
            className={`${fieldClass} mt-1`}
            name="metaTitle"
            maxLength={100}
            value={metaTitle}
            onChange={(e) => {
              setMetaTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder={name.trim() ? `${name.trim()} | VibeLock` : "e.g. Oversized Graphic Tees | VibeLock Dhaka"}
            autoComplete="off"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Recommended length: 50–60 characters. Displayed as the primary clickable headline in search engines.
          </p>
        </div>

        {/* Meta Description Textarea */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="category-meta-desc" className="block text-sm font-medium text-[#101114]">
              Meta Description
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono ${
                  metaDescription.length > 160
                    ? "font-bold text-amber-600"
                    : "text-muted-foreground"
                }`}
              >
                {metaDescription.length}/160 characters
              </span>
              {!metaDescription && description.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setMetaDescription(description.slice(0, 160).trim());
                    setIsDirty(true);
                  }}
                  className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4 transition-colors hover:text-[#101114]"
                >
                  <Sparkles className="size-3 text-[#00D9FF]" />
                  Copy from description
                </button>
              )}
            </div>
          </div>
          <textarea
            id="category-meta-desc"
            className={`${fieldClass} mt-1 min-h-20 resize-y`}
            name="metaDescription"
            maxLength={300}
            value={metaDescription}
            onChange={(e) => {
              setMetaDescription(e.target.value);
              setIsDirty(true);
            }}
            placeholder="e.g. Shop the newest oversized streetwear drop in Bangladesh. Minimal styling, heavyweight cotton, and express delivery across Dhaka."
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Recommended length: 120–160 characters. A concise summary shown beneath the page title in search results.
          </p>
        </div>
      </div>

      {/* SECTION 5: PROMOTIONAL BANNERS NOTICE */}
      <div className="flex items-start gap-3 rounded-lg border border-neutral-200/90 bg-[#FBF9F5] p-4 text-xs text-neutral-600">
        <Megaphone className="mt-0.5 size-4 shrink-0 text-[#101114]" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-neutral-900">Campaign &amp; Promotional Banners</p>
          <p>
            Promotional banners for this category are managed centrally in{" "}
            <Link href="/admin/banners" className="font-medium text-[#101114] underline underline-offset-2 hover:text-[#00D9FF]">
              Admin → Banners
            </Link>
            . Target banners to this category, upload desktop &amp; mobile assets, and set placement options from the marketing hub.
          </p>
        </div>
      </div>
    </AdminSaveForm>
  );
}
