import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Boxes, Coins, Lock, PackageCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getAdminInventory,
  getAdminInventorySummary,
  type InventoryFilter,
} from "@/lib/admin/inventory-queries";
import { AdminInventoryTable } from "@/components/admin/admin-inventory-table";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currency(value: unknown) {
  return `৳${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function validFilter(value: string | undefined): InventoryFilter {
  return value === "in-stock" ||
    value === "low-stock" ||
    value === "out-of-stock" ||
    value === "negative"
    ? value
    : "all";
}

async function InventorySummarySection() {
  const summary = await getAdminInventorySummary();

  return (
    <div className="space-y-4">
      {summary.negativeStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50/90 p-4 text-sm text-red-950 shadow-sm backdrop-blur-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 animate-pulse" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-red-950">
                Negative stock anomaly detected ({summary.negativeStockCount}{" "}
                {summary.negativeStockCount === 1 ? "variant" : "variants"})
              </p>
              <Link
                href="/admin/inventory?filter=negative"
                className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800 hover:bg-red-200 transition"
              >
                Inspect negative items →
              </Link>
            </div>
            <p className="mt-1 text-xs text-red-800 leading-relaxed">
              Physical or available stock is currently below zero. Click above to view the affected
              variants and record an audit adjustment or investigate ledger movements.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Physical Stock */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
              Physical Stock
            </span>
            <span className="rounded-md bg-zinc-100 p-1.5 text-zinc-600">
              <Boxes className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {summary.totalPhysicalStock.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Across {summary.totalVariants.toLocaleString()} variants on hand
          </p>
        </Card>

        {/* Reserved Stock */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-amber-600 uppercase">
              Reserved Stock
            </span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <Lock className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-amber-700">
            {summary.totalReservedStock.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Held in active checkout reservations
          </p>
        </Card>

        {/* Available Stock */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">
              Available Stock
            </span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <PackageCheck className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
            {summary.totalAvailableStock.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Ready for sale (Physical minus reserved)
          </p>
        </Card>

        {/* Est. Inventory Cost */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
              Est. Inventory Cost
            </span>
            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <Coins className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {currency(summary.estimatedCostValue)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Positive physical stock × current cost
          </p>
        </Card>

        {/* Low Stock Items */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
              Stock Warnings
            </span>
            <span className="rounded-md bg-rose-50 p-1.5 text-rose-600">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-rose-700">
              {summary.lowStockCount.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-zinc-400">low</span>
            <span className="text-zinc-300">/</span>
            <span className="text-lg font-bold text-zinc-600">
              {summary.outOfStockCount.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">out</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            1–5 units remaining or completely depleted
          </p>
        </Card>
      </div>
    </div>
  );
}

function InventorySummarySkeleton() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl border border-zinc-200/60 bg-zinc-100/70 animate-pulse p-4" />
      ))}
    </div>
  );
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const search = valueOf(resolvedSearchParams.q);
  const filter = validFilter(valueOf(resolvedSearchParams.filter));
  const rawPage = Number(valueOf(resolvedSearchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const data = await getAdminInventory({ search, filter, page });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101114]">
              Inventory Control Center
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 tracking-wide uppercase shadow-xs">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor real-time physical stock, checkout reservations, and execute atomic stock adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory-intelligence"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            Inventory Intelligence →
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <Suspense fallback={<InventorySummarySkeleton />}>
        <InventorySummarySection />
      </Suspense>

      {/* Inventory Control Table */}
      <AdminInventoryTable
        initialData={data}
        currentFilters={{
          q: search ?? "",
          filter,
          page,
        }}
      />
    </div>
  );
}
