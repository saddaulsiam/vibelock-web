"use client";

import { useState } from "react";
import {
  Bold,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Heading3,
  Italic,
  List,
  Plus,
  Quote,
  Shirt,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LIFESTYLE_PRESETS,
  type ProductSpecifications,
  type LifestyleCategoryPreset,
} from "@/lib/catalog/specifications";

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

const COMMON_CARE_SUGGESTIONS = [
  "Machine wash cold inside out with similar colors.",
  "Do not tumble dry. Hang dry in shade to preserve prints.",
  "Iron inside-out on low heat; avoid direct iron on graphics.",
  "Spot clean only with a soft damp cloth.",
  "Wipe clean with a specialized leather conditioner.",
  "Avoid exposure to direct sunlight and high moisture.",
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
    <div className="border-vl-dark-900/10 space-y-5 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
      {/* SECTION HEADER WITH NUMBERED ANCHOR */}
      <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
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
        <div className="border-vl-dark-900/10 bg-vl-white-100 flex flex-wrap items-center justify-between gap-2.5 rounded-sm border p-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="text-vl-cyan size-4 fill-vl-cyan" />
            <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
              ⚡ 1-Click Drop Presets:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onApplyPreset("tee")}
              className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 inline-flex items-center gap-1.5 rounded border bg-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors hover:text-white"
            >
              <span>👕</span>
              <span>Heavyweight Tee</span>
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset("hoodie")}
              className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 inline-flex items-center gap-1.5 rounded border bg-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors hover:text-white"
            >
              <span>🧥</span>
              <span>Winter Hoodie</span>
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset("bottoms")}
              className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 inline-flex items-center gap-1.5 rounded border bg-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors hover:text-white"
            >
              <span>👖</span>
              <span>Cargo / Denim</span>
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset("accessories")}
              className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-dark-900 inline-flex items-center gap-1.5 rounded border bg-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors hover:text-white"
            >
              <span>🧢</span>
              <span>Cap / Leather Bag</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4.5">
        {/* PRODUCT NAME */}
        <div>
          <label htmlFor="product-name" className="text-vl-dark-900 block text-xs font-bold uppercase tracking-wider">
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
            <label htmlFor="product-slug" className="text-vl-dark-900 block text-xs font-bold uppercase tracking-wider">
              Product Slug{" "}
              <span className="text-muted-foreground font-mono text-[10px] font-normal normal-case">
                (storefront URL handle)
              </span>
            </label>
            <div className="flex items-center gap-2">
              {!isSlugManuallyEdited && name.trim() ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/80">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Auto-syncing
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onGenerateSlug}
                className="text-muted-foreground hover:text-vl-dark-900 h-auto p-0 font-semibold underline underline-offset-4"
              >
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
        <div className="border-vl-dark-900/10 space-y-2.5 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label htmlFor="product-description" className="text-vl-dark-900 block text-xs font-bold uppercase tracking-wider">
                Product Story &amp; Details
              </label>
              <p className="text-muted-foreground text-[11px]">
                Narrative brand story, silhouette cut, fabric feel, and styling advice.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setShowStoryPreview(!showStoryPreview)}
              className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-200 h-7 gap-1.5 text-xs font-semibold"
            >
              <Eye className="size-3.5" />
              <span>{showStoryPreview ? "Back to Edit" : "Preview Story"}</span>
            </Button>
          </div>

          {/* QUICK STREETWEAR SNIPPETS */}
          <div className="border-vl-dark-900/10 bg-vl-white-100 flex flex-wrap items-center gap-1.5 rounded-xs border p-2">
            <span className="text-vl-dark-900/60 font-mono text-[10px] font-bold uppercase">
              1-Click Snippets:
            </span>
            {STREETWEAR_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.label}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => insertTemplateSnippet(tmpl.snippet)}
                className="border-vl-dark-900/15 bg-white text-vl-dark-900 hover:bg-vl-dark-900 h-6 gap-1 rounded-xs px-2 text-[10px] font-semibold hover:text-white"
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
                    className="text-vl-dark-900 hover:bg-white flex size-6.5 items-center justify-center rounded text-xs font-bold transition-colors"
                  >
                    <Bold className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("*", "*")}
                    title="Italic text"
                    className="text-vl-dark-900 hover:bg-white flex size-6.5 items-center justify-center rounded text-xs italic transition-colors"
                  >
                    <Italic className="size-3.5" />
                  </button>
                  <span className="bg-vl-dark-900/15 mx-0.5 h-3.5 w-px" />
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n### ", "\n")}
                    title="Heading"
                    className="text-vl-dark-900 hover:bg-white flex size-6.5 items-center justify-center rounded text-xs font-semibold transition-colors"
                  >
                    <Heading3 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n• ")}
                    title="Bullet Point"
                    className="text-vl-dark-900 hover:bg-white flex size-6.5 items-center justify-center rounded text-xs transition-colors"
                  >
                    <List className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("\n> ")}
                    title="Quote"
                    className="text-vl-dark-900 hover:bg-white flex size-6.5 items-center justify-center rounded text-xs transition-colors"
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
            <div className="border-vl-dark-900/10 bg-vl-white-100 min-h-36 rounded-sm border p-4">
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
                      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
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

export interface ProductSpecificationsSectionProps {
  specifications: ProductSpecifications | null;
  onSpecificationsChange: (specs: ProductSpecifications | null) => void;
  suggestedCategoryPreset?: LifestyleCategoryPreset | null;
}

export function ProductSpecificationsSection({
  specifications,
  onSpecificationsChange,
  suggestedCategoryPreset,
}: ProductSpecificationsSectionProps) {
  const [newCareInput, setNewCareInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const currentSpecs: ProductSpecifications = specifications || {
    categoryPreset: "apparel",
    attributes: [
      { label: "Fabric", value: "100% Combed Compact Cotton" },
      { label: "Weight", value: "260 GSM Heavyweight French Terry" },
      { label: "Fit Type", value: "Streetwear Boxy / Drop Shoulder" },
      { label: "Origin", value: "Crafted in Dhaka, BD" },
    ],
    careInstructions: [
      "Machine wash cold inside out with similar colors.",
      "Do not tumble dry. Hang dry in shade to preserve screenprints.",
      "Iron inside-out on low heat; avoid direct iron on print details.",
    ],
  };

  const applyPreset = (presetKey: Exclude<LifestyleCategoryPreset, "custom">) => {
    const presetData = LIFESTYLE_PRESETS[presetKey];
    onSpecificationsChange(JSON.parse(JSON.stringify(presetData)));
    toast.success(`Loaded ${presetKey.toUpperCase()} specifications preset!`);
  };

  const handleAttributeChange = (index: number, field: "label" | "value", val: string) => {
    const nextAttributes = [...currentSpecs.attributes];
    nextAttributes[index] = { ...nextAttributes[index], [field]: val };
    onSpecificationsChange({
      ...currentSpecs,
      categoryPreset: "custom",
      attributes: nextAttributes,
    });
  };

  const addAttributeRow = () => {
    const nextAttributes = [...currentSpecs.attributes, { label: "Property", value: "Details" }];
    onSpecificationsChange({
      ...currentSpecs,
      categoryPreset: "custom",
      attributes: nextAttributes,
    });
  };

  const removeAttributeRow = (index: number) => {
    const nextAttributes = currentSpecs.attributes.filter((_, i) => i !== index);
    onSpecificationsChange({
      ...currentSpecs,
      categoryPreset: "custom",
      attributes: nextAttributes,
    });
  };

  const addCareInstruction = (note: string) => {
    const trimmed = note.trim();
    if (!trimmed) return;
    if (currentSpecs.careInstructions.includes(trimmed)) {
      toast.info("Care note is already added.");
      return;
    }
    onSpecificationsChange({
      ...currentSpecs,
      careInstructions: [...currentSpecs.careInstructions, trimmed],
    });
    setNewCareInput("");
  };

  const removeCareInstruction = (index: number) => {
    const nextCare = currentSpecs.careInstructions.filter((_, i) => i !== index);
    onSpecificationsChange({
      ...currentSpecs,
      careInstructions: nextCare,
    });
  };

  return (
    <div className="border-vl-dark-900/10 space-y-4 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
      {/* SECTION HEADER WITH COMPACT PREVIEW TOGGLE */}
      <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="bg-vl-dark-900 flex size-6.5 items-center justify-center rounded-sm font-mono text-[11px] font-bold text-white shadow-2xs">
            04
          </span>
          <div>
            <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
              Materials &amp; Lifestyle Specifications
            </h3>
            <p className="text-muted-foreground text-xs">
              Fabric composition, GSM weight, streetwear fit type, and care handling instructions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowPreview((prev) => !prev)}
            className="border-vl-dark-900/15 text-vl-dark-900 hover:bg-vl-white-200 inline-flex h-7 items-center gap-1.5 text-xs font-semibold"
          >
            {showPreview ? (
              <>
                <EyeOff className="size-3.5" />
                <span>Hide preview</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                <span>Preview specs</span>
              </>
            )}
          </Button>
          <Sliders className="text-vl-dark-900/20 size-4.5" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-4">
        {/* CATEGORY-AWARE SMART PRESET RECOMMENDATION */}
        {suggestedCategoryPreset && currentSpecs.categoryPreset !== suggestedCategoryPreset && (
          <div className="border-vl-cyan/40 bg-vl-cyan-50/60 flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="text-vl-cyan-700 size-3.5 shrink-0" />
              <span className="text-vl-dark-900 text-xs">
                Category suggests <strong>{suggestedCategoryPreset.toUpperCase()}</strong> specifications.
              </span>
            </div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() =>
                applyPreset(suggestedCategoryPreset as Exclude<LifestyleCategoryPreset, "custom">)
              }
              className="border-vl-dark-900 bg-white text-vl-dark-900 hover:bg-vl-dark-900 h-6 px-2 text-[10px] font-bold hover:text-white"
            >
              Apply Preset
            </Button>
          </div>
        )}

        {/* COMPACT 1-CLICK PRESETS ROW & ADD BUTTON */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[11px] font-semibold">⚡ Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("apparel")}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                currentSpecs.categoryPreset === "apparel"
                  ? "bg-vl-dark-900 text-white border-vl-dark-900 shadow-2xs font-bold"
                  : "bg-white text-vl-dark-900 border-vl-dark-900/15 hover:bg-vl-white-200"
              }`}
            >
              <Shirt className="size-3" />
              <span>Apparel</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("headwear")}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                currentSpecs.categoryPreset === "headwear"
                  ? "bg-vl-dark-900 text-white border-vl-dark-900 shadow-2xs font-bold"
                  : "bg-white text-vl-dark-900 border-vl-dark-900/15 hover:bg-vl-white-200"
              }`}
            >
              <Tag className="size-3" />
              <span>Headwear</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("leather")}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                currentSpecs.categoryPreset === "leather"
                  ? "bg-vl-dark-900 text-white border-vl-dark-900 shadow-2xs font-bold"
                  : "bg-white text-vl-dark-900 border-vl-dark-900/15 hover:bg-vl-white-200"
              }`}
            >
              <Tag className="size-3" />
              <span>Leather</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("accessories")}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                currentSpecs.categoryPreset === "accessories"
                  ? "bg-vl-dark-900 text-white border-vl-dark-900 shadow-2xs font-bold"
                  : "bg-white text-vl-dark-900 border-vl-dark-900/15 hover:bg-vl-white-200"
              }`}
            >
              <Sparkles className="size-3" />
              <span>Accessories</span>
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={addAttributeRow}
            className="text-vl-dark-900 hover:text-vl-cyan h-6 gap-1 p-0 text-xs font-semibold"
          >
            <Plus className="size-3" />
            <span>Add attribute</span>
          </Button>
        </div>

        {/* 2x2 RESPONSIVE COMPACT ATTRIBUTES GRID */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {currentSpecs.attributes.map((attr, index) => (
            <div
              key={index}
              className="border-vl-dark-900/15 focus-within:border-vl-cyan flex items-center rounded border bg-white px-2 py-1 shadow-2xs transition-colors"
            >
              <input
                placeholder="LABEL"
                value={attr.label}
                onChange={(e) => handleAttributeChange(index, "label", e.target.value)}
                className="w-24 shrink-0 bg-transparent text-[11px] font-bold uppercase tracking-wider text-vl-dark-900/70 focus:outline-none"
              />
              <span className="text-vl-dark-900/20 px-1 select-none">|</span>
              <input
                placeholder="Value / Details"
                value={attr.value}
                onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                className="flex-1 bg-transparent text-xs text-vl-dark-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeAttributeRow(index)}
                className="text-muted-foreground hover:text-red-600 ml-1 size-5 shrink-0 cursor-pointer flex items-center justify-center transition-colors"
                title="Remove attribute"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {currentSpecs.attributes.length === 0 && (
            <p className="col-span-2 text-muted-foreground border-vl-dark-900/10 border border-dashed p-3 text-center text-xs">
              No specifications defined. Click &quot;Add attribute&quot; or choose a preset.
            </p>
          )}
        </div>

        {/* COMPACT CARE & HANDLING (TAG CHIPS SYSTEM) */}
        <div className="space-y-2 border-t border-vl-dark-900/10 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-vl-dark-900 text-xs font-bold uppercase tracking-wider">
              Care &amp; Handling
            </span>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-muted-foreground text-[10px]">Quick suggestions:</span>
              {COMMON_CARE_SUGGESTIONS.slice(0, 3).map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addCareInstruction(sugg)}
                  className="border-vl-dark-900/10 bg-vl-white-200/80 hover:bg-vl-cyan/20 hover:border-vl-cyan inline-flex cursor-pointer items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] text-zinc-700 transition-colors"
                >
                  <span>+</span>
                  <span className="max-w-28 truncate">{sugg.split(".")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Add care instruction (e.g. Cold machine wash inside-out)..."
              value={newCareInput}
              onChange={(e) => setNewCareInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCareInstruction(newCareInput);
                }
              }}
              className="text-xs h-8"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => addCareInstruction(newCareInput)}
              className="border-vl-dark-900 text-vl-dark-900 h-8 shrink-0 px-3 text-xs font-bold"
            >
              Add
            </Button>
          </div>

          {/* ACTIVE CARE INLINE TAG CHIPS */}
          {currentSpecs.careInstructions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {currentSpecs.careInstructions.map((note, index) => (
                <span
                  key={index}
                  className="border-vl-dark-900/15 bg-vl-white-100 text-vl-dark-900 inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs shadow-2xs"
                >
                  <span>• {note}</span>
                  <button
                    type="button"
                    onClick={() => removeCareInstruction(index)}
                    className="text-muted-foreground hover:text-red-600 cursor-pointer font-bold ml-1"
                    title="Remove instruction"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ON-DEMAND LIVE PREVIEW ACCORDION (EXPANDS ONLY WHEN USER CLICKS 'PREVIEW SPECS') */}
        {showPreview && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-150 border-vl-dark-900/15 bg-vl-white-100 rounded-sm border p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground font-mono text-[10px] uppercase font-bold">
                👁️ Live Storefront Card Preview
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-muted-foreground hover:text-vl-dark-900 text-xs font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="bg-white border-vl-dark-900/10 space-y-2 border p-3 rounded-xs">
              <div className="bg-vl-white-300/40 border-vl-dark-900/5 grid grid-cols-2 gap-2 border p-2.5">
                {currentSpecs.attributes.map((attr, idx) => (
                  <div key={idx}>
                    <span className="text-vl-dark-900/50 block text-[9px] font-bold tracking-wider uppercase sm:text-[10px]">
                      {attr.label || "Property"}
                    </span>
                    <span className="text-vl-dark-900 text-[11px] font-semibold sm:text-xs">
                      {attr.value || "Details"}
                    </span>
                  </div>
                ))}
              </div>
              {currentSpecs.careInstructions.length > 0 && (
                <div className="text-vl-dark-900/70 space-y-0.5 pt-1 text-[11px]">
                  <p className="text-vl-dark-900 font-bold">Care Instructions:</p>
                  {currentSpecs.careInstructions.map((note, i) => (
                    <p key={i}>• {note}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
