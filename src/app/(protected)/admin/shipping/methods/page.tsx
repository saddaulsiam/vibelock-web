import Link from "next/link";
import { CheckCircle2, Coins, Edit, MapPin, Plus, RotateCcw, Truck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { ShippingSubNav, ToggleShippingMethodForm } from "@/components/admin/shipping";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import { getAdminShippingMethods, getAdminShippingZonesForForm } from "@/lib/admin/shipping";

function formatCurrency(val: unknown): string {
  const num = typeof val === "number" ? val : Number(val || 0);
  return `৳${Math.round(num).toLocaleString()}`;
}

export default async function ShippingMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ zoneId?: string; active?: string }>;
}) {
  const query = await searchParams;
  const [methods, zones] = await Promise.all([
    getAdminShippingMethods({
      zoneId: query.zoneId,
      active: query.active === undefined ? undefined : query.active === "true",
    }),
    getAdminShippingZonesForForm(),
  ]);

  const hasFilter = Boolean(query.zoneId || query.active !== undefined);
  const activeMethodsCount = methods.filter((m) => m.isActive).length;
  const avgCost = methods.length
    ? Math.round(
        methods.reduce(
          (acc, m) => acc + (typeof m.cost === "number" ? m.cost : Number(m.cost || 0)),
          0
        ) / methods.length
      )
    : 0;
  const distinctZonesCovered = Array.from(new Set(methods.map((m) => m.zone.name)));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Logistics / Rates"
        title="Shipping Rates & Methods"
        badgeLabel="Live Checkout Calculation"
        badgeVariant="emerald"
        description="Configure customer delivery options, flat rates, and carrier pricing for inside and outside delivery zones."
      >
        <Link href="/admin/shipping/methods/new" className={ADMIN_TABLE_CLASSES.buttonPrimary}>
          <Plus className="size-3.5" />
          <span>New Method</span>
        </Link>
      </AdminPageHeader>

      {/* ── Unified Logistics Sub-Navigation ── */}
      <ShippingSubNav activeTab="methods" />

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={3}>
        <AdminKpiCard
          label="Total Shipping Methods"
          value={methods.length.toLocaleString()}
          description={`${activeMethodsCount} active at checkout`}
          icon={Truck}
          tone="neutral"
          alert={true}
        />
        <AdminKpiCard
          label="Active at Checkout"
          value={activeMethodsCount.toLocaleString()}
          description="Live rates selectable by customers"
          icon={CheckCircle2}
          tone="emerald"
          alert={true}
        />
        <AdminKpiCard
          label="Average Delivery Fee"
          value={`৳${avgCost.toLocaleString()}`}
          description={`Covering ${distinctZonesCovered.length} delivery zone(s)`}
          icon={Coins}
          tone="amber"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── Filter Form ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex flex-wrap items-center gap-2.5">
          <select
            name="zoneId"
            defaultValue={query.zoneId ?? ""}
            className={ADMIN_TABLE_CLASSES.select}
            aria-label="Filter by delivery zone"
          >
            <option value="">All Delivery Zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>

          <select
            name="active"
            defaultValue={query.active ?? ""}
            className={ADMIN_TABLE_CLASSES.select}
            aria-label="Filter by active status"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <button type="submit" className={ADMIN_TABLE_CLASSES.buttonSecondary}>
            Filter
          </button>

          {hasFilter && (
            <Link
              href="/admin/shipping/methods"
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              <RotateCcw className="size-3.5" />
              Reset filters
            </Link>
          )}
        </form>

        <div className="text-xs text-neutral-500">
          Showing <span className="font-semibold text-neutral-900">{methods.length}</span> method
          {methods.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* ── Methods Table ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="px-4 py-3.5">Method Name</th>
              <th className="px-4 py-3.5">Assigned Zone</th>
              <th className="px-4 py-3.5">Delivery Cost</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {methods.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Truck className="size-10 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-800">
                      No shipping methods found
                    </p>
                    <p className="max-w-xs text-xs text-neutral-500">
                      {hasFilter
                        ? "No methods match the selected filters. Try resetting filters."
                        : "Create a shipping method like 'Inside Dhaka - 60 BDT' to enable checkout delivery."}
                    </p>
                    <Link
                      href="/admin/shipping/methods/new"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
                    >
                      <Plus className="size-3.5" />
                      Add First Method
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr key={method.id} className={ADMIN_TABLE_CLASSES.tr}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                        <Truck className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">{method.name}</div>
                        <span className="text-[11px] text-neutral-400">Checkout Rate</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-2xs">
                      <MapPin className="size-3 text-neutral-500" />
                      {method.zone.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-neutral-900">
                      {formatCurrency(method.cost)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Flat shipping fee</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        method.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-neutral-200 bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          method.isActive ? "bg-emerald-500" : "bg-neutral-400"
                        }`}
                      />
                      {method.isActive ? "Active at Checkout" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ToggleShippingMethodForm id={method.id} active={method.isActive} />
                      <Link
                        href={`/admin/shipping/methods/${method.id}/edit`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                        title="Edit method rate"
                      >
                        <Edit className="size-3 text-neutral-500" />
                        <span>Edit</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
