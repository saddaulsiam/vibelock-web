import Link from "next/link";
import { ChevronLeft, Tag } from "lucide-react";
import { CouponForm } from "@/components/admin/coupons/coupon-form";
import { getAdminCouponFormData } from "@/lib/admin/coupon-queries";

export default async function NewCouponPage() {
  const { allCategories } = await getAdminCouponFormData();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900"
        >
          <ChevronLeft className="size-4" />
          <span>Back to Coupons</span>
        </Link>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-200">
            <Tag className="size-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#101114]">Create New Coupon</h1>
            <p className="text-xs text-neutral-500">
              Configure code, discount percentage or fixed amount, category targeting, and
              redemption constraints.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
        <CouponForm categories={allCategories} />
      </div>
    </div>
  );
}
