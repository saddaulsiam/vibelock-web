"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, ImagePlus, Layers, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { CategorySearchableSelect } from "@/components/admin/category-select";
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
  parentId: string | null;
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
  const [parentId, setParentId] = React.useState(category?.parentId ?? "");
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
      </div>
    </AdminSaveForm>
  );
}
