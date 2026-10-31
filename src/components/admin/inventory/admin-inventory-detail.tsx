"use client";

import { AdminInventoryPoModal } from "@/components/admin/inventory/admin-inventory-po-modal";
import { quickAdjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type { AdminInventoryDetailResult } from "@/lib/admin/inventory/inventory-queries";
import type { InventoryTransactionType } from "@prisma/client";
import {
  ArrowLeft,
  Barcode,
  Check,
  Copy,
  ExternalLink,
  Factory,
  FileSpreadsheet,
  Minus,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageX,
  Plus,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

function currency(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateInput: Date | string) {
  const d = new Date(dateInput);
  return d.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateInput: Date | string) {
  const d = new Date(dateInput).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateInput).toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}

function BarcodeSvg({ value, height = 28 }: { value: string; height?: number }) {
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

const COMMON_REASONS: Record<InventoryTransactionType, string[]> = {
  RESTOCK: [
    "Factory batch restock",
    "Supplier delivery intake",
    "Seasonal restock replenishment",
    "Warehouse transfer in",
  ],
  ADJUSTMENT: [
    "Physical audit count correction",
    "Discrepancy reconciliation",
    "Storefront sample return",
    "Unrecorded counter movement",
  ],
  DAMAGE: [
    "Damaged in transit / fabric defect",
    "Sewing / zipper defect",
    "Stained / spoiled unit",
    "Counter display wear and tear",
  ],
  RETURN: [
    "Customer return restocked",
    "Courier return inspection pass",
    "Exchange item restocked",
  ],
  SALE: ["POS counter direct sale", "Manual retail order"],
};

export function AdminInventoryDetail({ data }: { data: AdminInventoryDetailResult }) {
  const router = useRouter();
  const {
    variant,
    totalStock,
    reservedStock,
    availableStock,
    totalSold,
    totalRestocked,
    totalDamaged,
    transactions,
    totalPages,
    page,
    typeFilter,
    totalTransactions,
  } = data;

  // SKU Copy state
  const [copiedSku, setCopiedSku] = React.useState(false);
  const handleCopySku = () => {
    navigator.clipboard.writeText(variant.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  // Reference copy state
  const [copiedRef, setCopiedRef] = React.useState<string | null>(null);
  const handleCopyRef = (refId: string) => {
    navigator.clipboard.writeText(refId);
    setCopiedRef(refId);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Stock status
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;

  // Valuation metrics
  const costValuation = totalStock * variant.costPrice;
  const retailValuation = totalStock * variant.sellingPrice;
  const unitProfit = variant.sellingPrice - variant.costPrice;
  const marginPct =
    variant.sellingPrice > 0 ? Math.round((unitProfit / variant.sellingPrice) * 100) : 0;

  // Quick Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [adjustType, setAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [adjustMode, setAdjustMode] = React.useState<"delta" | "target">("delta");
  const [adjustQuantity, setAdjustQuantity] = React.useState<number>(10);
  const [targetQuantity, setTargetQuantity] = React.useState<number>(totalStock);
  const [adjustReason, setAdjustReason] = React.useState<string>("Factory batch restock");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = React.useState<string | null>(null);

  // When type changes, update default reason
  const handleTypeChange = (newType: InventoryTransactionType) => {
    setAdjustType(newType);
    setAdjustReason(COMMON_REASONS[newType][0] || "");
    if (newType === "DAMAGE" && adjustQuantity > 0) {
      setAdjustQuantity(-Math.abs(adjustQuantity));
    } else if (newType === "RESTOCK" && adjustQuantity < 0) {
      setAdjustQuantity(Math.abs(adjustQuantity));
    }
  };

  // Calculate actual delta to submit
  const computedDelta = adjustMode === "target" ? targetQuantity - totalStock : adjustQuantity;

  // Calculate resulting stock preview
  const previewStock = totalStock + computedDelta;
  const previewAvailable = previewStock - reservedStock;

  const handleQuickAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);

    if (computedDelta === 0) {
      setAdjustError("Stock delta cannot be 0.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Please specify a reason or audit note.");
      return;
    }
    if (previewStock < reservedStock) {
      setAdjustError(
        `Resulting physical stock (${previewStock}) cannot be less than active reservations (${reservedStock}).`
      );
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await quickAdjustInventoryAction({
        variantId: variant.id,
        quantity: computedDelta,
        reason: adjustReason.trim(),
        type: adjustType,
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        setAdjustSuccess(res.message || "Inventory successfully updated.");
        router.refresh();
        setTimeout(() => {
          setIsAdjustModalOpen(false);
          setAdjustSuccess(null);
        }, 1200);
      }
    } catch {
      setAdjustError("An unexpected error occurred while saving the adjustment.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Barcode & Price Tag Modal State
  const [showBarcodeModal, setShowBarcodeModal] = React.useState(false);
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantity, setBarcodeQuantity] = React.useState<number>(1);
  const [showCostOnBarcode, setShowCostOnBarcode] = React.useState<boolean>(false);

  // Supplier Purchase Order (PO) Modal State
  const [showPoModal, setShowPoModal] = React.useState(false);

  // Type filter navigation
  const handleFilterChange = (type: string) => {
    const params = new URLSearchParams(window.location.search);
    if (type === "ALL") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`/admin/inventory/${variant.id}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`/admin/inventory/${variant.id}?${params.toString()}`);
  };

  // Export Ledger to CSV
  const handleExportLedgerCsv = () => {
    const headers = ["Date", "Type", "Sales Channel", "Quantity Delta", "Reference ID", "Notes"];
    const rows = transactions.map((t) => [
      formatDate(t.createdAt),
      t.type,
      t.salesChannel || "DIRECT",
      t.quantity > 0 ? `+${t.quantity}` : `${t.quantity}`,
      t.referenceId || "",
      // Defend against CSV formula injection
      (t.notes || "").replace(/^[=+\-@\t\r]/, "'$&"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ledger-${variant.sku}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
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
            onClick={() => {
              setBarcodeQuantity(availableStock > 0 ? availableStock : 1);
              setShowBarcodeModal(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
          >
            <Barcode className="size-3.5" />
            <span>Print Tag</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPoModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
            title="Create Supplier Purchase Order / Reorder Sheet for this variant"
          >
            <Factory className="size-3.5 text-amber-700" />
            <span>Reorder / PO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdjustError(null);
              setAdjustSuccess(null);
              setAdjustType("RESTOCK");
              setAdjustMode("delta");
              setAdjustQuantity(10);
              setTargetQuantity(totalStock);
              setAdjustReason(COMMON_REASONS.RESTOCK[0]);
              setIsAdjustModalOpen(true);
            }}
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

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Physical Stock */}
        <div className="rounded-md border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#101114]/60">
            <span>Physical Stock</span>
            <Package className="size-4 text-[#101114]/40" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#101114]">{totalStock}</div>
          <p className="mt-1 text-[11px] text-[#101114]/60">Total units on-hand in warehouse</p>
        </div>

        {/* Reserved Stock */}
        <div className="rounded-md border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#101114]/60">
            <span>Reserved Stock</span>
            <PackageCheck className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{reservedStock}</div>
          <p className="mt-1 text-[11px] text-[#101114]/60">Active unexpired cart reservations</p>
        </div>

        {/* Available to Sell */}
        <div
          className={`rounded-md border p-4 shadow-2xs ${
            isOutOfStock
              ? "border-rose-200 bg-rose-50/50"
              : isLowStock
                ? "border-amber-200 bg-amber-50/50"
                : "border-emerald-200 bg-emerald-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#101114]/60">
            <span>Available to Sell</span>
            {isOutOfStock ? (
              <PackageX className="size-4 text-rose-600" />
            ) : isLowStock ? (
              <PackageMinus className="size-4 text-amber-600" />
            ) : (
              <PackagePlus className="size-4 text-emerald-600" />
            )}
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              isOutOfStock ? "text-rose-700" : isLowStock ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {availableStock}
          </div>
          <p className="mt-1 text-[11px] text-[#101114]/60">Physical stock minus reserved</p>
        </div>

        {/* Cost Valuation */}
        <div className="rounded-md border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#101114]/60">
            <span>Cost Valuation</span>
            <span className="font-mono text-[10px] text-[#101114]/40">৳ COST</span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#101114]">{currency(costValuation)}</div>
          <p className="mt-1 text-[11px] text-[#101114]/60">Physical units × Cost price</p>
        </div>

        {/* Retail Valuation */}
        <div className="rounded-md border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#101114]/60">
            <span>Retail Valuation</span>
            <span className="font-mono text-[10px] text-emerald-600">৳ RETAIL</span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            {currency(retailValuation)}
          </div>
          <p className="mt-1 text-[11px] text-[#101114]/60">Physical units × Selling price</p>
        </div>
      </div>

      {/* Lifetime Performance Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#101114]/70">Lifetime Sold:</span>
            <span className="font-bold text-[#101114]">{totalSold} units</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#101114]/70">Total Restocked:</span>
            <span className="font-bold text-emerald-700">+{totalRestocked} units</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#101114]/70">Damaged / Defect:</span>
            <span className="font-bold text-rose-700">{totalDamaged} units</span>
          </div>
        </div>

        <div className="text-[11px] text-[#101114]/50">
          Total recorded ledger entries: <strong>{totalTransactions}</strong>
        </div>
      </div>

      {/* Movement Timeline & Transaction Ledger */}
      <div className="rounded-md border border-[#101114]/10 bg-white shadow-xs">
        {/* Table Header & Controls */}
        <div className="flex flex-col gap-4 border-b border-[#101114]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#101114]">Stock Movement Timeline & Ledger</h2>
            <p className="text-xs text-[#101114]/60">
              Immutable ledger of all inbound, outbound, and adjustment events for this variant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportLedgerCsv}
              disabled={transactions.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-50"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-700" />
              <span>Export Ledger CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-2.5 text-xs">
          <span className="mr-1 font-semibold text-[#101114]/70">Filter Event:</span>
          {[
            { id: "ALL", label: "All Movements" },
            { id: "RESTOCK", label: "Restock (+)" },
            { id: "SALE", label: "Sales (-)" },
            { id: "ADJUSTMENT", label: "Adjustment (±)" },
            { id: "DAMAGE", label: "Damaged (-)" },
            { id: "RETURN", label: "Return (+)" },
          ].map((pill) => {
            const isActive = typeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => handleFilterChange(pill.id)}
                className={`rounded-xs px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#101114] text-white"
                    : "border border-[#101114]/15 bg-white text-[#101114]/70 hover:bg-[#101114]/10 hover:text-[#101114]"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Ledger Table */}
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RotateCcw className="size-8 text-[#101114]/30" />
            <p className="mt-3 text-sm font-semibold text-[#101114]">No transactions recorded</p>
            <p className="text-xs text-[#101114]/60">
              {typeFilter !== "ALL"
                ? `No transactions found matching filter "${typeFilter}".`
                : "No inventory events have occurred for this variant yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50 text-[11px] font-semibold text-[#101114]/70">
                <tr>
                  <th className="py-3 pr-3 pl-5">Event Type</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3 text-right">Quantity Delta</th>
                  <th className="px-3 py-3">Reference ID</th>
                  <th className="px-3 py-3">Notes & Reason</th>
                  <th className="py-3 pr-5 pl-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101114]/5">
                {transactions.map((tx) => {
                  const isPositive = tx.quantity > 0;
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-[#F3F0E8]/30">
                      {/* Type Badge */}
                      <td className="py-3 pr-3 pl-5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-bold ${
                            tx.type === "RESTOCK"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.type === "SALE"
                                ? "bg-blue-100 text-blue-800"
                                : tx.type === "DAMAGE"
                                  ? "bg-rose-100 text-rose-800"
                                  : tx.type === "RETURN"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {tx.type === "RESTOCK" && <PackagePlus className="size-3" />}
                          {tx.type === "SALE" && <PackageMinus className="size-3" />}
                          {tx.type === "DAMAGE" && <PackageX className="size-3" />}
                          {tx.type === "RETURN" && <RotateCcw className="size-3" />}
                          {tx.type === "ADJUSTMENT" && <SlidersHorizontal className="size-3" />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      {/* Sales Channel */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-[10px] font-medium text-[#101114]/60">
                          {tx.salesChannel || "SYSTEM"}
                        </span>
                      </td>

                      {/* Quantity Delta */}
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`inline-flex items-center font-mono text-xs font-extrabold ${
                            isPositive ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}
                        </span>
                      </td>

                      {/* Reference ID */}
                      <td className="px-3 py-3 font-mono text-[11px] text-[#101114]/70">
                        {tx.referenceId ? (
                          <div className="flex items-center gap-1">
                            <span className="max-w-[140px] truncate" title={tx.referenceId}>
                              {tx.referenceId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyRef(tx.referenceId!)}
                              className="text-[#101114]/40 hover:text-[#101114]"
                              title="Copy Reference"
                            >
                              {copiedRef === tx.referenceId ? (
                                <Check className="size-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="size-2.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Notes / Reason */}
                      <td className="max-w-xs truncate px-3 py-3 text-[#101114]/80">
                        {tx.notes || <span className="text-zinc-400 italic">No notes</span>}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 pr-5 pl-3 text-right">
                        <span className="block font-medium text-[#101114]">
                          {formatRelativeTime(tx.createdAt)}
                        </span>
                        <span className="block text-[10px] text-[#101114]/50">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
            <span className="text-[#101114]/60">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-8 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="h-8 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-lg rounded-md border border-[#101114]/15 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-4">
              <div>
                <h3 className="font-bold text-[#101114]">Record Stock Movement / Adjustment</h3>
                <p className="text-xs text-[#101114]/60">
                  {variant.product.name} ({variant.sku})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdjustSubmit} className="space-y-4 p-5">
              {/* Type Selection */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`rounded-xs border p-2 text-center text-xs font-bold transition-colors ${
                        adjustType === type
                          ? "border-[#101114] bg-[#101114] text-white"
                          : "border-[#101114]/20 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between rounded-xs border border-[#101114]/10 bg-[#FBF9F5] p-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAdjustMode("delta")}
                  className={`flex-1 rounded-xs py-1 font-semibold transition-colors ${
                    adjustMode === "delta"
                      ? "bg-white text-[#101114] shadow-2xs"
                      : "text-[#101114]/60 hover:text-[#101114]"
                  }`}
                >
                  Add / Remove Delta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode("target");
                    setTargetQuantity(totalStock);
                  }}
                  className={`flex-1 rounded-xs py-1 font-semibold transition-colors ${
                    adjustMode === "target"
                      ? "bg-white text-[#101114] shadow-2xs"
                      : "text-[#101114]/60 hover:text-[#101114]"
                  }`}
                >
                  Set Absolute On-Hand
                </button>
              </div>

              {/* Quantity Input */}
              {adjustMode === "delta" ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#101114]">
                      Quantity Delta (Positive to add, Negative to remove)
                    </label>
                    <span className="font-mono text-xs font-bold text-[#101114]">
                      {adjustQuantity > 0 ? `+${adjustQuantity}` : adjustQuantity}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustQuantity((prev) => prev - 1)}
                      className="flex size-9 items-center justify-center rounded-xs bg-[#F3F0E8] font-bold text-[#101114] hover:bg-[#101114]/15"
                    >
                      <Minus className="size-4" />
                    </button>
                    <input
                      type="number"
                      step="1"
                      value={adjustQuantity}
                      onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
                      className="h-9 flex-1 rounded-xs border border-[#101114]/20 px-3 text-center font-mono text-base font-bold text-[#101114] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustQuantity((prev) => prev + 1)}
                      className="flex size-9 items-center justify-center rounded-xs bg-[#F3F0E8] font-bold text-[#101114] hover:bg-[#101114]/15"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Stepper Quick Chips */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[1, 5, 10, 25, 50, 100].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setAdjustQuantity(adjustType === "DAMAGE" ? -step : step)}
                        className="rounded-xs bg-[#F3F0E8] px-2 py-0.5 text-[11px] font-semibold text-[#101114] hover:bg-[#101114]/15"
                      >
                        {adjustType === "DAMAGE" ? `-${step}` : `+${step}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-[#101114]">
                    Target Physical Stock (Currently: {totalStock})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(parseInt(e.target.value, 10) || 0)}
                    className="mt-1.5 h-9 w-full rounded-xs border border-[#101114]/20 px-3 font-mono text-base font-bold text-[#101114] outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#101114]/60">
                    Delta to record:{" "}
                    <strong>{computedDelta > 0 ? `+${computedDelta}` : computedDelta}</strong>
                  </p>
                </div>
              )}

              {/* Stock Preview Alert */}
              <div
                className={`rounded-xs border p-2.5 text-xs ${
                  previewStock < reservedStock
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-[#101114]/10 bg-[#FBF9F5] text-[#101114]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    Current Physical: <strong>{totalStock}</strong>
                  </span>
                  <span>→</span>
                  <span>
                    New Physical: <strong>{previewStock}</strong>
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#101114]/70">
                  <span>Reserved: {reservedStock}</span>
                  <span>
                    New Available to Sell: <strong>{previewAvailable}</strong>
                  </span>
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#101114]">
                  Reason / Audit Note
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain why this adjustment is being made"
                  className="h-9 w-full rounded-xs border border-[#101114]/20 px-3 text-xs text-[#101114] outline-none"
                />

                {/* Quick Reason Chips */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {COMMON_REASONS[adjustType].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setAdjustReason(reason)}
                      className={`rounded-xs px-2 py-0.5 text-[10px] transition-colors ${
                        adjustReason === reason
                          ? "bg-[#101114] text-white"
                          : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/15"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error / Success Messages */}
              {adjustError && (
                <div className="rounded-xs border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                  {adjustError}
                </div>
              )}
              {adjustSuccess && (
                <div className="rounded-xs border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                  {adjustSuccess}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="h-9 rounded-xs border border-[#101114]/20 bg-white px-4 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xs bg-[#101114] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#101114]/85 disabled:opacity-50"
                >
                  {isSubmittingAdjust ? "Saving Ledger Entry..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE & PRICE TAG PRINT MODAL */}
      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in-0 zoom-in-95 relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md border border-[#101114]/15 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Barcode className="size-5 text-[#101114]" />
                <h3 className="font-bold text-[#101114]">Print Barcodes & Garment Price Tags</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Format:</span>
                  <select
                    value={barcodeLabelSize}
                    onChange={(e) =>
                      setBarcodeLabelSize(e.target.value as "standard" | "compact" | "sheet")
                    }
                    className="h-8 rounded-xs border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="standard">50mm × 30mm (Thermal Roll)</option>
                    <option value="compact">40mm × 25mm (Compact Tag)</option>
                    <option value="sheet">A4 Sheet Grid</option>
                  </select>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1.5 rounded-xs border border-[#101114]/20 bg-white px-2 py-1">
                  <span className="text-[11px] font-semibold text-[#101114]/70">Copies:</span>
                  <button
                    type="button"
                    onClick={() => setBarcodeQuantity((prev) => Math.max(1, prev - 1))}
                    className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={barcodeQuantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setBarcodeQuantity(Math.min(500, v));
                    }}
                    className="h-5 w-12 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setBarcodeQuantity((prev) => Math.min(500, prev + 1))}
                    className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1">
                  {[1, 2, 5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBarcodeQuantity(preset)}
                      className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold ${
                        barcodeQuantity === preset
                          ? "bg-[#101114] text-white"
                          : "bg-[#F3F0E8] text-[#101114]/70 hover:bg-[#101114]/15"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Cost Code Checkbox */}
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-[#101114]/80">
                  <input
                    type="checkbox"
                    checked={showCostOnBarcode}
                    onChange={(e) => setShowCostOnBarcode(e.target.checked)}
                    className="rounded border-[#101114]/30"
                  />
                  <span>Show Cost Code</span>
                </label>
              </div>

              {/* Print Action Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-8 items-center gap-1.5 rounded-xs bg-[#101114] px-4 font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
              >
                <Printer className="size-3.5" />
                <span>
                  Print {barcodeQuantity} {barcodeQuantity === 1 ? "Label" : "Labels"}
                </span>
              </button>
            </div>

            {/* Print Preview Container */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                id="vibelock-printable-labels"
                className="flex flex-wrap items-center justify-center gap-3"
              >
                {Array.from({ length: barcodeQuantity }, (_, idx) => (
                  <div
                    key={idx}
                    className={`vibelock-label-card relative flex flex-col justify-between rounded-xs border border-dashed border-[#101114]/30 bg-white p-2 text-center text-[#101114] shadow-2xs ${
                      barcodeLabelSize === "compact"
                        ? "h-[25mm] w-[40mm]"
                        : barcodeLabelSize === "sheet"
                          ? "h-[30mm] w-[48mm]"
                          : "h-[30mm] w-[50mm]"
                    }`}
                  >
                    {barcodeQuantity > 1 && (
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
                      {variant.product.name}
                    </p>

                    <div className="flex items-center justify-between px-1 font-mono text-[9px]">
                      <span>{variant.size ? `SIZE: ${variant.size}` : ""}</span>
                      <span className="text-[11px] font-bold">
                        ৳{variant.discountPrice ?? variant.sellingPrice}
                      </span>
                    </div>

                    <div className="px-1 py-0.5">
                      <BarcodeSvg value={variant.sku} height={20} />
                      <p className="font-mono text-[8px] tracking-wider text-[#101114]/80">
                        {variant.sku}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#101114]/10 pt-0.5 text-[8px] text-[#101114]/60">
                      <span>{variant.color || "Standard"}</span>
                      {showCostOnBarcode && (
                        <span className="font-mono">C: ৳{variant.costPrice}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Stylesheet */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #vibelock-printable-labels,
                #vibelock-printable-labels * {
                  visibility: visible;
                }
                #vibelock-printable-labels {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  display: flex;
                  flex-wrap: wrap;
                  gap: 2mm;
                  padding: 2mm;
                  background: white;
                }
                .vibelock-label-card {
                  border: 1px dashed #ccc !important;
                  page-break-inside: avoid;
                  box-shadow: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Supplier Purchase Order (PO) Modal */}
      <AdminInventoryPoModal
        key={variant.id}
        isOpen={showPoModal}
        onClose={() => setShowPoModal(false)}
        initialItems={[
          {
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            discountPrice: variant.discountPrice,
            productId: variant.product.id,
            productSlug: variant.product.slug,
            primaryImage: variant.primaryImage,
            product: {
              id: variant.product.id,
              name: variant.product.name,
              slug: variant.product.slug,
            },
            totalStock,
            reserved: reservedStock,
            available: availableStock,
          },
        ]}
      />
    </div>
  );
}
