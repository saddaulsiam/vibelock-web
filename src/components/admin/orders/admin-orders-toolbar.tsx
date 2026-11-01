"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableColumnVisibility,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/shared";
import {
  DATE_RANGE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  orderColumnOptions,
  type OrderColumnKey,
} from "./order-table-types";

export interface AdminOrdersToolbarProps {
  tabs: AdminTableTabItem<string>[];
  activeStatus: string;
  onStatusTabChange: (statusKey: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  currentFilters: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    salesChannel?: string;
    dateRange?: string;
  };
  onUpdateFilter: (key: string, val: string) => void;
  visibleColumns: Record<OrderColumnKey, boolean>;
  onColumnChange: (key: OrderColumnKey, value: boolean) => void;
  onColumnReset: () => void;
  onExportCsv: () => void;
  isExportDisabled: boolean;
  currentCount: number;
  totalFiltered: number;
  hasActiveFilters: boolean;
  onResetAllFilters: () => void;
}

export function AdminOrdersToolbar({
  tabs,
  activeStatus,
  onStatusTabChange,
  searchTerm,
  onSearchChange,
  onClearSearch,
  searchInputRef,
  currentFilters,
  onUpdateFilter,
  visibleColumns,
  onColumnChange,
  onColumnReset,
  onExportCsv,
  isExportDisabled,
  currentCount,
  totalFiltered,
  hasActiveFilters,
  onResetAllFilters,
}: AdminOrdersToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <AdminTableTabs tabs={tabs} activeKey={activeStatus} onChange={onStatusTabChange} />

      {/* Search and Secondary Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input with '/' hotkey */}
          <AdminTableSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            onClear={onClearSearch}
            placeholder="Search order #, customer, phone..."
            inputRef={searchInputRef}
          />

          {/* Date Range Filter */}
          <AdminTableFilterSelect
            value={currentFilters.dateRange || "ALL"}
            onChange={(val) => onUpdateFilter("dateRange", val)}
            options={DATE_RANGE_OPTIONS}
            ariaLabel="Filter by date range"
          />

          {/* Sales Channel Filter */}
          <AdminTableFilterSelect
            value={currentFilters.salesChannel || "ALL"}
            onChange={(val) => onUpdateFilter("salesChannel", val)}
            options={SALES_CHANNEL_OPTIONS}
            ariaLabel="Filter by sales channel"
          />

          {/* Payment Status Filter */}
          <AdminTableFilterSelect
            value={currentFilters.paymentStatus || "ALL"}
            onChange={(val) => onUpdateFilter("paymentStatus", val)}
            options={PAYMENT_STATUS_OPTIONS}
            ariaLabel="Filter by payment status"
          />

          {/* Payment Method Filter */}
          <AdminTableFilterSelect
            value={currentFilters.paymentMethod || "ALL"}
            onChange={(val) => onUpdateFilter("paymentMethod", val)}
            options={PAYMENT_METHOD_OPTIONS}
            ariaLabel="Filter by payment method"
          />
        </div>

        {/* Column Visibility & CSV Export Controls */}
        <div className="flex items-center gap-2">
          <AdminTableColumnVisibility
            columns={orderColumnOptions}
            visibleColumns={visibleColumns}
            onChange={onColumnChange}
            onReset={onColumnReset}
          />

          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExportDisabled}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export orders to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={currentCount}
        totalFiltered={totalFiltered}
        itemName="order"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetAllFilters}
      />
    </div>
  );
}
