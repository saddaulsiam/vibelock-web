"use client";

import * as React from "react";
import { Plus, Tag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCouponListItem } from "@/lib/admin/coupons/coupon-shared";
import type { CouponColumnKey } from "./coupon-table-types";
import { AdminCouponsDesktopRow } from "./admin-coupons-desktop-row";

export interface AdminCouponsDesktopTableProps {
  couponsList: AdminCouponListItem[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleRow: (id: string) => void;
  visibleColumns: Record<CouponColumnKey, boolean>;
  visibleColumnCount: number;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  togglingId: string | null;
  onToggleStatus: (coupon: AdminCouponListItem) => void;
  onSharePromoWhatsApp: (coupon: AdminCouponListItem) => void;
  onEdit: (coupon: AdminCouponListItem) => void;
  onDelete: (coupon: AdminCouponListItem) => void;
  hasActiveFilters: boolean;
  onCreateCoupon: () => void;
}

export function AdminCouponsDesktopTable({
  couponsList,
  selectedIds,
  isAllSelected,
  onToggleSelectAll,
  onToggleRow,
  visibleColumns,
  visibleColumnCount,
  copiedCode,
  onCopyCode,
  togglingId,
  onToggleStatus,
  onSharePromoWhatsApp,
  onEdit,
  onDelete,
  hasActiveFilters,
  onCreateCoupon,
}: AdminCouponsDesktopTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                aria-label="Select all coupons"
                className="size-4 cursor-pointer rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
              />
            </TableHead>
            <TableHead>Coupon Code</TableHead>
            {visibleColumns.benefit && <TableHead>Discount Benefit</TableHead>}
            {visibleColumns.usage && <TableHead>Usage / Redemptions</TableHead>}
            {visibleColumns.validity && <TableHead>Validity Schedule</TableHead>}
            {visibleColumns.status && <TableHead>Status</TableHead>}
            <TableHead className="text-right">Quick Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {couponsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="py-16 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-4 ring-purple-50">
                  <Tag className="size-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-neutral-900">No coupons found</h4>
                <p className="mt-1 text-xs text-neutral-500">
                  {hasActiveFilters
                    ? "Try adjusting your search terms or filters."
                    : "Create your first promotional discount coupon to boost customer orders."}
                </p>
                <button
                  type="button"
                  onClick={onCreateCoupon}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#101114] px-4 text-xs font-bold text-white shadow-2xs hover:bg-neutral-800"
                >
                  <Plus className="size-3.5" />
                  <span>Create Coupon</span>
                </button>
              </TableCell>
            </TableRow>
          ) : (
            couponsList.map((coupon) => (
              <AdminCouponsDesktopRow
                key={coupon.id}
                coupon={coupon}
                isSelected={selectedIds.has(coupon.id)}
                onToggleSelect={onToggleRow}
                visibleColumns={visibleColumns}
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
        </TableBody>
      </Table>
    </div>
  );
}

