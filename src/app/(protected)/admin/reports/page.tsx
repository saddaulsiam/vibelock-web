import Link from "next/link";
import { CreditCard, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import {
  ReportCharts,
  ReportExportMenu,
  ReportFinancialHero,
  ReportLedgerWorkspace,
  ReportRangeFilter,
} from "@/components/admin/reports";
import {
  getAdminOrderProfitability,
  getAdminProductProfitability,
  getAdminReport,
} from "@/lib/admin/reports";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  const range = value("range") ?? "30d";
  const from = value("from");
  const to = value("to");
  const currentView = value("view") ?? "products";
  const reportFilters = { range, from, to, sort: value("sort"), search: value("q") };

  const buildHref = (updates: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, current] of Object.entries({
      range,
      from,
      to,
      q: value("q"),
      sort: value("sort"),
      page: value("page"),
      pPage: value("pPage"),
      view: value("view"),
      ...updates,
    })) {
      if (current !== undefined && current !== "") query.set(key, String(current));
    }
    return `?${query.toString()}`;
  };

  const productPage = Number(value("pPage") ?? "1");
  const [report, orders, productProfitability] = await Promise.all([
    getAdminReport(reportFilters),
    getAdminOrderProfitability({ ...reportFilters, page: Number(value("page") ?? "1") }),
    getAdminProductProfitability({ ...reportFilters, page: productPage, limit: 20 }),
  ]);

  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "yesterday"
        ? "Yesterday"
        : range === "7d"
          ? "Last 7 days"
          : range === "this-month"
            ? "This month"
            : range === "last-month"
              ? "Last month"
              : range === "custom"
                ? "Custom Window"
                : "Last 30 days";

  const reconciliationHref = `/admin/reports/reconciliation?${new URLSearchParams({
    range,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString()}`;

  const exportQuery = new URLSearchParams({
    range,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(value("sort") ? { sort: value("sort")! } : {}),
    ...(value("q") ? { q: value("q")! } : {}),
  }).toString();

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── 1. HARMONIZED ADMIN PAGE HEADER (MATCHING /admin & /admin/orders) ── */}
      <AdminPageHeader
        eyebrow="Operations / Analytics"
        title="Reports &amp; Profitability"
        badgeLabel="Realized P&amp;L"
        badgeVariant="emerald"
        description="Historical gross merchandise sales, returns, cost of goods, and realized profitability."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={reconciliationHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            <CreditCard className="size-3.5 text-vl-cyan" />
            <span>Cash Reconciliation</span>
          </Link>

          <Link
            href={buildHref({})}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 hover:text-neutral-900"
            title="Refresh current report calculations"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Link>

          <ReportExportMenu query={exportQuery} />
        </div>
      </AdminPageHeader>

      {/* ── 2. ANIMATED RANGE PRESETS & RESOLVED TIMEFRAME BAR ── */}
      <ReportRangeFilter
        currentRange={range}
        from={from}
        to={to}
        startDate={report.start}
        endDate={report.end}
        searchParamsRecord={{
          range,
          from,
          to,
          q: value("q"),
          sort: value("sort"),
          view: value("view"),
        }}
      />

      {/* ── 3. EXECUTIVE P&L FINANCIAL COCKPIT & OPERATIONS MATRIX ── */}
      <ReportFinancialHero summary={report.summary} rangeLabel={rangeLabel} />

      {/* ── 4. VISUAL REVENUE WAVE, COGS BARS & TOP PRODUCTS ── */}
      <ReportCharts
        trend={report.trend}
        products={report.products}
        payments={report.payments}
        soldUnits={report.summary.soldUnits}
        returnedUnits={report.summary.returnedUnits}
        returnRate={report.summary.returnRate}
        returnedValue={report.summary.returnedValue}
      />

      {/* ── 5. SEGMENTED LEDGER WORKSPACES (PRODUCTS / ORDERS / DAILY / PAYMENTS) ── */}
      <ReportLedgerWorkspace
        currentView={currentView}
        productProfitability={productProfitability}
        orders={orders}
        trend={report.trend}
        payments={report.payments}
        reportFilters={reportFilters}
        searchParamsRecord={{
          range,
          from,
          to,
          q: value("q"),
          sort: value("sort"),
          view: value("view"),
          page: value("page"),
          pPage: value("pPage"),
        }}
      />
    </div>
  );
}
