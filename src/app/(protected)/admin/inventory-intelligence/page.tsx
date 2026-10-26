import Link from "next/link";
import { AlertTriangle, Boxes, Clock, Coins, Flame, Info, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getAdminInventoryIntelligence,
  type InventoryIntelligenceWindow,
  type InventoryIntelligenceStatusFilter,
  type InventoryIntelligenceSort,
  type InventoryIntelligenceSummary,
} from "@/lib/admin/inventory-intelligence-queries";
import { AdminInventoryIntelligenceTable } from "@/components/admin/admin-inventory-intelligence-table";

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
              Variant reports negative physical or available stock. Review transaction ledger and apply adjustments.
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
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">
              Cost price is unrecorded. Valuation treats them safely as ৳0.00 rather than inflating working capital metrics.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Available Capital */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase">
              Available Capital
            </span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <Coins className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {formatBdt(summary.totalAvailableCostValue)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            At cost (Phys: {formatBdt(summary.totalPhysicalCostValue)})
          </p>
        </Card>

        {/* Stock Units */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
              Available Units
            </span>
            <span className="rounded-md bg-zinc-100 p-1.5 text-zinc-600">
              <Boxes className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {summary.totalAvailableStock.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Across {summary.totalVariants} variants ({summary.totalPhysicalStock.toLocaleString()} phys)
          </p>
        </Card>

        {/* Stockout Alert */}
        <Card
          className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
            summary.stockoutRiskCount > 0
              ? "border-rose-300 bg-rose-50/40"
              : "border-zinc-200/90 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold tracking-wider uppercase ${
                summary.stockoutRiskCount > 0 ? "text-rose-700" : "text-zinc-500"
              }`}
            >
              Stockout Risk
            </span>
            <span
              className={`rounded-md p-1.5 ${
                summary.stockoutRiskCount > 0
                  ? "bg-rose-100 text-rose-600 animate-pulse"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              <Flame className="size-4" />
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-black tracking-tight ${
              summary.stockoutRiskCount > 0 ? "text-rose-700" : "text-zinc-900"
            }`}
          >
            {summary.stockoutRiskCount.toLocaleString()}
          </div>
          <p
            className={`mt-1 text-xs ${
              summary.stockoutRiskCount > 0 ? "text-rose-600" : "text-zinc-500"
            }`}
          >
            Will run out in &le;14 days based on daily velocity
          </p>
        </Card>

        {/* Dead Stock */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-amber-600 uppercase">
              Dead Stock
            </span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <TrendingDown className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-amber-700">
            {summary.deadStockCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            0 sales in {window}, in-stock, &gt;14d since inflow
          </p>
        </Card>

        {/* Slow Moving */}
        <Card className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-yellow-700 uppercase">
              Slow Moving
            </span>
            <span className="rounded-md bg-yellow-50 p-1.5 text-yellow-700">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-yellow-800">
            {summary.slowMovingCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Supply pace exceeds 180 days runout
          </p>
        </Card>
      </div>
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
    <div className="space-y-6">
      {/* Header matching Inventory Control Center */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101114]">
              Inventory Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100/90 px-2.5 py-0.5 text-[11px] font-bold text-cyan-900 tracking-wide uppercase shadow-xs">
              <span className="size-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Velocity Engine
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Track sales velocity, critical stockout runout alerts, dead stock risk, and capital allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
          >
            &larr; Standard Inventory
          </Link>
        </div>
      </div>

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
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 text-zinc-600">
          <li>
            &bull; <strong className="text-zinc-900">Stockout Risk:</strong> Available stock will run out in &le;14 days at
            current daily sales velocity.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Suggested Restock:</strong> Units needed to provide a 30-day sales buffer
            based on trailing net velocity.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Dead Stock:</strong> Has positive stock, zero net sales in the trailing
            window, and &gt;14 days since inflow.
          </li>
          <li>
            &bull; <strong className="text-zinc-900">Slow Moving:</strong> Projected days of supply exceeds 180 days
            (six-month holding burden).
          </li>
        </ul>
      </div>
    </div>
  );
}
