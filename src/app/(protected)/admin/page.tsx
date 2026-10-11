import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Layers3,
  PackageCheck,
  Percent,
  ShoppingBag,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/admin/dashboard-queries";

function formatBdt(value: { toFixed: (decimalPlaces?: number) => string } | number) {
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function FinancialKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  href = "/admin/reports",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Boxes;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
    >
      <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none transition-colors group-hover:border-[#101114]/30">
        <CardContent className="flex min-h-32 items-start justify-between gap-4 p-4 sm:p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#101114]">{value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center bg-[#F3F0E8] text-[#101114] transition-colors group-hover:bg-[#101114] group-hover:text-white">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Boxes;
}) {
  return (
    <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none">
      <CardContent className="flex min-h-32 items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#101114]">{value.toLocaleString("en-BD")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center bg-[#F3F0E8] text-[#101114]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function StatusSummary({
  title,
  statuses,
}: {
  title: string;
  statuses: { status: string; count: number }[];
}) {
  const sortedStatuses = [...statuses].sort((left, right) => right.count - left.count);

  return (
    <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none">
      <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
        <CardTitle className="text-base font-semibold text-[#101114]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {sortedStatuses.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No status data yet.</p>
        ) : (
          <ul className="space-y-3">
            {sortedStatuses.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between gap-3">
                <OrderStatusBadge status={status} />
                <span className="text-sm font-semibold tabular-nums text-[#101114]">
                  {count.toLocaleString("en-BD")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const dashboard = await getAdminDashboardData();

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-7 sm:space-y-9">
      <header className="border-b border-[#101114]/10 pb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Operations / Overview
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">Admin dashboard</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Current catalog, customer, order, and inventory counts from VibeLock records.
        </p>
      </header>

      <section aria-labelledby="financial-kpis-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 id="financial-kpis-heading" className="text-lg font-semibold tracking-tight text-[#101114]">
              Executive performance
            </h3>
            <p className="text-sm text-muted-foreground">
              Last 30 days financial metrics from audited store records.
            </p>
          </div>
          <Link
            href="/admin/reports"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-[#101114] hover:underline"
          >
            View full report →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
          <FinancialKpiCard
            label="Net merchandise sales"
            value={formatBdt(dashboard.financials.netSales)}
            detail="Last 30 days · After discounts & refunds"
            icon={CircleDollarSign}
          />
          <FinancialKpiCard
            label="Gross profit"
            value={formatBdt(dashboard.financials.grossProfit)}
            detail="Last 30 days · Net sales minus retained COGS"
            icon={TrendingUp}
          />
          <FinancialKpiCard
            label="Gross margin"
            value={
              dashboard.financials.grossMargin !== null
                ? `${dashboard.financials.grossMargin.toFixed(1)}%`
                : "—"
            }
            detail="Profit percentage on net sales"
            icon={Percent}
          />
          <FinancialKpiCard
            label="Retained units sold"
            value={dashboard.financials.retainedUnits.toLocaleString("en-BD")}
            detail={`${dashboard.financials.soldUnits.toLocaleString("en-BD")} sold, ${dashboard.financials.returnedUnits.toLocaleString("en-BD")} returned`}
            icon={ShoppingBag}
          />
        </div>
      </section>

      <section aria-label="Store totals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <MetricCard
          label="Published products"
          value={dashboard.publishedProductCount}
          detail="Available in the customer catalog"
          icon={Boxes}
        />
        <MetricCard
          label="Categories"
          value={dashboard.categoryCount}
          detail="All catalog categories"
          icon={Layers3}
        />
        <MetricCard
          label="Customers"
          value={dashboard.customerCount}
          detail="Accounts with the customer role"
          icon={Users}
        />
        <MetricCard
          label="Orders"
          value={dashboard.orderCount}
          detail="All recorded orders"
          icon={ClipboardList}
        />
      </section>

      <section aria-labelledby="inventory-heading">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="inventory-heading" className="text-lg font-semibold tracking-tight text-[#101114]">Inventory attention</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Published variants by available quantity. Low stock means five or fewer units.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <MetricCard
            label="Low-stock variants"
            value={dashboard.inventory.lowStockVariantCount}
            detail={`${dashboard.inventory.productsWithLowStockCount.toLocaleString("en-BD")} products affected`}
            icon={Warehouse}
          />
          <MetricCard
            label="Out-of-stock variants"
            value={dashboard.inventory.outOfStockVariantCount}
            detail={`${dashboard.inventory.productsOutOfStockCount.toLocaleString("en-BD")} products affected`}
            icon={PackageCheck}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <StatusSummary title="Order status" statuses={dashboard.orderStatuses} />
        <StatusSummary title="Payment status" statuses={dashboard.paymentStatuses} />
      </section>

      <section aria-labelledby="recent-orders-heading">
        <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle id="recent-orders-heading" className="text-base font-semibold text-[#101114]">
                Recent orders
              </CardTitle>
              <span className="text-xs text-muted-foreground">Latest 6</span>
            </div>
          </CardHeader>
          {dashboard.recentOrders.length === 0 ? (
            <CardContent className="px-4 py-12 text-center sm:px-5">
              <ClipboardList className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-[#101114]">No orders yet</h4>
              <p className="mt-1 text-sm text-muted-foreground">New orders will appear here when they are recorded.</p>
            </CardContent>
          ) : (
            <ul className="divide-y divide-[#101114]/10">
              {dashboard.recentOrders.map((order) => (
                <li key={order.orderNumber} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-[#101114]">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge status={order.paymentStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <span className="text-xs text-muted-foreground sm:hidden">{order._count.items} items</span>
                    <span className="text-sm font-semibold tabular-nums text-[#101114]">{formatBdt(order.total)}</span>
                    <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                      {order._count.items} {order._count.items === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <p className="hidden text-xs text-muted-foreground md:block">
                    {order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
