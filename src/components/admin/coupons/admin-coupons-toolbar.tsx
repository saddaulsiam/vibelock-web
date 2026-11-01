"use client";

import * as React from "react";
import { Download, Plus } from "lucide-react";
import type { DiscountType } from "@prisma/client";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableColumnVisibility,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/shared";
import type { CouponFilter } from "@/lib/admin/coupons/coupon-shared";
import {
  couponColumnOptions,
  type CouponColumnKey,
} from "./coupon-table-types";

export interface AdminCouponsToolbarProps {
  currentFilter: CouponFilter;
  onFilterChange: (filter: CouponFilter) => void;
  segmentCounts?: {
    all: number;
    active: number;
    expired: number;
    inactive: number;
  };
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  currentType?: DiscountType;
  onTypeChange: (type: string) => void;
  visibleColumns: Record<CouponColumnKey, boolean>;
  onColumnChange: (key: CouponColumnKey, value: boolean) => void;
  onColumnReset: () => void;
  onExportCsv: () => void;
  isExportDisabled: boolean;
  onCreateCoupon: () => void;
  currentCount: number;
  totalFiltered: number;
  hasActiveFilters: boolean;
  onResetAllFilters: () => void;
}

export function AdminCouponsToolbar({
  currentFilter,
  onFilterChange,
  segmentCounts = { all: 0, active: 0, expired: 0, inactive: 0 },
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  searchInputRef,
  currentType,
  onTypeChange,
  visibleColumns,
  onColumnChange,
  onColumnReset,
  onExportCsv,
  isExportDisabled,
  onCreateCoupon,
  currentCount,
  totalFiltered,
  hasActiveFilters,
  onResetAllFilters,
}: AdminCouponsToolbarProps) {
  const tabs: AdminTableTabItem<CouponFilter>[] = [
    { key: "all", label: "All Coupons", count: segmentCounts.all },
    {
      key: "active",
      label: "Active & Live",
      count: segmentCounts.active,
      dotColor: "bg-emerald-500",
    },
    {
      key: "expired",
      label: "Expired / Depleted",
      count: segmentCounts.expired,
      dotColor: "bg-rose-500",
    },
    {
      key: "inactive",
      label: "Paused / Inactive",
      count: segmentCounts.inactive,
      dotColor: "bg-neutral-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── 1. Segment Status Filter Tabs ── */}
      <AdminTableTabs
        tabs={tabs}
        activeKey={currentFilter}
        onChange={onFilterChange}
      />

      {/* ── 2. Search & Toolbar Controls ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Form with '/' hotkey */}
          <form onSubmit={onSearchSubmit} className="max-w-md flex-1">
            <AdminTableSearchInput
              value={searchTerm}
              onChange={onSearchChange}
              onClear={onClearSearch}
              placeholder="Search coupon code (press / to focus)..."
              inputRef={searchInputRef}
            />
          </form>

          {/* Discount Type Filter Dropdown */}
          <AdminTableFilterSelect
            value={currentType || "ALL"}
            onChange={onTypeChange}
            options={[
              { value: "ALL", label: "All Discount Types" },
              { value: "PERCENTAGE", label: "Percentage (%)" },
              { value: "FIXED", label: "Fixed Amount (৳)" },
            ]}
            ariaLabel="Filter by discount type"
          />
        </div>

        {/* Right Action Controls: Columns Customizer, Export CSV & Create Coupon */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={couponColumnOptions}
            visibleColumns={visibleColumns}
            onChange={onColumnChange}
            buttonClassName={ADMIN_TABLE_CLASSES.buttonSecondary}
            onReset={onColumnReset}
          />

          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExportDisabled}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export coupons to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onCreateCoupon}
            className={ADMIN_TABLE_CLASSES.buttonPrimary}
          >
            <Plus className="size-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* ── 3. Meta Counter & Active Filter Reset ── */}
      <AdminTableMetaBar
        currentCount={currentCount}
        totalFiltered={totalFiltered}
        itemName="coupon"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetAllFilters}
      />
    </div>
  );
}
