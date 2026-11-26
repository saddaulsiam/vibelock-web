"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Calendar, CreditCard, ExternalLink, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductProfitabilityDrilldown } from "@/components/admin/products";
import type {
  getAdminOrderProfitability,
  ProductProfitabilityResult,
  ReportFilters,
} from "@/lib/admin/reports/report-queries";

export type AdminOrderProfitabilityResult = Awaited<ReturnType<typeof getAdminOrderProfitability>>;
export type AdminOrderProfitabilityOrder = AdminOrderProfitabilityResult["orders"][number];

function formatBdt(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(date));
}

interface TrendRow {
  date: Date;
  orders: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  refunds: number;
  cogs: number;
  grossProfit: number;
}

interface PaymentRow {
  method: string;
  orders: number;
  sales: number;
  refunds: number;
}

interface ReportLedgerWorkspaceProps {
  currentView?: string;
  productProfitability: ProductProfitabilityResult;
  orders: AdminOrderProfitabilityResult;
  trend: TrendRow[];
  payments: PaymentRow[];
  reportFilters: ReportFilters;
  searchParamsRecord: Record<string, string | undefined>;
}

export function ReportLedgerWorkspace({
  currentView = "products",
  productProfitability,
  orders,
  trend,
  payments,
  reportFilters,
  searchParamsRecord,
}: ReportLedgerWorkspaceProps) {
  const buildHref = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries({ ...searchParamsRecord, ...updates })) {
      if (val !== undefined && val !== "") params.set(key, String(val));
    }
    return `?${params.toString()}`;
  };

  const [activeTab, setActiveTab] = React.useState<"products" | "orders" | "daily" | "payments">(
    currentView === "orders" || currentView === "daily" || currentView === "payments"
      ? currentView
      : "products"
  );

  const TABS = [
    {
      key: "products" as const,
      label: "Product & SKU Profitability",
      icon: Boxes,
      badge: `${productProfitability.total} items`,
    },
    {
      key: "orders" as const,
      label: "Order Unit Economics",
      icon: ShoppingBag,
      badge: `${orders.total} orders`,
    },
    {
      key: "daily" as const,
      label: "Daily Sales Velocity",
      icon: Calendar,
      badge: `${trend.length} intervals`,
    },
    {
      key: "payments" as const,
      label: "Payment Settlements",
      icon: CreditCard,
      badge: `${payments.length} channels`,
    },
  ];

  return (
    <section
      aria-labelledby="ledger-workspace-heading"
      className="space-y-4 print:break-inside-avoid print:space-y-3"
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          if (val) setActiveTab(val as typeof activeTab);
        }}
        className="w-full gap-4"
      >
        {/* ── SEGMENTED LEDGER NAVIGATION TABS ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-2">
          <div>
            <h2
              id="ledger-workspace-heading"
              className="text-vl-dark-900 font-heading text-base font-bold tracking-tight"
            >
              Detailed Ledger Workspaces
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Inspect item unit economics, individual order margins, and daily transactional logs.
            </p>
          </div>

          <TabsList
            aria-label="Report ledger views"
            className="h-auto flex-wrap print:hidden"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;

              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  <span className="py-0.2 rounded bg-neutral-100 px-1.5 font-mono text-[10px] text-neutral-800">
                    {tab.badge}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* ── TAB 1: PRODUCT & SKU PROFITABILITY ── */}
        <TabsContent value="products" className="outline-none">
          <ProductProfitabilityDrilldown
            data={productProfitability}
            currentSort={reportFilters.sort}
            currentSearch={reportFilters.search}
            range={reportFilters.range}
            from={reportFilters.from}
            to={reportFilters.to}
            page={String(orders.page)}
            compactHeader={true}
          />
        </TabsContent>

        {/* ── TAB 2: ORDER UNIT ECONOMICS ── */}
        <TabsContent value="orders" className="outline-none">
          <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
            <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
                  Order Unit Economics &amp; P&amp;L
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Realized margins per order (cancelled orders excluded).
                </p>
              </div>
              <form className="flex gap-2 print:hidden">
                <Input
                  name="q"
                  defaultValue={reportFilters.search}
                  placeholder="Search order, customer or SKU"
                  className="h-8 w-60 font-mono text-xs"
                />
                <input type="hidden" name="range" value={reportFilters.range ?? "30d"} />
                {reportFilters.from && (
                  <input type="hidden" name="from" value={reportFilters.from} />
                )}
                {reportFilters.to && <input type="hidden" name="to" value={reportFilters.to} />}
                {reportFilters.sort && (
                  <input type="hidden" name="sort" value={reportFilters.sort} />
                )}
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                >
                  <Search className="mr-1 size-3" />
                  Search
                </Button>
              </form>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-220 text-xs print:w-full print:min-w-0 print:text-[9.5px]">
                <thead className="border-b border-neutral-200 bg-neutral-50/80 font-mono text-[11px] tracking-wider text-neutral-600 uppercase print:text-[8.5px]">
                  <tr className="text-left">
                    <th className="p-3 print:px-1.5 print:py-2">Order Identifier</th>
                    <th className="p-3 print:px-1.5 print:py-2">Customer</th>
                    <th className="p-3 print:px-1.5 print:py-2">Status</th>
                    <th className="p-3 text-center print:px-1.5 print:py-2">Items</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Gross</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Discount</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Refund</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">COGS</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Profit</th>
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {orders.orders.length ? (
                    orders.orders.map((order: AdminOrderProfitabilityOrder) => (
                      <tr key={order.id} className="transition-colors hover:bg-neutral-50/60">
                        <td className="p-3">
                          <Link
                            className="text-vl-dark-900 hover:text-vl-cyan-700 font-bold hover:underline"
                            href={`/admin/orders/${order.id}`}
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-muted-foreground text-[10px]">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>
                        <td className="p-3 font-sans font-medium text-neutral-800">
                          {order.customerName || (
                            <span className="text-neutral-400 italic">Guest</span>
                          )}
                        </td>
                        <td className="p-3 font-sans">
                          <span className="rounded border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800 uppercase">
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">{order.itemCount}</td>
                        <td className="p-3 text-right font-medium">
                          {formatBdt(order.grossSales)}
                        </td>
                        <td className="p-3 text-right text-purple-900">
                          {formatBdt(order.discount)}
                        </td>
                        <td className="p-3 text-right text-red-700">{formatBdt(order.refunds)}</td>
                        <td className="p-3 text-right text-neutral-600">{formatBdt(order.cogs)}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {formatBdt(order.profit)}
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            className="hover:border-vl-dark-900 inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-0.5 font-sans text-[11px] font-semibold text-neutral-700 transition-all hover:text-neutral-900"
                            href={`/admin/orders/${order.id}`}
                          >
                            <span>Manage</span>
                            <ExternalLink className="size-2.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-muted-foreground p-8 text-center font-sans">
                        No matching orders recorded for this window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {orders.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 p-3.5 font-mono text-xs print:hidden">
                <span className="text-muted-foreground">
                  Showing page <strong>{orders.page}</strong> of{" "}
                  <strong>{orders.totalPages}</strong>
                </span>
                <div className="flex gap-2">
                  <Link
                    className={cn(
                      "rounded border border-neutral-200 px-3 py-1 font-semibold transition-all",
                      orders.page <= 1
                        ? "pointer-events-none bg-neutral-50 text-neutral-400 opacity-40"
                        : "bg-white text-neutral-800 hover:bg-neutral-50"
                    )}
                    href={buildHref({ page: orders.page - 1 })}
                  >
                    Previous
                  </Link>
                  <Link
                    className={cn(
                      "rounded border border-neutral-200 px-3 py-1 font-semibold transition-all",
                      orders.page >= orders.totalPages
                        ? "pointer-events-none bg-neutral-50 text-neutral-400 opacity-40"
                        : "bg-white text-neutral-800 hover:bg-neutral-50"
                    )}
                    href={buildHref({ page: orders.page + 1 })}
                  >
                    Next
                  </Link>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 3: DAILY SALES VELOCITY ── */}
        <TabsContent value="daily" className="outline-none">
          <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
            <div className="border-vl-dark-900/10 border-b p-4">
              <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
                Daily Sales &amp; Cost Journal
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Daily transaction aggregation of orders, revenue, COGS and realized profit.
              </p>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-190 text-xs print:w-full print:min-w-0 print:text-[10px]">
                <thead className="border-b border-neutral-200 bg-neutral-50/80 font-mono text-[11px] tracking-wider text-neutral-600 uppercase print:text-[9px]">
                  <tr className="text-left">
                    <th className="p-3 print:px-1.5 print:py-2">Date</th>
                    <th className="p-3 text-center print:px-1.5 print:py-2">Orders</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Gross GMV</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Discounts</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Net Sales</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Refunds</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">COGS</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {trend.length ? (
                    trend.map((row) => (
                      <tr
                        key={new Date(row.date).toISOString()}
                        className="transition-colors hover:bg-neutral-50/60"
                      >
                        <td className="p-3 font-semibold text-neutral-900 print:px-1.5 print:py-1.5">
                          {formatDate(row.date)}
                        </td>
                        <td className="p-3 text-center print:px-1.5 print:py-1.5">{row.orders}</td>
                        <td className="p-3 text-right print:px-1.5 print:py-1.5">
                          {formatBdt(row.grossSales)}
                        </td>
                        <td className="p-3 text-right text-purple-900 print:px-1.5 print:py-1.5">
                          {formatBdt(row.discounts)}
                        </td>
                        <td className="p-3 text-right font-bold text-neutral-950 print:px-1.5 print:py-1.5">
                          {formatBdt(row.netSales)}
                        </td>
                        <td className="p-3 text-right text-red-700 print:px-1.5 print:py-1.5">
                          {formatBdt(row.refunds)}
                        </td>
                        <td className="p-3 text-right text-neutral-600 print:px-1.5 print:py-1.5">
                          {formatBdt(row.cogs)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 print:px-1.5 print:py-1.5">
                          {formatBdt(row.grossProfit)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-muted-foreground p-8 text-center font-sans">
                        No daily sales records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: PAYMENT CHANNELS SETTLEMENT ── */}
        <TabsContent value="payments" className="outline-none">
          <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
            <div className="border-vl-dark-900/10 border-b p-4">
              <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
                Payment Gateway Settlement Ledgers
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Billed transaction amounts across payment gateways and cash-on-delivery couriers.
              </p>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs print:w-full print:text-[10px]">
                <thead className="border-b border-neutral-200 bg-neutral-50/80 font-mono text-[11px] tracking-wider text-neutral-600 uppercase print:text-[9px]">
                  <tr className="text-left">
                    <th className="p-3 print:px-1.5 print:py-2">Payment Provider / Method</th>
                    <th className="p-3 text-center print:px-1.5 print:py-2">Orders</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Billed Sales</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Refunds Deducted</th>
                    <th className="p-3 text-right print:px-1.5 print:py-2">Net Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {payments.map((row) => (
                    <tr key={row.method} className="transition-colors hover:bg-neutral-50/60">
                      <td className="p-3 font-sans font-bold text-neutral-900">
                        {row.method === "COD"
                          ? "Cash on Delivery (National COD)"
                          : row.method === "BKASH"
                            ? "bKash Mobile Financial Services"
                            : row.method}
                      </td>
                      <td className="p-3 text-center">{row.orders.toLocaleString("en-BD")}</td>
                      <td className="p-3 text-right font-medium">{formatBdt(row.sales)}</td>
                      <td className="p-3 text-right text-red-700">{formatBdt(row.refunds)}</td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        {formatBdt(row.sales - row.refunds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
