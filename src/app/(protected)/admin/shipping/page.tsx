import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminShipmentsTable, ShippingSubNav } from "@/components/admin/shipping";
import {
  getAdminShipments,
  getAdminShippingOverviewKPIs,
  type ShipmentFilter,
  type ShipmentProviderFilter,
} from "@/lib/admin/shipping-queries";
import { AlertTriangle, Banknote, CheckCircle2, Truck } from "lucide-react";
import { Suspense } from "react";

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = valueOf(params.q);
  const rawFilter = valueOf(params.filter);
  const filter: ShipmentFilter = ["all", "in_transit", "delivered", "returned", "pending"].includes(
    rawFilter as string
  )
    ? (rawFilter as ShipmentFilter)
    : "all";

  const rawProvider = valueOf(params.provider);
  const provider: ShipmentProviderFilter = ["ALL", "STEADFAST", "MANUAL", "PATHAO"].includes(
    rawProvider as string
  )
    ? (rawProvider as ShipmentProviderFilter)
    : "ALL";

  const [kpis, shipmentsData] = await Promise.all([
    getAdminShippingOverviewKPIs(),
    getAdminShipments({
      search: q,
      filter,
      provider: provider !== "ALL" ? provider : undefined,
      page: 1,
      pageSize: 20,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Logistics & Delivery"
        title="Delivery Logistics"
        badgeLabel="Steadfast Courier Integrated"
        badgeVariant="emerald"
        description="Track live parcel consignments, Steadfast API tracking sync, monitor pending COD collections, and configure delivery zones & rates."
      />

      {/* ── Unified Logistics Sub-Navigation ── */}
      <ShippingSubNav activeTab="shipments" />

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Active In Transit"
          value={kpis.inTransitCount.toLocaleString()}
          description={`${kpis.providerBreakdown.steadfast} Steadfast • ${kpis.providerBreakdown.manual} Manual/In-House`}
          icon={Truck}
          tone="blue"
          alert={true}
          href="/admin/shipping?filter=in_transit"
        />

        <AdminKpiCard
          label="Delivered / Success Rate"
          value={kpis.deliveredCount.toLocaleString()}
          description={`${kpis.successRate}% parcel fulfillment success rate`}
          icon={CheckCircle2}
          tone="emerald"
          alert={true}
          href="/admin/shipping?filter=delivered"
        />

        <AdminKpiCard
          label="RTO & Return Alerts"
          value={kpis.returnedOrFailedCount.toLocaleString()}
          description={
            kpis.returnedOrFailedCount > 0
              ? "Requires parcel inspection & inventory restock"
              : "Zero failed or returned parcels"
          }
          icon={AlertTriangle}
          tone="rose"
          alert={kpis.returnedOrFailedCount > 0}
          href="/admin/shipping?filter=returned"
        />

        <AdminKpiCard
          label="Pending COD Remittance"
          value={`৳${Math.round(kpis.pendingCodAmount).toLocaleString()}`}
          description="Cash on Delivery awaiting courier remittance settlement"
          icon={Banknote}
          tone="amber"
          alert={kpis.pendingCodAmount > 0}
          href="/admin/shipping?filter=in_transit"
        />
      </AdminKpiGrid>

      {/* ── Shipments Table Component with Infinite Scroll ── */}
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-neutral-500">
            Loading delivery logistics...
          </div>
        }
      >
        <AdminShipmentsTable
          initialShipments={shipmentsData.shipments}
          total={shipmentsData.total}
          segmentCounts={shipmentsData.segmentCounts}
          currentSearch={q || ""}
          currentFilter={filter}
          currentProvider={provider}
        />
      </Suspense>
    </div>
  );
}
