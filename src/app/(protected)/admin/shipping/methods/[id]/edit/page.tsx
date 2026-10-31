import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import { ShippingMethodForm } from "@/components/admin/shipping";
import {
  getAdminShippingMethod,
  getAdminShippingZonesForForm,
} from "@/lib/admin/shipping-queries";

export default async function EditShippingMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [method, zones] = await Promise.all([
    getAdminShippingMethod(id),
    getAdminShippingZonesForForm(),
  ]);
  if (!method) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AdminPageHeader
        eyebrow="Logistics / Rates"
        title={`Edit ${method.name}`}
        description="Update pricing and assigned zone for this checkout delivery option."
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
        <ShippingMethodForm method={method} zones={zones} />
      </div>
    </div>
  );
}
