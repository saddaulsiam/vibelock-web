"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
import type { AdminProductItem } from "@/lib/admin/catalog/catalog-queries";
import { Minus, Plus, Printer, Tag, X } from "lucide-react";
import * as React from "react";

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
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((w, idx) => {
        const x = currentX;
        currentX += w;
        if (idx % 2 === 0) {
          return <rect key={idx} x={x} y={0} width={w} height={height} fill="#000000" />;
        }
        return null;
      })}
    </svg>
  );
}

export interface AdminProductBarcodeModalProps {
  products: AdminProductItem[] | null;
  onClose: () => void;
}

export function AdminProductBarcodeModal({ products, onClose }: AdminProductBarcodeModalProps) {
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantityMode, setBarcodeQuantityMode] = React.useState<
    "one-per-variant" | "by-stock" | "custom"
  >("one-per-variant");
  const [barcodeCustomQuantity, setBarcodeCustomQuantity] = React.useState<number>(5);
  const [barcodeVariantOverrides, setBarcodeVariantOverrides] = React.useState<
    Record<string, number>
  >({});
  const [showVariantTuning, setShowVariantTuning] = React.useState<boolean>(false);

  const [prevProductsKey, setPrevProductsKey] = React.useState<string | null>(null);
  const currentKey = products ? products.map((p) => p.id).join(",") : null;
  if (products && prevProductsKey !== currentKey) {
    setPrevProductsKey(currentKey);
    setBarcodeLabelSize("standard");
    setBarcodeQuantityMode("one-per-variant");
    setBarcodeCustomQuantity(5);
    setBarcodeVariantOverrides({});
    setShowVariantTuning(false);
  }

  if (!products) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="border-vl-dark-900/20 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-vl-dark-900/10 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="text-vl-dark-900 size-4" />
            <h3 className="text-vl-dark-900 text-sm font-semibold">
              Print Price Tags & Barcodes ({products.length}{" "}
              {products.length === 1 ? "product" : "products"})
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-vl-dark-900/60 hover:text-vl-dark-900 size-7"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Modal Settings Bar */}
        <div className="border-vl-dark-900/10 bg-vl-white-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Format selection */}
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

            {/* Quantity mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-vl-dark-900/70 font-semibold">Quantity:</span>
              <NativeSelect
                value={barcodeQuantityMode}
                onChange={(e) => {
                  setBarcodeQuantityMode(
                    e.target.value as "one-per-variant" | "by-stock" | "custom"
                  );
                  setBarcodeVariantOverrides({});
                }}
                size="sm"
                className="w-auto"
              >
                <option value="one-per-variant">1 Label per Variant</option>
                <option value="by-stock">Match Current Stock Count</option>
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
                    size="icon"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))}
                    className="size-6 rounded-xs"
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
                    size="icon"
                    onClick={() => setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))}
                    className="size-6 rounded-xs"
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
                      className="h-5 px-1.5 text-[10px]"
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
                {products.reduce((acc, product) => {
                  const variants =
                    product.variants && product.variants.length > 0
                      ? product.variants
                      : [{ id: product.id, stock: product.totalStock }];

                  const productTotal = variants.reduce((vAcc, v) => {
                    const count =
                      barcodeVariantOverrides[v.id] !== undefined
                        ? barcodeVariantOverrides[v.id]
                        : barcodeQuantityMode === "by-stock"
                          ? Math.max(1, v.stock > 0 ? v.stock : 1)
                          : barcodeQuantityMode === "custom"
                            ? barcodeCustomQuantity
                            : 1;
                    return vAcc + count;
                  }, 0);

                  return acc + productTotal;
                }, 0)}
              </span>
              <span className="text-vl-dark-900/60">Labels</span>
            </div>

            <Button type="button" variant="primary" size="default" onClick={() => window.print()}>
              <Printer className="size-3.5" />
              <span>Print Labels Now</span>
            </Button>
          </div>
        </div>

        {/* Individual Variant Fine-Tuning Drawer */}
        {products.some((p) => (p.variants && p.variants.length > 1) || products.length > 1) && (
          <div className="border-vl-dark-900/10 border-b bg-white px-5 py-2">
            <div className="flex items-center justify-between text-xs">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowVariantTuning(!showVariantTuning)}
                className="text-vl-dark-900 gap-1.5 font-semibold"
              >
                <span>{showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant</span>
              </Button>
              {Object.keys(barcodeVariantOverrides).length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setBarcodeVariantOverrides({})}
                  className="text-[11px] text-red-600 hover:text-red-700"
                >
                  Reset variant overrides
                </Button>
              )}
            </div>

            {showVariantTuning && (
              <div className="border-vl-dark-900/10 bg-vl-white-200 mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-sm border p-2">
                {products.flatMap((product) => {
                  const variants =
                    product.variants && product.variants.length > 0
                      ? product.variants
                      : [
                          {
                            id: product.id,
                            sku: product.skus[0] || product.slug,
                            size: null,
                            color: null,
                            stock: product.totalStock,
                          },
                        ];

                  return variants.map((v) => {
                    const count =
                      barcodeVariantOverrides[v.id] !== undefined
                        ? barcodeVariantOverrides[v.id]
                        : barcodeQuantityMode === "by-stock"
                          ? Math.max(1, v.stock > 0 ? v.stock : 1)
                          : barcodeQuantityMode === "custom"
                            ? barcodeCustomQuantity
                            : 1;

                    return (
                      <div
                        key={v.id}
                        className="border-vl-dark-900/5 flex items-center justify-between gap-2 rounded-xs border bg-white px-2.5 py-1 text-xs"
                      >
                        <div className="min-w-0 flex-1 truncate">
                          <span className="text-vl-dark-900 font-semibold">{product.name}</span>
                          <span className="text-vl-dark-900/60 ml-2 font-mono text-[10px]">
                            {v.sku}
                          </span>
                          <span className="text-vl-dark-900/50 ml-2 text-[10px]">
                            {[
                              v.size ? `Size: ${v.size}` : null,
                              v.color ? `Color: ${v.color}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Default"}
                          </span>
                          <span className="ml-2 text-[10px] text-zinc-400">(Stock: {v.stock})</span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              setBarcodeVariantOverrides((prev) => ({
                                ...prev,
                                [v.id]: Math.max(1, count - 1),
                              }))
                            }
                            className="size-5 rounded-xs"
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
                                setBarcodeVariantOverrides((prev) => ({
                                  ...prev,
                                  [v.id]: Math.min(500, val),
                                }));
                              }
                            }}
                            size="sm"
                            className="h-6 w-12 px-1 text-center font-mono text-xs font-bold"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              setBarcodeVariantOverrides((prev) => ({
                                ...prev,
                                [v.id]: Math.min(500, count + 1),
                              }))
                            }
                            className="size-5 rounded-xs"
                          >
                            <Plus className="size-2.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            )}
          </div>
        )}

        {/* Live Tag Preview Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div id="vibelock-printable-labels" className="flex flex-wrap justify-center gap-3">
            {products.flatMap((product) => {
              const variants =
                product.variants && product.variants.length > 0
                  ? product.variants
                  : [
                      {
                        id: product.id,
                        sku: product.skus[0] || product.slug,
                        size: null,
                        color: null,
                        sellingPrice: product.minSellingPrice ?? 0,
                        discountPrice: product.minDiscountPrice,
                        stock: product.totalStock,
                      },
                    ];

              return variants.flatMap((v) => {
                const count =
                  barcodeVariantOverrides[v.id] !== undefined
                    ? barcodeVariantOverrides[v.id]
                    : barcodeQuantityMode === "by-stock"
                      ? Math.max(1, v.stock > 0 ? v.stock : 1)
                      : barcodeQuantityMode === "custom"
                        ? barcodeCustomQuantity
                        : 1;

                return Array.from({ length: count }, (_, idx) => (
                  <div
                    key={`${v.id}-${idx}`}
                    className={`vibelock-label-card border-vl-dark-900/30 text-vl-dark-900 relative flex flex-col justify-between rounded-sm border border-dashed bg-white p-2 text-center shadow-xs ${
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
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between px-1 font-mono text-[9px]">
                      <span>{v.size ? `SIZE: ${v.size}` : ""}</span>
                      <span className="text-[11px] font-bold">
                        ৳{v.discountPrice ?? v.sellingPrice}
                      </span>
                    </div>
                    <div className="px-1 py-0.5">
                      <BarcodeSvg value={v.sku} height={20} />
                      <p className="text-vl-dark-900/80 font-mono text-[8px] tracking-wider">
                        {v.sku}
                      </p>
                    </div>
                  </div>
                ));
              });
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-vl-dark-900/10 text-vl-dark-900/60 flex items-center justify-between border-t bg-white px-5 py-2.5 text-xs">
          <span>Previewing labels before printing. Press Print Now to send to printer.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-vl-dark-900 font-semibold"
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
          #vibelock-printable-labels,
          #vibelock-printable-labels * {
            visibility: visible !important;
          }
          #vibelock-printable-labels {
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
          .vibelock-label-card {
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
