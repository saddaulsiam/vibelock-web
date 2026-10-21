import Link from "next/link";
import { Input } from "@/components/ui/input";
import { getAdminShippingZones } from "@/lib/admin/shipping-queries";

export default async function ShippingZonesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const zones = await getAdminShippingZones(q);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/shipping" className="text-primary text-sm font-medium hover:underline">
            ← Back to shipping
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Shipping zones</h1>
        </div>
        <Link
          href="/admin/shipping/zones/new"
          className="bg-[#101114] px-4 py-2 text-sm font-semibold text-white"
        >
          New zone
        </Link>
      </div>
      <form method="get" className="flex gap-3">
        <Input name="q" defaultValue={q} placeholder="Search zone name..." className="max-w-sm" />
        <button className="border bg-[#101114] px-4 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">Zone</th>
              <th className="p-3 font-medium">Countries</th>
              <th className="p-3 font-medium">Methods</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {zones.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground p-10 text-center">
                  No shipping zones found.
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="p-3 font-medium">{zone.name}</td>
                  <td className="p-3">{zone.countries.join(", ")}</td>
                  <td className="p-3">{zone._count.methods}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/shipping/zones/${zone.id}/edit`}
                      className="text-primary font-medium hover:underline"
                    >
                      Edit
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
