"use client";

import { quickUpdateProductPricesAction } from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductItem } from "@/lib/admin/catalog/catalog-queries";
import { Loader2, Tag, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

export interface AdminProductQuickPriceModalProps {
  product: AdminProductItem | null;
  onClose: () => void;
  onSuccess: (updatedProduct: AdminProductItem, message: string) => void;
}

export function AdminProductQuickPriceModal({
  product,
  onClose,
  onSuccess,
}: AdminProductQuickPriceModalProps) {
  const [priceForm, setPriceForm] = React.useState<{ sellingPrice: string; discountPrice: string }>(
    {
      sellingPrice: "",
      discountPrice: "",
    }
  );
  const [isUpdatingPrice, setIsUpdatingPrice] = React.useState(false);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setPriceForm({
        sellingPrice: product.minSellingPrice !== null ? String(product.minSellingPrice) : "",
        discountPrice: product.minDiscountPrice !== null ? String(product.minDiscountPrice) : "",
      });
      setPriceError(null);
      setIsUpdatingPrice(false);
    }
  }, [product]);

  if (!product) return null;

  const handleSaveQuickPrice = async () => {
    if (!product || isUpdatingPrice) return;
    setPriceError(null);
    setIsUpdatingPrice(true);
    try {
      const sNum = Number(priceForm.sellingPrice);
      const dNum = priceForm.discountPrice ? Number(priceForm.discountPrice) : null;
      const res = await quickUpdateProductPricesAction(product.id, {
        sellingPrice: sNum,
        discountPrice: dNum,
      });
      if (res.error) {
        setPriceError(res.error);
      } else {
        const updatedProduct: AdminProductItem = {
          ...product,
          minSellingPrice: sNum,
          maxSellingPrice: sNum,
          minDiscountPrice: dNum,
          variants: product.variants.map((v) => ({
            ...v,
            sellingPrice: sNum,
            discountPrice: dNum,
          })),
        };
        onSuccess(updatedProduct, `Updated prices for "${product.name}".`);
        onClose();
      }
    } catch {
      setPriceError("Failed to update prices.");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const s = Number(priceForm.sellingPrice);
  const d = Number(priceForm.discountPrice);
  const hasSavings = s > 0 && d > 0 && d < s;
  const saveAmount = hasSavings ? s - d : 0;
  const savePercent = hasSavings ? Math.round((saveAmount / s) * 100) : 0;

  const effectivePrice = Number(priceForm.discountPrice) || Number(priceForm.sellingPrice);
  const cost = product.minCostPrice ?? 0;
  const showProfit = cost > 0 && effectivePrice > 0;
  const profit = effectivePrice - cost;
  const profitMargin = showProfit ? Math.round((profit / effectivePrice) * 100) : 0;
  const isLoss = profit < 0;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="w-full max-w-md rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-[#101114]" />
            <h3 className="text-sm font-semibold text-[#101114]">Quick Price & Discount Edit</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-3">
            {product.primaryImage ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-xs border border-[#101114]/15 bg-white">
                <Image
                  src={product.primaryImage}
                  alt={product.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#101114]">{product.name}</p>
              <p className="font-mono text-[10px] text-[#101114]/60">
                /{product.slug} • {product.variantCount} variant(s)
              </p>
            </div>
          </div>

          {priceError && (
            <div className="rounded-sm border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
              {priceError}
            </div>
          )}

          <div className="space-y-3">
            {/* Cost Price (কেনা দাম - Disabled / Read-only) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#101114]">Cost Price</label>
                <span className="text-[10px] font-medium text-[#101114]/50">
                  🔒 Disabled (Main Price / No Change)
                </span>
              </div>
              <input
                type="text"
                disabled
                readOnly
                value={
                  product.minCostPrice !== null
                    ? product.minCostPrice === product.maxCostPrice
                      ? `৳${product.minCostPrice}`
                      : `৳${product.minCostPrice} – ৳${product.maxCostPrice}`
                    : "৳0"
                }
                className="mt-1 h-9 w-full cursor-not-allowed rounded-sm border border-[#101114]/15 bg-[#F3F0E8]/70 px-3 text-xs font-semibold text-[#101114]/70 select-none"
                title="Cost price cannot be edited here. Change it from the full product edit page."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101114]">
                Selling Price (BDT ৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={priceForm.sellingPrice}
                onChange={(e) =>
                  setPriceForm((prev) => ({ ...prev, sellingPrice: e.target.value }))
                }
                placeholder="e.g. 1600"
                className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-medium text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101114]">
                Discount Price (BDT ৳){" "}
                <span className="font-normal text-[#101114]/60">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={priceForm.discountPrice}
                onChange={(e) =>
                  setPriceForm((prev) => ({ ...prev, discountPrice: e.target.value }))
                }
                placeholder="Leave blank for regular price"
                className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-medium text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
              />
            </div>

            {/* Live Savings calculation */}
            {hasSavings && (
              <div className="flex items-center justify-between rounded-xs border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                <span>
                  Customer saves: <strong>৳{saveAmount}</strong>
                </span>
                <span className="rounded-2xs bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                  -{savePercent}% OFF
                </span>
              </div>
            )}

            {/* Profit Margin / Below Cost Warning */}
            {showProfit && (
              <div
                className={`flex items-center justify-between rounded-xs border px-3 py-1.5 text-xs ${
                  isLoss
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                <span>
                  {isLoss ? "⚠️ Selling below cost:" : "Est. Profit over Cost:"}{" "}
                  <strong>{isLoss ? `-৳${Math.abs(profit)}` : `৳${profit}`}</strong>
                </span>
                <span
                  className={`rounded-2xs px-1.5 py-0.5 text-[10px] font-bold ${
                    isLoss ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"
                  }`}
                >
                  {profitMargin}% margin
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-[#101114]/50">
            Note: Updating the price will apply to all variants of this product.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUpdatingPrice || !priceForm.sellingPrice}
            onClick={handleSaveQuickPrice}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
          >
            {isUpdatingPrice ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>Save Prices</span>
          </button>
        </div>
      </div>
    </div>
  );
}
