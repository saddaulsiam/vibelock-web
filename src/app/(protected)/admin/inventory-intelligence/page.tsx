import Link from "next/link";
import { AlertTriangle, Boxes, Clock, Coins, Flame, Info, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Negative stock ledger anomaly</p>
            <p className="mt-0.5 text-xs text-red-800">
              {summary.negativeStockCount}{" "}
              {summary.negativeStockCount === 1 ? "variant reports" : "variants report"} negative
              physical or available stock. Review transaction ledger and apply adjustments.
            </p>
          </div>
        </div>
      )}

      {summary.missingCostCount > 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Missing cost price notice</p>
            <p className="mt-0.5 text-xs text-amber-800">
              {summary.missingCostCount}{" "}
              {summary.missingCostCount === 1 ? "variant lacks" : "variants lack"} cost price.
              Valuation treats them safely as ৳0.00 rather than inflating working capital.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Available Capital */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Available Capital
            </CardTitle>
            <Coins className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#101114]">
              {formatBdt(summary.totalAvailableCostValue)}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
              Unreserved available stock at cost (Phys: {formatBdt(summary.totalPhysicalCostValue)})
            </p>
          </CardContent>
        </Card>

        {/* Stock Units */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Available Units
            </CardTitle>
            <Boxes className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#101114]">
              {summary.totalAvailableStock.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
              Across {summary.totalVariants} variants ({summary.totalPhysicalStock.toLocaleString()}{" "}
              physical)
            </p>
          </CardContent>
        </Card>

        {/* Stockout Alert */}
        <Card
          className={`rounded-sm border shadow-none ${
            summary.stockoutRiskCount > 0
              ? "border-rose-300 bg-rose-50/40"
              : "border-[#101114]/10 bg-white"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle
              className={`text-xs font-semibold tracking-wider uppercase ${
                summary.stockoutRiskCount > 0 ? "text-rose-800" : "text-muted-foreground"
              }`}
            >
              Stockout Risk
            </CardTitle>
            <Flame
              className={`size-4 ${
                summary.stockoutRiskCount > 0 ? "text-rose-600" : "text-neutral-400"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${
                summary.stockoutRiskCount > 0 ? "text-rose-800" : "text-[#101114]"
              }`}
            >
              {summary.stockoutRiskCount.toLocaleString()}
            </div>
            <p
              className={`mt-1 text-[11px] leading-tight ${
                summary.stockoutRiskCount > 0 ? "text-rose-700" : "text-muted-foreground"
              }`}
            >
              Will run out in &le;14 days based on daily velocity
            </p>
          </CardContent>
        </Card>

        {/* Dead Stock */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Dead Stock
            </CardTitle>
            <TrendingDown className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-800">
              {summary.deadStockCount.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
              0 sales in trailing {window}, in-stock, &gt;14d since inflow
            </p>
          </CardContent>
        </Card>

        {/* Slow Moving */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Slow Moving
            </CardTitle>
            <Clock className="size-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-yellow-800">
              {summary.slowMovingCount.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
              Supply pace exceeds 180 days runout
            </p>
          </CardContent>
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
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Operations / Inventory
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            Inventory Intelligence
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Track sales velocity, critical stockout runout alerts, dead stock risk, and capital
            allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-[#101114]/20 bg-white px-4 text-xs font-semibold text-[#101114] shadow-2xs hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            &larr; Standard Inventory
          </Link>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <InventoryIntelligenceSummaryCards summary={data.summary} window={window} />

      {/* Main Interactive Intelligence Table */}
      <Card className="rounded-sm border border-[#101114]/10 bg-white p-4 shadow-none sm:p-5">
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
      </Card>

      {/* Concise Operational Methodology Footnote */}
      <div className="rounded-sm border border-[#101114]/10 bg-[#F3F0E8]/40 p-4 text-xs text-[#101114]/80">
        <div className="flex items-center gap-2 font-semibold text-[#101114]">
          <Info className="size-4 text-[#00D9FF]" />
          <span>Inventory Intelligence Rules &amp; Explanations</span>
        </div>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <li>
            &bull; <strong>Stockout Risk:</strong> Available stock will run out in &le;14 days at
            current daily sales velocity.
          </li>
          <li>
            &bull; <strong>Suggested Restock:</strong> Units needed to provide a 30-day sales buffer
            based on trailing net velocity.
          </li>
          <li>
            &bull; <strong>Dead Stock:</strong> Has positive stock, zero net sales in the trailing
            window, and &gt;14 days since inflow.
          </li>
          <li>
            &bull; <strong>Slow Moving:</strong> Projected days of supply exceeds 180 days
            (six-month holding burden).
          </li>
        </ul>
      </div>
    </div>
  );
}
