"use client";

import { useActionState } from "react";
import type { DiscountType } from "@prisma/client";
import { saveCouponAction, type CouponActionState } from "@/lib/admin/coupon-actions";

const initialState: CouponActionState = { error: null };

export function CouponForm({
  coupon,
}: {
  coupon?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: unknown;
    minOrderValue: unknown;
    usageLimit: number | null;
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
  };
}) {
  const [state, formAction] = useActionState(saveCouponAction, initialState);
  const input = "mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";
  const dateValue = (value: Date | null | undefined) => value ? new Date(value).toISOString().slice(0, 16) : "";
  return (
    <form action={formAction} className="space-y-5">
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium">Code<input name="code" required defaultValue={coupon?.code} className={input} placeholder="WELCOME10" /></label>
        <label className="text-sm font-medium">Discount type<select name="discountType" defaultValue={coupon?.discountType ?? "PERCENTAGE"} className={input}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
        <label className="text-sm font-medium">Discount value<input name="discountValue" required type="number" min="0.01" step="0.01" defaultValue={coupon?.discountValue?.toString()} className={input} /></label>
        <label className="text-sm font-medium">Minimum order value<input name="minOrderValue" type="number" min="0" step="0.01" defaultValue={coupon?.minOrderValue?.toString() ?? ""} className={input} /></label>
        <label className="text-sm font-medium">Usage limit<input name="usageLimit" type="number" min={coupon?.usageLimit ?? 1} step="1" defaultValue={coupon?.usageLimit ?? ""} className={input} /></label>
        <label className="text-sm font-medium">Start date<input name="startDate" type="datetime-local" defaultValue={dateValue(coupon?.startDate)} className={input} /></label>
        <label className="text-sm font-medium">End date<input name="endDate" type="datetime-local" defaultValue={dateValue(coupon?.endDate)} className={input} /></label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input name="isActive" type="checkbox" value="on" defaultChecked={coupon?.isActive ?? true} /> Active</label>
      </div>
      {coupon ? <p className="text-xs text-muted-foreground">Used {coupon.usageLimit === null ? "unlimited" : `up to ${coupon.usageLimit}`} times. Existing order totals are unchanged.</p> : null}
      {state.error ? <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      {state.message ? <p role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.message}</p> : null}
      <button type="submit" className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white">Save coupon</button>
    </form>
  );
}
