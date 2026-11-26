"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  Layers,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSaveForm } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { CategorySearchableSelect } from "./category-select";
import { CategoryFormPreview } from "./category-form-preview";
import { saveCategoryAction } from "@/lib/admin/catalog/catalog-actions";

export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const STREETWEAR_CATEGORY_PRESETS = [
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

export type CategoryFormValues = {
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
  isDuplicate = false,
  duplicateFromName,
}: {
  category: CategoryFormValues | null;
  categories: { id: string; name: string }[];
  isDuplicate?: boolean;
  duplicateFromName?: string;
}) {
  const router = useRouter();

  const [name, setName] = React.useState(category?.name ?? "");
  const [slug, setSlug] = React.useState(category?.slug ?? "");
  const [description, setDescription] = React.useState(category?.description ?? "");
  const [metaTitle, setMetaTitle] = React.useState(category?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = React.useState(category?.metaDescription ?? "");
  const [parentId, setParentId] = React.useState(category?.parentId ?? "");
  const [isActive, setIsActive] = React.useState(category?.isActive ?? true);
  const [sortOrder, setSortOrder] = React.useState(
    category?.sortOrder && category.sortOrder >= 1 ? category.sortOrder : 1
  );
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(Boolean(category?.slug));
  const [isDirty, setIsDirty] = React.useState(false);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(category?.imageUrl ?? null);
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [useUrlInput, setUseUrlInput] = React.useState(false);
  const [externalUrl, setExternalUrl] = React.useState(category?.imageUrl ?? "");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showLivePreview, setShowLivePreview] = React.useState(true);
  const [submitIntent, setSubmitIntent] = React.useState<"save" | "save_and_add_another">("save");

  // Global keyboard shortcut: Ctrl+S or Cmd+S triggers instant category save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const form = document.getElementById("category-form") as HTMLFormElement | null;
        if (form) {
          toast.info("Saving category…");
          form.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Unsaved changes warning for tab close AND Next.js client-side link navigation
  React.useEffect(() => {
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
        "You have unsaved category changes. Are you sure you want to leave without saving?"
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

  const selectedParentCategory = categories.find((c) => c.id === parentId);

  return (
    <AdminSaveForm
      id="category-form"
      hideBottomBar={true}
      action={async (state, formData) => {
        const intent = String(formData.get("_action_intent") || submitIntent || "save");
        const res = await saveCategoryAction(state, formData);
        if (!res.error) {
          setIsDirty(false);
          if (intent === "save_and_add_another") {
            toast.success("Category created! Opening new draft…");
            router.push("/admin/categories/new");
            router.refresh();
          } else {
            toast.success(
              category?.id ? "Category updated successfully!" : "Category created successfully!"
            );
            router.push("/admin/categories");
            router.refresh();
          }
        }
        return res;
      }}
    >
      {category?.id ? <input type="hidden" name="id" value={category.id} /> : null}
      {isRemoved ? <input type="hidden" name="removeImage" value="true" /> : null}
      <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

      {/* ── TOP HEADER BAR: BREADCRUMB, TITLE, STATUS & UTILITIES ── */}
      <header className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <Link
            href="/admin/categories"
            className="text-muted-foreground hover:text-vl-dark-900 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to categories
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-vl-dark-900 text-2xl font-semibold tracking-tight sm:text-3xl">
              {category?.id
                ? category.name
                : isDuplicate
                  ? "Duplicate category"
                  : "Create category"}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {isActive ? "Active at Store" : "Hidden / Draft"}
            </span>
          </div>
          {isDuplicate && duplicateFromName && (
            <p className="text-muted-foreground text-xs">
              Cloned from <strong>{duplicateFromName}</strong>. Adjust name, slug, and details to
              save.
            </p>
          )}
          {category?.id ? (
            <p className="text-muted-foreground font-mono text-xs">Slug: /{category.slug}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Define category identity, hierarchy, cover media, and SEO-friendly slug.
            </p>
          )}
        </div>

        {/* ── TOP RIGHT UTILITY ACTIONS FOR EXISTING CATEGORIES ── */}
        {category?.id ? (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/category/${category.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-vl-dark-900/20 text-vl-dark-900/80 hover:bg-vl-white-300 hover:text-vl-dark-900 focus-visible:ring-vl-cyan inline-flex min-h-9 items-center gap-1.5 border bg-white px-3 text-xs font-semibold shadow-2xs transition-colors"
              title="View on live storefront"
            >
              <ExternalLink className="size-3.5" />
              <span>View in store</span>
            </a>

            <Link
              href={`/admin/categories/new?duplicateFrom=${category.id}`}
              className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 focus-visible:ring-vl-cyan inline-flex min-h-9 items-center justify-center gap-1.5 border bg-white px-3 text-xs font-semibold transition-colors"
              title="Clone this category into a new draft"
            >
              <Copy className="size-3.5" />
              <span>Duplicate</span>
            </Link>
          </div>
        ) : null}
      </header>

      {/* ── TWO-COLUMN MASTER-DETAIL WORKSPACE ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── LEFT MAIN WORKHORSE COLUMN (Content, Media & SEO) ── */}
        <div className="min-w-0 space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
            <div className="border-vl-dark-900/10 border-b pb-4">
              <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
                Basic Information
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Category name, instant auto-syncing URL handle, and description presets for
                storefront SEO.
              </p>
            </div>

            <div className="space-y-4">
              {/* Category Name */}
              <div>
                <label
                  htmlFor="category-name"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Category Name{" "}
                  <span aria-hidden="true" className="text-red-600">
                    *
                  </span>
                </label>
                <div className="mt-1.5">
                  <Input
                    id="category-name"
                    name="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Oversized Heavyweight Hoodies"
                    autoComplete="off"
                    size="default"
                    className="text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Category Slug with Auto-Sync & Manual Edit */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="category-slug"
                    className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                  >
                    Category Slug{" "}
                    <span className="text-muted-foreground text-xs font-normal normal-case">
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
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={handleGenerateSlug}
                      className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 font-semibold underline underline-offset-4"
                    >
                      <Sparkles className="text-vl-cyan size-3.5" />
                      Generate from name
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5">
                  <Input
                    id="category-slug"
                    name="slug"
                    maxLength={160}
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g. oversized-heavyweight-hoodies"
                    autoComplete="off"
                    size="default"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                  <Globe className="text-vl-dark-900/40 size-3.5" />
                  <span>Preview:</span>
                  <span className="text-vl-dark-900 font-mono">
                    vibelock.bd/category/
                    <strong className="text-vl-dark-900 font-semibold">
                      {slug || "category-slug"}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Description with Quick Streetwear Presets */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="category-description"
                    className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                  >
                    Description{" "}
                    <span className="text-muted-foreground text-xs font-normal normal-case">
                      ({description.length}/1000 characters)
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">Quick presets:</span>
                    {STREETWEAR_CATEGORY_PRESETS.map((tmpl) => (
                      <Button
                        key={tmpl.label}
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setDescription(tmpl.text);
                          setIsDirty(true);
                          toast.success(`Applied ${tmpl.label} description!`);
                        }}
                        className="border-vl-dark-900/15 bg-vl-white-100 text-vl-dark-900 hover:border-vl-dark-900 hover:bg-vl-white-300 h-6 rounded px-2 py-0.5 text-[11px] font-medium"
                      >
                        {tmpl.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5">
                  <Textarea
                    id="category-description"
                    name="description"
                    maxLength={1000}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Enter a compelling description for catalog listing and search engine optimization..."
                    size="default"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CATEGORY HERO / COVER IMAGE */}
          <div className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
            <div className="border-vl-dark-900/10 border-b pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
                    Category Hero &amp; Cover Media
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Showcased in the homepage hero grid, category drawer, mega menu, and catalog
                    banners.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => {
                    setUseUrlInput((prev) => !prev);
                    setIsDirty(true);
                  }}
                  className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 font-semibold underline underline-offset-4"
                >
                  {useUrlInput ? (
                    <>
                      <Upload className="size-3.5" /> Upload local file instead
                    </>
                  ) : (
                    <>
                      <Globe className="text-vl-cyan size-3.5" /> Or use external image URL
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Image Preview Card */}
            {previewUrl && !isRemoved ? (
              <div className="space-y-3">
                <div className="border-vl-dark-900/20 relative aspect-video max-w-md overflow-hidden rounded-sm border bg-black/5 shadow-xs">
                  <Image
                    src={previewUrl}
                    alt="Category image preview"
                    fill
                    unoptimized={previewUrl.startsWith("blob:")}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-center justify-between text-white">
                    <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                      Active Cover Image
                    </span>
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={handleRemoveImage}
                      className="gap-1 shadow-xs"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
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
                      ? "border-vl-cyan bg-vl-cyan-50"
                      : "border-vl-dark-900/20 bg-vl-white-200 hover:border-vl-dark-900 hover:bg-vl-white-300"
                  }`}
                >
                  <div className="border-vl-dark-900/10 flex size-12 items-center justify-center rounded-full border bg-white shadow-xs">
                    <ImagePlus className="text-vl-dark-900/70 size-6" />
                  </div>
                  <span className="text-vl-dark-900 mt-3 text-sm font-semibold">
                    {previewUrl && !isRemoved
                      ? "Choose a different image file"
                      : "Click or drag & drop to upload cover image"}
                  </span>
                  <span className="text-muted-foreground mt-1 text-xs">
                    Uploads directly to Cloudinary CDN • Supports JPG, PNG, WebP, GIF, or AVIF (Max
                    5MB)
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
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Public Image URL (HTTPS or Cloudinary CDN)
                </label>
                <div className="mt-1.5">
                  <Input
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
                    size="default"
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Directly links an external CDN image without re-uploading.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: HIERARCHY & PLACEMENT */}
          <div className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
            <div className="border-vl-dark-900/10 border-b pb-4">
              <div className="flex items-center gap-2">
                <Layers className="text-vl-dark-900 size-4" />
                <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
                  Hierarchy &amp; Placement
                </h3>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Organize categories into parent-child nesting for multi-level navigation and catalog
                filters.
              </p>
            </div>

            <div>
              <label className="text-vl-dark-900 mb-1.5 block text-xs font-bold tracking-wider uppercase">
                Parent Category{" "}
                <span className="text-muted-foreground font-normal normal-case">(optional)</span>
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
              <div className="text-muted-foreground mt-2.5 space-y-1 text-xs">
                <p>
                  • <strong>Top-level category:</strong> Displays prominently in the main navigation
                  bar and featured categories section.
                </p>
                <p>
                  • <strong>Sub-category:</strong> Groups under the selected parent category in
                  dropdown menus and filter drawers.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: SEARCH ENGINE OPTIMIZATION (SEO) */}
          <div className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
            <div className="border-vl-dark-900/10 border-b pb-4">
              <div className="flex items-center gap-2">
                <Search className="text-vl-dark-900 size-4" />
                <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
                  Search Engine Optimization (SEO)
                </h3>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Customize how this category appears in search engine results (Google, Bing) and
                social sharing previews.
              </p>
            </div>

            {/* Live Google Search Snippet Preview Box */}
            <div className="bg-vl-white-200 border-vl-dark-900/10 rounded-sm border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                  Google Search Result Preview
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">Live Simulation</span>
              </div>

              <div className="border-vl-dark-900/10 rounded-xs border bg-white p-3.5 shadow-2xs">
                {/* Google Breadcrumb */}
                <div className="text-vl-dark-900 flex items-center gap-1.5 text-xs">
                  <span className="bg-vl-white-300 text-vl-dark-900 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                    V
                  </span>
                  <div className="text-vl-dark-500 flex items-center gap-1 text-[11px]">
                    <span className="text-vl-dark-900 font-medium">vibelock.bd</span>
                    <span>›</span>
                    <span>category</span>
                    <span>›</span>
                    <span className="text-vl-dark-900 font-semibold">
                      {slug || "category-slug"}
                    </span>
                  </div>
                </div>

                {/* Google Blue Link Title */}
                <div className="mt-1 cursor-pointer text-base font-medium text-blue-700 hover:underline">
                  {metaTitle.trim() ||
                    (name.trim()
                      ? `${name.trim()} | VibeLock Streetwear`
                      : "Category Title | VibeLock")}
                </div>

                {/* Google Description Snippet */}
                <p className="text-vl-dark-500 mt-1 line-clamp-2 text-xs leading-relaxed">
                  {metaDescription.trim() ||
                    description.trim() ||
                    `Explore the latest ${name.trim() || "streetwear"} collection at VibeLock. Premium fabrics, oversized silhouettes, and minimal aesthetics crafted for Dhaka youth.`}
                </p>
              </div>
            </div>

            {/* Meta Title Input */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="category-meta-title"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Page Title (Meta Title)
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] ${
                      metaTitle.length > 70 ? "font-bold text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {metaTitle.length}/70 characters
                  </span>
                  {!metaTitle && name.trim() && (
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={() => {
                        setMetaTitle(`${name.trim()} | VibeLock`);
                        setIsDirty(true);
                      }}
                      className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 font-semibold underline underline-offset-4"
                    >
                      <Sparkles className="text-vl-cyan size-3" />
                      Auto-fill
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1">
                <Input
                  id="category-meta-title"
                  name="metaTitle"
                  maxLength={100}
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={
                    name.trim()
                      ? `${name.trim()} | VibeLock`
                      : "e.g. Oversized Graphic Tees | VibeLock Dhaka"
                  }
                  autoComplete="off"
                  size="default"
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Recommended length: 50–60 characters. Displayed as the primary clickable headline in
                search engines.
              </p>
            </div>

            {/* Meta Description Textarea */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="category-meta-desc"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Meta Description
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] ${
                      metaDescription.length > 160
                        ? "font-bold text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {metaDescription.length}/160 characters
                  </span>
                  {!metaDescription && description.trim() && (
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={() => {
                        setMetaDescription(description.slice(0, 160).trim());
                        setIsDirty(true);
                      }}
                      className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 font-semibold underline underline-offset-4"
                    >
                      <Sparkles className="text-vl-cyan size-3" />
                      Copy from description
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1">
                <Textarea
                  id="category-meta-desc"
                  name="metaDescription"
                  maxLength={300}
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Shop the newest oversized streetwear drop in Bangladesh. Minimal styling, heavyweight cotton, and express delivery across Dhaka."
                  size="sm"
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Recommended length: 120–160 characters. A concise summary shown beneath the page
                title in search results.
              </p>
            </div>
          </div>

          {/* SECTION 5: PROMOTIONAL BANNERS NOTICE */}
          <div className="bg-vl-white-200 border-vl-dark-900/10 flex items-start gap-3 rounded-sm border p-4 text-xs text-neutral-600">
            <Megaphone className="text-vl-dark-900 mt-0.5 size-4 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-vl-dark-900 font-semibold">Campaign &amp; Promotional Banners</p>
              <p>
                Promotional banners for this category are managed centrally in{" "}
                <Link
                  href="/admin/banners"
                  className="text-vl-dark-900 hover:text-vl-cyan font-semibold underline underline-offset-2"
                >
                  Admin → Banners
                </Link>
                . Target banners to this category, upload desktop &amp; mobile assets, and set
                placement options from the marketing hub.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT STICKY CONTROL & PREVIEW SIDEBAR ── */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* STICKY PRIMARY ACTIONS CARD */}
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
              {category?.id ? "Save category" : "Create category"}
            </Button>
            <div className="flex items-center gap-2">
              {!category?.id && (
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
                href="/admin/categories"
                onClick={(e) => {
                  if (
                    isDirty &&
                    !window.confirm(
                      "You have unsaved category changes. Are you sure you want to cancel?"
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
              <CategoryFormPreview
                name={name}
                slug={slug}
                imageUrl={previewUrl && !isRemoved ? previewUrl : undefined}
                isActive={isActive}
                sortOrder={sortOrder}
                parentCategoryName={selectedParentCategory?.name}
              />
            )}
          </div>

          {/* SIDEBAR CARD 2: PUBLISHING & VISIBILITY */}
          <div className="border-vl-dark-900/10 space-y-4 rounded-sm border bg-white p-5 shadow-xs">
            <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-tight">
                  Publishing Status
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Storefront discovery and priority.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                  isActive
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                {isActive ? "Active" : "Draft"}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="category-status"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Storefront State
                </label>
                <div className="mt-1.5">
                  <NativeSelect
                    id="category-status"
                    value={isActive ? "ACTIVE" : "DRAFT"}
                    onChange={(e) => {
                      setIsActive(e.target.value === "ACTIVE");
                      setIsDirty(true);
                    }}
                    size="sm"
                    className="text-xs font-medium"
                  >
                    <option value="ACTIVE">Active — Live and visible in store navigation</option>
                    <option value="DRAFT">Draft — Hidden from store, save for later</option>
                  </NativeSelect>
                </div>
              </div>

              {/* DISPLAY PRIORITY (SORT ORDER) */}
              <div className="border-vl-dark-900/10 border-t pt-3.5">
                <label
                  htmlFor="category-sort-order"
                  className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
                >
                  Display Priority (Sort Order)
                </label>
                <div className="mt-1.5">
                  <Input
                    id="category-sort-order"
                    type="number"
                    name="sortOrder"
                    value={sortOrder}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      setSortOrder(val);
                      setIsDirty(true);
                    }}
                    min="1"
                    size="sm"
                    className="text-xs font-semibold"
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                  Priority 1 appears first in the top navigation bar and category grids (1, 2,
                  3...).
                </p>
              </div>

              {/* STOREFRONT QUALITY GATE ALERT */}
              {isActive && (!previewUrl || isRemoved || !description.trim()) && (
                <div className="rounded border border-amber-200/90 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <p className="font-semibold">⚠️ Storefront Quality Gate:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px]">
                    {(!previewUrl || isRemoved) && (
                      <li>Cover image is recommended for homepage and drawer grids.</li>
                    )}
                    {!description.trim() && (
                      <li>Description is recommended for search engine ranking (SEO).</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR CARD 3: TAXONOMY OVERVIEW */}
          <div className="border-vl-dark-900/10 space-y-3.5 rounded-sm border bg-white p-5 shadow-xs">
            <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-tight">
                  Taxonomy Position
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Navigation tree relationship.
                </p>
              </div>
              <span className="bg-vl-white-200 text-vl-dark-900 border-vl-dark-900/10 rounded border px-2 py-0.5 font-mono text-[10px] font-bold">
                {parentId ? "Sub-category" : "Root Category"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {parentId ? (
                <>
                  Nested under <strong>{selectedParentCategory?.name ?? "Parent Category"}</strong>.
                  It will be grouped inside that department&apos;s dropdown menu and filter
                  accordion.
                </>
              ) : (
                <>
                  Configured as a <strong>Root Department</strong>. Appears as a top-level item in
                  the main header navigation and featured collection carousels.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </AdminSaveForm>
  );
}
