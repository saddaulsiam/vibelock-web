"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  Sparkles,
  X,
  Loader2,
  Calendar,
  Percent,
  DollarSign,
  AlertCircle,
  Dices,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { DiscountType } from "@prisma/client";
import { saveCouponAction } from "@/lib/admin/coupons/coupon-actions";
import { CategoryMultiSelect } from "@/components/admin/categories";

interface CouponToEditData {
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
}

interface CouponCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: CouponToEditData | null;
  categories?: { id: string; name: string; slug: string }[];
}

function generateRandomCode(): string {
  const prefixes = ["DROP", "VIBE", "DHAKA", "VIP", "FLASH", "STREET", "CHILL"];
  const discounts = ["10", "15", "20", "25", "50", "100", "200"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const discount = discounts[Math.floor(Math.random() * discounts.length)];
  return `${prefix}${discount}`;
}

const toLocalIso = (d: Date | null | undefined) => {
  if (!d) return "";
  const date = new Date(d);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function CouponCreateDialog({
  couponToEdit,
  categories = [],
  onClose,
}: {
  couponToEdit?: CouponToEditData | null;
  categories?: { id: string; name: string; slug: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states with direct initialization (zero useEffect!)
  const [code, setCode] = useState(couponToEdit?.code ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    couponToEdit?.discountType ?? "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState(
    couponToEdit?.discountValue?.toString() ?? "10"
  );
  const [minOrderValue, setMinOrderValue] = useState(couponToEdit?.minOrderValue?.toString() ?? "");
  const [usageLimit, setUsageLimit] = useState(couponToEdit?.usageLimit?.toString() ?? "");
  const [startDate, setStartDate] = useState(toLocalIso(couponToEdit?.startDate));
  const [endDate, setEndDate] = useState(toLocalIso(couponToEdit?.endDate));
  const [isActive, setIsActive] = useState(couponToEdit?.isActive ?? true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    couponToEdit?.categories?.map((c) => c.id) ?? []
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (couponToEdit) {
      formData.set("id", couponToEdit.id);
    }
    formData.set("code", code.trim().toUpperCase());
    formData.set("discountType", discountType);
    formData.set("discountValue", discountValue.trim());
    if (minOrderValue.trim()) formData.set("minOrderValue", minOrderValue.trim());
    if (usageLimit.trim()) formData.set("usageLimit", usageLimit.trim());
    if (isActive) formData.set("isActive", "on");
    if (startDate) formData.set("startDate", startDate);
    if (endDate) formData.set("endDate", endDate);
    selectedCategoryIds.forEach((catId) => {
      formData.append("categoryIds", catId);
    });

    startTransition(async () => {
      const result = await saveCouponAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.message || "Coupon saved successfully.");
        router.refresh();
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    });
  };

  const isEditing = !!couponToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isPending && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-200">
              <Tag className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {isEditing ? "Edit Coupon & Rules" : "Create New Coupon"}
              </h3>
              <p className="text-xs text-neutral-500">
                {isEditing
                  ? `Update settings for coupon code: ${couponToEdit.code}`
                  : "Create a promotional discount code for customer checkout"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Live Coupon Badge Preview */}
        <div className="my-5 rounded-xl border border-purple-200 bg-linear-to-r from-purple-50/70 via-white to-purple-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              <span className="text-xs font-bold tracking-wider text-purple-900 uppercase">
                Live Customer Preview
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isActive
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border border-neutral-200 bg-neutral-100 text-neutral-600"
              }`}
            >
              {isActive ? "Active on Checkout" : "Paused"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-purple-400 bg-white px-3.5 font-mono text-sm font-black tracking-wider text-purple-900">
                {code ? code.toUpperCase() : "YOUR-CODE"}
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
                  ) : minOrderValue && Number(minOrderValue) > 0 ? (
                    `Min order: ৳${Number(minOrderValue).toLocaleString()} (Storewide)`
                  ) : (
                    "Storewide discount applied at checkout"
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-neutral-500">
              <div>
                {usageLimit && Number(usageLimit) > 0
                  ? `Limit: ${usageLimit} redemptions`
                  : "Unlimited redemptions"}
              </div>
              <div className="text-[10px] text-neutral-400">
                {endDate ? `Expires: ${new Date(endDate).toLocaleDateString()}` : "No expiry date"}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Coupon Code */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700">Coupon Code *</label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setCode(generateRandomCode())}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800"
                  >
                    <Dices className="size-3" />
                    <span>Generate</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIP20 or EID15"
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 font-mono text-xs font-bold tracking-wider text-neutral-900 uppercase focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                Letters, numbers, hyphens or underscores (3-50 chars).
              </p>
            </div>

            {/* Discount Type */}
            <div>
              <label className="text-xs font-bold text-neutral-700">Discount Type *</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENTAGE")}
                  className={`flex h-9.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition ${
                    discountType === "PERCENTAGE"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <Percent className="size-3.5" />
                  <span>Percentage (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("FIXED")}
                  className={`flex h-9.5 items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition ${
                    discountType === "FIXED"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <DollarSign className="size-3.5" />
                  <span>Fixed (৳ BDT)</span>
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="text-xs font-bold text-neutral-700">
                Discount Amount * ({discountType === "PERCENTAGE" ? "Percentage %" : "BDT ৳"})
              </label>
              <input
                type="number"
                required
                min="0.01"
                max={discountType === "PERCENTAGE" ? "100" : undefined}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "PERCENTAGE" ? "e.g. 15" : "e.g. 200"}
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            {/* Minimum Order Value */}
            <div>
              <label className="text-xs font-bold text-neutral-700">
                Minimum Order Spend (৳) (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="e.g. 1500 (Leave empty for no minimum)"
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            {/* Usage Limit */}
            <div>
              <label className="text-xs font-bold text-neutral-700">
                Usage Limit (Max Redemptions) (Optional)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="e.g. 100 (Leave empty for unlimited)"
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            {/* Active Status */}
            <div className="flex flex-col justify-center">
              <label className="text-xs font-bold text-neutral-700">Active Status</label>
              <label className="mt-2.5 flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-medium text-neutral-800">
                  Enable coupon immediately on store checkout
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
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <Calendar className="size-3 text-neutral-500" />
                <span>Expiry Date &amp; Time (Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Targeting Section */}
          <div className="space-y-3 rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-neutral-700" />
                <label className="text-xs font-bold text-neutral-800">Category Targeting</label>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Select one or more store categories to target. Leave empty to apply storewide across
                all products.
              </p>
            </div>

            <CategoryMultiSelect
              categories={categories}
              initialSelectedIds={couponToEdit?.categories?.map((c) => c.id) ?? []}
              name="categoryIds"
              placeholder="Select categories (leave empty for storewide discount)..."
              onChange={setSelectedCategoryIds}
            />

            {selectedCategoryIds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-white p-2.5 text-xs text-neutral-600">
                ✨ <strong>Storewide:</strong> Applies to <strong>all products</strong> across the
                entire catalog.
              </div>
            ) : (
              <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5 text-xs text-purple-900">
                🎯 <strong>Targeted:</strong> Applies only to eligible items in the{" "}
                <strong>{selectedCategoryIds.length}</strong> selected categor
                {selectedCategoryIds.length === 1 ? "y" : "ies"}.
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-9.5 rounded-lg border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-5 text-xs font-bold text-white shadow-xs transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Coupon...</span>
                </>
              ) : (
                <span>{isEditing ? "Update Coupon" : "Create Coupon"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CouponCreateModal({
  isOpen,
  onClose,
  couponToEdit,
  categories,
}: CouponCreateModalProps) {
  if (!isOpen) return null;
  return (
    <CouponCreateDialog
      key={couponToEdit?.id ?? "new"}
      couponToEdit={couponToEdit}
      categories={categories}
      onClose={onClose}
    />
  );
}
