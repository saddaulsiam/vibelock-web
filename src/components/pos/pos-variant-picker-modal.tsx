"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="border-vl-white-500 rounded-brand max-w-xl gap-0 overflow-hidden border bg-white p-0 shadow-xl sm:max-w-xl md:max-w-2xl">
        {/* Header Preview */}
        <div className="border-vl-white-400 bg-vl-white-100 flex items-center gap-3.5 border-b p-4 sm:p-5">
          <div className="border-vl-white-500 rounded-brand relative h-16 w-16 flex-shrink-0 overflow-hidden border bg-white sm:h-20 sm:w-20">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="text-vl-dark-300 flex h-full w-full items-center justify-center">
                <Package className="text-vl-dark-300 h-8 w-8 stroke-1" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <DialogHeader className="space-y-0.5 text-left">
              <DialogTitle className="font-heading text-vl-dark-900 line-clamp-1 text-base font-bold sm:text-lg">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-vl-dark-400 text-xs">
                Tap a variant below to add to POS ticket
              </DialogDescription>
            </DialogHeader>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-heading text-vl-dark-900 text-sm font-black tabular-nums sm:text-base">
                ৳{product.minPrice.toFixed(0)}
                {product.maxPrice > product.minPrice && (
                  <span className="text-vl-dark-400 text-xs font-normal sm:text-sm">
                    {" "}
                    - ৳{product.maxPrice.toFixed(0)}
                  </span>
                )}
              </span>
              <span className="text-vl-dark-200">•</span>
              <span className="text-vl-dark-500 font-mono text-xs font-medium">
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
                <Button
                  key={v.id}
                  type="button"
                  variant="ghost"
                  disabled={vOutOfStock}
                  onClick={() => {
                    onSelectVariant(v, product);
                    onClose();
                  }}
                  className={`group rounded-brand relative flex h-auto flex-col justify-between border p-3.5 text-left transition-colors ${
                    vOutOfStock
                      ? "border-vl-white-400 bg-vl-white-100 cursor-not-allowed opacity-60"
                      : "hover:border-vl-dark-900 hover:bg-vl-white-100 border-vl-white-500 bg-white active:scale-[0.98]"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-1">
                    <span className="font-heading text-vl-dark-900 truncate text-xs font-bold">
                      {label}
                    </span>
                    <span className="font-heading text-vl-dark-900 shrink-0 text-xs font-black tabular-nums">
                      ৳{v.effectivePrice.toFixed(0)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex w-full items-center justify-between text-[11px]">
                    <span className="text-vl-dark-400 max-w-[100px] truncate font-mono text-[10px]">
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
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
