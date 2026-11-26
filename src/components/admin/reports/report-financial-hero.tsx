import {
  ArrowDownRight,
  CircleDollarSign,
  Package,
  Percent,
  RotateCcw,
  Tag,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReportFinancialSummary {
  orders: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  refunds: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number | null;
  soldUnits: number;
  returnedUnits: number;
  returnRate: number;
  averageOrderValue: number | null;
  shippingCharged: number;
  priorNetSales?: number | null;
  priorGrossProfit?: number | null;
  priorOrders?: number | null;
  priorReturnRate?: number | null;
  netSalesDelta?: number | null;
  grossProfitDelta?: number | null;
  ordersDelta?: number | null;
  returnRateDelta?: number | null;
}

function formatBdt(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

interface ReportFinancialHeroProps {
  summary: ReportFinancialSummary;
  rangeLabel: string;
}

export function ReportFinancialHero({ summary, rangeLabel }: ReportFinancialHeroProps) {
  return (
    <section aria-labelledby="financial-summary-heading" className="space-y-4 print:space-y-3 print:break-inside-avoid">
      <div className="border-neutral-200/90 rounded-sm border bg-white shadow-xs print:shadow-none print:border-neutral-300">
        {/* ── TOP PRIMARY P&L ROW: NET SALES, GROSS PROFIT, MARGIN, COGS ── */}
        <div className="border-b border-neutral-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100/90 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
                Net Merchandise Revenue
              </span>
              <span className="border-vl-cyan-600/30 bg-vl-cyan-50 text-vl-cyan-950 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase shadow-2xs">
                <span className="bg-vl-cyan-600 size-1.5 animate-pulse rounded-full" />
                {rangeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-neutral-200/80 bg-neutral-50 px-2.5 py-0.5 rounded font-mono text-[11px] font-medium text-neutral-700 shadow-2xs">
                {summary.orders.toLocaleString("en-BD")} realized orders
              </span>
              {summary.ordersDelta !== null && summary.ordersDelta !== undefined && (
                <span
                  className={cn(
                    "font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    summary.ordersDelta >= 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  )}
                  title={`Prior: ${summary.priorOrders ?? 0} orders`}
                >
                  {summary.ordersDelta >= 0 ? "▲ +" : "▼ "}
                  {summary.ordersDelta.toFixed(1)}% vol
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-center">
            {/* Primary Net Revenue */}
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <p
                  id="financial-summary-heading"
                  className="text-vl-dark-900 font-heading text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
                >
                  {formatBdt(summary.netSales)}
                </p>
                {summary.netSalesDelta !== null && summary.netSalesDelta !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-bold border shadow-2xs",
                      summary.netSalesDelta >= 0
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-rose-300 bg-rose-50 text-rose-800"
                    )}
                    title={`Prior period: ${formatBdt(summary.priorNetSales)}`}
                  >
                    {summary.netSalesDelta >= 0 ? "▲ +" : "▼ "}
                    {summary.netSalesDelta.toFixed(1)}% vs prior
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Realized revenue net of customer discounts, store promotions, and approved returns.
              </p>
            </div>

            {/* Core Profitability Badges: COGS -> Profit -> Margin */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="border-amber-200/70 bg-amber-50/50 rounded-sm border p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase">
                  <Warehouse className="size-3.5 text-amber-600" />
                  <span>Total COGS</span>
                </div>
                <p className="font-mono text-base font-extrabold text-amber-950 sm:text-lg">
                  {formatBdt(summary.cogs)}
                </p>
                <span className="text-[10px] text-amber-700/80">Historical Item Cost</span>
              </div>

              <div className="border-emerald-200/70 bg-emerald-50/50 rounded-sm border p-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="size-3.5 text-emerald-600" />
                    <span>Gross Profit</span>
                  </div>
                  {summary.grossProfitDelta !== null && summary.grossProfitDelta !== undefined && (
                    <span
                      className={cn(
                        "font-mono text-[10px]",
                        summary.grossProfitDelta >= 0 ? "text-emerald-700" : "text-rose-700"
                      )}
                      title={`Prior: ${formatBdt(summary.priorGrossProfit)}`}
                    >
                      {summary.grossProfitDelta >= 0 ? "▲ +" : "▼ "}
                      {summary.grossProfitDelta.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="font-mono text-base font-extrabold text-emerald-950 sm:text-lg">
                  {formatBdt(summary.grossProfit)}
                </p>
                <span className="text-[10px] text-emerald-700/80">Net Sales – COGS</span>
              </div>

              <div className="border-cyan-200/70 bg-cyan-50/50 rounded-sm border p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-800 uppercase">
                  <Percent className="size-3.5 text-cyan-600" />
                  <span>Gross Margin</span>
                </div>
                <p className="font-mono text-base font-extrabold text-cyan-950 sm:text-lg">
                  {summary.grossMargin !== null ? `${summary.grossMargin.toFixed(1)}%` : "—"}
                </p>
                <span className="text-[10px] text-cyan-700/80">Merchandise Profit %</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SHOPIFY PLUS / STRIPE CONTRIBUTION MARGIN BRIDGE ── */}
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold uppercase tracking-wider text-[11px] text-neutral-700">
                Operational Contribution Bridge
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                (Merchandise Gross Profit − Est. Gateway Fees)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Est. Processing Fees (~2%):</span>
                <span className="font-bold text-amber-900">
                  -{formatBdt(summary.netSales * 0.02)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Net Contribution Margin:</span>
                <span className="font-extrabold text-emerald-900">
                  {formatBdt(Math.max(summary.grossProfit - summary.netSales * 0.02, 0))}
                </span>
                <span className="text-[10px] text-neutral-500 font-sans font-medium">
                  (
                  {summary.netSales > 0
                    ? (((summary.grossProfit - summary.netSales * 0.02) / summary.netSales) * 100).toFixed(1)
                    : 0}
                  %)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECONDARY FINANCIAL PULSE GRID (6 TILES) ── */}
        <div className="bg-neutral-50/50 grid grid-cols-2 divide-x divide-y divide-neutral-200/80 sm:grid-cols-3 lg:grid-cols-6 sm:divide-y-0">
          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <CircleDollarSign className="size-3 text-neutral-500" />
              Gross GMV
            </span>
            <p className="font-mono text-sm font-bold text-vl-dark-900 sm:text-base">
              {formatBdt(summary.grossSales)}
            </p>
            <span className="text-muted-foreground block text-[10px]">Pre-discount merchandise</span>
          </div>

          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <Tag className="size-3 text-purple-600" />
              Discounts
            </span>
            <p className="font-mono text-sm font-bold text-purple-900 sm:text-base">
              {formatBdt(summary.discounts)}
            </p>
            <span className="text-muted-foreground block text-[10px]">Coupons &amp; campaigns</span>
          </div>

          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <ArrowDownRight className="size-3 text-red-600" />
              Refunds Paid
            </span>
            <p className="font-mono text-sm font-bold text-red-900 sm:text-base">
              {formatBdt(summary.refunds)}
            </p>
            <span className="text-muted-foreground block text-[10px]">Successful remittances</span>
          </div>

          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <Package className="size-3 text-blue-600" />
              Avg Order Value
            </span>
            <p className="font-mono text-sm font-bold text-vl-dark-900 sm:text-base">
              {formatBdt(summary.averageOrderValue)}
            </p>
            <span className="text-muted-foreground block text-[10px]">Basket realization</span>
          </div>

          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <Truck className="size-3 text-cyan-700" />
              Shipping Charged
            </span>
            <p className="font-mono text-sm font-bold text-vl-dark-900 sm:text-base">
              {formatBdt(summary.shippingCharged)}
            </p>
            <span className="text-muted-foreground block text-[10px]">Customer delivery fees</span>
          </div>

          <div className="space-y-0.5 p-3.5 sm:p-4">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
              <RotateCcw className="size-3 text-amber-600" />
              Return Rate
            </span>
            <p className="font-mono text-sm font-bold text-amber-950 sm:text-base">
              {summary.returnRate.toFixed(1)}%
            </p>
            <span className="text-muted-foreground block font-mono text-[10px]">
              {summary.returnedUnits} ret / {summary.soldUnits} sold
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
