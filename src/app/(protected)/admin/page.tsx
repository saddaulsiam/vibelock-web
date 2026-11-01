import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Layers3,
  PackageCheck,
  Percent,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/admin/reports";

function formatBdt(value: { toFixed: (decimalPlaces?: number) => string } | number) {
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(value);
}

const rangePresets = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this-month", label: "Current month" },
] as const;

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
      className="group block rounded-sm focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
    >
      <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none transition-colors group-hover:border-[#101114]/30">
        <CardContent className="flex min-h-32 items-start justify-between gap-4 p-4 sm:p-5">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#101114]">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">{detail}</p>
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
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#101114]">
            {value.toLocaleString("en-BD")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">{detail}</p>
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
          <p className="text-muted-foreground py-2 text-sm">No status data yet.</p>
        ) : (
          <ul className="space-y-3">
            {sortedStatuses.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between gap-3">
                <OrderStatusBadge status={status} />
                <span className="text-sm font-semibold text-[#101114] tabular-nums">
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
  const params = searchParams ? await searchParams : {};
  const rawRange = typeof params.range === "string" ? params.range.trim() : undefined;
  const validKeys = new Set(["today", "yesterday", "7d", "30d", "this-month"]);
  const range = rawRange && validKeys.has(rawRange) ? rawRange : "30d";
  const dashboard = await getAdminDashboardData({ range });

  const activePreset = rangePresets.find((p) => p.key === range) ?? rangePresets[3];
  const reportHref = range === "30d" ? "/admin/reports" : `/admin/reports?range=${range}`;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-7 sm:space-y-9">
      <header className="border-b border-[#101114]/10 pb-5">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
          Operations / Overview
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
          Admin dashboard
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          Current catalog, customer, order, and inventory counts from VibeLock records.
        </p>
      </header>

      <section aria-labelledby="financial-kpis-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3
              id="financial-kpis-heading"
              className="text-lg font-semibold tracking-tight text-[#101114]"
            >
              Executive performance
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {activePreset.label} financial metrics ({dateLabel(dashboard.financials.start)} –{" "}
              {dateLabel(new Date(dashboard.financials.end.getTime() - 1))}).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav
              aria-label="Executive KPI range presets"
              className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            >
              {rangePresets.map((preset) => {
                const isActive = range === preset.key;
                const href = preset.key === "30d" ? "/admin" : `/admin?range=${preset.key}`;
                return (
                  <Link
                    key={preset.key}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center justify-center rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                      isActive
                        ? "border-[#101114] bg-[#101114] text-white shadow-none"
                        : "text-muted-foreground hover:bg-muted border-[#101114]/15 bg-white hover:text-[#101114]"
                    }`}
                  >
                    {preset.label}
                  </Link>
                );
              })}
            </nav>
            <Link
              href={reportHref}
              className="text-muted-foreground text-xs font-medium underline-offset-4 hover:text-[#101114] hover:underline"
            >
              View full report →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <FinancialKpiCard
            label="Net sales"
            value={formatBdt(dashboard.financials.netSales)}
            detail={`${activePreset.label} · After discounts & refunds`}
            icon={CircleDollarSign}
            href={reportHref}
          />
          <FinancialKpiCard
            label="Gross profit"
            value={formatBdt(dashboard.financials.grossProfit)}
            detail={`${activePreset.label} · Net sales minus COGS`}
            icon={TrendingUp}
            href={reportHref}
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
            href={reportHref}
          />
          <FinancialKpiCard
            label="Orders"
            value={dashboard.financials.orders.toLocaleString("en-BD")}
            detail={`Placed in ${activePreset.label.toLowerCase()} (non-cancelled)`}
            icon={ClipboardList}
            href={reportHref}
          />
          <FinancialKpiCard
            label="Retained units"
            value={dashboard.financials.retainedUnits.toLocaleString("en-BD")}
            detail={`${dashboard.financials.soldUnits.toLocaleString("en-BD")} sold, ${dashboard.financials.returnedUnits.toLocaleString("en-BD")} returned`}
            icon={ShoppingBag}
            href={reportHref}
          />
          <FinancialKpiCard
            label="Return rate"
            value={
              dashboard.financials.soldUnits > 0
                ? `${dashboard.financials.returnRate.toFixed(1)}%`
                : "—"
            }
            detail={`${dashboard.financials.returnedUnits.toLocaleString("en-BD")} returned of ${dashboard.financials.soldUnits.toLocaleString("en-BD")} units sold`}
            icon={RotateCcw}
            href={reportHref}
          />
        </div>
      </section>

      <section
        aria-label="Store totals"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
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
            <h3
              id="inventory-heading"
              className="text-lg font-semibold tracking-tight text-[#101114]"
            >
              Inventory attention
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
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
              <CardTitle
                id="recent-orders-heading"
                className="text-base font-semibold text-[#101114]"
              >
                Recent orders
              </CardTitle>
              <span className="text-muted-foreground text-xs">Latest 6</span>
            </div>
          </CardHeader>
          {dashboard.recentOrders.length === 0 ? (
            <CardContent className="px-4 py-12 text-center sm:px-5">
              <ClipboardList
                className="text-muted-foreground mx-auto mb-3 size-7"
                aria-hidden="true"
              />
              <h4 className="text-sm font-semibold text-[#101114]">No orders yet</h4>
              <p className="text-muted-foreground mt-1 text-sm">
                New orders will appear here when they are recorded.
              </p>
            </CardContent>
          ) : (
            <ul className="divide-y divide-[#101114]/10">
              {dashboard.recentOrders.map((order) => (
                <li
                  key={order.orderNumber}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-all text-[#101114]">
                      {order.orderNumber}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Intl.DateTimeFormat("en-BD", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge status={order.paymentStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <span className="text-muted-foreground text-xs sm:hidden">
                      {order._count.items} items
                    </span>
                    <span className="text-sm font-semibold text-[#101114] tabular-nums">
                      {formatBdt(order.total)}
                    </span>
                    <p className="text-muted-foreground mt-1 hidden text-xs sm:block">
                      {order._count.items} {order._count.items === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <p className="text-muted-foreground hidden text-xs md:block">
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
