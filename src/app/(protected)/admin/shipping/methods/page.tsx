import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  getAdminShippingMethods,
  getAdminShippingZonesForForm,
} from "@/lib/admin/shipping-queries";
import { ToggleShippingMethodForm } from "@/components/admin/shipping-forms";

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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/shipping" className="text-primary text-sm font-medium hover:underline">
            ← Back to shipping
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Shipping methods</h1>
        </div>
        <Link
          href="/admin/shipping/methods/new"
          className="bg-[#101114] px-4 py-2 text-sm font-semibold text-white"
        >
          New method
        </Link>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Zone
          <select
            name="zoneId"
            defaultValue={query.zoneId ?? ""}
            className="border-input mt-1 h-10 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">All zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            name="active"
            defaultValue={query.active ?? ""}
            className="border-input mt-1 h-10 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <button className="h-10 border bg-[#101114] px-4 text-sm font-semibold text-white">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium">Zone</th>
              <th className="p-3 font-medium">Cost</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {methods.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-10 text-center">
                  No shipping methods found.
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr key={method.id}>
                  <td className="p-3 font-medium">{method.name}</td>
                  <td className="p-3">{method.zone.name}</td>
                  <td className="p-3">৳{Number(method.cost).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={method.isActive ? "outline" : "secondary"}>
                      {method.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/shipping/methods/${method.id}/edit`}
                        className="text-primary font-medium hover:underline"
                      >
                        Edit
                      </Link>
                      <ToggleShippingMethodForm id={method.id} active={method.isActive} />
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
