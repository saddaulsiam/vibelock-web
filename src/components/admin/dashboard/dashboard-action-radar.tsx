import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  CreditCard,
  RotateCcw,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { formatBdt } from "./dashboard-financial-kpis";

function formatShortBdt(val: number) {
  if (val >= 100000) return `৳${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `৳${(val / 1000).toFixed(1)}K`;
  return `৳${Math.round(val)}`;
}

interface PaymentBreakdown {
  method: string;
  orders: number;
  sales: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface DashboardActionRadarProps {
  pendingOrdersCount: number;
  outOfStockVariantCount: number;
  productsOutOfStockCount: number;
  lowStockVariantCount: number;
  productsWithLowStockCount: number;
  publishedProductCount: number;
  categoryCount: number;
  customerCount: number;
  orderCount: number;
  returnedUnitsCount?: number;
  returnRate?: number;
  paymentsBreakdown?: PaymentBreakdown[];
  paymentStatuses?: StatusCount[];
  isManagerOrAdmin: boolean;
}

export function DashboardActionRadar({
  pendingOrdersCount,
  outOfStockVariantCount,
  productsOutOfStockCount,
  lowStockVariantCount,
  productsWithLowStockCount,
  publishedProductCount,
  categoryCount,
  customerCount,
  orderCount,
  returnedUnitsCount = 0,
  returnRate = 0,
  paymentsBreakdown = [],
  paymentStatuses = [],
  isManagerOrAdmin,
}: DashboardActionRadarProps) {
  const paymentTotal = paymentsBreakdown.reduce((sum, p) => sum + p.sales, 0);
  const codSales = paymentsBreakdown.find((p) => p.method === "COD")?.sales ?? 0;
  const onlineSales = Math.max(0, paymentTotal - codSales);
  const codPct = paymentTotal > 0 ? (codSales / paymentTotal) * 100 : 0;
  const onlinePct = paymentTotal > 0 ? (onlineSales / paymentTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── CARD 1: URGENT ATTENTION RADAR ── */}
      <div className="border-vl-dark-900/15 space-y-3.5 rounded-sm border bg-white p-5 shadow-xs">
        <div className="border-b border-neutral-100 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Operational Attention Radar
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-900 uppercase shadow-2xs">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              Live Radar
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Action 1: Pending Orders (Highlighted when count > 0) */}
          <Link
            href="/admin/orders?status=PENDING"
            className={`group flex items-center justify-between rounded border p-3 transition-all ${
              pendingOrdersCount > 0
                ? "border-amber-300 bg-amber-50/60 shadow-2xs ring-1 ring-amber-300/30 hover:border-amber-500 hover:bg-amber-100/50"
                : "border-vl-dark-900/10 hover:border-vl-dark-900/30"
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-vl-dark-900 flex items-center gap-1.5 text-xs font-bold">
                  <ClipboardList className="size-3.5 text-amber-600" />
                  Orders Awaiting Confirmation
                </span>
                {pendingOrdersCount > 0 && (
                  <span className="rounded border-amber-400 bg-amber-200 px-1 font-mono text-[8px] font-extrabold text-amber-950 uppercase">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px]">
                Pending intake verification or fulfillment.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-right font-mono">
              <span
                className={`text-lg font-black ${pendingOrdersCount > 0 ? "text-amber-950" : "text-vl-dark-900"}`}
              >
                {pendingOrdersCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 2: Critical Stockouts */}
          <Link
            href="/admin/inventory?stockStatus=out_of_stock"
            className="border-vl-dark-900/10 group flex items-center justify-between rounded border p-3 transition-all hover:border-red-500 hover:bg-red-50/40"
          >
            <div className="space-y-0.5">
              <span className="text-vl-dark-900 flex items-center gap-1.5 text-xs font-bold">
                <AlertTriangle className="size-3.5 text-red-600" />
                Critical Sold-Out Items
              </span>
              <p className="text-muted-foreground text-[11px]">
                {productsOutOfStockCount} products completely empty.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-right font-mono">
              <span className="text-lg font-black text-red-700">
                {outOfStockVariantCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 3: Low Stock Warning */}
          <Link
            href="/admin/inventory?stockStatus=low_stock"
            className="border-vl-dark-900/10 group flex items-center justify-between rounded border p-3 transition-all hover:border-amber-400 hover:bg-amber-50/30"
          >
            <div className="space-y-0.5">
              <span className="text-vl-dark-900 flex items-center gap-1.5 text-xs font-bold">
                <Warehouse className="size-3.5 text-amber-600" />
                Low-Stock Buffer (≤ 5 units)
              </span>
              <p className="text-muted-foreground text-[11px]">
                {productsWithLowStockCount} products nearing zero.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-right font-mono">
              <span className="text-lg font-black text-amber-800">
                {lowStockVariantCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 4: Return Requests with Clear Metrics */}
          <Link
            href="/admin/returns"
            className="border-vl-dark-900/10 group flex items-center justify-between rounded border p-3 transition-all hover:border-blue-400 hover:bg-blue-50/30"
          >
            <div className="space-y-0.5">
              <span className="text-vl-dark-900 flex items-center gap-1.5 text-xs font-bold">
                <RotateCcw className="size-3.5 text-blue-600" />
                Return &amp; Exchange Hub
              </span>
              <p className="text-muted-foreground text-[11px]">
                {returnedUnitsCount > 0
                  ? `${returnedUnitsCount} returned units · ${returnRate.toFixed(1)}% rate`
                  : "All RMA customer requests processed."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-right font-mono">
              <span className="text-vl-dark-900 text-lg font-black">
                {returnedUnitsCount > 0 ? returnedUnitsCount.toLocaleString("en-BD") : "0"}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── CARD 2: PAYMENT GATEWAY BREAKDOWN (MANAGERS ONLY) ── */}
      {isManagerOrAdmin && paymentsBreakdown.length > 0 && (
        <div className="border-vl-dark-900/10 space-y-3.5 rounded-sm border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="text-vl-dark-900 size-4" />
              <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                Payment Channel Mix
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-800">
              Total {formatShortBdt(paymentTotal)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {/* Interactive SVG Donut Ring Chart */}
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 100 100" className="size-full">
                <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {onlinePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="12"
                    strokeDasharray={`${(onlinePct / 100) * 226.19} 226.19`}
                    strokeDashoffset={0}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                )}
                {codPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="12"
                    strokeDasharray={`${(codPct / 100) * 226.19} 226.19`}
                    strokeDashoffset={`-${(onlinePct / 100) * 226.19}`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                )}
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-neutral-900 font-mono text-[10px] font-black"
                >
                  {formatShortBdt(paymentTotal)}
                </text>
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-neutral-400 font-sans text-[7px] font-bold tracking-wider uppercase"
                >
                  Settled
                </text>
              </svg>
            </div>

            {/* Methods Breakdown */}
            <div className="w-full flex-1 space-y-2">
              {paymentsBreakdown.map((item) => (
                <div
                  key={item.method}
                  className="flex items-center justify-between rounded border border-neutral-100 bg-neutral-50/60 p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${
                        item.method === "COD"
                          ? "bg-emerald-600"
                          : item.method === "BKASH"
                            ? "bg-pink-600"
                            : "bg-cyan-600"
                      }`}
                    />
                    <div>
                      <span className="font-bold text-neutral-800">
                        {item.method === "COD"
                          ? "Cash on Delivery"
                          : item.method === "BKASH"
                            ? "bKash MFS"
                            : item.method}
                      </span>
                      <span className="text-muted-foreground block text-[10px]">
                        {item.orders} orders
                      </span>
                    </div>
                  </div>
                  <span className="text-vl-dark-900 font-mono text-xs font-bold">
                    {formatBdt(item.sales)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Statuses Pills */}
          {paymentStatuses.length > 0 && (
            <div className="border-t border-neutral-100 pt-2.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Settlement Statuses:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
                {paymentStatuses.map((st) => (
                  <span
                    key={st.status}
                    className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-neutral-800"
                  >
                    <span>{st.status}:</span>
                    <strong>{st.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CARD 3: STORE CATALOG FOOTPRINT ── */}
      <div className="border-vl-dark-900/10 space-y-3 rounded-sm border bg-white p-5 shadow-xs">
        <div className="border-b border-neutral-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Boxes className="text-vl-dark-900 size-4" />
            <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Store Catalog Footprint
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-neutral-100 bg-neutral-50/70 p-2.5">
            <span className="text-muted-foreground text-[10px] uppercase">Products</span>
            <p className="text-vl-dark-900 font-mono text-lg font-bold">
              {publishedProductCount.toLocaleString("en-BD")}
            </p>
          </div>
          <div className="rounded border border-neutral-100 bg-neutral-50/70 p-2.5">
            <span className="text-muted-foreground text-[10px] uppercase">Categories</span>
            <p className="text-vl-dark-900 font-mono text-lg font-bold">
              {categoryCount.toLocaleString("en-BD")}
            </p>
          </div>
          <div className="rounded border border-neutral-100 bg-neutral-50/70 p-2.5">
            <span className="text-muted-foreground text-[10px] uppercase">Customers</span>
            <p className="text-vl-dark-900 font-mono text-lg font-bold">
              {customerCount.toLocaleString("en-BD")}
            </p>
          </div>
          <div className="rounded border border-neutral-100 bg-neutral-50/70 p-2.5">
            <span className="text-muted-foreground text-[10px] uppercase">Lifetime Orders</span>
            <p className="text-vl-dark-900 font-mono text-lg font-bold">
              {orderCount.toLocaleString("en-BD")}
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-2 text-right">
          <Link
            href="/admin/products"
            className="text-vl-dark-900 hover:text-vl-cyan-700 inline-flex items-center gap-1 text-xs font-semibold"
          >
            <span>Manage Catalog Items</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* ── CARD 4: COURIER & LOGISTICS DISPATCH HEALTH ── */}
      <div className="border-vl-dark-900/10 space-y-3 rounded-sm border bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2">
            <Truck className="text-vl-dark-900 size-4" />
            <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
              Logistics &amp; Courier Sync
            </span>
          </div>
          <span className="rounded border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
            Live Dispatch
          </span>
        </div>

        {/* Actionable COD Cash Settlement Telemetry */}
        {codSales > 0 && (
          <div className="rounded border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[11px] font-bold text-emerald-900">COD Payout Pipeline</span>
              <span className="text-[12px] font-extrabold text-emerald-800">
                {formatBdt(codSales)}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-emerald-800/80">
              Cash collected across 64 districts awaiting courier remittance.
            </p>
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">Steadfast Courier</span>
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Webhook Active
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">Pathao Express</span>
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Inside Dhaka Ready
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">National COD Dispatch</span>
            <span className="font-mono text-[10px] text-neutral-600">64 Districts Coverage</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-xs font-semibold">
          <Link
            href="/admin/orders?status=SHIPPED"
            className="text-muted-foreground hover:text-vl-dark-900 inline-flex items-center gap-1"
          >
            <span>Active Shipments</span>
          </Link>
          <Link
            href="/admin/shipping"
            className="text-vl-dark-900 hover:text-vl-cyan-700 inline-flex items-center gap-1"
          >
            <span>Track Consignments</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
