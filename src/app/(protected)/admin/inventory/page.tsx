import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Boxes, Coins, Lock, PackageCheck, Sparkles } from "lucide-react";
import {
  getAdminInventory,
  getAdminInventorySummary,
  type InventoryFilter,
} from "@/lib/admin/inventory";
import { AdminInventoryTable } from "@/components/admin/inventory/admin-inventory-table";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";

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
          <AlertTriangle className="mt-0.5 size-5 shrink-0 animate-pulse text-red-600" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-red-950">
                Negative stock anomaly detected ({summary.negativeStockCount}{" "}
                {summary.negativeStockCount === 1 ? "variant" : "variants"})
              </p>
              <Link
                href="/admin/inventory?filter=negative"
                className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800 transition hover:bg-red-200"
              >
                Inspect negative items →
              </Link>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-red-800">
              Physical or available stock is currently below zero. Click above to view the affected
              variants and record an audit adjustment or investigate ledger movements.
            </p>
          </div>
        </div>
      )}

      <AdminKpiGrid columns={5}>
        {/* Physical Stock */}
        <AdminKpiCard
          label="Physical Stock"
          value={summary.totalPhysicalStock.toLocaleString()}
          description={`Across ${summary.totalVariants.toLocaleString()} variants on hand`}
          icon={Boxes}
          tone="neutral"
          alert={true}
        />

        {/* Reserved Stock */}
        <AdminKpiCard
          label="Reserved Stock"
          value={summary.totalReservedStock.toLocaleString()}
          description="Held in active checkout reservations"
          icon={Lock}
          tone="amber"
          alert={true}
        />

        {/* Available Stock */}
        <AdminKpiCard
          label="Available Stock"
          value={summary.totalAvailableStock.toLocaleString()}
          description="Ready for sale (Physical minus reserved)"
          icon={PackageCheck}
          tone="emerald"
          alert={true}
        />

        {/* Est. Inventory Cost */}
        <AdminKpiCard
          label="Est. Inventory Cost"
          value={currency(summary.estimatedCostValue)}
          description="Positive physical stock × current cost"
          icon={Coins}
          tone="blue"
          alert={true}
        />

        {/* Stock Warnings */}
        <AdminKpiCard
          label="Stock Warnings"
          value={
            <div className="flex items-baseline gap-1.5">
              <span>{summary.lowStockCount.toLocaleString()}</span>
              <span className="text-xs font-medium text-neutral-400">low</span>
              <span className="text-neutral-300">/</span>
              <span>{summary.outOfStockCount.toLocaleString()}</span>
              <span className="text-xs font-medium text-neutral-400">out</span>
            </div>
          }
          description="1–5 units remaining or completely depleted"
          icon={AlertTriangle}
          tone="rose"
          alert={true}
        />
      </AdminKpiGrid>
    </div>
  );
}

function InventorySummarySkeleton() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-neutral-200/60 bg-neutral-100/70 p-4"
        />
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
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Harmonized Page Header */}
      <AdminPageHeader
        eyebrow="Operations / Inventory"
        title="Inventory Control Center"
        badgeLabel="Live Ledger"
        badgeVariant="emerald"
        description="Monitor real-time physical stock, checkout reservations, and execute atomic stock adjustments."
      >
        <Link
          href="/admin/inventory-intelligence"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Inventory Intelligence →</span>
        </Link>
      </AdminPageHeader>

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
