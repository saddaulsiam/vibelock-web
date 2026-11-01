"use client";

import * as React from "react";
import type { AdminCouponListItem } from "@/lib/admin/coupons/coupon-shared";
import { AdminCouponsMobileCard } from "./admin-coupons-mobile-card";

export interface AdminCouponsMobileListProps {
  couponsList: AdminCouponListItem[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  togglingId: string | null;
  onToggleStatus: (coupon: AdminCouponListItem) => void;
  onSharePromoWhatsApp: (coupon: AdminCouponListItem) => void;
  onEdit: (coupon: AdminCouponListItem) => void;
  onDelete: (coupon: AdminCouponListItem) => void;
}

export function AdminCouponsMobileList({
  couponsList,
  selectedIds,
  onToggleRow,
  copiedCode,
  onCopyCode,
  togglingId,
  onToggleStatus,
  onSharePromoWhatsApp,
  onEdit,
  onDelete,
}: AdminCouponsMobileListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {couponsList.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-500">
          No coupons found matching your criteria.
        </div>
      ) : (
        couponsList.map((coupon) => (
          <AdminCouponsMobileCard
            key={coupon.id}
            coupon={coupon}
            isSelected={selectedIds.has(coupon.id)}
            onToggleSelect={onToggleRow}
            copiedCode={copiedCode}
            onCopyCode={onCopyCode}
            isToggling={togglingId === coupon.id}
            onToggleStatus={onToggleStatus}
            onShareWhatsApp={onSharePromoWhatsApp}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
