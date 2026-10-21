import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShippingMethodForm } from "@/components/admin/shipping-forms";
import { getAdminShippingZonesForForm } from "@/lib/admin/shipping-queries";

export default async function NewShippingMethodPage() {
  const zones = await getAdminShippingZonesForForm();
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
          <CardTitle>New shipping method</CardTitle>
        </CardHeader>
        <CardContent>
          {zones.length ? (
            <ShippingMethodForm zones={zones} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Create a shipping zone before adding a method.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
