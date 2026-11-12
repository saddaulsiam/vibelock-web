"use client";

import * as React from "react";
import { Tag, X, Minus, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
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
      <div className="border-vl-dark-900/20 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-vl-dark-900/10 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="text-vl-dark-900 size-4" />
            <h3 className="text-vl-dark-900 text-sm font-semibold">
              Print Barcodes & Price Tags ({items.length}{" "}
              {items.length === 1 ? "variant" : "variants"})
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-vl-dark-900/40 hover:text-vl-dark-900"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Settings Bar */}
        <div className="border-vl-dark-900/10 bg-vl-white-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-vl-dark-900/70 font-semibold">Format:</span>
              <NativeSelect
                value={barcodeLabelSize}
                onChange={(e) =>
                  setBarcodeLabelSize(e.target.value as "standard" | "compact" | "sheet")
                }
                size="sm"
                className="w-auto"
              >
                <option value="standard">50mm × 30mm (Thermal Roll)</option>
                <option value="compact">40mm × 25mm (Compact Tag)</option>
                <option value="sheet">A4 Sheet (24 Grid)</option>
              </NativeSelect>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-vl-dark-900/70 font-semibold">Quantity:</span>
              <NativeSelect
                value={barcodeQuantityMode}
                onChange={(e) => {
                  setBarcodeQuantityMode(
                    e.target.value as "one-per-variant" | "by-stock" | "custom"
                  );
                  setBarcodeItemOverrides({});
                }}
                size="sm"
                className="w-auto"
              >
                <option value="one-per-variant">1 Label per Variant</option>
                <option value="by-stock">Match Available Stock</option>
                <option value="custom">Custom Quantity</option>
              </NativeSelect>
            </div>

            {/* Custom Quantity Stepper & Presets */}
            {barcodeQuantityMode === "custom" && (
              <div className="border-vl-dark-900/20 flex flex-wrap items-center gap-1.5 rounded-sm border bg-white px-2 py-1 shadow-2xs">
                <span className="text-vl-dark-900/70 text-[11px] font-semibold">Copies:</span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))}
                    className="text-vl-dark-900 size-6 rounded-xs p-0"
                    title="Decrease"
                  >
                    <Minus className="size-3" />
                  </Button>
                  <Input
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
                    size="sm"
                    className="h-6 w-12 px-1 text-center font-mono text-xs font-bold"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))}
                    className="text-vl-dark-900 size-6 rounded-xs p-0"
                    title="Increase"
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>

                <div className="border-vl-dark-900/10 flex items-center gap-1 border-l pl-1">
                  {[1, 2, 5, 10, 25, 50].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={barcodeCustomQuantity === preset ? "primary" : "secondary"}
                      size="xs"
                      onClick={() => setBarcodeCustomQuantity(preset)}
                      className="h-6 px-1.5 py-0.5 text-[10px] font-semibold"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total & Print Button */}
          <div className="flex items-center gap-3">
            <div className="bg-vl-dark-900/5 flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs">
              <span className="text-vl-dark-900/60">Total:</span>
              <span className="text-vl-dark-900 font-bold">
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
              <span className="text-vl-dark-900/60">Labels</span>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="size-3.5" />
              <span>Print Labels Now</span>
            </Button>
          </div>
        </div>

        {/* Individual Variant Fine-Tuning Drawer */}
        {items.length > 1 && (
          <div className="border-vl-dark-900/10 border-b bg-white px-5 py-2">
            <div className="flex items-center justify-between text-xs">
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => setShowVariantTuning(!showVariantTuning)}
                className="text-vl-dark-900 h-auto p-0 font-semibold hover:underline"
              >
                <span>
                  {showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant (
                  {items.length})
                </span>
              </Button>
              {Object.keys(barcodeItemOverrides).length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => setBarcodeItemOverrides({})}
                  className="h-auto p-0 text-[11px] text-red-600 hover:underline"
                >
                  Reset variant overrides
                </Button>
              )}
            </div>

            {showVariantTuning && (
              <div className="border-vl-dark-900/10 bg-vl-white-200 mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-sm border p-2">
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
                      className="border-vl-dark-900/5 flex items-center justify-between gap-2 rounded-xs border bg-white px-2.5 py-1 text-xs"
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-vl-dark-900 font-semibold">{item.product.name}</span>
                        <span className="text-vl-dark-900/60 ml-2 font-mono text-[10px]">
                          {item.sku}
                        </span>
                        <span className="text-vl-dark-900/50 ml-2 text-[10px]">
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
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          onClick={() =>
                            setBarcodeItemOverrides((prev) => ({
                              ...prev,
                              [item.id]: Math.max(1, count - 1),
                            }))
                          }
                          className="text-vl-dark-900 size-5 rounded-xs p-0"
                        >
                          <Minus className="size-2.5" />
                        </Button>
                        <Input
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
                          size="sm"
                          className="h-6 w-12 px-1 text-center font-mono text-xs font-bold"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          onClick={() =>
                            setBarcodeItemOverrides((prev) => ({
                              ...prev,
                              [item.id]: Math.min(500, count + 1),
                            }))
                          }
                          className="text-vl-dark-900 size-5 rounded-xs p-0"
                        >
                          <Plus className="size-2.5" />
                        </Button>
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
                  className={`vibelock-inventory-label-card border-vl-dark-900/30 text-vl-dark-900 relative flex flex-col justify-between rounded-sm border border-dashed bg-white p-2 text-center shadow-xs ${
                    barcodeLabelSize === "compact"
                      ? "h-[25mm] w-[40mm]"
                      : barcodeLabelSize === "sheet"
                        ? "h-[30mm] w-[48mm]"
                        : "h-[30mm] w-[50mm]"
                  }`}
                >
                  {count > 1 && (
                    <span className="no-print text-vl-dark-900/40 absolute top-1 right-1 font-mono text-[8px]">
                      #{idx + 1}
                    </span>
                  )}
                  <div className="border-vl-dark-900/15 border-b pb-0.5">
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
                    <p className="text-vl-dark-900/80 font-mono text-[8px] tracking-wider">
                      {item.sku}
                    </p>
                  </div>
                </div>
              ));
            })}
          </div>
        </div>

        <div className="border-vl-dark-900/10 text-vl-dark-900/60 flex items-center justify-between border-t bg-white px-5 py-2.5 text-xs">
          <span>Previewing labels before printing. Press Print Labels Now to send to printer.</span>
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={onClose}
            className="text-vl-dark-900 h-auto p-0 font-semibold hover:underline"
          >
            Close
          </Button>
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
