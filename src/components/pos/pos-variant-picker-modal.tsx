"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PosProductSummary, PosProductVariant } from "@/lib/pos/pos-types";

interface PosVariantPickerModalProps {
  product: PosProductSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant: (variant: PosProductVariant, product: PosProductSummary) => void;
}

export function PosVariantPickerModal({
  product,
  isOpen,
  onClose,
  onSelectVariant,
}: PosVariantPickerModalProps) {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-[#d6d2c4] bg-white p-0 shadow-2xl sm:max-w-xl md:max-w-2xl">
        {/* Header Preview */}
        <div className="flex items-center gap-3.5 border-b border-[#e2ded2] bg-[#fbfaf7] p-4 sm:p-5">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[#e2ded2] bg-white shadow-2xs sm:h-20 sm:w-20">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package className="h-8 w-8 stroke-1 text-slate-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <DialogHeader className="space-y-0.5 text-left">
              <DialogTitle className="font-heading text-vl-black line-clamp-1 text-base font-bold sm:text-lg">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tap a variant below to add to POS ticket
              </DialogDescription>
            </DialogHeader>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-heading text-vl-black text-sm font-black sm:text-base">
                ৳{product.minPrice.toFixed(0)}
                {product.maxPrice > product.minPrice && (
                  <span className="text-vl-grey text-xs font-normal sm:text-sm">
                    {" "}
                    - ৳{product.maxPrice.toFixed(0)}
                  </span>
                )}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-medium text-slate-600">
                Total Stock: {product.totalAvailableStock}
              </span>
            </div>
          </div>
        </div>

        {/* Variants Touch Grid */}
        <div className="max-h-[440px] overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {product.variants.map((v) => {
              const vOutOfStock = v.availableStock <= 0;
              const label = [v.size, v.color].filter(Boolean).join(" / ") || v.sku;

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={vOutOfStock}
                  onClick={() => {
                    onSelectVariant(v, product);
                    onClose();
                  }}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    vOutOfStock
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
                      : "hover:border-vl-cyan hover:bg-vl-cyan/5 border-[#e2ded2] bg-white hover:shadow-xs active:scale-[0.98]"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-1">
                    <span className="font-heading text-vl-black group-hover:text-vl-cyan truncate text-xs font-bold">
                      {label}
                    </span>
                    <span className="font-heading text-vl-black shrink-0 text-xs font-black">
                      ৳{v.effectivePrice.toFixed(0)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex w-full items-center justify-between text-[11px]">
                    <span className="max-w-[100px] truncate font-mono text-[10px] text-slate-400">
                      {v.sku}
                    </span>
                    {vOutOfStock ? (
                      <span className="font-mono text-[10px] font-bold text-red-500">
                        Out of stock
                      </span>
                    ) : v.availableStock <= 2 ? (
                      <span className="font-mono text-[10px] font-bold text-amber-600">
                        Low: {v.availableStock}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] font-semibold text-emerald-600">
                        {v.availableStock} in stock
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
