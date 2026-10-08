import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return <div className="max-w-3xl space-y-6"><div><Link href="/admin/coupons" className="text-sm font-medium text-primary hover:underline">← Back to coupons</Link><h1 className="mt-3 text-3xl font-bold tracking-tight">New coupon</h1></div><Card><CardHeader><CardTitle>Coupon details</CardTitle><CardDescription>Only fields supported by the current coupon model are configurable.</CardDescription></CardHeader><CardContent><CouponForm /></CardContent></Card></div>;
}
