"use client";

import { useActionState, useState } from "react";
import type { DiscountType } from "@prisma/client";
import { saveCouponAction, type CouponActionState } from "@/lib/admin/coupon-actions";
import { CategoryMultiSelect } from "@/components/admin/categories";
import {
  Tag,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Dices,
  Calendar,
  Layers,
} from "lucide-react";

const initialState: CouponActionState = { error: null };

function generateRandomCode(): string {
  const prefixes = ["DROP", "VIBE", "DHAKA", "VIP", "FLASH", "STREET"];
  const discounts = ["10", "15", "20", "25", "50", "100", "200"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const discount = discounts[Math.floor(Math.random() * discounts.length)];
  return `${prefix}${discount}`;
}

export function CouponForm({
  coupon,
  categories = [],
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
    categories?: { id: string; name: string; slug: string }[];
  };
  categories?: { id: string; name: string; slug: string }[];
}) {
  const [state, formAction] = useActionState(saveCouponAction, initialState);
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    coupon?.discountType ?? "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState(coupon?.discountValue?.toString() || "10");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    coupon?.categories?.map((c) => c.id) ?? []
  );

  const inputClass =
    "mt-1.5 flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition hover:border-neutral-300 focus:border-[#101114] focus:ring-1 focus:ring-[#101114]";

  const dateValue = (value: Date | null | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  return (
    <form action={formAction} className="space-y-6">
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

      {/* Live Preview Card */}
      <div className="rounded-xl border border-purple-200 bg-linear-to-r from-purple-50/70 via-white to-purple-50/40 p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-purple-600" />
          <span className="text-xs font-bold tracking-wider text-purple-900 uppercase">
            Live Preview
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-purple-400 bg-white px-3.5 font-mono text-sm font-black tracking-wider text-purple-900">
            {code ? code.toUpperCase() : "PROMO-CODE"}
          </div>
          <div>
            <div className="text-sm font-black text-neutral-900">
              {discountType === "PERCENTAGE"
                ? `${discountValue || 0}% OFF`
                : `৳${discountValue || 0} OFF`}
            </div>
            <div className="text-[11px] text-neutral-500">
              {selectedCategoryIds.length > 0 ? (
                <span className="font-semibold text-purple-700">
                  🎯 Valid only for:{" "}
                  {categories
                    .filter((c) => selectedCategoryIds.includes(c.id))
                    .map((c) => c.name)
                    .join(", ")}
                </span>
              ) : (
                "Discount applied storewide at checkout"
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Code */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700">Coupon Code *</label>
            {!coupon && (
              <button
                type="button"
                onClick={() => setCode(generateRandomCode())}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800"
              >
                <Dices className="size-3" />
                <span>Random</span>
              </button>
            )}
          </div>
          <input
            name="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${inputClass} font-mono font-bold tracking-wider uppercase`}
            placeholder="e.g. VIP20 or SUMMER15"
          />
        </div>

        {/* Discount Type */}
        <div>
          <label className="text-xs font-bold text-neutral-700">Discount Type *</label>
          <select
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className={`${inputClass} font-semibold`}
          >
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Amount (৳)</option>
          </select>
        </div>

        {/* Discount Value */}
        <div>
          <label className="text-xs font-bold text-neutral-700">
            Discount Value * ({discountType === "PERCENTAGE" ? "%" : "৳"})
          </label>
          <input
            name="discountValue"
            required
            type="number"
            min="0.01"
            max={discountType === "PERCENTAGE" ? "100" : undefined}
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Min Order Value */}
        <div>
          <label className="text-xs font-bold text-neutral-700">
            Minimum Order Value (৳) (Optional)
          </label>
          <input
            name="minOrderValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue={coupon?.minOrderValue?.toString() ?? ""}
            placeholder="e.g. 1500 (No minimum if empty)"
            className={inputClass}
          />
        </div>

        {/* Usage Limit */}
        <div>
          <label className="text-xs font-bold text-neutral-700">
            Usage Limit (Max Redemptions) (Optional)
          </label>
          <input
            name="usageLimit"
            type="number"
            min={coupon?.usageLimit ?? 1}
            step="1"
            defaultValue={coupon?.usageLimit ?? ""}
            placeholder="e.g. 50 (Unlimited if empty)"
            className={inputClass}
          />
        </div>

        {/* Active Toggle */}
        <div className="flex flex-col justify-center">
          <label className="text-xs font-bold text-neutral-700">Status</label>
          <label className="mt-2.5 flex cursor-pointer items-center gap-2">
            <input
              name="isActive"
              type="checkbox"
              value="on"
              defaultChecked={coupon?.isActive ?? true}
              className="size-4 rounded border-neutral-300 text-[#101114] focus:ring-[#101114]"
            />
            <span className="text-xs font-medium text-neutral-800">
              Active and usable on checkout
            </span>
          </label>
        </div>

        {/* Start Date */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
            <Calendar className="size-3 text-neutral-500" />
            <span>Start Date &amp; Time (Optional)</span>
          </label>
          <input
            name="startDate"
            type="datetime-local"
            defaultValue={dateValue(coupon?.startDate)}
            className={inputClass}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
            <Calendar className="size-3 text-neutral-500" />
            <span>Expiry Date &amp; Time (Optional)</span>
          </label>
          <input
            name="endDate"
            type="datetime-local"
            defaultValue={dateValue(coupon?.endDate)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Category Targeting / Eligibility */}
      <div className="space-y-3.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-neutral-700" />
            <label className="text-xs font-bold text-neutral-800">
              Target Categories
            </label>
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Select one or more store categories to target. Leave empty to apply this coupon storewide across all products.
          </p>
        </div>

        <CategoryMultiSelect
          categories={categories}
          initialSelectedIds={coupon?.categories?.map((c) => c.id) ?? []}
          name="categoryIds"
          placeholder="Select categories (leave empty for storewide discount)..."
          onChange={setSelectedCategoryIds}
        />

        {selectedCategoryIds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-3 text-xs text-neutral-600">
            ✨ <strong>Storewide:</strong> This coupon applies to <strong>all products</strong> across the entire catalog during checkout.
          </div>
        ) : (
          <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900">
            🎯 <strong>Targeted:</strong> Applies only to eligible items in the{" "}
            <strong>{selectedCategoryIds.length}</strong> selected categor
            {selectedCategoryIds.length === 1 ? "y" : "ies"}.
          </div>
        )}
      </div>

      {coupon ? (
        <p className="text-xs text-neutral-500">
          Redeemed{" "}
          {coupon.usageLimit === null ? "unlimited times" : `${coupon.usageLimit} times max`}.
          Historical orders are protected and remain unmodified.
        </p>
      ) : null}

      {state.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.message ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-3">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#101114] px-5 text-xs font-bold text-white shadow-2xs transition hover:bg-neutral-800"
        >
          <Tag className="size-3.5" />
          <span>{coupon ? "Update Coupon" : "Save Coupon"}</span>
        </button>
      </div>
    </form>
  );
}
