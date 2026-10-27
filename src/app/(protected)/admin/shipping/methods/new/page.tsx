import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import { ShippingMethodForm } from "@/components/admin/shipping-forms";
import { getAdminShippingZonesForForm } from "@/lib/admin/shipping-queries";

export default async function NewShippingMethodPage() {
  const zones = await getAdminShippingZonesForForm();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AdminPageHeader
        eyebrow="Logistics / Rates"
        title="Create Shipping Method"
        description="Define a delivery rate and associate it with an active shipping zone."
      >
        <Link
          href="/admin/shipping/methods"
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Methods</span>
        </Link>
      </AdminPageHeader>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
        {zones.length ? (
          <ShippingMethodForm zones={zones} />
        ) : (
          <div className="py-8 text-center text-xs text-neutral-500">
            <p className="font-semibold text-neutral-800">No active shipping zones found</p>
            <p className="mt-1">Please create a shipping zone before adding a delivery rate.</p>
            <Link
              href="/admin/shipping/zones/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white shadow-2xs"
            >
              <Plus className="size-3.5" />
              Create Zone First
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
