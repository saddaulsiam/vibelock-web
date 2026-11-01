"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  X,
  Loader2,
  PauseCircle,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { deleteCouponAction, toggleCouponStatusAction } from "@/lib/admin/coupons/coupon-actions";
import type { AdminCouponListItem } from "@/lib/admin/coupons/coupon-shared";

interface CouponDeleteModalProps {
  coupon: AdminCouponListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function CouponDeleteDialog({
  coupon,
  onClose,
}: {
  coupon: AdminCouponListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasUsage = coupon.usageCount > 0;

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteCouponAction(coupon.id);
      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setError(res.error || "Failed to delete coupon.");
      }
    });
  };

  const handleDeactivate = () => {
    setError(null);
    startTransition(async () => {
      const res = await toggleCouponStatusAction(coupon.id);
      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setError(res.error || "Failed to pause coupon.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isPending && onClose()}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${
                hasUsage
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                  : "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
              }`}
            >
              {hasUsage ? <ShieldCheck className="size-5" /> : <AlertTriangle className="size-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {hasUsage ? "Audit Protected Coupon" : "Delete Coupon"}
              </h3>
              <p className="font-mono text-xs font-bold text-neutral-600">{coupon.code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="my-4 text-xs leading-relaxed text-neutral-600">
          {hasUsage ? (
            <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900">
              <p className="font-semibold">
                This coupon has already been redeemed{" "}
                <span className="font-bold underline">{coupon.usageCount} time(s)</span>.
              </p>
              <p className="text-[11px] text-amber-800">
                To maintain historical accounting and order calculation integrity, coupons with usage
                history cannot be permanently deleted.
              </p>
              <p className="text-[11px] text-amber-800">
                Instead, you can <strong>pause or deactivate</strong> this coupon so that customers can
                no longer apply it on checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p>
                Are you sure you want to permanently delete coupon{" "}
                <span className="font-mono font-bold text-neutral-900">{coupon.code}</span>?
              </p>
              <p className="text-neutral-500">
                This coupon has <strong>0 redemptions</strong> and this action cannot be undone.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            Cancel
          </button>

          {hasUsage ? (
            coupon.isActive ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-500 px-4 text-xs font-bold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PauseCircle className="size-3.5" />
                )}
                <span>Deactivate Coupon</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg bg-neutral-900 px-4 text-xs font-semibold text-white"
              >
                Already Paused (Keep)
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Delete Permanently</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CouponDeleteModal({ coupon, isOpen, onClose }: CouponDeleteModalProps) {
  if (!isOpen || !coupon) return null;
  return <CouponDeleteDialog key={coupon.id} coupon={coupon} onClose={onClose} />;
}
