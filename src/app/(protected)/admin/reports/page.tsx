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
    <div className="print-document mx-auto w-full max-w-[100rem] space-y-6 print:space-y-4 print:max-w-none print:w-full print:p-0 print:bg-white">
      {/* ── 1. HARMONIZED ADMIN PAGE HEADER (MATCHING /admin & /admin/orders) ── */}
      <div className="print:hidden">
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
      </div>

      {/* ── 2. ANIMATED RANGE PRESETS & RESOLVED TIMEFRAME BAR ── */}
      <div className="print:hidden">
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
      </div>

      {/* ── SECTION 1: EXECUTIVE AUDIT & FINANCIAL COCKPIT (PAGE 1) ── */}
      <div className="print-break-after-page space-y-6 print:space-y-4">
        {/* ── PRINT-ONLY EXECUTIVE AUDIT HEADER ── */}
        <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-xl text-neutral-950 uppercase tracking-tight">VibeLock</span>
                <span className="h-4 w-px bg-neutral-300" />
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 font-bold">Operations &amp; Analytics</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-950 uppercase font-heading mt-1">
                Executive Financial Statement
              </h1>
              <p className="text-xs text-neutral-600 mt-1">
                Timeframe: <span className="font-bold text-neutral-900">{rangeLabel}</span> ({report.start.toLocaleDateString("en-BD")} to {report.end.toLocaleDateString("en-BD")})
              </p>
            </div>
            <div className="text-right text-xs font-mono text-neutral-500">
              <p className="font-bold text-neutral-800">Confidential Financial Audit</p>
              <p>Generated: {new Date().toLocaleDateString("en-BD", { dateStyle: "long" })}</p>
              <p className="text-[10px] text-neutral-400">Doc ID: VL-P&amp;L-{report.start.getTime().toString(36).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* ── 3. EXECUTIVE P&L FINANCIAL COCKPIT & OPERATIONS MATRIX ── */}
        <ReportFinancialHero summary={report.summary} rangeLabel={rangeLabel} />

        {/* ── PRINT-ONLY EXECUTIVE SIGN-OFF & AUDIT VALIDATION BLOCK (PAGE 1 FOOTER) ── */}
        <div className="hidden print:grid grid-cols-2 gap-10 pt-10 mt-8 border-t border-neutral-300 text-xs">
          <div className="space-y-1.5">
            <p className="font-bold text-neutral-900 uppercase tracking-wider text-[10px] font-mono">Prepared &amp; Verified By:</p>
            <div className="h-10 border-b border-neutral-400 flex items-end pb-1 font-mono text-neutral-800">
              <span>Operations &amp; Finance Automated Controller</span>
            </div>
            <p className="text-[10px] text-neutral-500">VibeLock ERP System · Reconciliation: Clean Ledger</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-bold text-neutral-900 uppercase tracking-wider text-[10px] font-mono">Reviewed &amp; Authorized By:</p>
            <div className="h-10 border-b border-neutral-400 flex items-end pb-1 font-mono text-neutral-800">
              <span>Executive Management / Store Administration</span>
            </div>
            <p className="text-[10px] text-neutral-500">Sign-off Date: {new Date().toLocaleDateString("en-BD")}</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: VISUAL REVENUE WAVE, COGS BARS & TOP PRODUCTS (PAGE 2) ── */}
      <div className="print-break-after-page space-y-4">
        <ReportCharts
          trend={report.trend}
          products={report.products}
          payments={report.payments}
          soldUnits={report.summary.soldUnits}
          returnedUnits={report.summary.returnedUnits}
          returnRate={report.summary.returnRate}
          returnedValue={report.summary.returnedValue}
        />
      </div>

      {/* ── SECTION 3: SEGMENTED LEDGER WORKSPACES (PAGE 3+) ── */}
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
