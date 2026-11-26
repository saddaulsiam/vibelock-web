"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  Calendar,
  CreditCard,
  ExternalLink,
  Search,
  ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section aria-labelledby="ledger-workspace-heading" className="space-y-4">
      {/* ── SEGMENTED LEDGER NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-2">
        <div>
          <h2 id="ledger-workspace-heading" className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
            Detailed Ledger Workspaces
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Inspect item unit economics, individual order margins, and daily transactional logs.
          </p>
        </div>

        <nav
          aria-label="Report ledger views"
          className="relative inline-flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200/90 bg-neutral-100/80 p-1 shadow-2xs backdrop-blur-xs"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors duration-150 select-none cursor-pointer",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-vl-dark-900/20",
                  isActive ? "text-vl-dark-900 font-bold" : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="reportLedgerActiveTabPill"
                    className="absolute inset-0 -z-10 rounded-lg border border-neutral-200/70 bg-white shadow-xs"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 35,
                    }}
                  />
                )}
                <Icon className={cn("size-3.5", isActive ? "text-vl-cyan-700" : "text-neutral-400")} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] rounded px-1.5 py-0.2",
                    isActive ? "bg-neutral-100 text-neutral-800" : "text-neutral-400"
                  )}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── TAB 1: PRODUCT & SKU PROFITABILITY ── */}
      {activeTab === "products" && (
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
      )}

      {/* ── TAB 2: ORDER UNIT ECONOMICS ── */}
      {activeTab === "orders" && (
        <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs">
          <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
                Order Unit Economics &amp; P&amp;L
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Realized margins per order (cancelled orders excluded).
              </p>
            </div>
            <form className="flex gap-2">
              <Input
                name="q"
                defaultValue={reportFilters.search}
                placeholder="Search order, customer or SKU"
                className="h-8 w-60 text-xs font-mono"
              />
              <input type="hidden" name="range" value={reportFilters.range ?? "30d"} />
              {reportFilters.from && <input type="hidden" name="from" value={reportFilters.from} />}
              {reportFilters.to && <input type="hidden" name="to" value={reportFilters.to} />}
              {reportFilters.sort && <input type="hidden" name="sort" value={reportFilters.sort} />}
              <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-semibold">
                <Search className="size-3 mr-1" />
                Search
              </Button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-xs">
              <thead className="bg-neutral-50/80 font-mono text-[11px] uppercase tracking-wider text-neutral-600 border-b border-neutral-200">
                <tr className="text-left">
                  <th className="p-3">Order Identifier</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3 text-right">Gross</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Refund</th>
                  <th className="p-3 text-right">COGS</th>
                  <th className="p-3 text-right">Profit</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {orders.orders.length ? (
                  orders.orders.map((order: AdminOrderProfitabilityOrder) => (
                    <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3">
                        <Link
                          className="text-vl-dark-900 hover:text-vl-cyan-700 font-bold hover:underline"
                          href={`/admin/orders/${order.id}`}
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="text-muted-foreground text-[10px]">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="p-3 font-sans font-medium text-neutral-800">
                        {order.customerName || <span className="italic text-neutral-400">Guest</span>}
                      </td>
                      <td className="p-3 font-sans">
                        <span className="border-neutral-200 bg-neutral-100 text-neutral-800 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">{order.itemCount}</td>
                      <td className="p-3 text-right font-medium">{formatBdt(order.grossSales)}</td>
                      <td className="p-3 text-right text-purple-900">{formatBdt(order.discount)}</td>
                      <td className="p-3 text-right text-red-700">{formatBdt(order.refunds)}</td>
                      <td className="p-3 text-right text-neutral-600">{formatBdt(order.cogs)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{formatBdt(order.profit)}</td>
                      <td className="p-3 text-center">
                        <Link
                          className="border-neutral-200 hover:border-vl-dark-900 inline-flex items-center gap-1 rounded border bg-white px-2 py-0.5 text-[11px] font-sans font-semibold text-neutral-700 hover:text-neutral-900 transition-all"
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
                    <td colSpan={10} className="p-8 text-center text-muted-foreground font-sans">
                      No matching orders recorded for this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {orders.totalPages > 1 && (
            <div className="border-t border-neutral-100 flex items-center justify-between p-3.5 text-xs font-mono">
              <span className="text-muted-foreground">
                Showing page <strong>{orders.page}</strong> of <strong>{orders.totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <Link
                  className={cn(
                    "rounded border border-neutral-200 px-3 py-1 font-semibold transition-all",
                    orders.page <= 1
                      ? "pointer-events-none opacity-40 bg-neutral-50 text-neutral-400"
                      : "bg-white hover:bg-neutral-50 text-neutral-800"
                  )}
                  href={buildHref({ page: orders.page - 1 })}
                >
                  Previous
                </Link>
                <Link
                  className={cn(
                    "rounded border border-neutral-200 px-3 py-1 font-semibold transition-all",
                    orders.page >= orders.totalPages
                      ? "pointer-events-none opacity-40 bg-neutral-50 text-neutral-400"
                      : "bg-white hover:bg-neutral-50 text-neutral-800"
                  )}
                  href={buildHref({ page: orders.page + 1 })}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: DAILY SALES VELOCITY ── */}
      {activeTab === "daily" && (
        <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs">
          <div className="border-vl-dark-900/10 border-b p-4">
            <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
              Daily Sales &amp; Cost Journal
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Daily transaction aggregation of orders, revenue, COGS and realized profit.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-xs">
              <thead className="bg-neutral-50/80 font-mono text-[11px] uppercase tracking-wider text-neutral-600 border-b border-neutral-200">
                <tr className="text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Orders</th>
                  <th className="p-3 text-right">Gross GMV</th>
                  <th className="p-3 text-right">Discounts</th>
                  <th className="p-3 text-right">Net Sales</th>
                  <th className="p-3 text-right">Refunds</th>
                  <th className="p-3 text-right">COGS</th>
                  <th className="p-3 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {trend.length ? (
                  trend.map((row) => (
                    <tr key={new Date(row.date).toISOString()} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3 font-semibold text-neutral-900">{formatDate(row.date)}</td>
                      <td className="p-3 text-center">{row.orders}</td>
                      <td className="p-3 text-right">{formatBdt(row.grossSales)}</td>
                      <td className="p-3 text-right text-purple-900">{formatBdt(row.discounts)}</td>
                      <td className="p-3 text-right font-bold text-neutral-950">{formatBdt(row.netSales)}</td>
                      <td className="p-3 text-right text-red-700">{formatBdt(row.refunds)}</td>
                      <td className="p-3 text-right text-neutral-600">{formatBdt(row.cogs)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{formatBdt(row.grossProfit)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground font-sans">
                      No daily sales records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: PAYMENT CHANNELS SETTLEMENT ── */}
      {activeTab === "payments" && (
        <div className="border-vl-dark-900/10 rounded-sm border bg-white shadow-xs">
          <div className="border-vl-dark-900/10 border-b p-4">
            <h3 className="text-vl-dark-900 font-heading text-sm font-bold tracking-wider uppercase">
              Payment Gateway Settlement Ledgers
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Billed transaction amounts across payment gateways and cash-on-delivery couriers.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50/80 font-mono text-[11px] uppercase tracking-wider text-neutral-600 border-b border-neutral-200">
                <tr className="text-left">
                  <th className="p-3">Payment Provider / Method</th>
                  <th className="p-3 text-center">Orders</th>
                  <th className="p-3 text-right">Billed Sales</th>
                  <th className="p-3 text-right">Refunds Deducted</th>
                  <th className="p-3 text-right">Net Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {payments.map((row) => (
                  <tr key={row.method} className="hover:bg-neutral-50/60 transition-colors">
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
      )}
    </section>
  );
}
