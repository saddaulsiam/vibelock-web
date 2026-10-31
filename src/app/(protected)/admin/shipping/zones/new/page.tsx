import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import { ShippingZoneForm } from "@/components/admin/shipping";

export default function NewShippingZonePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AdminPageHeader
        eyebrow="Logistics / Configuration"
        title="Create Shipping Zone"
        description="Add a new geographical delivery boundary to assign regional shipping rates."
      >
        <Link
          href="/admin/shipping/zones"
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Zones</span>
        </Link>
      </AdminPageHeader>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
        <ShippingZoneForm />
      </div>
    </div>
  );
}
