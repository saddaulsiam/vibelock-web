"use client";

import { quickUpdateProductPricesAction } from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductItem } from "@/lib/admin/catalog/catalog-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const [prevProductId, setPrevProductId] = React.useState<string | null>(null);
  if (product && prevProductId !== product.id) {
    setPrevProductId(product.id);
    setPriceForm({
      sellingPrice: product.minSellingPrice !== null ? String(product.minSellingPrice) : "",
      discountPrice: product.minDiscountPrice !== null ? String(product.minDiscountPrice) : "",
    });
    setPriceError(null);
    setIsUpdatingPrice(false);
  }

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
      <div className="border-vl-dark-900/20 w-full max-w-md rounded-sm border bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-vl-dark-900/10 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Tag className="text-vl-dark-900 size-4" />
            <h3 className="text-vl-dark-900 text-sm font-semibold">Quick Price & Discount Edit</h3>
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

        {/* Modal Body */}
        <div className="space-y-4 p-5">
          <div className="border-vl-dark-900/10 bg-vl-white-200 flex items-center gap-3 rounded-sm border p-3">
            {product.primaryImage ? (
              <div className="border-vl-dark-900/15 relative size-10 shrink-0 overflow-hidden rounded-xs border bg-white">
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
              <p className="text-vl-dark-900 truncate text-xs font-semibold">{product.name}</p>
              <p className="text-vl-dark-900/60 font-mono text-[10px]">
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
                <label className="text-vl-dark-900 block text-xs font-semibold">Cost Price</label>
                <span className="text-vl-dark-900/50 text-[10px] font-medium">
                  🔒 Disabled (Main Price / No Change)
                </span>
              </div>
              <div className="mt-1">
                <Input
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
                  size="default"
                  className="text-vl-dark-900/70 cursor-not-allowed font-semibold select-none"
                  title="Cost price cannot be edited here. Change it from the full product edit page."
                />
              </div>
            </div>

            <div>
              <label className="text-vl-dark-900 block text-xs font-semibold">
                Selling Price (BDT ৳) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={priceForm.sellingPrice}
                  onChange={(e) =>
                    setPriceForm((prev) => ({ ...prev, sellingPrice: e.target.value }))
                  }
                  placeholder="e.g. 1600"
                  size="default"
                />
              </div>
            </div>

            <div>
              <label className="text-vl-dark-900 block text-xs font-semibold">
                Discount Price (BDT ৳){" "}
                <span className="text-vl-dark-900/60 font-normal">(Optional)</span>
              </label>
              <div className="mt-1">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={priceForm.discountPrice}
                  onChange={(e) =>
                    setPriceForm((prev) => ({ ...prev, discountPrice: e.target.value }))
                  }
                  placeholder="Leave blank for regular price"
                  size="default"
                />
              </div>
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

          <p className="text-vl-dark-900/50 text-[11px] leading-relaxed">
            Note: Updating the price will apply to all variants of this product.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="border-vl-dark-900/10 bg-vl-white-200 flex items-center justify-end gap-2 border-t px-5 py-3 text-xs">
          <Button type="button" variant="outline" size="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="default"
            disabled={isUpdatingPrice || !priceForm.sellingPrice}
            onClick={handleSaveQuickPrice}
          >
            {isUpdatingPrice ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>Save Prices</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
