"use client";

import * as React from "react";
import { useState, useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ExternalLink, Globe, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { BannerPlacement } from "@prisma/client";
import { toast } from "sonner";
import { CategoryMultiSelect, type CategoryOption } from "@/components/admin/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
import { saveBannerAction, type BannerActionState } from "@/lib/admin/banners/banner-actions";

const initialState: BannerActionState = { error: null };

type BannerFormValue = {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  placement: BannerPlacement;
  sortOrder: number;
  isActive: boolean;
  categories: { id: string }[];
};

const TITLE_SUGGESTIONS = [
  "Winter 2026 Heavyweight Drop",
  "Acid Wash & Vintage Graphic Drops",
  "End of Season Clearance - Up to 40% Off",
  "Urban Tactical Cargo & Outerwear",
  "Limited Edition Streetwear Essentials",
];

const DESTINATION_PRESETS = [
  { label: "All Products", url: "/shop" },
  { label: "T-Shirts", url: "/category/t-shirts" },
  { label: "Hoodies & Sweats", url: "/category/hoodies" },
  { label: "Cargo Pants", url: "/category/pants" },
  { label: "Sale Items", url: "/shop?sort=sale" },
];

export function BannerForm({
  banner,
  categories = [],
}: {
  banner?: BannerFormValue;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveBannerAction, initialState);

  // Toast feedback & auto-redirect on successful banner creation
  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
      if (!banner) {
        router.push("/admin/banners");
      }
    }
  }, [state.message, banner, router]);

  // Form Fields
  const [title, setTitle] = useState(banner?.title ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [placement, setPlacement] = useState<BannerPlacement>(banner?.placement ?? "BOTH");
  const [sortOrder, setSortOrder] = useState<number>(banner?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState<boolean>(banner?.isActive ?? true);

  // Desktop Image State
  const [useDesktopUrlInput, setUseDesktopUrlInput] = useState(
    Boolean(banner?.imageUrl && !banner.imageUrl.startsWith("blob:"))
  );
  const [desktopUrl, setDesktopUrl] = useState(banner?.imageUrl ?? "");
  const [desktopPreview, setDesktopPreview] = useState<string | null>(banner?.imageUrl ?? null);
  const [desktopFileName, setDesktopFileName] = useState<string | null>(null);
  const [isDesktopDragging, setIsDesktopDragging] = useState(false);
  const desktopFileRef = useRef<HTMLInputElement>(null);

  // Mobile Image State
  const [useMobileUrlInput, setUseMobileUrlInput] = useState(
    Boolean(banner?.mobileImageUrl && !banner.mobileImageUrl.startsWith("blob:"))
  );
  const [mobileUrl, setMobileUrl] = useState(banner?.mobileImageUrl ?? "");
  const [mobilePreview, setMobilePreview] = useState<string | null>(banner?.mobileImageUrl ?? null);
  const [mobileFileName, setMobileFileName] = useState<string | null>(null);
  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const mobileFileRef = useRef<HTMLInputElement>(null);

  // File validation helper
  const validateFile = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) {
      toast.error(
        `"${file.name}" is not a supported image format. Please use JPG, PNG, WebP, GIF, or AVIF.`
      );
      return false;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 8MB limit. Please compress or choose a smaller image.`);
      return false;
    }
    return true;
  };

  // Desktop File Handlers
  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file)) {
        if (desktopFileRef.current) desktopFileRef.current.value = "";
        return;
      }
      setDesktopFileName(file.name);
      setDesktopPreview(URL.createObjectURL(file));
      setDesktopUrl("");
    }
  };

  const handleDesktopDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDesktopDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!validateFile(file)) return;
      if (desktopFileRef.current) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          desktopFileRef.current.files = dt.files;
        } catch {}
      }
      setDesktopFileName(file.name);
      setDesktopPreview(URL.createObjectURL(file));
      setDesktopUrl("");
    }
  };

  const handleClearDesktop = () => {
    setDesktopPreview(null);
    setDesktopUrl("");
    setDesktopFileName(null);
    if (desktopFileRef.current) desktopFileRef.current.value = "";
  };

  // Mobile File Handlers
  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file)) {
        if (mobileFileRef.current) mobileFileRef.current.value = "";
        return;
      }
      setMobileFileName(file.name);
      setMobilePreview(URL.createObjectURL(file));
      setMobileUrl("");
    }
  };

  const handleMobileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsMobileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!validateFile(file)) return;
      if (mobileFileRef.current) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          mobileFileRef.current.files = dt.files;
        } catch {}
      }
      setMobileFileName(file.name);
      setMobilePreview(URL.createObjectURL(file));
      setMobileUrl("");
    }
  };

  const handleClearMobile = () => {
    setMobilePreview(null);
    setMobileUrl("");
    setMobileFileName(null);
    if (mobileFileRef.current) mobileFileRef.current.value = "";
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!desktopFileName && !desktopUrl && !desktopPreview) {
      e.preventDefault();
      toast.error("Please upload or provide a desktop banner image.");
      return;
    }
  };

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      onSubmit={handleFormSubmit}
      className="space-y-6"
    >
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}

      {/* Hidden file inputs for direct upload */}
      <input
        ref={desktopFileRef}
        id="desktop-image-file"
        type="file"
        name="desktopImageFile"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleDesktopFileChange}
        className="sr-only"
      />
      <input
        ref={mobileFileRef}
        id="mobile-image-file"
        type="file"
        name="mobileImageFile"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleMobileFileChange}
        className="sr-only"
      />

      {/* Hidden fallback/URL inputs */}
      <input type="hidden" name="imageUrl" value={desktopUrl} />
      <input type="hidden" name="mobileImageUrl" value={mobileUrl} />

      {/* Error & Success Feedback */}
      {state.error && (
        <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          <X className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div>
            <span className="font-bold">Error: </span>
            {state.error}
          </div>
        </div>
      )}

      {state.message && (
        <div className="border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          {state.message}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: BANNER DETAILS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-5 border border-vl-dark-900/10 bg-white p-4 sm:p-6">
        <div className="border-b border-vl-dark-900/10 pb-4">
          <h3 className="text-base font-semibold text-vl-dark-900">Banner Details</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Configure campaign identity, destination navigation, and display placement.
          </p>
        </div>

        <div className="space-y-4">
          {/* Internal Title */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="banner-title" className="block text-xs font-semibold text-vl-dark-900">
                Campaign Title <span className="text-red-500">*</span>
              </label>
              <span className="text-muted-foreground font-mono text-[11px]">
                {title.length} / 120 chars
              </span>
            </div>
            <div className="mt-1.5">
              <Input
                id="banner-title"
                name="title"
                required
                minLength={2}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Winter 2026 Heavyweight Collection"
                size="default"
              />
            </div>

            {/* Quick Title Presets */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Quick suggestions:</span>
              {TITLE_SUGGESTIONS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setTitle(preset)}
                  className="h-6 rounded border-vl-dark-900/15 bg-vl-white-100 px-2 py-0.5 text-[11px] font-medium text-vl-dark-900 hover:bg-vl-dark-900 hover:text-white"
                >
                  + {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Click-through Link */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="banner-link" className="block text-xs font-semibold text-vl-dark-900">
                Destination Link URL (Optional)
              </label>
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  <span>Test link</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="mt-1.5">
              <Input
                id="banner-link"
                name="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/products or /category/t-shirts or https://..."
                size="default"
              />
            </div>

            {/* Destination Presets */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Common destinations:</span>
              {DESTINATION_PRESETS.map((dest) => (
                <Button
                  key={dest.url}
                  type="button"
                  variant={linkUrl === dest.url ? "primary" : "outline"}
                  size="xs"
                  onClick={() => setLinkUrl(dest.url)}
                  className="h-6 rounded px-2 py-0.5 text-[11px] font-medium"
                >
                  {dest.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Placement and Sort Order */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="banner-placement"
                className="block text-xs font-semibold text-vl-dark-900"
              >
                Showcase Placement
              </label>
              <div className="mt-1.5">
                <NativeSelect
                  id="banner-placement"
                  name="placement"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as BannerPlacement)}
                  size="default"
                >
                  <option value="BOTH">Category pages + Search results (Recommended)</option>
                  <option value="CATEGORY">Category pages only</option>
                  <option value="SEARCH">Search results only</option>
                </NativeSelect>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Choose where customers encounter this visual banner.
              </p>
            </div>

            <div>
              <label
                htmlFor="banner-sort-order"
                className="block text-xs font-semibold text-vl-dark-900"
              >
                Sort Order Priority
              </label>
              <div className="mt-1.5">
                <Input
                  id="banner-sort-order"
                  name="sortOrder"
                  type="number"
                  min={-99999}
                  max={99999}
                  step="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  size="default"
                />
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Controls slide sequence in the carousel. Lower numbers (0, 1, 2) appear first.
              </p>
            </div>
          </div>

          {/* Active Status */}
          <div className="pt-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-vl-dark-900">
              <input
                type="checkbox"
                name="isActive"
                value="on"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-vl-dark-900/30 text-vl-dark-900 focus:ring-vl-cyan"
              />
              <span>Storefront Active (Visible to customers)</span>
            </label>
            <p className="text-muted-foreground mt-1 ml-6.5 text-[11px]">
              When unchecked, the banner remains saved as a draft without appearing on the live
              storefront.
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: TARGET CATEGORIES (Matches Product Form)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 border border-vl-dark-900/10 bg-white p-4 sm:p-6">
        <div className="border-b border-vl-dark-900/10 pb-4">
          <h3 className="text-base font-semibold text-vl-dark-900">Target Categories</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Select one or more store categories to target. Leave empty to display this campaign
            storewide across all categories.
          </p>
        </div>

        <CategoryMultiSelect
          categories={categories}
          initialSelectedIds={banner?.categories.map((c) => c.id) ?? []}
          name="categoryIds"
          placeholder="Select categories (leave empty for storewide display)..."
        />

        <div className="rounded border border-vl-dark-900/10 bg-vl-white-100 p-3 text-xs text-vl-dark-900/80">
          <span className="font-semibold text-vl-dark-900">Storewide Rule: </span>
          If you do not select any category, this banner automatically displays across every
          category page on the storefront.
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: DESKTOP BANNER IMAGE (Direct Drag & Drop Upload)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 border border-vl-dark-900/10 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vl-dark-900/10 pb-4">
          <div>
            <h3 className="text-base font-semibold text-vl-dark-900">
              Desktop Banner Image <span className="text-red-500">*</span>
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Wide landscape banner for desktop browsers. Recommended aspect ratio: 16:7 or 21:6
              (1920 × 600px).
            </p>
          </div>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={() => setUseDesktopUrlInput((prev) => !prev)}
            className="h-auto p-0 font-semibold text-muted-foreground underline underline-offset-4 hover:text-vl-dark-900"
          >
            {useDesktopUrlInput ? (
              <>
                <Upload className="size-3.5" /> Upload local file instead
              </>
            ) : (
              <>
                <Globe className="size-3.5" /> Or use external / Cloudinary URL
              </>
            )}
          </Button>
        </div>

        {!useDesktopUrlInput ? (
          <div>
            <label
              htmlFor="desktop-image-file"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDesktopDragging(true);
              }}
              onDragLeave={() => setIsDesktopDragging(false)}
              onDrop={handleDesktopDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center transition-all ${
                isDesktopDragging
                  ? "scale-[1.01] border-vl-cyan bg-vl-cyan-50"
                  : "border-vl-dark-900/20 bg-vl-white-100/60 hover:border-vl-cyan hover:bg-vl-white-100"
              }`}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-vl-dark-900/5 text-vl-dark-900">
                <ImagePlus className="size-6 text-vl-dark-900/70" />
              </div>
              <span className="mt-3 text-sm font-semibold text-vl-dark-900">
                {desktopPreview
                  ? "Replace desktop banner image"
                  : "Click or drag to upload desktop banner"}
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                {desktopFileName
                  ? `Selected: ${desktopFileName}`
                  : "Uploads directly to Cloudinary CDN • Supports JPG, PNG, WebP, AVIF (Max 8MB)"}
              </span>
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-vl-dark-900">
              Direct Image URL (Cloudinary)
            </label>
            <div className="mt-1.5">
              <Input
                type="url"
                value={desktopUrl}
                onChange={(e) => {
                  setDesktopUrl(e.target.value);
                  setDesktopPreview(e.target.value || null);
                }}
                placeholder="https://res.cloudinary.com/..."
                size="default"
              />
            </div>
            <span className="text-muted-foreground mt-1 block text-xs">
              Paste a secure Cloudinary image URL.
            </span>
          </div>
        )}

        {/* Desktop Image Preview */}
        {desktopPreview && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-vl-dark-900">
              <span>Storefront Preview (Desktop 16:7)</span>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={handleClearDesktop}
                className="h-auto p-0 text-red-600 hover:underline"
              >
                <Trash2 className="size-3.5" />
                <span>Remove</span>
              </Button>
            </div>
            <div className="relative aspect-16/7 w-full overflow-hidden rounded-2xl bg-vl-white-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
              <Image
                src={desktopPreview}
                alt="Desktop Banner"
                fill
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
              />
              <div
                className="from-vl-dark-900/30 pointer-events-none absolute inset-0 bg-linear-to-t via-transparent to-transparent"
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute top-3.5 left-4 z-10">
                <span className="border-vl-dark-900/20 bg-vl-dark-900/85 text-vl-white-300 inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xs">
                  <span className="bg-vl-cyan size-1 rounded-full" aria-hidden="true" />
                  <span>Featured Drop</span>
                </span>
              </div>
              {linkUrl ? (
                <div className="pointer-events-none absolute right-3.5 bottom-3.5 z-10">
                  <span className="border-vl-dark-900/20 bg-vl-dark-900/90 text-vl-white-300 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xs">
                    <span>Explore</span>
                    <ArrowUpRight className="text-vl-cyan size-3" aria-hidden="true" />
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: MOBILE BANNER IMAGE (Optional Direct Upload)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 border border-vl-dark-900/10 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vl-dark-900/10 pb-4">
          <div>
            <h3 className="text-base font-semibold text-vl-dark-900">
              Mobile Banner Image{" "}
              <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Optimized vertical or square asset for smartphones. If empty, desktop visual scales
              down automatically. Recommended: 3:2 or 1:1.
            </p>
          </div>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={() => setUseMobileUrlInput((prev) => !prev)}
            className="h-auto p-0 font-semibold text-muted-foreground underline underline-offset-4 hover:text-vl-dark-900"
          >
            {useMobileUrlInput ? (
              <>
                <Upload className="size-3.5" /> Upload local file instead
              </>
            ) : (
              <>
                <Globe className="size-3.5" /> Or use external / Cloudinary URL
              </>
            )}
          </Button>
        </div>

        {!useMobileUrlInput ? (
          <div>
            <label
              htmlFor="mobile-image-file"
              onDragOver={(e) => {
                e.preventDefault();
                setIsMobileDragging(true);
              }}
              onDragLeave={() => setIsMobileDragging(false)}
              onDrop={handleMobileDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center transition-all ${
                isMobileDragging
                  ? "scale-[1.01] border-vl-cyan bg-vl-cyan-50"
                  : "border-vl-dark-900/20 bg-vl-white-100/60 hover:border-vl-cyan hover:bg-vl-white-100"
              }`}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-vl-dark-900/5 text-vl-dark-900">
                <ImagePlus className="size-6 text-vl-dark-900/70" />
              </div>
              <span className="mt-3 text-sm font-semibold text-vl-dark-900">
                {mobilePreview
                  ? "Replace mobile banner image"
                  : "Click or drag to upload mobile banner"}
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                {mobileFileName
                  ? `Selected: ${mobileFileName}`
                  : "Optional • Supports JPG, PNG, WebP, AVIF (Max 8MB)"}
              </span>
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-vl-dark-900">
              Mobile Image URL (Cloudinary)
            </label>
            <div className="mt-1.5">
              <Input
                type="url"
                value={mobileUrl}
                onChange={(e) => {
                  setMobileUrl(e.target.value);
                  setMobilePreview(e.target.value || null);
                }}
                placeholder="https://res.cloudinary.com/..."
                size="default"
              />
            </div>
            <span className="text-muted-foreground mt-1 block text-xs">
              Optional mobile-specific Cloudinary image URL.
            </span>
          </div>
        )}

        {/* Mobile Image Preview */}
        {mobilePreview && (
          <div className="mt-3 max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-vl-dark-900">
              <span>Mobile Preview (3:2)</span>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={handleClearMobile}
                className="h-auto p-0 text-red-600 hover:underline"
              >
                <Trash2 className="size-3.5" />
                <span>Remove</span>
              </Button>
            </div>
            <div className="relative aspect-3/2 w-full overflow-hidden rounded-2xl bg-vl-white-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
              <Image
                src={mobilePreview}
                alt="Mobile Banner"
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: ACTION BUTTONS (Matches Product Form)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-vl-dark-900/10 pt-6">
        <Button asChild variant="outline" size="default">
          <Link href="/admin/banners">Cancel</Link>
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="default"
          loading={pending}
        >
          {banner ? "Update banner" : "Save banner"}
        </Button>
      </div>
    </form>
  );
}
