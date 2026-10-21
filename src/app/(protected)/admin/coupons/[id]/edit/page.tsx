import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponForm } from "@/components/admin/coupon-form";
import { getAdminCouponById } from "@/lib/admin/coupon-queries";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await getAdminCouponById(id);
  if (!coupon) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/coupons" className="text-primary text-sm font-medium hover:underline">
          ← Back to coupons
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Edit coupon</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{coupon.code}</CardTitle>
          <CardDescription>Historical order totals are never changed by edits.</CardDescription>
        </CardHeader>
        <CardContent>
          <CouponForm coupon={coupon} />
        </CardContent>
      </Card>
    </div>
  );
}
