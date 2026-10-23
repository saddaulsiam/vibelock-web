import Link from "next/link";
import { BarChart3, CreditCard, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReportCharts } from "@/components/admin/report-charts";
import { ReportExportMenu } from "@/components/admin/report-export-menu";
import { ProductProfitabilityDrilldown } from "@/components/admin/product-profitability-drilldown";
import {
  getAdminOrderProfitability,
  getAdminProductProfitability,
  getAdminReport,
} from "@/lib/admin/report-queries";

function money(value: number | null) {
  return value === null
    ? "Unavailable"
    : `৳${value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(value);
}

const ranges = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["custom", "Custom"],
] as const;

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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-[#101114]/15 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            VibeLock / Admin analytics
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <BarChart3 className="size-7 text-[#00a8c6]" /> Reports &amp; Profitability
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Track sales, returns, inventory cost and profitability.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/reports/reconciliation?${new URLSearchParams({ range, ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}`}
            className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium text-[#101114]"
          >
            <CreditCard className="size-4 text-[#00a8c6]" /> Cash Reconciliation
          </Link>
          <Badge variant="outline">
            Data: {dateLabel(report.start)} – {dateLabel(new Date(report.end.getTime() - 1))}
          </Badge>
          <a
            href={buildHref({})}
            className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
          >
            <RefreshCw className="size-4" /> Refresh
          </a>
          <ReportExportMenu
            query={new URLSearchParams({
              range,
              ...(from ? { from } : {}),
              ...(to ? { to } : {}),
              ...(value("sort") ? { sort: value("sort")! } : {}),
              ...(value("q") ? { q: value("q")! } : {}),
            }).toString()}
          />
        </div>
      </header>

      <form className="grid gap-3 border border-[#101114]/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-[auto_1fr_1fr_auto]">
        <label className="text-sm font-medium">
          Period
          <select
            name="range"
            defaultValue={range}
            className="border-input bg-background mt-2 h-10 w-full border px-3 text-sm lg:w-44"
          >
            {ranges.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          From
          <Input name="from" type="date" defaultValue={from} className="mt-2" />
        </label>
        <label className="text-sm font-medium">
          To
          <Input name="to" type="date" defaultValue={to} className="mt-2" />
        </label>
        {value("sort") ? <input type="hidden" name="sort" value={value("sort")!} /> : null}
        {value("q") ? <input type="hidden" name="q" value={value("q")!} /> : null}
        <button
          className="mt-auto inline-flex h-10 items-center justify-center bg-[#101114] px-5 text-sm font-semibold text-white hover:bg-[#101114]/85"
          type="submit"
        >
          Apply
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Sales overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Gross sales", money(report.summary.grossSales)],
            ["Discounts", money(report.summary.discounts)],
            ["Net sales / revenue", money(report.summary.netSales)],
            ["Orders", report.summary.orders.toLocaleString()],
            ["Average order value", money(report.summary.averageOrderValue)],
            ["Refunds paid", money(report.summary.refunds)],
            ["Shipping charged", money(report.summary.shippingCharged)],
            ["Return rate", `${report.summary.returnRate.toFixed(2)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <ReportCharts
        trend={report.trend}
        products={report.products}
        payments={report.payments}
        soldUnits={report.summary.soldUnits}
        returnedUnits={report.summary.returnedUnits}
        returnRate={report.summary.returnRate}
        returnedValue={report.summary.returnedValue}
      />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Gross profitability</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              COGS uses the historical OrderItem cost snapshot and excludes non-rejected returned
              quantities.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-[#101114]/10 bg-white p-4">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">COGS</p>
            <p className="mt-2 text-xl font-semibold">{money(report.summary.cogs)}</p>
          </div>
          <div className="border border-[#101114]/10 bg-white p-4">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Gross profit</p>
            <p className="mt-2 text-xl font-semibold">{money(report.summary.grossProfit)}</p>
          </div>
          <div className="border border-[#101114]/10 bg-white p-4">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Gross margin</p>
            <p className="mt-2 text-xl font-semibold">
              {report.summary.grossMargin === null
                ? "Unavailable"
                : `${report.summary.grossMargin.toFixed(2)}%`}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Shipping expense, payment fees, operating expense, net profit, and net margin are
          unavailable because the current schema stores no authoritative values for them.
        </p>
      </section>

      <section className="border border-[#101114]/10 bg-white">
        <div className="border-b border-[#101114]/10 px-4 py-4">
          <h2 className="text-xl font-semibold">Daily sales trend</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Date</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Discounts</th>
                <th className="p-3">Net sales</th>
                <th className="p-3">Refunds</th>
                <th className="p-3">COGS</th>
                <th className="p-3">Gross profit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.trend.length ? (
                report.trend.map((row) => (
                  <tr key={row.date.toISOString()}>
                    <td className="p-3">{dateLabel(row.date)}</td>
                    <td className="p-3">{row.orders}</td>
                    <td className="p-3">{money(row.grossSales)}</td>
                    <td className="p-3">{money(row.discounts)}</td>
                    <td className="p-3">{money(row.netSales)}</td>
                    <td className="p-3">{money(row.refunds)}</td>
                    <td className="p-3">{money(row.cogs)}</td>
                    <td className="p-3">{money(row.grossProfit)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-muted-foreground p-8 text-center">
                    No sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProductProfitabilityDrilldown
        data={productProfitability}
        currentSort={value("sort")}
        currentSearch={value("q")}
        range={range}
        from={from}
        to={to}
        page={value("page")}
      />

      <section className="border border-[#101114]/10 bg-white">
        <div className="border-b border-[#101114]/10 px-4 py-4">
          <h2 className="text-xl font-semibold">Payment methods</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Sales reflect billed order amounts, not proof of cash collection. Pending online
            payments and unsettled COD remittances are not counted as collected cash; actual COD
            remittances are not calculated by this dashboard.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Method</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Sales</th>
                <th className="p-3">Refunds</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.payments.map((row) => (
                <tr key={row.method}>
                  <td className="p-3">{row.method === "COD" ? "Cash on delivery" : row.method}</td>
                  <td className="p-3">{row.orders}</td>
                  <td className="p-3">{money(row.sales)}</td>
                  <td className="p-3">{money(row.refunds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#101114]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-4 py-4">
          <div>
            <h2 className="text-xl font-semibold">Order profitability</h2>
            <p className="text-muted-foreground mt-1 text-sm">Cancelled orders are excluded.</p>
          </div>
          <form className="flex gap-2">
            <Input
              name="q"
              defaultValue={value("q")}
              placeholder="Search order, customer, product or SKU"
            />
            <input type="hidden" name="range" value={range} />
            <input type="hidden" name="from" value={from ?? ""} />
            <input type="hidden" name="to" value={to ?? ""} />
            {value("sort") ? <input type="hidden" name="sort" value={value("sort")!} /> : null}
            <button
              className="border-input hover:bg-muted border px-3 text-sm font-medium"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Items</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Refund</th>
                <th className="p-3">COGS</th>
                <th className="p-3">Profit</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.orders.map((order) => (
                <tr key={order.id}>
                  <td className="p-3">
                    <Link
                      className="font-medium hover:underline"
                      href={`/admin/orders/${order.id}`}
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-muted-foreground text-xs">{dateLabel(order.createdAt)}</p>
                  </td>
                  <td className="p-3">{order.customerName || "Guest"}</td>
                  <td className="p-3">
                    <Badge variant="outline">{order.status}</Badge>
                  </td>
                  <td className="p-3">{order.itemCount}</td>
                  <td className="p-3">{money(order.grossSales)}</td>
                  <td className="p-3">{money(order.discount)}</td>
                  <td className="p-3">{money(order.refunds)}</td>
                  <td className="p-3">{money(order.cogs)}</td>
                  <td className="p-3">{money(order.profit)}</td>
                  <td className="p-3">
                    <Link
                      className="text-primary hover:underline"
                      href={`/admin/orders/${order.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.totalPages > 1 ? (
          <div className="flex justify-center gap-4 border-t border-[#101114]/10 p-4 text-sm">
            <Link
              className={
                orders.page <= 1 ? "text-muted-foreground/50 pointer-events-none" : "font-medium"
              }
              href={buildHref({ page: orders.page - 1 })}
            >
              Previous
            </Link>
            <span>
              Page {orders.page} of {orders.totalPages}
            </span>
            <Link
              className={
                orders.page >= orders.totalPages
                  ? "text-muted-foreground/50 pointer-events-none"
                  : "font-medium"
              }
              href={buildHref({ page: orders.page + 1 })}
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
