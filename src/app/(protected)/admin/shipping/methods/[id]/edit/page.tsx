import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShippingMethodForm } from "@/components/admin/shipping-forms";
import { getAdminShippingMethod, getAdminShippingZonesForForm } from "@/lib/admin/shipping-queries";

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
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/shipping/methods"
        className="text-primary text-sm font-medium hover:underline"
      >
        ← Back to methods
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit shipping method</CardTitle>
        </CardHeader>
        <CardContent>
          <ShippingMethodForm method={method} zones={zones} />
        </CardContent>
      </Card>
    </div>
  );
}
