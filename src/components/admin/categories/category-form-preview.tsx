"use client";

import { Eye, Globe, ImageOff, Layers } from "lucide-react";
import Image from "next/image";

export interface CategoryFormPreviewProps {
  name: string;
  slug: string;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  parentCategoryName?: string | null;
}

export function CategoryFormPreview({
  name,
  slug,
  imageUrl,
  isActive,
  sortOrder,
  parentCategoryName,
}: CategoryFormPreviewProps) {
  const cleanName = (name || "Untitled Category").replace(/^\d+[.\s-]+/, "").trim();

  return (
    <div className="border-vl-dark-900/15 overflow-hidden rounded-md border bg-white shadow-xs">
      <div className="border-vl-dark-900/10 bg-vl-white-100 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Eye className="text-vl-dark-900 size-4" />
          <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            Live Storefront Card Preview
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">3:4 catalog aspect ratio</span>
      </div>

      <div className="bg-vl-white-100 flex flex-col items-center justify-center p-4 sm:p-5">
        {/* Category Card Canvas matching storefront featured-categories.tsx */}
        <div className="group border-vl-dark-900/15 bg-vl-dark-900 relative flex aspect-3/4 w-full max-w-60 flex-col justify-end overflow-hidden rounded-sm border text-white shadow-md transition-all hover:shadow-lg">
          {/* Category Image or Fallback */}
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={cleanName}
              fill
              sizes="240px"
              unoptimized={imageUrl.startsWith("blob:")}
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="from-vl-dark-900 via-vl-dark-800 to-vl-dark-700 absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b p-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60">
                <ImageOff className="size-5" />
              </div>
              <span className="font-mono text-[11px] font-bold tracking-wider text-white/70 uppercase">
                Awaiting Cover Image
              </span>
              <span className="text-[10px] text-white/40">Upload media to see live appearance</span>
            </div>
          )}

          {/* Gradient Overlay for Legibility */}
          <div
            className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent transition-opacity group-hover:from-black/95"
            aria-hidden="true"
          />

          {/* Top Indicators */}
          <div className="pointer-events-none absolute top-2.5 right-2.5 left-2.5 z-10 flex items-center justify-between gap-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase backdrop-blur-xs ${
                isActive
                  ? "border border-emerald-400/40 bg-emerald-950/80 text-emerald-300"
                  : "border border-amber-400/40 bg-amber-950/80 text-amber-300"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              {isActive ? "Active" : "Draft"}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 font-mono text-[9px] font-semibold text-white/90 backdrop-blur-xs">
              #{sortOrder}
            </span>
          </div>

          {/* Bottom Card Content */}
          <div className="relative z-10 w-full px-3 pb-3 text-center sm:pb-4">
            {parentCategoryName && (
              <span className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-medium tracking-wide text-white/70">
                <Layers className="size-2.5" />
                {parentCategoryName}
              </span>
            )}
            <h4 className="font-heading text-sm font-bold tracking-wide text-white drop-shadow-md sm:text-base">
              {cleanName}
            </h4>
            <div className="mt-1 flex items-center justify-center gap-1 font-mono text-[10px] text-white/60">
              <Globe className="size-2.5" />
              <span>/{slug || "category-slug"}</span>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mt-3 text-center text-[11px]">
          Simulates category tile on homepage featured grid and navigation drawer.
        </p>
      </div>
    </div>
  );
}
