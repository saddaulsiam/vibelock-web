import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShippingZoneForm } from "@/components/admin/shipping-forms";

export default function NewShippingZonePage() {
  return <div className="max-w-2xl space-y-6"><Link href="/admin/shipping/zones" className="text-sm font-medium text-primary hover:underline">← Back to zones</Link><Card><CardHeader><CardTitle>New shipping zone</CardTitle></CardHeader><CardContent><ShippingZoneForm /></CardContent></Card></div>;
}
