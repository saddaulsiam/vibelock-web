"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Barcode,
  Check,
  Copy,
  ExternalLink,
  Factory,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import { BarcodeSvg } from "./admin-inventory-barcode-modal";
import type { AdminInventoryDetailResult } from "@/lib/admin/inventory/inventory-queries";

function currency(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface AdminInventoryDetailHeaderProps {
  variant: AdminInventoryDetailResult["variant"];
  availableStock: number;
  onOpenPrintTag: () => void;
  onOpenPo: () => void;
  onOpenAdjust: () => void;
}

export function AdminInventoryDetailHeader({
  variant,
  availableStock,
  onOpenPrintTag,
  onOpenPo,
  onOpenAdjust,
}: AdminInventoryDetailHeaderProps) {
  const [copiedSku, setCopiedSku] = React.useState(false);
  const handleCopySku = () => {
    navigator.clipboard.writeText(variant.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;

  const unitProfit = variant.sellingPrice - variant.costPrice;
  const marginPct =
    variant.sellingPrice > 0 ? Math.round((unitProfit / variant.sellingPrice) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-4">
        <div className="flex items-center gap-2 text-sm text-[#101114]/60">
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-1.5 font-medium text-[#101114] hover:underline"
          >
            <ArrowLeft className="size-4" />
            <span>Inventory Control Center</span>
          </Link>
          <span>/</span>
          <span className="max-w-[200px] truncate text-[#101114]/70">{variant.product.name}</span>
          <span>/</span>
          <span className="font-mono text-xs font-semibold text-[#101114]">{variant.sku}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/products/${variant.product.slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
          >
            <ExternalLink className="size-3.5" />
            <span>Storefront View</span>
          </Link>

          <button
            type="button"
            onClick={onOpenPrintTag}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
          >
            <Barcode className="size-3.5" />
            <span>Print Tag</span>
          </button>

          <button
            type="button"
            onClick={onOpenPo}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
            title="Create Supplier Purchase Order / Reorder Sheet for this variant"
          >
            <Factory className="size-3.5 text-amber-700" />
            <span>Reorder / PO</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdjust}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-[#101114] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#101114]/85"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* Hero Variant Profile Card */}
      <div className="relative overflow-hidden rounded-md border border-[#101114]/10 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {/* Product Thumbnail */}
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-[#101114]/10 bg-[#F3F0E8]">
              {variant.primaryImage ? (
                <Image
                  src={variant.primaryImage}
                  alt={variant.product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[#101114]/40">
                  <Package className="size-8" />
                </div>
              )}
            </div>

            {/* Title & Attributes */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#101114]">
                  {variant.product.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isOutOfStock
                      ? "border border-rose-200 bg-rose-100 text-rose-800"
                      : isLowStock
                        ? "border border-amber-200 bg-amber-100 text-amber-900"
                        : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                </span>
              </div>

              {/* SKU & Copy */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#101114]/70">
                <div className="flex items-center gap-1.5 rounded-xs bg-[#F3F0E8] px-2 py-0.5 font-mono text-xs font-bold text-[#101114]">
                  <span>{variant.sku}</span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="text-[#101114]/60 transition-colors hover:text-[#101114]"
                    title="Copy SKU"
                  >
                    {copiedSku ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>

                <span>•</span>
                <span>
                  <strong>Size:</strong> {variant.size || "Standard"}
                </span>
                <span>•</span>
                <span>
                  <strong>Color:</strong> {variant.color || "Standard"}
                </span>
                {variant.weight ? (
                  <>
                    <span>•</span>
                    <span>
                      <strong>Weight:</strong> {variant.weight} kg
                    </span>
                  </>
                ) : null}
              </div>

              {/* Price Tags */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
                <div>
                  <span className="text-xs text-[#101114]/60">Cost Price: </span>
                  <span className="font-semibold text-[#101114]">
                    {currency(variant.costPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#101114]/60">Selling Price: </span>
                  <span className="font-bold text-[#101114]">
                    {currency(variant.discountPrice ?? variant.sellingPrice)}
                  </span>
                  {variant.discountPrice ? (
                    <span className="ml-1.5 text-xs text-zinc-400 line-through">
                      {currency(variant.sellingPrice)}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xs bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Margin: {marginPct}% (+{currency(unitProfit)})
                </div>
              </div>
            </div>
          </div>

          {/* Quick Barcode Preview */}
          <div className="hidden shrink-0 flex-col items-center rounded-sm border border-[#101114]/15 bg-[#FBF9F5] p-3 text-center sm:flex">
            <span className="text-[10px] font-extrabold tracking-widest text-[#101114]/60 uppercase">
              GARMENT TAG
            </span>
            <div className="my-1">
              <BarcodeSvg value={variant.sku} height={22} />
            </div>
            <span className="font-mono text-[9px] text-[#101114]/80">{variant.sku}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

