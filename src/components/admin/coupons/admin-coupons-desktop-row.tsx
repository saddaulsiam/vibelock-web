"use client";

import * as React from "react";
import { Check, Copy, Edit, Loader2, MessageCircle, Power, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { couponStatus, type AdminCouponListItem } from "@/lib/admin/coupons/coupon-shared";
import type { CouponColumnKey } from "./coupon-table-types";
import { formatCurrency, formatDate, getValidityNote } from "./coupon-table-utils";

export interface AdminCouponsDesktopRowProps {
  coupon: AdminCouponListItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  visibleColumns: Record<CouponColumnKey, boolean>;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  isToggling: boolean;
  onToggleStatus: (coupon: AdminCouponListItem) => void;
  onShareWhatsApp: (coupon: AdminCouponListItem) => void;
  onEdit: (coupon: AdminCouponListItem) => void;
  onDelete: (coupon: AdminCouponListItem) => void;
}

export function AdminCouponsDesktopRow({
  coupon,
  isSelected,
  onToggleSelect,
  visibleColumns,
  copiedCode,
  onCopyCode,
  isToggling,
  onToggleStatus,
  onShareWhatsApp,
  onEdit,
  onDelete,
}: AdminCouponsDesktopRowProps) {
  const status = couponStatus(coupon);
  const validity = getValidityNote(coupon.startDate, coupon.endDate);
  const usagePercent =
    coupon.usageLimit && coupon.usageLimit > 0
      ? Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100))
      : null;

  return (
    <TableRow className={isSelected ? "bg-purple-50/50" : undefined}>
      {/* 0. Row Checkbox */}
      <TableCell className="w-10 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(coupon.id)}
          aria-label={`Select coupon ${coupon.code}`}
          className="size-4 cursor-pointer rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
        />
      </TableCell>

      {/* 1. Code & Copy */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-purple-900 shadow-2xs">
            {coupon.code}
          </span>
          <button
            type="button"
            onClick={() => onCopyCode(coupon.code)}
            title="Copy coupon code"
            className="flex size-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            {copiedCode === coupon.code ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
        <span className="mt-1 block text-[10px] text-neutral-400">
          Created {formatDate(coupon.createdAt)}
        </span>
      </TableCell>

      {/* 2. Discount Benefit */}
      {visibleColumns.benefit && (
        <TableCell>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {coupon.discountType === "PERCENTAGE"
                ? `${coupon.discountValue}% OFF`
                : `${formatCurrency(coupon.discountValue)} OFF`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            {coupon.minOrderValue && Number(coupon.minOrderValue) > 0
              ? `Min spend ${formatCurrency(coupon.minOrderValue)}`
              : "No minimum spend"}
          </div>
          <div className="mt-1">
            {coupon.categories && coupon.categories.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                <span className="size-1 rounded-full bg-purple-500" />
                {coupon.categories[0].name}
                {coupon.categories.length > 1 ? ` +${coupon.categories.length - 1}` : ""}
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400">Storewide</span>
            )}
          </div>
        </TableCell>
      )}

      {/* 3. Usage / Redemptions Meter */}
      {visibleColumns.usage && (
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900">{coupon.usageCount.toLocaleString()}</span>
            <span className="text-neutral-400">
              / {coupon.usageLimit ? coupon.usageLimit.toLocaleString() : "∞"}
            </span>
          </div>

          {usagePercent !== null ? (
            <div className="mt-1.5 w-32">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent >= 100
                      ? "bg-rose-500"
                      : usagePercent >= 80
                        ? "bg-amber-500"
                        : "bg-purple-600"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="mt-0.5 block text-[10px] text-neutral-400">
                {usagePercent}% redeemed
              </span>
            </div>
          ) : (
            <span className="mt-0.5 block text-[10px] text-neutral-400">Unlimited uses</span>
          )}
        </TableCell>
      )}

      {/* 4. Validity Schedule */}
      {visibleColumns.validity && (
        <TableCell>
          <div
            className={`font-semibold ${
              validity.tone === "expired"
                ? "text-rose-600"
                : validity.tone === "warning"
                  ? "font-bold text-amber-600"
                  : "text-neutral-700"
            }`}
          >
            {validity.text}
          </div>
          <span className="mt-0.5 block text-[10px] text-neutral-400">
            {coupon.startDate ? `From ${formatDate(coupon.startDate)}` : "Immediate"}
          </span>
        </TableCell>
      )}

      {/* 5. Status Badge */}
      {visibleColumns.status && (
        <TableCell>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              status === "ACTIVE"
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                : status === "DEPLETED"
                  ? "border border-amber-300 bg-amber-50 text-amber-800"
                  : status === "EXPIRED"
                    ? "border border-rose-300 bg-rose-50 text-rose-800"
                    : "border border-neutral-300 bg-neutral-100 text-neutral-700"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                status === "ACTIVE"
                  ? "animate-pulse bg-emerald-500"
                  : status === "DEPLETED"
                    ? "bg-amber-500"
                    : status === "EXPIRED"
                      ? "bg-rose-500"
                      : "bg-neutral-400"
              }`}
            />
            <span>{status}</span>
          </span>
        </TableCell>
      )}

      {/* 6. Quick Action Hub */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Quick Active Toggle */}
          <button
            type="button"
            onClick={() => onToggleStatus(coupon)}
            disabled={isToggling}
            title={coupon.isActive ? "Pause Coupon" : "Activate Coupon"}
            className={`flex size-8 items-center justify-center rounded-lg border transition ${
              coupon.isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-neutral-200 bg-white text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
            }`}
          >
            {isToggling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Power className="size-3.5" />
            )}
          </button>

          {/* WhatsApp Promo Blast Share */}
          <button
            type="button"
            onClick={() => onShareWhatsApp(coupon)}
            title="Share promotional message on WhatsApp"
            className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
          >
            <MessageCircle className="size-3.5" />
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(coupon)}
            title="Edit coupon settings"
            className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            <Edit className="size-3.5" />
          </button>

          {/* Safe Delete / Deactivate Button */}
          <button
            type="button"
            onClick={() => onDelete(coupon)}
            title={coupon.usageCount > 0 ? "Deactivate Coupon" : "Delete Unused Coupon"}
            className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
