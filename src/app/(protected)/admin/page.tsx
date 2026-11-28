import {
  DashboardActionRadar,
  DashboardFulfillmentRibbon,
  DashboardHeader,
  DashboardHeroCockpit,
  DashboardRecentOrders,
} from "@/components/admin/dashboard";
import { getAdminDashboardData } from "@/lib/admin/reports";
import { requireRole } from "@/lib/auth/authorization";
import { hasRequiredRole } from "@/lib/auth/roles";
import { Calculator, ClipboardList, Truck, Warehouse } from "lucide-react";
import Link from "next/link";

const VALID_RANGES = new Set(["today", "yesterday", "7d", "30d", "this-month"]);

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
  const user = await requireRole("STAFF");
  const isManagerOrAdmin = hasRequiredRole(user.role, "MANAGER");

  const params = searchParams ? await searchParams : {};
  const rawRange = typeof params.range === "string" ? params.range.trim() : undefined;
  const range = rawRange && VALID_RANGES.has(rawRange) ? rawRange : "30d";

  const dashboard = await getAdminDashboardData({ range });

  const activePresetLabel =
    range === "today"
      ? "Today"
      : range === "yesterday"
        ? "Yesterday"
        : range === "7d"
          ? "Last 7 days"
          : range === "this-month"
            ? "Current month"
            : "Last 30 days";

  const reportHref = range === "30d" ? "/admin/reports" : `/admin/reports?range=${range}`;

  const pendingOrdersCount =
    dashboard.orderStatuses.find((s) => s.status === "PENDING")?.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── TOP HEADER WITH LIVE PULSE & QUICK ACTION BAR ── */}
      <DashboardHeader isManagerOrAdmin={isManagerOrAdmin} currentRange={range} />

      {/* ── ASYMMETRIC 2-COLUMN BENTO MISSION CONTROL ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── LEFT MAIN COCKPIT: REVENUE HERO, FLOW RIBBON & ORDER STREAM ── */}
        <div className="min-w-0 space-y-6">
          {/* 1. Hero Revenue Cockpit with Integrated Sales Velocity Wave (Manager) or Staff Center */}
          {isManagerOrAdmin ? (
            <DashboardHeroCockpit
              financials={dashboard.financials}
              trend={dashboard.trend ?? []}
              currentRange={range}
              activePresetLabel={activePresetLabel}
              reportHref={reportHref}
            />
          ) : (
            /* Staff Quick Actions Center */
            <section aria-label="Staff Quick Actions" className="space-y-3">
              <div className="border-vl-dark-900/10 border-b pb-2">
                <h3 className="text-vl-dark-900 font-heading text-base font-bold tracking-tight">
                  Staff Operations Center
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Quick access to register sales, fulfillment queues, and stock operations.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  href="/pos"
                  className="group border-vl-dark-900/10 hover:border-vl-dark-900/30 flex items-center gap-3 border bg-white p-4 transition-colors"
                >
                  <span className="bg-vl-white-300 text-vl-dark-900 group-hover:bg-vl-dark-900 flex size-10 shrink-0 items-center justify-center transition-colors group-hover:text-white">
                    <Calculator className="size-5" />
                  </span>
                  <div>
                    <p className="text-vl-dark-900 text-sm font-semibold">POS Counter</p>
                    <p className="text-muted-foreground text-xs">Scan &amp; checkout sales</p>
                  </div>
                </Link>
                <Link
                  href="/admin/orders"
                  className="group border-vl-dark-900/10 hover:border-vl-dark-900/30 flex items-center gap-3 border bg-white p-4 transition-colors"
                >
                  <span className="bg-vl-white-300 text-vl-dark-900 group-hover:bg-vl-dark-900 flex size-10 shrink-0 items-center justify-center transition-colors group-hover:text-white">
                    <ClipboardList className="size-5" />
                  </span>
                  <div>
                    <p className="text-vl-dark-900 text-sm font-semibold">Fulfill Orders</p>
                    <p className="text-muted-foreground text-xs">
                      Pick, pack &amp; track shipments
                    </p>
                  </div>
                </Link>
                <Link
                  href="/admin/inventory"
                  className="group border-vl-dark-900/10 hover:border-vl-dark-900/30 flex items-center gap-3 border bg-white p-4 transition-colors"
                >
                  <span className="bg-vl-white-300 text-vl-dark-900 group-hover:bg-vl-dark-900 flex size-10 shrink-0 items-center justify-center transition-colors group-hover:text-white">
                    <Warehouse className="size-5" />
                  </span>
                  <div>
                    <p className="text-vl-dark-900 text-sm font-semibold">Inventory Counts</p>
                    <p className="text-muted-foreground text-xs">Stock on hand &amp; alerts</p>
                  </div>
                </Link>
                <Link
                  href="/admin/shipping"
                  className="group border-vl-dark-900/10 hover:border-vl-dark-900/30 flex items-center gap-3 border bg-white p-4 transition-colors"
                >
                  <span className="bg-vl-white-300 text-vl-dark-900 group-hover:bg-vl-dark-900 flex size-10 shrink-0 items-center justify-center transition-colors group-hover:text-white">
                    <Truck className="size-5" />
                  </span>
                  <div>
                    <p className="text-vl-dark-900 text-sm font-semibold">Shipping Status</p>
                    <p className="text-muted-foreground text-xs">Courier &amp; consignment logs</p>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* 2. Order Fulfillment Flow Ribbon */}
          <DashboardFulfillmentRibbon orderStatuses={dashboard.orderStatuses} />

          {/* 3. Live Technical Order Book */}
          <DashboardRecentOrders
            recentOrders={dashboard.recentOrders}
            totalOrderCount={dashboard.orderCount}
          />
        </div>

        {/* ── RIGHT STICKY ACTION RADAR & CHANNELS ── */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <DashboardActionRadar
            pendingOrdersCount={pendingOrdersCount}
            outOfStockVariantCount={dashboard.inventory.outOfStockVariantCount}
            productsOutOfStockCount={dashboard.inventory.productsOutOfStockCount}
            lowStockVariantCount={dashboard.inventory.lowStockVariantCount}
            productsWithLowStockCount={dashboard.inventory.productsWithLowStockCount}
            publishedProductCount={dashboard.publishedProductCount}
            categoryCount={dashboard.categoryCount}
            customerCount={dashboard.customerCount}
            orderCount={dashboard.orderCount}
            returnedUnitsCount={dashboard.financials.returnedUnits}
            returnRate={dashboard.financials.returnRate}
            paymentsBreakdown={dashboard.payments ?? []}
            paymentStatuses={dashboard.paymentStatuses ?? []}
            isManagerOrAdmin={isManagerOrAdmin}
          />
        </div>
      </div>
    </div>
  );
}
