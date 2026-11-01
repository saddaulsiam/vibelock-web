"use client";

import * as React from "react";
import { Check, Copy, Edit, MessageCircle, Power, Trash2 } from "lucide-react";
import { couponStatus, type AdminCouponListItem } from "@/lib/admin/coupons/coupon-shared";
import { formatCurrency, getValidityNote } from "./coupon-table-utils";

export interface AdminCouponsMobileCardProps {
  coupon: AdminCouponListItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  isToggling: boolean;
  onToggleStatus: (coupon: AdminCouponListItem) => void;
  onShareWhatsApp: (coupon: AdminCouponListItem) => void;
  onEdit: (coupon: AdminCouponListItem) => void;
  onDelete: (coupon: AdminCouponListItem) => void;
}

export function AdminCouponsMobileCard({
  coupon,
  isSelected,
  onToggleSelect,
  copiedCode,
  onCopyCode,
  isToggling,
  onToggleStatus,
  onShareWhatsApp,
  onEdit,
  onDelete,
}: AdminCouponsMobileCardProps) {
  const status = couponStatus(coupon);
  const validity = getValidityNote(coupon.startDate, coupon.endDate);

  return (
    <div
      className={`space-y-3 rounded-xl border bg-white p-4 shadow-2xs transition ${
        isSelected
          ? "border-purple-300 bg-purple-50/20 ring-1 ring-purple-300"
          : "border-neutral-200/90"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(coupon.id)}
            aria-label={`Select coupon ${coupon.code}`}
            className="mr-0.5 size-4 cursor-pointer rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-purple-900">
            {coupon.code}
          </span>
          <button
            type="button"
            onClick={() => onCopyCode(coupon.code)}
            className="p-1 text-neutral-400 hover:text-neutral-700"
          >
            {copiedCode === coupon.code ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            status === "ACTIVE"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border border-neutral-200 bg-neutral-100 text-neutral-600"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-neutral-900">
            {coupon.discountType === "PERCENTAGE"
              ? `${coupon.discountValue}% OFF`
              : `${formatCurrency(coupon.discountValue)} OFF`}
          </span>
          <span className="block text-[11px] text-neutral-500">
            {coupon.minOrderValue && Number(coupon.minOrderValue) > 0
              ? `Min ${formatCurrency(coupon.minOrderValue)}`
              : "No minimum"}
          </span>
          <span className="mt-0.5 block">
            {coupon.categories && coupon.categories.length > 0 ? (
              <span className="py-0.2 inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 text-[9px] font-semibold text-purple-700">
                {coupon.categories[0].name}
                {coupon.categories.length > 1 ? ` +${coupon.categories.length - 1}` : ""}
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400">Storewide</span>
            )}
          </span>
        </div>
        <div className="text-right">
          <span className="font-bold text-neutral-900">
            {coupon.usageCount} / {coupon.usageLimit ?? "∞"} used
          </span>
          <span className="block text-[10px] text-neutral-400">{validity.text}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-2.5">
        <button
          type="button"
          onClick={() => onToggleStatus(coupon)}
          disabled={isToggling}
          className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${
            coupon.isActive
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-neutral-200 bg-neutral-100 text-neutral-600"
          }`}
        >
          <Power className="size-3" />
          <span>{coupon.isActive ? "Active" : "Paused"}</span>
        </button>

        <button
          type="button"
          onClick={() => onShareWhatsApp(coupon)}
          className="flex h-8 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700"
        >
          <MessageCircle className="size-3" />
          <span>Share</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(coupon)}
          className="flex h-8 items-center gap-1 rounded-md border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700"
        >
          <Edit className="size-3" />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(coupon)}
          className="flex h-8 items-center justify-center rounded-md border border-neutral-200 px-2 text-neutral-500 hover:text-rose-600"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
