"use client";

import { useState } from "react";
import { Ruler, Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type CategoryTab = "tops" | "bottoms" | "panjabi";
type Unit = "in" | "cm";

interface SizeRow {
  size: string;
  chest?: string;
  length: string;
  sleeve?: string;
  waist?: string;
  hip?: string;
}

const TOPS_SIZES_IN: SizeRow[] = [
  { size: "S", chest: "38 - 40", length: "27.5", sleeve: "8.5" },
  { size: "M", chest: "40 - 42", length: "28.5", sleeve: "9.0" },
  { size: "L", chest: "42 - 44", length: "29.5", sleeve: "9.5" },
  { size: "XL", chest: "44 - 46", length: "30.5", sleeve: "10.0" },
  { size: "XXL", chest: "46 - 48", length: "31.5", sleeve: "10.5" },
];

const TOPS_SIZES_CM: SizeRow[] = [
  { size: "S", chest: "96 - 101", length: "70", sleeve: "21.5" },
  { size: "M", chest: "101 - 106", length: "72", sleeve: "23.0" },
  { size: "L", chest: "106 - 111", length: "75", sleeve: "24.0" },
  { size: "XL", chest: "111 - 117", length: "77", sleeve: "25.5" },
  { size: "XXL", chest: "117 - 122", length: "80", sleeve: "26.5" },
];

const PANJABI_SIZES_IN: SizeRow[] = [
  { size: "38", chest: "40", length: "40", sleeve: "24.5" },
  { size: "40", chest: "42", length: "42", sleeve: "25.0" },
  { size: "42", chest: "44", length: "44", sleeve: "25.5" },
  { size: "44", chest: "46", length: "45", sleeve: "26.0" },
];

const PANJABI_SIZES_CM: SizeRow[] = [
  { size: "38", chest: "101", length: "101", sleeve: "62" },
  { size: "40", chest: "106", length: "106", sleeve: "63.5" },
  { size: "42", chest: "111", length: "111", sleeve: "65" },
  { size: "44", chest: "117", length: "114", sleeve: "66" },
];

const BOTTOMS_SIZES_IN: SizeRow[] = [
  { size: "30", waist: "30 - 31", hip: "38", length: "39" },
  { size: "32", waist: "32 - 33", hip: "40", length: "40" },
  { size: "34", waist: "34 - 35", hip: "42", length: "41" },
  { size: "36", waist: "36 - 37", hip: "44", length: "42" },
];

const BOTTOMS_SIZES_CM: SizeRow[] = [
  { size: "30", waist: "76 - 79", hip: "96", length: "99" },
  { size: "32", waist: "81 - 84", hip: "101", length: "101" },
  { size: "34", waist: "86 - 89", hip: "106", length: "104" },
  { size: "36", waist: "91 - 94", hip: "111", length: "106" },
];

export function SizeGuideModal() {
  const [activeTab, setActiveTab] = useState<CategoryTab>("tops");
  const [unit, setUnit] = useState<Unit>("in");

  const getRows = () => {
    if (activeTab === "tops") return unit === "in" ? TOPS_SIZES_IN : TOPS_SIZES_CM;
    if (activeTab === "panjabi") return unit === "in" ? PANJABI_SIZES_IN : PANJABI_SIZES_CM;
    return unit === "in" ? BOTTOMS_SIZES_IN : BOTTOMS_SIZES_CM;
  };

  const rows = getRows();

  return (
    <Dialog>
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
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6 sm:p-8"
      >
        <DialogHeader className="space-y-1.5 pb-2 text-left">
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm">
              <Sparkles className="size-3" />
              Fit Guide
            </Badge>
            <span className="text-vl-dark-900/50 font-mono text-xs tracking-widest uppercase">
              Streetwear Cut
            </span>
          </div>
          <DialogTitle className="font-heading text-vl-dark-900 text-xl font-black tracking-tight sm:text-2xl">
            VibeLock Measurements
          </DialogTitle>
          <p className="text-vl-dark-900/70 text-xs sm:text-sm">
            Our drops feature a modern oversized boxy fit. If you prefer a regular tailored fit,
            consider sizing down.
          </p>
        </DialogHeader>

        {/* Tab & Unit Controls */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-y py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("tops")}
              className={`rounded-xs px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "tops"
                  ? "bg-vl-dark-900 text-white shadow-2xs"
                  : "text-vl-dark-900/70 hover:bg-vl-dark-900/5"
              }`}
            >
              T-Shirts & Tops
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("panjabi")}
              className={`rounded-xs px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "panjabi"
                  ? "bg-vl-dark-900 text-white shadow-2xs"
                  : "text-vl-dark-900/70 hover:bg-vl-dark-900/5"
              }`}
            >
              Panjabi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bottoms")}
              className={`rounded-xs px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "bottoms"
                  ? "bg-vl-dark-900 text-white shadow-2xs"
                  : "text-vl-dark-900/70 hover:bg-vl-dark-900/5"
              }`}
            >
              Pants & Cargo
            </button>
          </div>

          {/* Unit Toggle */}
          <div className="border-vl-dark-900/15 flex items-center rounded-xs border p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={`rounded-xs px-2.5 py-1 transition-all ${
                unit === "in"
                  ? "bg-vl-dark-900 text-white"
                  : "text-vl-dark-900/60 hover:text-vl-dark-900"
              }`}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              className={`rounded-xs px-2.5 py-1 transition-all ${
                unit === "cm"
                  ? "bg-vl-dark-900 text-white"
                  : "text-vl-dark-900/60 hover:text-vl-dark-900"
              }`}
            >
              CM
            </button>
          </div>
        </div>

        {/* Measurement Table */}
        <div className="border-vl-dark-900/10 overflow-x-auto rounded-xs border">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-vl-dark-900/10 bg-vl-white-300/60 font-heading text-vl-dark-900 border-b font-black tracking-wider uppercase">
                <th className="px-4 py-3">Size</th>
                {activeTab !== "bottoms" && <th className="px-4 py-3">Chest</th>}
                {activeTab === "bottoms" && <th className="px-4 py-3">Waist</th>}
                {activeTab === "bottoms" && <th className="px-4 py-3">Hip</th>}
                <th className="px-4 py-3">Length</th>
                {activeTab !== "bottoms" && <th className="px-4 py-3">Sleeve</th>}
              </tr>
            </thead>
            <tbody className="divide-vl-dark-900/5 divide-y">
              {rows.map((row) => (
                <tr key={row.size} className="hover:bg-vl-cyan-50/50 transition-colors">
                  <td className="text-vl-dark-900 px-4 py-3 font-bold">{row.size}</td>
                  {row.chest && <td className="text-vl-dark-900/80 px-4 py-3">{row.chest}</td>}
                  {row.waist && <td className="text-vl-dark-900/80 px-4 py-3">{row.waist}</td>}
                  {row.hip && <td className="text-vl-dark-900/80 px-4 py-3">{row.hip}</td>}
                  <td className="text-vl-dark-900/80 px-4 py-3">{row.length}</td>
                  {row.sleeve && <td className="text-vl-dark-900/80 px-4 py-3">{row.sleeve}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Streetwear Fit Pro-Tip */}
        <div className="bg-vl-dark-900/5 text-vl-dark-900/80 space-y-1.5 rounded-xs p-3.5 text-xs">
          <div className="text-vl-dark-900 flex items-center gap-1.5 font-bold">
            <Check className="text-vl-cyan-600 size-3.5" />
            <span>How to measure for perfect fit:</span>
          </div>
          <ul className="text-vl-dark-900/70 list-disc space-y-1 pl-5">
            <li>
              <strong>Chest:</strong> Measure across the fullest part of your chest under your
              armpits.
            </li>
            <li>
              <strong>Length:</strong> Measure from the highest point of the shoulder down to the
              bottom hem.
            </li>
            <li>
              <strong>Exchange Guarantee:</strong> If size doesn&apos;t fit, our 7-day hassle-free
              exchange has you covered!
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
