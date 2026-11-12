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
import { Button } from "@/components/ui/button";
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
      <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="text-vl-dark-900/60 flex items-center gap-2 text-sm">
          <Link
            href="/admin/inventory"
            className="text-vl-dark-900 inline-flex items-center gap-1.5 font-medium hover:underline"
          >
            <ArrowLeft className="size-4" />
            <span>Inventory Control Center</span>
          </Link>
          <span>/</span>
          <span className="text-vl-dark-900/70 max-w-[200px] truncate">{variant.product.name}</span>
          <span>/</span>
          <span className="text-vl-dark-900 font-mono text-xs font-semibold">{variant.sku}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/products/${variant.product.slug}`}
            target="_blank"
            className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 inline-flex h-9 items-center gap-1.5 rounded-sm border bg-white px-3 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="size-3.5" />
            <span>Storefront View</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPrintTag}
            className="gap-1.5"
          >
            <Barcode className="size-3.5" />
            <span>Print Tag</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPo}
            className="gap-1.5"
            title="Create Supplier Purchase Order / Reorder Sheet for this variant"
          >
            <Factory className="size-3.5 text-amber-700" />
            <span>Reorder / PO</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenAdjust}
            className="gap-1.5"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Adjust Stock</span>
          </Button>
        </div>
      </div>

      {/* Hero Variant Profile Card */}
      <div className="border-vl-dark-900/10 relative overflow-hidden rounded-md border bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {/* Product Thumbnail */}
            <div className="border-vl-dark-900/10 bg-vl-white-300 relative size-20 shrink-0 overflow-hidden rounded-md border">
              {variant.primaryImage ? (
                <Image
                  src={variant.primaryImage}
                  alt={variant.product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="text-vl-dark-900/40 flex size-full items-center justify-center">
                  <Package className="size-8" />
                </div>
              )}
            </div>

            {/* Title & Attributes */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-vl-dark-900 text-xl font-bold tracking-tight">
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
              <div className="text-vl-dark-900/70 flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-vl-white-300 text-vl-dark-900 flex items-center gap-1.5 rounded-xs px-2 py-0.5 font-mono text-xs font-bold">
                  <span>{variant.sku}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopySku}
                    className="text-vl-dark-900/60 hover:text-vl-dark-900 size-4"
                    title="Copy SKU"
                  >
                    {copiedSku ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
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
                  <span className="text-vl-dark-900/60 text-xs">Cost Price: </span>
                  <span className="text-vl-dark-900 font-semibold">
                    {currency(variant.costPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-vl-dark-900/60 text-xs">Selling Price: </span>
                  <span className="text-vl-dark-900 font-bold">
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
          <div className="border-vl-dark-900/15 bg-vl-white-200 hidden shrink-0 flex-col items-center rounded-sm border p-3 text-center sm:flex">
            <span className="text-vl-dark-900/60 text-[10px] font-extrabold tracking-widest uppercase">
              GARMENT TAG
            </span>
            <div className="my-1">
              <BarcodeSvg value={variant.sku} height={22} />
            </div>
            <span className="text-vl-dark-900/80 font-mono text-[9px]">{variant.sku}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
