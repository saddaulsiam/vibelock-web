import { Suspense } from "react";
import { DiscountType } from "@prisma/client";
import { AdminCouponsTable } from "@/components/admin/admin-coupons-table";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import prisma from "@/lib/prisma/client";
import {
  getAdminCoupons,
  getAdminCouponsSummaryKPIs,
  type CouponFilter,
} from "@/lib/admin/coupon-queries";
import { Tag, Sparkles, ShoppingBag, Clock } from "lucide-react";

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function filterOf(value: string | undefined): CouponFilter {
  return value === "active" || value === "inactive" || value === "expired" ? value : "all";
}

async function CouponsOverviewCards() {
  const kpis = await getAdminCouponsSummaryKPIs();

  return (
    <AdminKpiGrid columns={4}>
      <AdminKpiCard
        label="Total Coupons"
        value={kpis.totalCoupons.toLocaleString()}
        description={`${kpis.percentageCount} percentage • ${kpis.fixedCount} fixed`}
        icon={Tag}
        tone="neutral"
        alert={true}
      />
      <AdminKpiCard
        label="Active & Live"
        value={kpis.activeCoupons.toLocaleString()}
        description="Available on checkout right now"
        icon={Sparkles}
        tone="emerald"
        alert={true}
      />
      <AdminKpiCard
        label="Total Redemptions"
        value={kpis.totalRedemptions.toLocaleString()}
        description="Orders placed with discount"
        icon={ShoppingBag}
        tone="blue"
        alert={true}
      />
      <AdminKpiCard
        label="Expired / Depleted"
        value={kpis.expiredOrDepleted.toLocaleString()}
        description="Past expiry or reached usage cap"
        icon={Clock}
        tone="amber"
        alert={true}
      />
    </AdminKpiGrid>
  );
}

async function CouponsContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const filter = filterOf(valueOf(searchParams.status));
  const typeValue = valueOf(searchParams.type);
  const type = Object.values(DiscountType).includes(typeValue as DiscountType)
    ? (typeValue as DiscountType)
    : undefined;
  const [{ coupons, total, segmentCounts }, allCategories] = await Promise.all([
    getAdminCoupons({
      search,
      filter,
      type,
      page: 1,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <AdminCouponsTable
      coupons={coupons}
      total={total}
      currentSearch={search}
      currentFilter={filter}
      currentType={type}
      segmentCounts={segmentCounts}
      allCategories={allCategories}
    />
  );
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <AdminPageHeader
        eyebrow="Marketing & Promotions"
        title="Coupons & Discounts"
        badgeLabel="Live Promotions Engine"
        badgeVariant="purple"
        description="Create promotional codes, configure minimum spend limits, track checkout redemptions, and launch 1-click WhatsApp campaigns."
      />

      {/* 2. KPI Summary Overview */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-neutral-200/70 bg-white"
              />
            ))}
          </div>
        }
      >
        <CouponsOverviewCards />
      </Suspense>

      {/* 3. Interactive Data Table */}
      <Suspense
        fallback={
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-xs text-neutral-400 animate-pulse">
            Loading promotional coupons...
          </div>
        }
      >
        <CouponsContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  );
}
