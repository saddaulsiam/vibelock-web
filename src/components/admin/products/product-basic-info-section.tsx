"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type LifestyleCategoryPreset,
  type ProductSpecifications,
} from "@/lib/catalog/specifications";
import {
  Bold,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Heading3,
  Italic,
  List,
  Quote,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const slugify = (value: string) => {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized && value.trim()) {
    return "product";
  }
  return sanitized;
};

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
    label: "Model Stats",
    snippet: "\n• Model is 5'11\" wearing Size L for a relaxed streetwear fit",
  },
];

export interface ProductBasicInfoSectionProps {
  name: string;
  onNameChange: (val: string) => void;
  slug: string;
  onSlugChange: (val: string) => void;
  isSlugManuallyEdited: boolean;
  onGenerateSlug: () => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  specifications?: ProductSpecifications | null;
  onSpecificationsChange?: (specs: ProductSpecifications | null) => void;
  suggestedCategoryPreset?: LifestyleCategoryPreset | null;
  onApplyPreset?: (presetKey: "tee" | "hoodie" | "bottoms" | "accessories") => void;
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
  onApplyPreset,
}: ProductBasicInfoSectionProps) {
  const [showStoryPreview, setShowStoryPreview] = useState(false);

  const insertTemplateSnippet = (snippet: string) => {
    onDescriptionChange(description ? `${description.trim()}${snippet}` : snippet.trim());
    toast.success("Snippet added to story!");
  };

  const applyFormatting = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("product-description") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end);
    const replacement = selected
      ? `${prefix}${selected}${suffix}`
      : `${prefix}sample text${suffix}`;
    const next = current.substring(0, start) + replacement + current.substring(end);
    onDescriptionChange(next);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = newCursorStart + (selected ? selected.length : 11);
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 10);
  };

  return (
    <div className="border-border space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
      {/* SECTION HEADER WITH NUMBERED ANCHOR */}
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5">
          <span className="bg-vl-dark-900 flex size-6.5 items-center justify-center rounded-sm font-mono text-[11px] font-bold text-white shadow-2xs">
            01
          </span>
          <div>
            <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
              Basic Information &amp; Narrative Story
            </h3>
            <p className="text-muted-foreground text-xs">
              Product title, SEO-friendly storefront URL slug, and brand narrative story.
            </p>
          </div>
        </div>
        <FileText className="text-vl-dark-900/20 size-5" aria-hidden="true" />
      </div>

      {/* 1-CLICK DROP PRESETS BAR */}
      {onApplyPreset && (
        <div className="border-border bg-vl-white-100 flex flex-wrap items-center justify-between gap-2.5 rounded-sm border p-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="text-vl-cyan fill-vl-cyan size-4" />
            <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
              ⚡ 1-Click Drop Presets:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" size="2xs" variant="outline" onClick={() => onApplyPreset("tee")}>
              <span>👕</span>
              <span>Heavyweight Tee</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant="outline"
              onClick={() => onApplyPreset("hoodie")}
            >
              <span>🧥</span>
              <span>Winter Hoodie</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant="outline"
              onClick={() => onApplyPreset("bottoms")}
            >
              <span>👖</span>
              <span>Cargo / Denim</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant="outline"
              onClick={() => onApplyPreset("accessories")}
            >
              <span>🧢</span>
              <span>Cap / Leather Bag</span>
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4.5">
        {/* PRODUCT NAME */}
        <div>
          <label
            htmlFor="product-name"
            className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
          >
            Product Title / Name{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
          </label>
          <div className="mt-1.5">
            <Input
              id="product-name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. VibeLock Heavyweight Boxy Tee or Cyberpunk Leather Messenger"
              autoComplete="off"
              size="lg"
              className="text-sm font-semibold sm:text-base"
            />
          </div>
        </div>

        {/* SLUG */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="product-slug"
              className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
            >
              Product Slug{" "}
              <span className="text-muted-foreground font-mono text-[10px] font-normal normal-case">
                (storefront URL handle)
              </span>
            </label>
            <div className="flex items-center gap-2">
              {!isSlugManuallyEdited && name.trim() ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Auto-syncing
                </span>
              ) : null}
              <Button type="button" variant="ghost" size="2xs" onClick={onGenerateSlug}>
                <Sparkles className="text-vl-cyan size-3.5" />
                Generate from name
              </Button>
            </div>
          </div>
          <div className="mt-1.5">
            <Input
              id="product-slug"
              name="slug"
              maxLength={160}
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="vibelock-heavyweight-boxy-tee"
              autoComplete="off"
              size="default"
              className="font-mono text-xs"
            />
          </div>
          <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
            <Globe className="text-vl-dark-900/40 size-3.5" />
            <span>Preview:</span>
            <span className="text-vl-dark-900 font-mono">
              vibelock.bd/products/
              <strong className="text-vl-dark-900 font-semibold">{slug || "product-slug"}</strong>
            </span>
          </div>

          {name.trim() && /[^\x00-\x7F]/.test(name) && (
            <p className="mt-2 flex items-center gap-1.5 rounded border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800">
              <span aria-hidden="true">ℹ️</span>
              <span>
                বাংলা বা ইউনিকোড টাইটেল ডিটেক্ট হয়েছে। সার্চ ইঞ্জিন ফ্রেন্ডলি ইংরেজি URL স্লাগ
                ব্যবহার করা নিশ্চিত করুন।
              </span>
            </p>
          )}
        </div>

        {/* ── PRODUCT STORY & DESCRIPTION (ALWAYS VISIBLE) ── */}
        <div className="space-y-2.5 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label
                htmlFor="product-description"
                className="text-vl-dark-900 block text-xs font-bold tracking-wider uppercase"
              >
                Product Story &amp; Details
              </label>
              <p className="text-muted-foreground text-[11px]">
                Narrative brand story, silhouette cut, fabric feel, and styling advice.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="2xs"
              onClick={() => setShowStoryPreview(!showStoryPreview)}
            >
              {showStoryPreview ? (
                <>
                  <EyeOff className="size-3.5" />
                  <span>Back to Edit</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5" />
                  <span>Preview Story</span>
                </>
              )}
            </Button>
          </div>

          {/* QUICK STREETWEAR SNIPPETS */}
          <div className="border-border bg-vl-white-100 flex flex-wrap items-center gap-1.5 rounded-xs border p-2">
            <span className="text-vl-dark-900/60 font-mono text-[10px] font-bold uppercase">
              1-Click Snippets:
            </span>
            {STREETWEAR_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.label}
                type="button"
                variant="outline"
                size="2xs"
                onClick={() => insertTemplateSnippet(tmpl.snippet)}
                // className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 h-6 gap-1 rounded-xs bg-white px-2 text-[10px] font-semibold hover:text-white"
              >
                + {tmpl.label}
              </Button>
            ))}
          </div>

          {!showStoryPreview ? (
            <div>
              {/* RICH FORMATTING MICRO-TOOLBAR */}
              <div className="border-vl-dark-900/15 bg-vl-white-200/80 flex flex-wrap items-center justify-between rounded-t-sm border border-b-0 px-2.5 py-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyFormatting("**", "**")}
                    title="Bold text"
                    className="text-vl-dark-900 flex size-6.5 items-center justify-center rounded text-xs font-bold transition-colors hover:bg-white"
                  >
                    <Bold className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("*", "*")}
                    title="Italic text"
                    className="text-vl-dark-900 flex size-6.5 items-center justify-center rounded text-xs italic transition-colors hover:bg-white"
                  >
                    <Italic className="size-3.5" />
                  </button>
                  <span className="bg-vl-dark-900/15 mx-0.5 h-3.5 w-px" />
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n### ", "\n")}
                    title="Heading"
                    className="text-vl-dark-900 flex size-6.5 items-center justify-center rounded text-xs font-semibold transition-colors hover:bg-white"
                  >
                    <Heading3 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n• ")}
                    title="Bullet Point"
                    className="text-vl-dark-900 flex size-6.5 items-center justify-center rounded text-xs transition-colors hover:bg-white"
                  >
                    <List className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n> ")}
                    title="Quote"
                    className="text-vl-dark-900 flex size-6.5 items-center justify-center rounded text-xs transition-colors hover:bg-white"
                  >
                    <Quote className="size-3.5" />
                  </button>
                </div>
                <span className="text-muted-foreground hidden text-[10px] sm:inline">
                  Markdown formatting enabled
                </span>
              </div>

              <Textarea
                id="product-description"
                name="description"
                maxLength={5000}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Describe the aesthetic, cultural influence, fabric weight, and silhouette..."
                className="min-h-36 resize-y rounded-t-none font-sans text-xs leading-relaxed sm:text-sm"
              />
              <div className="text-muted-foreground mt-1 flex justify-between text-[11px]">
                <span>Supports markdown tags (**bold**, *italic*, bullets).</span>
                <span>{description.length} / 5000 chars</span>
              </div>
            </div>
          ) : (
            <div className="border-border bg-vl-white-100 min-h-36 rounded-sm border p-4">
              <span className="text-muted-foreground mb-2 block font-mono text-[10px] uppercase">
                Live Storefront Rendering:
              </span>
              {description.trim() ? (
                <div className="text-vl-dark-900/85 space-y-1.5 text-xs sm:text-sm">
                  {description
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((line, idx) => {
                      const isBullet =
                        line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
                      const clean = isBullet ? line.replace(/^[•\-\*]\s*/, "") : line;
                      return isBullet ? (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="bg-vl-dark-900 mt-1.5 size-1.5 shrink-0 rounded-full" />
                          <span>{clean}</span>
                        </div>
                      ) : (
                        <p key={idx}>{clean}</p>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No story content entered yet. Switch to Edit Mode to add text.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
