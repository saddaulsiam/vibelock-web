"use client";

import { Package, PackageCheck, PackageMinus, PackagePlus, PackageX } from "lucide-react";

function currency(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface AdminInventoryDetailKpiProps {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  costValuation: number;
  retailValuation: number;
  totalSold: number;
  totalRestocked: number;
  totalDamaged: number;
  totalTransactions: number;
}

export function AdminInventoryDetailKpi({
  totalStock,
  reservedStock,
  availableStock,
  costValuation,
  retailValuation,
  totalSold,
  totalRestocked,
  totalDamaged,
  totalTransactions,
}: AdminInventoryDetailKpiProps) {
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;

  return (
    <div className="space-y-4">
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
    </div>
  );
}
