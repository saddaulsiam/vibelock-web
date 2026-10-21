import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, Clock, Coins, Download, Info, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminInventoryIntelligence,
  type InventoryIntelligenceWindow,
  type InventoryIntelligenceStatusFilter,
  type InventoryIntelligenceSort,
  type InventoryIntelligenceStatus,
} from "@/lib/admin/inventory-intelligence-queries";

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

function getStatusBadge(status: InventoryIntelligenceStatus) {
  switch (status) {
    case "NEGATIVE":
      return <Badge variant="destructive">Negative stock</Badge>;
    case "OUT_OF_STOCK":
      return (
        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
          Out of stock
        </Badge>
      );
    case "DEAD":
      return (
        <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800">
          Dead stock
        </Badge>
      );
    case "SLOW":
      return (
        <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800">
          Slow moving
        </Badge>
      );
    case "HEALTHY":
      return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
          Healthy
        </Badge>
      );
  }
}

async function InventoryIntelligenceSummarySection({
  window,
}: {
  window: InventoryIntelligenceWindow;
}) {
  const { summary } = await getAdminInventoryIntelligence({ window, pageSize: 1 });

  return (
    <div className="space-y-4">
      {summary.negativeStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Negative stock anomaly detected</p>
            <p className="mt-0.5 text-red-800">
              {summary.negativeStockCount}{" "}
              {summary.negativeStockCount === 1 ? "variant reports" : "variants report"} negative
              physical or available stock. Ledger transactions require review or stock adjustment.
            </p>
          </div>
        </div>
      )}

      {summary.missingCostCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Missing cost price notice</p>
            <p className="mt-0.5 text-amber-800">
              {summary.missingCostCount}{" "}
              {summary.missingCostCount === 1 ? "variant is" : "variants are"} missing cost price.
              Valuation treats them as ৳0.00 rather than inflating estimates.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Available Capital
            </CardTitle>
            <Coins className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {formatBdt(summary.totalAvailableCostValue)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Unreserved available stock at current variant cost (Physical:{" "}
              {formatBdt(summary.totalPhysicalCostValue)})
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Stock Units
            </CardTitle>
            <Boxes className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {summary.totalAvailableStock.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Available units ({summary.totalPhysicalStock.toLocaleString()} physical on hand across{" "}
              {summary.totalVariants} variants)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Dead Stock Risk
            </CardTitle>
            <TrendingDown className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-800">
              {summary.deadStockCount.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Zero net sales in trailing {window}, in stock, &gt;14d since inflow
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
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
            <p className="text-muted-foreground mt-1 text-xs">
              Estimated runout supply exceeds 180 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function InventoryIntelligenceTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const windowParam = valueOf(searchParams.window);
  const window: InventoryIntelligenceWindow =
    windowParam === "30d" || windowParam === "60d" || windowParam === "90d" ? windowParam : "90d";

  const statusParam = valueOf(searchParams.status);
  const status: InventoryIntelligenceStatusFilter =
    statusParam === "negative" ||
    statusParam === "out-of-stock" ||
    statusParam === "dead" ||
    statusParam === "slow" ||
    statusParam === "healthy"
      ? statusParam
      : "all";

  const sortParam = valueOf(searchParams.sort);
  const sort: InventoryIntelligenceSort =
    sortParam === "stock" ||
    sortParam === "velocity" ||
    sortParam === "age" ||
    sortParam === "runout"
      ? sortParam
      : "valuation";

  const search = valueOf(searchParams.q);
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const { items, total, totalPages } = await getAdminInventoryIntelligence({
    window,
    status,
    search,
    sort,
    page,
    pageSize: 20,
  });

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("q", search);
  if (window !== "90d") queryParams.set("window", window);
  if (status !== "all") queryParams.set("status", status);
  if (sort !== "valuation") queryParams.set("sort", sort);

  const exportQuery = queryParams.toString();
  const exportHref = `/api/admin/inventory-intelligence/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form method="get" className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            name="q"
            placeholder="Search product or SKU..."
            defaultValue={search}
            className="w-full sm:w-60"
          />

          <select
            name="window"
            defaultValue={window}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="30d">Trailing 30 Days</option>
            <option value="60d">Trailing 60 Days</option>
            <option value="90d">Trailing 90 Days</option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="healthy">Healthy</option>
            <option value="slow">Slow moving (&gt;180d)</option>
            <option value="dead">Dead stock (0 sales, &gt;14d)</option>
            <option value="out-of-stock">Out of stock</option>
            <option value="negative">Negative stock</option>
          </select>

          <select
            name="sort"
            defaultValue={sort}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="valuation">Sort: Capital Value</option>
            <option value="stock">Sort: Available Stock</option>
            <option value="velocity">Sort: Sales Velocity</option>
            <option value="age">Sort: Inflow Age</option>
            <option value="runout">Sort: Days of Supply</option>
          </select>

          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-sm border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/90"
          >
            Apply Filters
          </button>
        </form>

        <div className="flex items-center gap-2">
          <a
            href={exportHref}
            download
            className="border-input bg-background hover:bg-muted inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-sm font-medium"
            title={
              total > 5000
                ? "Export capped at first 5,000 matching items"
                : "Export current inventory intelligence to CSV"
            }
          >
            <Download className="size-4" />
            Export CSV {total > 5000 ? "(Capped at 5k)" : ""}
          </a>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <p>
          Showing {items.length} of {total} {total === 1 ? "variant" : "variants"}
          {total > 5000 ? " · CSV export limited to first 5,000 items" : ""}
        </p>
        <p>
          Window: <strong>{window}</strong> · Net Retained = Sold - Returns
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">SKU / Product</th>
              <th className="p-3 text-right font-medium">Stock (Phys / Avail)</th>
              <th className="p-3 text-right font-medium">Avail Capital</th>
              <th className="p-3 text-right font-medium">Net Sales ({window})</th>
              <th className="p-3 text-right font-medium">Daily Velocity</th>
              <th className="p-3 text-right font-medium">Days of Supply</th>
              <th className="p-3 text-right font-medium">Inflow Age</th>
              <th className="p-3 text-center font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-muted-foreground p-10 text-center">
                  No inventory items match the current filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-mono text-xs font-semibold">{item.sku}</div>
                    <div className="text-foreground font-medium">{item.productName}</div>
                    <div className="text-muted-foreground text-xs">
                      {[item.size, item.color].filter(Boolean).join(" / ") || "Default variant"}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold">{item.availableStock}</div>
                    <div className="text-muted-foreground text-xs">
                      {item.physicalStock} phys ({item.reservedStock} res)
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold">{formatBdt(item.availableCostValue)}</div>
                    <div className="text-muted-foreground text-xs">
                      Cost: {item.costUnavailable ? "N/A" : formatBdt(item.costPrice)}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold">{item.netRetainedUnits}</div>
                    <div className="text-muted-foreground text-xs">
                      {item.soldUnits} sold - {item.returnedUnits} ret
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-mono text-xs">
                      {item.dailyVelocity > 0 ? item.dailyVelocity.toFixed(3) : "0.000"} /d
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {item.daysOfSupply !== null ? (
                      <div>
                        <span
                          className={`font-semibold ${
                            item.daysOfSupply > 180 ? "text-amber-700" : ""
                          }`}
                        >
                          {Math.round(item.daysOfSupply)}d
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {item.daysSinceLastInflow !== null ? (
                      <div className="text-xs">
                        <span className="font-medium">{item.daysSinceLastInflow}d ago</span>
                        <div className="text-muted-foreground">
                          {item.lastInflowAt
                            ? new Date(item.lastInflowAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <span
                        className="text-muted-foreground text-xs"
                        title="No recorded inflow in system"
                      >
                        Unavailable
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">{getStatusBadge(item.status)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/inventory/${item.id}`}
                      className="text-primary font-medium hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Inventory intelligence pages"
          className="flex items-center justify-center gap-3"
        >
          {page > 1 ? (
            <Link
              href={`/admin/inventory-intelligence?${(() => {
                const p = new URLSearchParams(queryParams);
                p.set("page", String(page - 1));
                return p.toString();
              })()}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border bg-white"
            >
              ←
            </Link>
          ) : null}
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/inventory-intelligence?${(() => {
                const p = new URLSearchParams(queryParams);
                p.set("page", String(page + 1));
                return p.toString();
              })()}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border bg-white"
            >
              →
            </Link>
          ) : null}
        </nav>
      )}

      {/* Methodology and limitations footnote card */}
      <div className="bg-muted/20 text-muted-foreground space-y-2 rounded-lg border border-[#101114]/10 p-4 text-xs">
        <div className="text-foreground flex items-center gap-1.5 font-semibold">
          <Info className="text-primary size-3.5" />
          Methodology & Data Precision Disclosures
        </div>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>Stock Valuation:</strong> Valuation uses current variant cost price (
            <code>costPrice</code>) multiplied by non-negative quantities. Available Capital
            measures unreserved inventory (<code>max(availableStock, 0) × costPrice</code>).
          </li>
          <li>
            <strong>Velocity & Returns:</strong> Daily velocity is based on net retained units
            (committed <code>SALE</code> transactions minus positive <code>RETURN</code>{" "}
            transactions in the selected trailing window). Canceled orders are excluded.
          </li>
          <li>
            <strong>Inventory Age Precision:</strong> Days since last recorded inflow is tracked
            from the most recent <code>RESTOCK</code>, <code>RETURN</code>, or positive{" "}
            <code>ADJUSTMENT</code> transaction. VibeLock does not use FIFO/batch tracking; age
            represents the latest replenishment, not the age of every individual physical unit. If
            no inflow transaction exists, age is reported as Unavailable.
          </li>
          <li>
            <strong>Dead Stock Rule:</strong> A variant is classified as Dead Stock only if it has
            positive available stock, zero net retained sales in the trailing window, a reliable
            recorded inflow date, and more than 14 days have passed since that inflow (14-day grace
            period prevents newly received goods from false dead-stock classification).
          </li>
          <li>
            <strong>Slow Moving Rule:</strong> A variant is classified as Slow Moving when estimated
            days of supply exceeds 180 days (half-year runout).
          </li>
        </ul>
      </div>
    </div>
  );
}

export default async function AdminInventoryIntelligencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const windowParam = valueOf(resolvedSearchParams.window);
  const window: InventoryIntelligenceWindow =
    windowParam === "30d" || windowParam === "60d" || windowParam === "90d" ? windowParam : "90d";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Intelligence</h1>
          <p className="text-muted-foreground">
            Stock valuation, sales velocity, turnover age, and dead-stock runout analytics.
          </p>
        </div>
        <div>
          <Link
            href="/admin/inventory"
            className="border-input bg-background hover:bg-muted inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-4 text-sm font-medium"
          >
            ← Standard Inventory
          </Link>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted/40 h-28 animate-pulse rounded-xl" />
            ))}
          </div>
        }
      >
        <InventoryIntelligenceSummarySection window={window} />
      </Suspense>

      <Suspense
        fallback={
          <div className="text-muted-foreground p-12 text-center">
            Loading inventory intelligence...
          </div>
        }
      >
        <InventoryIntelligenceTable searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
