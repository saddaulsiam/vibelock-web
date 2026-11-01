import Link from "next/link";
import { AlertTriangle, Boxes, Clock, Coins, Flame, Info, TrendingDown } from "lucide-react";
import {
  getAdminInventoryIntelligence,
  type InventoryIntelligenceWindow,
  type InventoryIntelligenceStatusFilter,
  type InventoryIntelligenceSort,
  type InventoryIntelligenceSummary,
} from "@/lib/admin/inventory";
import { AdminInventoryIntelligenceTable } from "@/components/admin/inventory/admin-inventory-intelligence-table";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatBdt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function InventoryIntelligenceSummaryCards({
  summary,
  window,
}: {
  summary: InventoryIntelligenceSummary;
  window: InventoryIntelligenceWindow;
}) {
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
              Variant reports negative physical or available stock. Review transaction ledger and
              apply adjustments.
            </p>
          </div>
        </div>
      )}

      {summary.missingCostCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm backdrop-blur-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold text-amber-950">
              Missing cost price notice ({summary.missingCostCount}{" "}
              {summary.missingCostCount === 1 ? "variant" : "variants"})
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Cost price is unrecorded. Valuation treats them safely as ৳0.00 rather than inflating
              working capital metrics.
            </p>
          </div>
        </div>
      )}

      <AdminKpiGrid columns={5}>
        {/* Available Units */}
        <AdminKpiCard
          label="Available Units"
          value={summary.totalAvailableStock.toLocaleString()}
          description={`Across ${summary.totalVariants} variants (${summary.totalPhysicalStock.toLocaleString()} phys)`}
          icon={Boxes}
          tone="neutral"
          alert={true}
        />

        {/* Available Capital */}
        <AdminKpiCard
          label="Available Capital"
          value={formatBdt(summary.totalAvailableCostValue)}
          description={`At cost (Phys: ${formatBdt(summary.totalPhysicalCostValue)})`}
          icon={Coins}
          tone="emerald"
          alert={true}
        />

        {/* Stockout Risk */}
        <AdminKpiCard
          label="Stockout Risk"
          value={summary.stockoutRiskCount.toLocaleString()}
          description="Will run out in ≤14 days based on daily velocity"
          icon={Flame}
          tone="rose"
          alert={true}
          href="/admin/inventory-intelligence?status=stockout-risk"
        />

        {/* Dead Stock */}
        <AdminKpiCard
          label="Dead Stock"
          value={summary.deadStockCount.toLocaleString()}
          description={`0 sales in ${window}, in-stock, >14d since inflow`}
          icon={TrendingDown}
          tone="amber"
          alert={true}
          href="/admin/inventory-intelligence?status=dead-stock"
        />

        {/* Slow Moving */}
        <AdminKpiCard
          label="Slow Moving"
          value={summary.slowMovingCount.toLocaleString()}
          description="Supply pace exceeds 180 days runout"
          icon={Clock}
          tone="amber"
          alert={true}
          href="/admin/inventory-intelligence?status=slow-moving"
        />
      </AdminKpiGrid>
    </div>
  );
}

export default async function AdminInventoryIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;

  const windowParam = valueOf(resolved.window);
  const window: InventoryIntelligenceWindow =
    windowParam === "30d" || windowParam === "60d" || windowParam === "90d" ? windowParam : "90d";

  const statusParam = valueOf(resolved.status);
  const status: InventoryIntelligenceStatusFilter =
    statusParam === "negative" ||
    statusParam === "out-of-stock" ||
    statusParam === "stockout-risk" ||
    statusParam === "dead" ||
    statusParam === "slow" ||
    statusParam === "healthy"
      ? statusParam
      : "all";

  const sortParam = valueOf(resolved.sort);
  const sort: InventoryIntelligenceSort =
    sortParam === "stock" ||
    sortParam === "velocity" ||
    sortParam === "age" ||
    sortParam === "runout"
      ? sortParam
      : "valuation";

  const q = valueOf(resolved.q);
  const rawPage = Number(valueOf(resolved.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const data = await getAdminInventoryIntelligence({
    window,
    status,
    search: q,
    sort,
    page,
    pageSize: 20,
  });

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Harmonized Page Header */}
      <AdminPageHeader
        eyebrow="Analytics / Velocity"
        title="Inventory Intelligence"
        badgeLabel="Velocity Engine"
        badgeVariant="cyan"
        description="Track sales velocity, critical stockout runout alerts, dead stock risk, and capital allocation."
      >
        <Link
          href="/admin/inventory"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <span>&larr; Standard Inventory</span>
        </Link>
      </AdminPageHeader>

      {/* KPI Summary Cards */}
      <InventoryIntelligenceSummaryCards summary={data.summary} window={window} />

      {/* Main Interactive Intelligence Table */}
      <AdminInventoryIntelligenceTable
        initialData={data}
        currentFilters={{
          q,
          window,
          status,
          sort,
          page,
        }}
      />

      {/* Concise Operational Methodology Footnote */}
      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4 text-xs text-zinc-600 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-zinc-900">
          <Info className="size-4 text-[#00D9FF]" />
          <span>Inventory Intelligence Rules &amp; Explanations</span>
        </div>
        <ul className="mt-2 grid gap-1.5 text-zinc-600 sm:grid-cols-2">
          <li>
            &bull; <strong className="text-zinc-900">Stockout Risk:</strong> Available stock will
            run out in &le;14 days at current daily sales velocity.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Suggested Restock:</strong> Units needed to
            provide a 30-day sales buffer based on trailing net velocity.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Dead Stock:</strong> Has positive stock, zero
            net sales in the trailing window, and &gt;14 days since inflow.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Slow Moving:</strong> Projected days of supply
            exceeds 180 days (six-month holding burden).
          </li>
        </ul>
      </div>
    </div>
  );
}
