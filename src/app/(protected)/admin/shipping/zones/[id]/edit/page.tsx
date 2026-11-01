import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import { ShippingZoneForm } from "@/components/admin/shipping";
import { getAdminShippingZone } from "@/lib/admin/shipping";

export default async function EditShippingZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const zone = await getAdminShippingZone(id);
  if (!zone) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AdminPageHeader
        eyebrow="Logistics / Configuration"
        title={`Edit ${zone.name}`}
        description="Modify geographical delivery boundary and assigned country codes."
      >
        <Link href="/admin/shipping/zones" className={ADMIN_TABLE_CLASSES.buttonSecondary}>
          <ArrowLeft className="size-3.5" />
          <span>Back to Zones</span>
        </Link>
      </AdminPageHeader>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
        <ShippingZoneForm zone={zone} />
      </div>
    </div>
  );
}
