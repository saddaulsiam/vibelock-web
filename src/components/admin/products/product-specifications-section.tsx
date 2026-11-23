"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LIFESTYLE_PRESETS,
  type LifestyleCategoryPreset,
  type ProductSpecifications,
} from "@/lib/catalog/specifications";
import { Eye, EyeOff, Plus, Shirt, Sliders, Sparkles, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    <div className="border-border space-y-4 rounded-sm border bg-white p-5 shadow-xs sm:p-6">
      {/* SECTION HEADER WITH COMPACT PREVIEW TOGGLE */}
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
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
            size="2xs"
            onClick={() => setShowPreview((prev) => !prev)}
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
                Category suggests <strong>{suggestedCategoryPreset.toUpperCase()}</strong>{" "}
                specifications.
              </span>
            </div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() =>
                applyPreset(suggestedCategoryPreset as Exclude<LifestyleCategoryPreset, "custom">)
              }
              className="border-vl-dark-900 text-vl-dark-900 hover:bg-vl-dark-900 h-6 bg-white px-2 text-[10px] font-bold hover:text-white"
            >
              Apply Preset
            </Button>
          </div>
        )}

        {/* COMPACT 1-CLICK PRESETS ROW & ADD BUTTON */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[11px] font-semibold">⚡ Presets:</span>
            <Button
              type="button"
              size="2xs"
              variant={currentSpecs.categoryPreset === "apparel" ? "primary" : "outline"}
              onClick={() => applyPreset("apparel")}
            >
              <Shirt className="size-3" />
              <span>Apparel</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant={currentSpecs.categoryPreset === "headwear" ? "primary" : "outline"}
              onClick={() => applyPreset("headwear")}
            >
              <Tag className="size-3" />
              <span>Headwear</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant={currentSpecs.categoryPreset === "leather" ? "primary" : "outline"}
              onClick={() => applyPreset("leather")}
            >
              <Tag className="size-3" />
              <span>Leather</span>
            </Button>
            <Button
              type="button"
              size="2xs"
              variant={currentSpecs.categoryPreset === "accessories" ? "primary" : "outline"}
              onClick={() => applyPreset("accessories")}
            >
              <Sparkles className="size-3" />
              <span>Accessories</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="2xs"
            onClick={addAttributeRow}
            // className="text-vl-dark-900 hover:text-vl-cyan h-6 gap-1 p-0 text-xs font-semibold"
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
                className="text-vl-dark-900/70 w-24 shrink-0 bg-transparent text-[11px] font-bold tracking-wider uppercase focus:outline-none"
              />
              <span className="text-vl-dark-900/20 px-1 select-none">|</span>
              <input
                placeholder="Value / Details"
                value={attr.value}
                onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                className="text-vl-dark-900 flex-1 bg-transparent text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeAttributeRow(index)}
                className="text-muted-foreground ml-1 flex size-5 shrink-0 cursor-pointer items-center justify-center transition-colors hover:text-red-600"
                title="Remove attribute"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {currentSpecs.attributes.length === 0 && (
            <p className="text-muted-foreground border-border col-span-2 border border-dashed p-3 text-center text-xs">
              No specifications defined. Click &quot;Add attribute&quot; or choose a preset.
            </p>
          )}
        </div>

        {/* COMPACT CARE & HANDLING (TAG CHIPS SYSTEM) */}
        <div className="border-border space-y-2 border-t pt-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
              Care &amp; Handling
            </span>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-muted-foreground text-[10px]">Quick suggestions:</span>
              {COMMON_CARE_SUGGESTIONS.slice(0, 3).map((sugg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addCareInstruction(sugg)}
                  className="border-border bg-vl-white-200/80 hover:bg-vl-cyan/20 hover:border-vl-cyan inline-flex cursor-pointer items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] text-zinc-700 transition-colors"
                >
                  <span>+</span>
                  <span className="max-w-28 truncate">{sugg.split(".")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              size="default"
              placeholder="Add care instruction (e.g. Cold machine wash inside-out)..."
              value={newCareInput}
              onChange={(e) => setNewCareInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCareInstruction(newCareInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => addCareInstruction(newCareInput)}
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
                    className="text-muted-foreground ml-1 cursor-pointer font-bold hover:text-red-600"
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
          <div className="animate-in fade-in slide-in-from-top-2 border-vl-dark-900/15 bg-vl-white-100 rounded-sm border p-3.5 duration-150">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase">
                👁️ Live Storefront Card Preview
              </span>
              <Button
                type="button"
                size="2xs"
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                ✕ Close
              </Button>
            </div>
            <div className="border-border space-y-2 rounded-xs border bg-white p-3">
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
