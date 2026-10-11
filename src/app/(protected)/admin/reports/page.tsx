import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReportCharts } from "@/components/admin/report-charts";
import { ReportExportMenu } from "@/components/admin/report-export-menu";
import { getAdminOrderProfitability, getAdminReport } from "@/lib/admin/report-queries";

function money(value: number | null) {
  return value === null ? "Unavailable" : `৳${value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    for (const [key, current] of Object.entries({ range, from, to, q: value("q"), sort: value("sort"), page: value("page"), ...updates })) {
      if (current !== undefined && current !== "") query.set(key, String(current));
    }
    return `?${query.toString()}`;
  };
  const [report, orders] = await Promise.all([
    getAdminReport(reportFilters),
    getAdminOrderProfitability({ ...reportFilters, page: Number(value("page") ?? "1") }),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-[#101114]/15 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">VibeLock / Admin analytics</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight"><BarChart3 className="size-7 text-[#00a8c6]" /> Reports &amp; Profitability</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track sales, returns, inventory cost and profitability.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Data: {dateLabel(report.start)} – {dateLabel(new Date(report.end.getTime() - 1))}</Badge><a href={buildHref({})} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"><RefreshCw className="size-4" /> Refresh</a><ReportExportMenu query={new URLSearchParams({ range, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(value("sort") ? { sort: value("sort")! } : {}), ...(value("q") ? { q: value("q")! } : {}) }).toString()} /></div>
      </header>

      <form className="grid gap-3 border border-[#101114]/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-[auto_1fr_1fr_auto]">
        <label className="text-sm font-medium">Period
          <select name="range" defaultValue={range} className="mt-2 h-10 w-full border border-input bg-background px-3 text-sm lg:w-44">
            {ranges.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">From
          <Input name="from" type="date" defaultValue={from} className="mt-2" />
        </label>
        <label className="text-sm font-medium">To
          <Input name="to" type="date" defaultValue={to} className="mt-2" />
        </label>
        <button className="mt-auto inline-flex h-10 items-center justify-center bg-[#101114] px-5 text-sm font-semibold text-white hover:bg-[#101114]/85" type="submit">Apply</button>
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
          ].map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div>)}
        </div>
      </section>

      <ReportCharts trend={report.trend} products={report.products} payments={report.payments} soldUnits={report.summary.soldUnits} returnedUnits={report.summary.returnedUnits} returnRate={report.summary.returnRate} returnedValue={report.summary.returnedValue} />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Gross profitability</h2><p className="mt-1 text-sm text-muted-foreground">COGS uses the historical OrderItem cost snapshot and excludes non-rejected returned quantities.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-[#101114]/10 bg-white p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">COGS</p><p className="mt-2 text-xl font-semibold">{money(report.summary.cogs)}</p></div>
          <div className="border border-[#101114]/10 bg-white p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Gross profit</p><p className="mt-2 text-xl font-semibold">{money(report.summary.grossProfit)}</p></div>
          <div className="border border-[#101114]/10 bg-white p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Gross margin</p><p className="mt-2 text-xl font-semibold">{report.summary.grossMargin === null ? "Unavailable" : `${report.summary.grossMargin.toFixed(2)}%`}</p></div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Shipping expense, payment fees, operating expense, net profit, and net margin are unavailable because the current schema stores no authoritative values for them.</p>
      </section>

      <section className="border border-[#101114]/10 bg-white">
        <div className="border-b border-[#101114]/10 px-4 py-4"><h2 className="text-xl font-semibold">Daily sales trend</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Date</th><th className="p-3">Orders</th><th className="p-3">Gross</th><th className="p-3">Discounts</th><th className="p-3">Net sales</th><th className="p-3">Refunds</th><th className="p-3">COGS</th><th className="p-3">Gross profit</th></tr></thead><tbody className="divide-y">{report.trend.length ? report.trend.map((row) => <tr key={row.date.toISOString()}><td className="p-3">{dateLabel(row.date)}</td><td className="p-3">{row.orders}</td><td className="p-3">{money(row.grossSales)}</td><td className="p-3">{money(row.discounts)}</td><td className="p-3">{money(row.netSales)}</td><td className="p-3">{money(row.refunds)}</td><td className="p-3">{money(row.cogs)}</td><td className="p-3">{money(row.grossProfit)}</td></tr>) : <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No sales in this period.</td></tr>}</tbody></table></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-[#101114]/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-4 py-4">
            <div>
              <h2 className="text-xl font-semibold">Product profitability</h2>
              <p className="mt-1 text-sm text-muted-foreground">Top 100 by selected sort. Profit uses historical item costs and returned quantities; order-level coupon discounts and payment refunds are not allocated to individual products and are accounted for at the order summary level.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <Link href={buildHref({ sort: "revenue", page: undefined })} className={`underline-offset-4 hover:underline ${(!value("sort") || value("sort") === "revenue") ? "font-semibold underline" : ""}`}>Revenue</Link>
              <Link href={buildHref({ sort: "profit", page: undefined })} className={`underline-offset-4 hover:underline ${value("sort") === "profit" ? "font-semibold underline" : ""}`}>Profit</Link>
              <Link href={buildHref({ sort: "units", page: undefined })} className={`underline-offset-4 hover:underline ${value("sort") === "units" ? "font-semibold underline" : ""}`}>Units</Link>
              <Link href={buildHref({ sort: "margin", page: undefined })} className={`underline-offset-4 hover:underline ${value("sort") === "margin" ? "font-semibold underline" : ""}`}>Margin</Link>
              <Link href={buildHref({ sort: "returns", page: undefined })} className={`underline-offset-4 hover:underline ${value("sort") === "returns" ? "font-semibold underline" : ""}`}>Returns</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3">Product / SKU</th>
                  <th className="p-3">Sold</th>
                  <th className="p-3">Returns</th>
                  <th className="p-3">Net units</th>
                  <th className="p-3">Return %</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Net sales</th>
                  <th className="p-3">COGS</th>
                  <th className="p-3">Profit</th>
                  <th className="p-3">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.products.length ? report.products.map((row) => (
                  <tr key={row.sku}>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{row.productName}</span>
                        {row.isAnomaly ? (
                          <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">Over-return</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{row.sku}</p>
                    </td>
                    <td className="p-3">{row.soldUnits}</td>
                    <td className="p-3">{row.returnedUnits}</td>
                    <td className="p-3">{row.netUnits}</td>
                    <td className="p-3">{row.returnRate === null ? "—" : `${row.returnRate.toFixed(1)}%`}</td>
                    <td className="p-3">{money(row.grossSales)}</td>
                    <td className="p-3">{money(row.netSales)}</td>
                    <td className="p-3">{money(row.cogs)}</td>
                    <td className="p-3">{money(row.profit)}</td>
                    <td className="p-3">{row.margin === null ? "—" : `${row.margin.toFixed(1)}%`}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border border-[#101114]/10 bg-white"><div className="border-b border-[#101114]/10 px-4 py-4"><h2 className="text-xl font-semibold">Payment methods</h2><p className="mt-1 text-xs text-muted-foreground">Sales reflect billed order amounts, not proof of cash collection. Pending online payments and unsettled COD remittances are not counted as collected cash; actual COD remittances are not calculated by this dashboard.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Method</th><th className="p-3">Orders</th><th className="p-3">Sales</th><th className="p-3">Refunds</th></tr></thead><tbody className="divide-y">{report.payments.map((row) => <tr key={row.method}><td className="p-3">{row.method === "COD" ? "Cash on delivery" : row.method}</td><td className="p-3">{row.orders}</td><td className="p-3">{money(row.sales)}</td><td className="p-3">{money(row.refunds)}</td></tr>)}</tbody></table></div></div>
      </section>

      <section className="border border-[#101114]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-4 py-4"><div><h2 className="text-xl font-semibold">Order profitability</h2><p className="mt-1 text-sm text-muted-foreground">Cancelled orders are excluded.</p></div><form className="flex gap-2"><Input name="q" defaultValue={value("q")} placeholder="Search order, customer, product or SKU" /><input type="hidden" name="range" value={range} /><input type="hidden" name="from" value={from ?? ""} /><input type="hidden" name="to" value={to ?? ""} />{value("sort") ? <input type="hidden" name="sort" value={value("sort")!} /> : null}<button className="border border-input px-3 text-sm font-medium hover:bg-muted" type="submit">Search</button></form></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50"><tr className="text-left"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Items</th><th className="p-3">Gross</th><th className="p-3">Discount</th><th className="p-3">Refund</th><th className="p-3">COGS</th><th className="p-3">Profit</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{orders.orders.map((order) => <tr key={order.id}><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link><p className="text-xs text-muted-foreground">{dateLabel(order.createdAt)}</p></td><td className="p-3">{order.customerName || "Guest"}</td><td className="p-3"><Badge variant="outline">{order.status}</Badge></td><td className="p-3">{order.itemCount}</td><td className="p-3">{money(order.grossSales)}</td><td className="p-3">{money(order.discount)}</td><td className="p-3">{money(order.refunds)}</td><td className="p-3">{money(order.cogs)}</td><td className="p-3">{money(order.profit)}</td><td className="p-3"><Link className="text-primary hover:underline" href={`/admin/orders/${order.id}`}>View</Link></td></tr>)}</tbody></table></div>
        {orders.totalPages > 1 ? <div className="flex justify-center gap-4 border-t border-[#101114]/10 p-4 text-sm"><Link className={orders.page <= 1 ? "pointer-events-none text-muted-foreground/50" : "font-medium"} href={buildHref({ page: orders.page - 1 })}>Previous</Link><span>Page {orders.page} of {orders.totalPages}</span><Link className={orders.page >= orders.totalPages ? "pointer-events-none text-muted-foreground/50" : "font-medium"} href={buildHref({ page: orders.page + 1 })}>Next</Link></div> : null}
      </section>
    </div>
  );
}
