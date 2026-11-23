"use client";

import { useMemo, useState } from "react";
import { Ruler, Sparkles, Check, User, Table as TableIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CategoryTab = "tops" | "bottoms" | "panjabi";
export type Unit = "in" | "cm";
export type ViewMode = "table" | "fit-finder";

export interface SizeRow {
  size: string;
  chest?: string;
  length: string;
  sleeve?: string;
  waist?: string;
  hip?: string;
  thigh?: string;
}

export interface HeightWeightRow {
  height: string;
  weight: string;
  recommendedSize: string;
  fitNote: string;
}

// ── 1. TOPS MEASUREMENTS ──
export const TOPS_SIZES_IN: SizeRow[] = [
  { size: "S", chest: "38 – 40", length: "27.5", sleeve: "8.5" },
  { size: "M", chest: "40 – 42", length: "28.5", sleeve: "9.0" },
  { size: "L", chest: "42 – 44", length: "29.5", sleeve: "9.5" },
  { size: "XL", chest: "44 – 46", length: "30.5", sleeve: "10.0" },
  { size: "XXL", chest: "46 – 48", length: "31.5", sleeve: "10.5" },
];

export const TOPS_SIZES_CM: SizeRow[] = [
  { size: "S", chest: "96 – 101", length: "70", sleeve: "21.5" },
  { size: "M", chest: "101 – 106", length: "72", sleeve: "23.0" },
  { size: "L", chest: "106 – 111", length: "75", sleeve: "24.0" },
  { size: "XL", chest: "111 – 117", length: "77", sleeve: "25.5" },
  { size: "XXL", chest: "117 – 122", length: "80", sleeve: "26.5" },
];

// ── 2. BOTTOMS (CARGO / DENIM) FULL 28 TO 40 RANGE ──
export const BOTTOMS_SIZES_IN: SizeRow[] = [
  { size: "28", waist: "28 – 29", hip: "36", length: "39.0", thigh: "22.0" },
  { size: "29", waist: "29 – 30", hip: "37", length: "39.5", thigh: "22.5" },
  { size: "30", waist: "30 – 31", hip: "38", length: "40.0", thigh: "23.0" },
  { size: "31", waist: "31 – 32", hip: "39", length: "40.0", thigh: "23.5" },
  { size: "32", waist: "32 – 33", hip: "40", length: "40.5", thigh: "24.0" },
  { size: "33", waist: "33 – 34", hip: "41", length: "40.5", thigh: "24.5" },
  { size: "34", waist: "34 – 35", hip: "42", length: "41.0", thigh: "25.0" },
  { size: "35", waist: "35 – 36", hip: "43", length: "41.0", thigh: "25.5" },
  { size: "36", waist: "36 – 37", hip: "44", length: "41.5", thigh: "26.0" },
  { size: "37", waist: "37 – 38", hip: "45", length: "41.5", thigh: "26.5" },
  { size: "38", waist: "38 – 39", hip: "46", length: "42.0", thigh: "27.0" },
  { size: "39", waist: "39 – 40", hip: "47", length: "42.0", thigh: "27.5" },
  { size: "40", waist: "40 – 41", hip: "48", length: "42.5", thigh: "28.0" },
];

export const BOTTOMS_SIZES_CM: SizeRow[] = [
  { size: "28", waist: "71 – 74", hip: "91", length: "99", thigh: "56" },
  { size: "29", waist: "74 – 76", hip: "94", length: "100", thigh: "57" },
  { size: "30", waist: "76 – 79", hip: "96", length: "101", thigh: "58" },
  { size: "31", waist: "79 – 81", hip: "99", length: "101", thigh: "60" },
  { size: "32", waist: "81 – 84", hip: "101", length: "103", thigh: "61" },
  { size: "33", waist: "84 – 86", hip: "104", length: "103", thigh: "62" },
  { size: "34", waist: "86 – 89", hip: "106", length: "104", thigh: "63" },
  { size: "35", waist: "89 – 91", hip: "109", length: "104", thigh: "65" },
  { size: "36", waist: "91 – 94", hip: "111", length: "105", thigh: "66" },
  { size: "37", waist: "94 – 96", hip: "114", length: "105", thigh: "67" },
  { size: "38", waist: "96 – 99", hip: "117", length: "106", thigh: "68" },
  { size: "39", waist: "99 – 101", hip: "119", length: "106", thigh: "70" },
  { size: "40", waist: "101 – 104", hip: "122", length: "108", thigh: "71" },
];

// ── 3. PANJABI MEASUREMENTS ──
export const PANJABI_SIZES_IN: SizeRow[] = [
  { size: "38", chest: "40", length: "40", sleeve: "24.5" },
  { size: "40", chest: "42", length: "42", sleeve: "25.0" },
  { size: "42", chest: "44", length: "44", sleeve: "25.5" },
  { size: "44", chest: "46", length: "45", sleeve: "26.0" },
];

export const PANJABI_SIZES_CM: SizeRow[] = [
  { size: "38", chest: "101", length: "101", sleeve: "62" },
  { size: "40", chest: "106", length: "106", sleeve: "63.5" },
  { size: "42", chest: "111", length: "111", sleeve: "65" },
  { size: "44", chest: "117", length: "114", sleeve: "66" },
];

// ── 4. QUICK FIT ESTIMATOR (HEIGHT & WEIGHT) ──
export const TOPS_FIT_GUIDE: HeightWeightRow[] = [
  {
    height: `5'4" – 5'6" (162–168 cm)`,
    weight: "50 – 58 kg",
    recommendedSize: "S",
    fitNote: "Streetwear Boxy Fit with drop shoulder",
  },
  {
    height: `5'7" – 5'9" (170–175 cm)`,
    weight: "59 – 68 kg",
    recommendedSize: "M",
    fitNote: "Signature VibeLock relaxed drape",
  },
  {
    height: `5'9" – 5'11" (175–180 cm)`,
    weight: "69 – 78 kg",
    recommendedSize: "L",
    fitNote: "Authentic streetwear relaxed silhouette",
  },
  {
    height: `5'11" – 6'1" (180–185 cm)`,
    weight: "79 – 88 kg",
    recommendedSize: "XL",
    fitNote: "Oversized silhouette; plenty of room",
  },
  {
    height: `6'1"+ (185+ cm)`,
    weight: "89 – 98+ kg",
    recommendedSize: "XXL",
    fitNote: "Maximum oversized aesthetic",
  },
];

export const BOTTOMS_FIT_GUIDE: HeightWeightRow[] = [
  {
    height: `5'4" – 5'7" (162–170 cm)`,
    weight: "50 – 58 kg",
    recommendedSize: "28 – 30",
    fitNote: "Clean sneaker stack with tailored waist",
  },
  {
    height: `5'7" – 5'9" (170–175 cm)`,
    weight: "59 – 68 kg",
    recommendedSize: "31 – 32",
    fitNote: "Relaxed wide-leg cargo / denim stack",
  },
  {
    height: `5'9" – 5'11" (175–180 cm)`,
    weight: "69 – 78 kg",
    recommendedSize: "33 – 34",
    fitNote: "Comfortable mid-rise with full thigh room",
  },
  {
    height: `5'11" – 6'1" (180–185 cm)`,
    weight: "79 – 88 kg",
    recommendedSize: "35 – 36",
    fitNote: "Wide streetwear drape over high-top kicks",
  },
  {
    height: `6'1"+ (185+ cm)`,
    weight: "89 – 100+ kg",
    recommendedSize: "37 – 40",
    fitNote: "Generous utilitarian cargo silhouette",
  },
];

export interface SizeGuideModalProps {
  selectedSize?: string | null;
  productName?: string;
  categoryPreset?: string | null;
  availableSizes?: string[];
  onSelectSize?: (size: string) => void;
}

export function SizeGuideModal({
  selectedSize,
  productName = "",
  categoryPreset,
  availableSizes = [],
  onSelectSize,
}: SizeGuideModalProps) {
  // Context-aware automatic category determination
  const defaultCategory = useMemo<CategoryTab>(() => {
    const pName = (productName || "").toLowerCase();
    const preset = (categoryPreset || "").toLowerCase();

    if (
      preset.includes("bottom") ||
      preset.includes("pant") ||
      preset.includes("denim") ||
      preset.includes("cargo") ||
      pName.includes("pant") ||
      pName.includes("cargo") ||
      pName.includes("trouser") ||
      pName.includes("denim") ||
      pName.includes("jeans") ||
      availableSizes.some((s) => /^(28|29|30|31|32|33|34|35|36|37|38|39|40)$/.test(s))
    ) {
      return "bottoms";
    }

    if (preset.includes("panjabi") || pName.includes("panjabi") || pName.includes("kurta")) {
      return "panjabi";
    }

    return "tops";
  }, [categoryPreset, productName, availableSizes]);

  const [userSelectedTab, setUserSelectedTab] = useState<CategoryTab | null>(null);
  const activeTab = userSelectedTab ?? defaultCategory;
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isOpen, setIsOpen] = useState(false);

  const [unit, setUnit] = useState<Unit>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vl_size_unit");
        if (saved === "in" || saved === "cm") return saved as Unit;
      } catch {
        // Fallback safely if storage restricted
      }
    }
    return "in";
  });

  const handleUnitToggle = (newUnit: Unit) => {
    setUnit(newUnit);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vl_size_unit", newUnit);
      } catch {
        // Ignore storage error
      }
    }
  };

  const rows = useMemo(() => {
    if (activeTab === "tops") return unit === "in" ? TOPS_SIZES_IN : TOPS_SIZES_CM;
    if (activeTab === "panjabi") return unit === "in" ? PANJABI_SIZES_IN : PANJABI_SIZES_CM;
    return unit === "in" ? BOTTOMS_SIZES_IN : BOTTOMS_SIZES_CM;
  }, [activeTab, unit]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group text-vl-dark-900/70 hover:text-vl-cyan-600 focus-visible:ring-vl-cyan inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          />
        }
      >
        <Ruler className="size-3.5 transition-transform group-hover:rotate-12" aria-hidden="true" />
        <span>Size Guide</span>
      </DialogTrigger>

      <DialogContent
        variant="brand"
        className="max-h-[90vh] max-w-xl [scrollbar-width:none] overflow-y-auto p-5 [-ms-overflow-style:none] sm:max-w-2xl sm:p-6 [&::-webkit-scrollbar]:hidden"
      >
        {/* ── 1. ARCHITECTURAL HEADER ── */}
        <DialogHeader className="mt-1 space-y-1 text-left sm:mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-vl-cyan size-2 rounded-full" />
              <span className="text-vl-dark-900/50 font-mono text-[10px] font-bold tracking-widest uppercase">
                {activeTab === "bottoms"
                  ? "Pants & Cargo Silhouette"
                  : activeTab === "panjabi"
                    ? "Traditional Cut"
                    : "Heavyweight Boxy Silhouette"}
              </span>
            </div>
            {selectedSize && (
              <span className="text-vl-dark-900/60 font-mono text-xs">
                Selected: <strong className="text-vl-dark-900 font-bold">{selectedSize}</strong>
              </span>
            )}
          </div>

          <DialogTitle className="font-heading text-vl-dark-900 text-xl font-black tracking-tight sm:text-2xl">
            Size &amp; Measurements
          </DialogTitle>

          <p className="text-vl-dark-900/60 text-xs sm:text-sm">
            {activeTab === "bottoms"
              ? "Designed with a relaxed leg and subtle sneaker stack. Fits true to waist size."
              : "Cut with an authentic drop-shoulder streetwear drape. If you prefer a regular tailored fit, size down."}
          </p>
        </DialogHeader>

        {/* ── 2. UNIFIED STREAMLINED TOOLBAR ── */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-y py-2.5">
          {/* Category Selector Tabs (Underline Style) */}
          <nav className="flex items-center gap-5 text-xs" aria-label="Product categories">
            <button
              type="button"
              onClick={() => setUserSelectedTab("tops")}
              className={`relative py-1 font-bold tracking-wider uppercase transition-colors ${
                activeTab === "tops"
                  ? "text-vl-dark-900"
                  : "text-vl-dark-900/40 hover:text-vl-dark-900"
              }`}
            >
              <span>Tops</span>
              {activeTab === "tops" && (
                <span className="bg-vl-dark-900 absolute right-0 -bottom-2.5 left-0 h-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setUserSelectedTab("bottoms")}
              className={`relative py-1 font-bold tracking-wider uppercase transition-colors ${
                activeTab === "bottoms"
                  ? "text-vl-dark-900"
                  : "text-vl-dark-900/40 hover:text-vl-dark-900"
              }`}
            >
              <span>Bottoms</span>
              {activeTab === "bottoms" && (
                <span className="bg-vl-dark-900 absolute right-0 -bottom-2.5 left-0 h-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setUserSelectedTab("panjabi")}
              className={`relative py-1 font-bold tracking-wider uppercase transition-colors ${
                activeTab === "panjabi"
                  ? "text-vl-dark-900"
                  : "text-vl-dark-900/40 hover:text-vl-dark-900"
              }`}
            >
              <span>Panjabi</span>
              {activeTab === "panjabi" && (
                <span className="bg-vl-dark-900 absolute right-0 -bottom-2.5 left-0 h-0.5" />
              )}
            </button>
          </nav>

          {/* Right Controls: Mode Toggle & Unit Switcher */}
          <div className="flex items-center gap-2">
            {/* View Mode (Table vs Fit Finder) */}
            {activeTab !== "panjabi" && (
              <div className="border-vl-dark-900/15 flex items-center rounded-xs border p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-pressed={viewMode === "table"}
                  className={`flex items-center gap-1 rounded-xs px-2 py-0.5 transition-all ${
                    viewMode === "table"
                      ? "bg-vl-dark-900 text-white"
                      : "text-vl-dark-900/60 hover:text-vl-dark-900"
                  }`}
                >
                  <TableIcon className="size-3" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("fit-finder")}
                  aria-pressed={viewMode === "fit-finder"}
                  className={`flex items-center gap-1 rounded-xs px-2 py-0.5 transition-all ${
                    viewMode === "fit-finder"
                      ? "bg-vl-dark-900 text-white"
                      : "text-vl-dark-900/60 hover:text-vl-dark-900"
                  }`}
                >
                  <User className="size-3" />
                  <span>Fit Finder</span>
                </button>
              </div>
            )}

            {/* Unit Switcher (IN vs CM) */}
            {viewMode === "table" && (
              <div className="border-vl-dark-900/15 flex items-center rounded-xs border p-0.5 font-mono text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleUnitToggle("in")}
                  aria-pressed={unit === "in"}
                  className={`rounded-xs px-2 py-0.5 transition-all ${
                    unit === "in"
                      ? "bg-vl-dark-900 text-white shadow-2xs"
                      : "text-vl-dark-900/50 hover:text-vl-dark-900"
                  }`}
                >
                  IN
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle("cm")}
                  aria-pressed={unit === "cm"}
                  className={`rounded-xs px-2 py-0.5 transition-all ${
                    unit === "cm"
                      ? "bg-vl-dark-900 text-white shadow-2xs"
                      : "text-vl-dark-900/50 hover:text-vl-dark-900"
                  }`}
                >
                  CM
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. DATA VIEW: TABLE OR FIT FINDER ── */}
        {viewMode === "table" ? (
          <div className="border-vl-dark-900/10 relative [scrollbar-width:none] overflow-x-auto rounded-xs border [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-xs whitespace-nowrap sm:text-sm">
              <thead>
                <tr className="border-vl-dark-900/10 bg-vl-white-200/70 text-vl-dark-900/70 font-mono text-[11px] font-bold tracking-widest uppercase">
                  <th className="bg-vl-white-200/90 sticky left-0 z-20 px-3.5 py-2.5 sm:px-4">
                    Size
                  </th>
                  {activeTab !== "bottoms" && (
                    <th className="px-3.5 py-2.5 sm:px-4">Chest ({unit})</th>
                  )}
                  {activeTab === "bottoms" && (
                    <th className="px-3.5 py-2.5 sm:px-4">Waist ({unit})</th>
                  )}
                  {activeTab === "bottoms" && (
                    <th className="px-3.5 py-2.5 sm:px-4">Hip ({unit})</th>
                  )}
                  {activeTab === "bottoms" && (
                    <th className="px-3.5 py-2.5 sm:px-4">Thigh ({unit})</th>
                  )}
                  <th className="px-3.5 py-2.5 sm:px-4">Length ({unit})</th>
                  {activeTab !== "bottoms" && (
                    <th className="px-3.5 py-2.5 sm:px-4">Sleeve ({unit})</th>
                  )}
                  {onSelectSize && <th className="px-3.5 py-2.5 text-right sm:px-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-vl-dark-900/5 divide-y font-mono text-xs sm:text-sm">
                {rows.map((row) => {
                  const isSelected =
                    selectedSize?.trim().toUpperCase() === row.size.trim().toUpperCase();

                  return (
                    <tr
                      key={row.size}
                      onClick={() => {
                        if (onSelectSize) {
                          onSelectSize(row.size);
                          setIsOpen(false);
                        }
                      }}
                      className={`group transition-colors ${onSelectSize ? "cursor-pointer" : ""} ${
                        isSelected ? "bg-vl-cyan-50/70 font-bold" : "hover:bg-vl-dark-900/5"
                      }`}
                    >
                      {/* Sticky size column */}
                      <td
                        className={`sticky left-0 z-10 px-3.5 py-2.5 transition-colors sm:px-4 sm:py-3 ${
                          isSelected
                            ? "bg-vl-cyan-50 text-vl-dark-900 border-vl-cyan border-l-2"
                            : "text-vl-dark-900 bg-white group-hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-sans font-bold">
                          <span>{row.size}</span>
                          {isSelected && (
                            <span className="bg-vl-cyan text-vl-dark-900 rounded-2xs px-1 text-[9px] font-black tracking-wider uppercase">
                              Active
                            </span>
                          )}
                        </div>
                      </td>

                      {row.chest && (
                        <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                          {row.chest}
                        </td>
                      )}
                      {row.waist && (
                        <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                          {row.waist}
                        </td>
                      )}
                      {row.hip && (
                        <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                          {row.hip}
                        </td>
                      )}
                      {row.thigh && (
                        <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                          {row.thigh}
                        </td>
                      )}
                      <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        {row.length}
                      </td>
                      {row.sleeve && (
                        <td className="text-vl-dark-900/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
                          {row.sleeve}
                        </td>
                      )}

                      {onSelectSize && (
                        <td className="px-3.5 py-2.5 text-right font-sans sm:px-4 sm:py-3">
                          {isSelected ? (
                            <span className="text-vl-cyan-dark inline-flex items-center gap-1 text-[11px] font-bold">
                              <Check className="size-3" /> Selected
                            </span>
                          ) : (
                            <span className="text-vl-dark-900/40 group-hover:text-vl-dark-900 text-[10px] font-bold uppercase transition-colors">
                              Select
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── View 2: Fit Finder (Height / Weight Matrix) ── */
          <div className="border-vl-dark-900/10 overflow-hidden rounded-xs border">
            <div className="divide-vl-dark-900/10 divide-y">
              {(activeTab === "bottoms" ? BOTTOMS_FIT_GUIDE : TOPS_FIT_GUIDE).map((guide, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-neutral-50 sm:p-3.5"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-vl-dark-900 font-bold">{guide.height}</span>
                      <span className="text-vl-dark-900/30">&bull;</span>
                      <span className="text-vl-dark-900/80 font-medium">{guide.weight}</span>
                    </div>
                    <p className="text-vl-dark-900/50 text-[11px]">{guide.fitNote}</p>
                  </div>

                  <div className="text-right">
                    <span className="border-vl-dark-900/20 bg-vl-white-200/80 text-vl-dark-900 inline-block rounded-xs border px-2 py-1 font-mono text-xs font-black">
                      Size {guide.recommendedSize}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. HOW TO MEASURE & EDITORIAL FIT GUIDANCE ── */}
        <div className="border-vl-dark-900/10 border-t pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-vl-dark-900/50 font-mono text-[10px] font-bold uppercase">
                01 / {activeTab === "bottoms" ? "Waistline" : "Chest"}
              </span>
              <p className="text-vl-dark-900/80 text-xs leading-relaxed">
                {activeTab === "bottoms"
                  ? "Measure around natural waistline where your pants usually sit."
                  : "Measure horizontally under armpits across the fullest part of chest."}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-vl-dark-900/50 font-mono text-[10px] font-bold uppercase">
                02 / Length
              </span>
              <p className="text-vl-dark-900/80 text-xs leading-relaxed">
                {activeTab === "bottoms"
                  ? "Total outseam length from waist down to the hem over sneakers."
                  : "From highest shoulder point down to bottom hem."}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-vl-dark-900/50 font-mono text-[10px] font-bold uppercase">
                03 / Model Specs
              </span>
              <p className="text-vl-dark-900/80 text-xs leading-relaxed">
                Model is 5&apos;11&quot; (180 cm), 72 kg, wearing Size L (Tops) / 32 (Bottoms).
              </p>
            </div>
          </div>

          <div className="text-vl-dark-900/50 mt-3 flex items-center justify-between border-t border-black/5 pt-2.5 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="text-vl-cyan-600 size-3" />
              <span>Free 72-Hour Doorstep Size Exchange Policy</span>
            </span>
            <span className="font-semibold text-emerald-700">100% Authentic Guarantee</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
