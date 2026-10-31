"use client";

import * as React from "react";
import { Tag, X, Minus, Plus, Printer } from "lucide-react";
import type { AdminInventoryItem } from "@/lib/admin/inventory/inventory-queries";

export function BarcodeSvg({ value, height = 28 }: { value: string; height?: number }) {
  const chars = value.split("");
  const bars: number[] = [2, 1, 1, 2];
  chars.forEach((char) => {
    const code = char.charCodeAt(0);
    bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
  });
  bars.push(2, 3, 1, 1, 2);

  const totalWidth = bars.reduce((acc, b) => acc + b, 0);
  let currentX = 0;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="mx-auto block h-auto w-full max-w-[130px]"
      aria-label={`Barcode: ${value}`}
    >
      {bars.map((barWidth, index) => {
        const isBlack = index % 2 === 0;
        const x = currentX;
        currentX += barWidth;
        if (!isBlack) return null;
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth}
            height={height}
            fill="#101114"
            shapeRendering="crispEdges"
          />
        );
      })}
    </svg>
  );
}

interface AdminInventoryBarcodeModalProps {
  items: AdminInventoryItem[] | null;
  onClose: () => void;
}

export function AdminInventoryBarcodeModal({ items, onClose }: AdminInventoryBarcodeModalProps) {
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantityMode, setBarcodeQuantityMode] = React.useState<
    "one-per-variant" | "by-stock" | "custom"
  >("one-per-variant");
  const [barcodeCustomQuantity, setBarcodeCustomQuantity] = React.useState<number>(5);
  const [barcodeItemOverrides, setBarcodeItemOverrides] = React.useState<Record<string, number>>(
    {}
  );
  const [showVariantTuning, setShowVariantTuning] = React.useState<boolean>(false);

  const [prevItemsKey, setPrevItemsKey] = React.useState<string | null>(null);
  const currentKey = items ? items.map((i) => i.id).join(",") : null;
  if (items && prevItemsKey !== currentKey) {
    setPrevItemsKey(currentKey);
    setBarcodeLabelSize("standard");
    setBarcodeQuantityMode("one-per-variant");
    setBarcodeCustomQuantity(5);
    setBarcodeItemOverrides({});
    setShowVariantTuning(false);
  }

  if (!items) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-[#101114]" />
            <h3 className="text-sm font-semibold text-[#101114]">
              Print Barcodes & Price Tags ({items.length}{" "}
              {items.length === 1 ? "variant" : "variants"})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#101114]/70">Format:</span>
              <select
                value={barcodeLabelSize}
                onChange={(e) =>
                  setBarcodeLabelSize(e.target.value as "standard" | "compact" | "sheet")
                }
                className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
              >
                <option value="standard">50mm × 30mm (Thermal Roll)</option>
                <option value="compact">40mm × 25mm (Compact Tag)</option>
                <option value="sheet">A4 Sheet (24 Grid)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#101114]/70">Quantity:</span>
              <select
                value={barcodeQuantityMode}
                onChange={(e) => {
                  setBarcodeQuantityMode(
                    e.target.value as "one-per-variant" | "by-stock" | "custom"
                  );
                  setBarcodeItemOverrides({});
                }}
                className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
              >
                <option value="one-per-variant">1 Label per Variant</option>
                <option value="by-stock">Match Available Stock</option>
                <option value="custom">Custom Quantity</option>
              </select>
            </div>

            {/* Custom Quantity Stepper & Presets */}
            {barcodeQuantityMode === "custom" && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-2 py-1 shadow-2xs">
                <span className="text-[11px] font-semibold text-[#101114]/70">Copies:</span>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))}
                    className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                    title="Decrease"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={barcodeCustomQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        setBarcodeCustomQuantity(Math.min(500, val));
                      }
                    }}
                    className="h-6 w-12 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))}
                    className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                    title="Increase"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1 border-l border-[#101114]/10 pl-1">
                  {[1, 2, 5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBarcodeCustomQuantity(preset)}
                      className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        barcodeCustomQuantity === preset
                          ? "bg-[#101114] text-white"
                          : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/15"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total & Print Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-sm bg-[#101114]/5 px-2.5 py-1 text-xs">
              <span className="text-[#101114]/60">Total:</span>
              <span className="font-bold text-[#101114]">
                {items.reduce((acc, item) => {
                  if (barcodeItemOverrides[item.id] !== undefined) {
                    return acc + Math.max(1, barcodeItemOverrides[item.id]);
                  }
                  if (barcodeQuantityMode === "by-stock") {
                    return acc + Math.max(1, item.available > 0 ? item.available : 1);
                  }
                  if (barcodeQuantityMode === "custom") {
                    return acc + Math.max(1, barcodeCustomQuantity);
                  }
                  return acc + 1;
                }, 0)}
              </span>
              <span className="text-[#101114]/60">Labels</span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#101114] px-4 font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85"
            >
              <Printer className="size-3.5" />
              <span>Print Labels Now</span>
            </button>
          </div>
        </div>

        {/* Individual Variant Fine-Tuning Drawer */}
        {items.length > 1 && (
          <div className="border-b border-[#101114]/10 bg-white px-5 py-2">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowVariantTuning(!showVariantTuning)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#101114] hover:underline"
              >
                <span>
                  {showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant (
                  {items.length})
                </span>
              </button>
              {Object.keys(barcodeItemOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => setBarcodeItemOverrides({})}
                  className="text-[11px] text-red-600 hover:underline"
                >
                  Reset variant overrides
                </button>
              )}
            </div>

            {showVariantTuning && (
              <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                {items.map((item) => {
                  const count =
                    barcodeItemOverrides[item.id] !== undefined
                      ? barcodeItemOverrides[item.id]
                      : barcodeQuantityMode === "by-stock"
                        ? Math.max(1, item.available > 0 ? item.available : 1)
                        : barcodeQuantityMode === "custom"
                          ? barcodeCustomQuantity
                          : 1;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xs border border-[#101114]/5 bg-white px-2.5 py-1 text-xs"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-semibold text-[#101114]">{item.product.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-[#101114]/60">
                          {item.sku}
                        </span>
                        <span className="ml-2 text-[10px] text-[#101114]/50">
                          {[
                            item.size ? `Size: ${item.size}` : null,
                            item.color ? `Color: ${item.color}` : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Default"}
                        </span>
                        <span className="ml-2 text-[10px] text-zinc-400">
                          (Stock: {item.available})
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeItemOverrides((prev) => ({
                              ...prev,
                              [item.id]: Math.max(1, count - 1),
                            }))
                          }
                          className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                        >
                          <Minus className="size-2.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={count}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              setBarcodeItemOverrides((prev) => ({
                                ...prev,
                                [item.id]: Math.min(500, val),
                              }));
                            }
                          }}
                          className="h-5 w-10 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeItemOverrides((prev) => ({
                              ...prev,
                              [item.id]: Math.min(500, count + 1),
                            }))
                          }
                          className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Live Tag Preview Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            id="vibelock-inventory-printable-labels"
            className="flex flex-wrap justify-center gap-3"
          >
            {items.flatMap((item) => {
              const count =
                barcodeItemOverrides[item.id] !== undefined
                  ? barcodeItemOverrides[item.id]
                  : barcodeQuantityMode === "by-stock"
                    ? Math.max(1, item.available > 0 ? item.available : 1)
                    : barcodeQuantityMode === "custom"
                      ? barcodeCustomQuantity
                      : 1;

              return Array.from({ length: count }, (_, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className={`vibelock-inventory-label-card relative flex flex-col justify-between rounded-sm border border-dashed border-[#101114]/30 bg-white p-2 text-center text-[#101114] shadow-xs ${
                    barcodeLabelSize === "compact"
                      ? "h-[25mm] w-[40mm]"
                      : barcodeLabelSize === "sheet"
                        ? "h-[30mm] w-[48mm]"
                        : "h-[30mm] w-[50mm]"
                  }`}
                >
                  {count > 1 && (
                    <span className="no-print absolute top-1 right-1 font-mono text-[8px] text-[#101114]/40">
                      #{idx + 1}
                    </span>
                  )}
                  <div className="border-b border-[#101114]/15 pb-0.5">
                    <span className="text-[9px] font-extrabold tracking-widest uppercase">
                      VIBELOCK
                    </span>
                  </div>
                  <p className="truncate px-0.5 text-[10px] leading-tight font-semibold">
                    {item.product.name}
                  </p>
                  <div className="flex items-center justify-between px-1 font-mono text-[9px]">
                    <span>{item.size ? `SIZE: ${item.size}` : ""}</span>
                    <span className="text-[11px] font-bold">
                      ৳{item.discountPrice ?? item.sellingPrice}
                    </span>
                  </div>
                  <div className="px-1 py-0.5">
                    <BarcodeSvg value={item.sku} height={20} />
                    <p className="font-mono text-[8px] tracking-wider text-[#101114]/80">
                      {item.sku}
                    </p>
                  </div>
                </div>
              ));
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#101114]/10 bg-white px-5 py-2.5 text-xs text-[#101114]/60">
          <span>Previewing labels before printing. Press Print Labels Now to send to printer.</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-[#101114] hover:underline"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Print Stylesheet for Labels ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #vibelock-inventory-printable-labels,
          #vibelock-inventory-printable-labels * {
            visibility: visible !important;
          }
          #vibelock-inventory-printable-labels {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 3mm !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            justify-content: flex-start !important;
            z-index: 999999 !important;
          }
          .vibelock-inventory-label-card {
            border: 1px solid #101114 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 2mm;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
