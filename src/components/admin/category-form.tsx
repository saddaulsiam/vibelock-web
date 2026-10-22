"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Trash2, Upload, Globe } from "lucide-react";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { saveCategoryAction } from "@/lib/admin/catalog-actions";

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
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(category?.imageUrl ?? null);
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [useUrlInput, setUseUrlInput] = React.useState(false);
  const [externalUrl, setExternalUrl] = React.useState(category?.imageUrl ?? "");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsRemoved(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setIsRemoved(true);
    setExternalUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fieldClass =
    "mt-1.5 min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

  return (
    <AdminSaveForm
      action={saveCategoryAction}
      submitLabel={category ? "Save category" : "Create category"}
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      {isRemoved ? <input type="hidden" name="removeImage" value="true" /> : null}

      {/* Category Name */}
      <label className="block text-sm font-medium text-[#101114]">
        Name{" "}
        <span aria-hidden="true" className="text-red-700">
          *
        </span>
        <input
          className={fieldClass}
          name="name"
          required
          maxLength={120}
          defaultValue={category?.name ?? ""}
          autoComplete="off"
        />
      </label>

      {/* Category Slug */}
      <label className="block text-sm font-medium text-[#101114]">
        Slug{" "}
        <span className="text-muted-foreground font-normal">
          (leave blank to generate from name)
        </span>
        <input
          className={fieldClass}
          name="slug"
          maxLength={160}
          defaultValue={category?.slug ?? ""}
          autoComplete="off"
        />
      </label>

      {/* Category Hero / Cover Image */}
      <fieldset className="space-y-3 border border-[#101114]/15 bg-[#FBF9F5] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <legend className="px-1 text-sm font-semibold text-[#101114]">Category Image</legend>
            <p className="text-muted-foreground px-1 text-xs">
              Used in the storefront hero section, category grids, and navigation cards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseUrlInput((prev) => !prev)}
            className="text-muted-foreground hover:text-[#101114] inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
          >
            {useUrlInput ? (
              <>
                <Upload className="size-3.5" /> Upload local file instead
              </>
            ) : (
              <>
                <Globe className="size-3.5" /> Or use external image URL
              </>
            )}
          </button>
        </div>

        {/* Live Preview If image exists */}
        {previewUrl && !isRemoved ? (
          <div className="space-y-3">
            <div className="relative aspect-[16/9] max-w-sm overflow-hidden rounded border border-[#101114]/20 bg-black/5 shadow-sm">
              <Image
                src={previewUrl}
                alt="Category image preview"
                fill
                unoptimized={previewUrl.startsWith("blob:")}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between text-white">
                <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                  Active Image
                </span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1 rounded bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              To replace this image, select a new file below or enter a new URL.
            </p>
          </div>
        ) : null}

        {/* File Upload Input / Area */}
        {!useUrlInput ? (
          <div>
            <label
              htmlFor="category-image-file"
              className="hover:border-[#00D9FF] hover:bg-white/60 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-[#101114]/20 bg-white/40 p-6 text-center transition-colors"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[#101114]/5 text-[#101114]">
                <ImagePlus className="size-6 text-[#101114]/70" />
              </div>
              <span className="mt-3 text-sm font-semibold text-[#101114]">
                {previewUrl ? "Choose a different image file" : "Click or drag to upload image"}
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
          /* External URL Input */
          <div>
            <label className="block text-xs font-semibold text-[#101114]">
              Image URL (Public HTTPS or Cloudinary)
              <input
                type="url"
                name="imageUrl"
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  setPreviewUrl(e.target.value.trim() || null);
                  setIsRemoved(false);
                }}
                placeholder="https://res.cloudinary.com/... or https://..."
                className={fieldClass}
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* Description */}
      <label className="block text-sm font-medium text-[#101114]">
        Description
        <textarea
          className={`${fieldClass} min-h-28 resize-y`}
          name="description"
          maxLength={1000}
          defaultValue={category?.description ?? ""}
        />
      </label>

      {/* Parent category */}
      <label className="block text-sm font-medium text-[#101114]">
        Parent category <span className="text-muted-foreground font-normal">(optional)</span>
        <select className={fieldClass} name="parentId" defaultValue={category?.parentId ?? ""}>
          <option value="">No parent</option>
          {categories
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          href="/admin/categories"
          className="inline-flex min-h-10 items-center border border-[#101114]/20 px-4 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          Back to categories
        </Link>
      </div>
    </AdminSaveForm>
  );
}
