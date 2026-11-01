"use client";

import { Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const STREETWEAR_TEMPLATES = [
  {
    label: "Fabric & GSM",
    snippet: "\n• 100% Combed Compact Cotton, 260 GSM Heavyweight French Terry",
  },
  {
    label: "Fit & Cut",
    snippet: "\n• Oversized drop-shoulder streetwear silhouette with ribbed crewneck",
  },
  {
    label: "Wash Care",
    snippet: "\n• Cold machine wash inside out. Do not bleach or iron directly on screenprint",
  },
  {
    label: "Size & Model",
    snippet: "\n• Model is 5'11\" wearing Size L for a relaxed streetwear fit",
  },
];

const fieldClass =
  "min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none transition-colors placeholder:text-[#101114]/35 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

export interface ProductBasicInfoSectionProps {
  name: string;
  onNameChange: (val: string) => void;
  slug: string;
  onSlugChange: (val: string) => void;
  isSlugManuallyEdited: boolean;
  onGenerateSlug: () => void;
  description: string;
  onDescriptionChange: (val: string) => void;
}

export function ProductBasicInfoSection({
  name,
  onNameChange,
  slug,
  onSlugChange,
  isSlugManuallyEdited,
  onGenerateSlug,
  description,
  onDescriptionChange,
}: ProductBasicInfoSectionProps) {
  const insertTemplateSnippet = (snippet: string) => {
    onDescriptionChange(description ? `${description.trim()}${snippet}` : snippet.trim());
    toast.success("Specification template added!");
  };

  return (
    <div className="space-y-5 border border-[#101114]/10 bg-white p-4 sm:p-6">
      <div className="border-b border-[#101114]/10 pb-4">
        <h3 className="text-base font-semibold text-[#101114]">Basic Information</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Title, live auto-generating URL handle, and rich catalog description.
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
            onChange={(e) => onNameChange(e.target.value)}
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
                onClick={onGenerateSlug}
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
            onChange={(e) => onSlugChange(e.target.value)}
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

        {/* DESCRIPTION WITH 1-CLICK TEMPLATES */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="product-description"
              className="block text-sm font-medium text-[#101114]"
            >
              Description &amp; Specifications
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Quick presets:</span>
              {STREETWEAR_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => insertTemplateSnippet(tmpl.snippet)}
                  className="inline-flex items-center gap-1 rounded border border-[#101114]/15 bg-[#F9F8F6] px-2 py-0.5 text-[11px] font-medium text-[#101114] transition-colors hover:bg-[#101114] hover:text-white"
                >
                  + {tmpl.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="product-description"
            className={`${fieldClass} mt-1.5 min-h-36 resize-y font-sans`}
            name="description"
            maxLength={5000}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Provide a detailed description of fabric, fit, styling, and care notes..."
          />
        </div>
      </div>
    </div>
  );
}

