import Link from "next/link";
import { Edit, Globe, MapPin, Plus, RotateCcw, Truck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { ShippingSubNav } from "@/components/admin/shipping";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import { getAdminShippingZones } from "@/lib/admin/shipping";

export default async function ShippingZonesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const zones = await getAdminShippingZones(q);

  const totalAssignedRates = zones.reduce((acc, z) => acc + (z._count?.methods || 0), 0);
  const distinctCountries = Array.from(new Set(zones.flatMap((z) => z.countries)));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Logistics / Configuration"
        title="Delivery Zones"
        badgeLabel="Regional Coverage"
        badgeVariant="blue"
        description="Define geographical delivery boundaries and group countries or regional divisions for localized shipping rates."
      >
        <Link href="/admin/shipping/zones/new" className={ADMIN_TABLE_CLASSES.buttonPrimary}>
          <Plus className="size-3.5" />
          <span>New Zone</span>
        </Link>
      </AdminPageHeader>

      {/* ── Unified Logistics Sub-Navigation ── */}
      <ShippingSubNav activeTab="zones" />

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={3}>
        <AdminKpiCard
          label="Total Delivery Zones"
          value={zones.length.toLocaleString()}
          description="Active regional shipping boundaries"
          icon={MapPin}
          tone="blue"
          alert={true}
        />
        <AdminKpiCard
          label="Assigned Shipping Rates"
          value={totalAssignedRates.toLocaleString()}
          description="Pricing rates linked across all zones"
          icon={Truck}
          tone="emerald"
          alert={true}
          href="/admin/shipping/methods"
        />
        <AdminKpiCard
          label="Country Coverage"
          value={distinctCountries.length.toLocaleString()}
          description={distinctCountries.join(", ") || "No countries configured"}
          icon={Globe}
          tone="neutral"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex w-full max-w-md items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search zone name..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-xs text-[#101114] transition-colors outline-none placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            />
          </div>
          <button type="submit" className={ADMIN_TABLE_CLASSES.buttonSecondary}>
            Search
          </button>
          {q && (
            <Link
              href="/admin/shipping/zones"
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              <RotateCcw className="size-3.5" />
              Clear
            </Link>
          )}
        </form>

        <div className="text-xs text-neutral-500">
          Showing <span className="font-semibold text-neutral-900">{zones.length}</span> zone
          {zones.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* ── Zones Table ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="px-4 py-3.5">Zone Name</th>
              <th className="px-4 py-3.5">Country / Regions</th>
              <th className="px-4 py-3.5">Assigned Rates</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {zones.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <MapPin className="size-10 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-800">
                      No shipping zones found
                    </p>
                    <p className="max-w-xs text-xs text-neutral-500">
                      {q
                        ? `No zones matched "${q}". Try clearing search.`
                        : "Create your first delivery zone to assign shipping methods."}
                    </p>
                    <Link
                      href="/admin/shipping/zones/new"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
                    >
                      <Plus className="size-3.5" />
                      Add First Zone
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id} className={ADMIN_TABLE_CLASSES.tr}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                        <MapPin className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">{zone.name}</div>
                        <span className="text-[11px] text-neutral-400">
                          Regional Delivery Boundary
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {zone.countries.map((country) => (
                        <span
                          key={country}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200/90 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700 shadow-2xs"
                        >
                          <Globe className="size-2.5 text-neutral-400" />
                          {country}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/shipping/methods?zoneId=${zone.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                    >
                      <span>
                        {zone._count.methods} method{zone._count.methods === 1 ? "" : "s"}
                      </span>
                      <span className="text-neutral-400">&rarr;</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/shipping/zones/${zone.id}/edit`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                      title="Edit shipping zone"
                    >
                      <Edit className="size-3 text-neutral-500" />
                      <span>Edit</span>
                    </Link>
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
