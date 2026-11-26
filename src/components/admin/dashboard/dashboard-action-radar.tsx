import Link from "next/link";
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
import { formatBdt } from "./dashboard-financial-kpis";

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
  const codSales = paymentsBreakdown.find((p) => p.method === "COD")?.sales ?? 0;

  return (
    <div className="space-y-6">
      {/* ── CARD 1: URGENT ATTENTION RADAR ── */}
      <div className="border-vl-dark-900/15 space-y-3.5 rounded-sm border bg-white p-5 shadow-xs">
        <div className="border-b border-neutral-100 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Operational Attention Radar
            </h3>
            <span className="border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase shadow-2xs">
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
                ? "border-amber-300 bg-amber-50/60 hover:border-amber-500 hover:bg-amber-100/50 shadow-2xs ring-1 ring-amber-300/30"
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
                  <span className="border-amber-400 bg-amber-200 text-amber-950 rounded px-1 font-mono text-[8px] font-extrabold uppercase">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px]">
                Pending intake verification or fulfillment.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-right font-mono">
              <span className={`text-lg font-black ${pendingOrdersCount > 0 ? "text-amber-950" : "text-vl-dark-900"}`}>
                {pendingOrdersCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 2: Critical Stockouts */}
          <Link
            href="/admin/inventory?stockStatus=out_of_stock"
            className="border-vl-dark-900/10 hover:border-red-500 hover:bg-red-50/40 group flex items-center justify-between rounded border p-3 transition-all"
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
              <span className="text-red-700 text-lg font-black">
                {outOfStockVariantCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 3: Low Stock Warning */}
          <Link
            href="/admin/inventory?stockStatus=low_stock"
            className="border-vl-dark-900/10 hover:border-amber-400 hover:bg-amber-50/30 group flex items-center justify-between rounded border p-3 transition-all"
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
              <span className="text-amber-800 text-lg font-black">
                {lowStockVariantCount.toLocaleString("en-BD")}
              </span>
              <ArrowRight className="text-muted-foreground size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Action 4: Return Requests with Clear Metrics */}
          <Link
            href="/admin/returns"
            className="border-vl-dark-900/10 hover:border-blue-400 hover:bg-blue-50/30 group flex items-center justify-between rounded border p-3 transition-all"
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
        <div className="border-vl-dark-900/10 space-y-3 rounded-sm border bg-white p-5 shadow-xs">
          <div className="border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="text-vl-dark-900 size-4" />
              <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                Payment Channel Mix
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {paymentsBreakdown.map((item) => (
              <div
                key={item.method}
                className="flex items-center justify-between rounded border border-neutral-100 bg-neutral-50/60 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      item.method === "COD"
                        ? "bg-emerald-600"
                        : item.method === "BKASH"
                          ? "bg-pink-600"
                          : "bg-blue-600"
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
                    className="border-neutral-200 bg-neutral-100 text-neutral-800 inline-flex items-center gap-1 rounded border px-2 py-0.5"
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
          <span className="border-emerald-200 bg-emerald-50 text-emerald-800 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold">
            Live Dispatch
          </span>
        </div>

        {/* Actionable COD Cash Settlement Telemetry */}
        {codSales > 0 && (
          <div className="border-emerald-200 bg-emerald-50/70 rounded border p-2.5 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-emerald-900 font-bold text-[11px]">COD Payout Pipeline</span>
              <span className="text-emerald-800 font-extrabold text-[12px]">{formatBdt(codSales)}</span>
            </div>
            <p className="text-emerald-800/80 mt-0.5 text-[10px]">
              Cash collected across 64 districts awaiting courier remittance.
            </p>
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">Steadfast Courier</span>
            <span className="text-emerald-700 flex items-center gap-1 font-mono text-[10px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Webhook Active
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">Pathao Express</span>
            <span className="text-emerald-700 flex items-center gap-1 font-mono text-[10px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Inside Dhaka Ready
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-neutral-50 px-2.5 py-1.5">
            <span className="font-semibold text-neutral-800">National COD Dispatch</span>
            <span className="text-neutral-600 font-mono text-[10px]">
              64 Districts Coverage
            </span>
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
