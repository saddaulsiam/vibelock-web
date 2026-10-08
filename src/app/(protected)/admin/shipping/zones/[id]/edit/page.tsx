import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShippingZoneForm } from "@/components/admin/shipping-forms";
import { getAdminShippingZone } from "@/lib/admin/shipping-queries";

export default async function EditShippingZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = await getAdminShippingZone(id);
  if (!zone) notFound();
  return <div className="max-w-2xl space-y-6"><Link href="/admin/shipping/zones" className="text-sm font-medium text-primary hover:underline">← Back to zones</Link><Card><CardHeader><CardTitle>Edit shipping zone</CardTitle></CardHeader><CardContent><ShippingZoneForm zone={zone} /></CardContent></Card></div>;
}
