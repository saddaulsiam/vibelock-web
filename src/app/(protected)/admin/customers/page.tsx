import { AdminCustomersTable } from "@/components/admin/customers/admin-customers-table";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { AdminPageHeader } from "@/components/admin/shared";
import {
  getAdminCustomers,
  getAdminCustomerSummaryKPIs,
  type CustomerSegment,
  type CustomerSortBy,
} from "@/lib/admin/customer-queries";
import { Award, DollarSign, ShoppingBag, Users } from "lucide-react";
import { Suspense } from "react";

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currency(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

async function CustomersOverviewCards() {
  const kpis = await getAdminCustomerSummaryKPIs();

  return (
    <AdminKpiGrid columns={4}>
      <AdminKpiCard
        label="Total Customers"
        value={kpis.totalCustomers.toLocaleString()}
        description="Registered customer profiles"
        icon={Users}
        tone="neutral"
        alert={true}
      />
      <AdminKpiCard
        label="Active Buyers"
        value={kpis.activeBuyers.toLocaleString()}
        description={`${
          kpis.totalCustomers > 0 ? Math.round((kpis.activeBuyers / kpis.totalCustomers) * 100) : 0
        }% placed at least 1 order`}
        icon={ShoppingBag}
        tone="blue"
        alert={true}
      />
      <AdminKpiCard
        label="Repeat / VIP Buyers"
        value={kpis.repeatBuyers.toLocaleString()}
        description={`${kpis.retentionRate}% customer retention rate`}
        icon={Award}
        tone="emerald"
        alert={true}
      />
      <AdminKpiCard
        label="Customer LTV (Paid)"
        value={currency(kpis.totalLtv)}
        description="Authoritative completed revenue"
        icon={DollarSign}
        tone="purple"
        alert={true}
      />
    </AdminKpiGrid>
  );
}

async function CustomersTableContainer({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawSegment = valueOf(searchParams.segment) as CustomerSegment | undefined;
  const segment: CustomerSegment =
    rawSegment === "REPEAT" || rawSegment === "SINGLE" || rawSegment === "LEADS"
      ? rawSegment
      : "ALL";
  const rawSort = valueOf(searchParams.sort) as CustomerSortBy | undefined;
  const sortBy: CustomerSortBy =
    rawSort === "orders" || rawSort === "spent" || rawSort === "oldest" ? rawSort : "newest";

  const { customers, total, totalPages, segmentCounts } = await getAdminCustomers({
    search,
    page,
    segment,
    sortBy,
  });

  return (
    <AdminCustomersTable
      customers={customers}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      currentSearch={search ?? ""}
      currentSegment={segment}
      currentSort={sortBy}
      segmentCounts={segmentCounts}
    />
  );
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      {/* 1. Standard Admin Page Header */}
      <AdminPageHeader
        eyebrow="Customers & CRM"
        title="Customers"
        badgeLabel="CRM Engine"
        badgeVariant="purple"
        description="Track customer relationships, repeat purchase behavior, lifetime value, and courier fraud risk."
      />

      {/* 2. Executive KPI Summary Cards */}
      <Suspense
        fallback={
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-neutral-200 bg-white/50"
              />
            ))}
          </div>
        }
      >
        <CustomersOverviewCards />
      </Suspense>

      {/* 3. Rich Customer Table with Segments, Search, Sorting, and Export */}
      <Suspense
        fallback={
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500 shadow-2xs">
            Loading customers database...
          </div>
        }
      >
        <CustomersTableContainer searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
