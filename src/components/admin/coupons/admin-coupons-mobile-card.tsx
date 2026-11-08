"use client";

import * as React from "react";
import { Check, Copy, Edit, MessageCircle, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onCopyCode(coupon.code)}
            className="size-6 p-0 text-neutral-400 hover:text-neutral-700"
          >
            {copiedCode === coupon.code ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
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
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onToggleStatus(coupon)}
          disabled={isToggling}
          className={`h-8 gap-1 px-2.5 text-xs font-semibold ${
            coupon.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <Power className="size-3" />
          <span>{coupon.isActive ? "Active" : "Paused"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onShareWhatsApp(coupon)}
          className="h-8 gap-1 border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <MessageCircle className="size-3" />
          <span>Share</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onEdit(coupon)}
          className="h-8 gap-1 border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <Edit className="size-3" />
          <span>Edit</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => onDelete(coupon)}
          className="size-8 text-neutral-500 hover:text-rose-600"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
