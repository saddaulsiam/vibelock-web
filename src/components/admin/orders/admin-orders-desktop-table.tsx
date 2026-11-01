"use client";

import * as React from "react";
import { Package, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminOrderItem } from "@/lib/admin/orders/order-queries";
import type { OrderColumnKey } from "./order-table-types";
import { AdminOrdersDesktopRow } from "./admin-orders-desktop-row";

export interface AdminOrdersDesktopTableProps {
  loadedOrders: AdminOrderItem[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  visibleColumns: Record<OrderColumnKey, boolean>;
  visibleColumnCount: number;
  copiedTracking: string | null;
  onCopyTracking: (tracking: string) => void;
  updatingOrderId: string | null;
  onQuickStatus: (orderId: string, nextStatus: OrderStatus) => void;
  hasActiveFilters: boolean;
  onResetAllFilters: () => void;
}

export function AdminOrdersDesktopTable({
  loadedOrders,
  selectedIds,
  isAllSelected,
  onToggleSelectAll,
  onToggleSelect,
  visibleColumns,
  visibleColumnCount,
  copiedTracking,
  onCopyTracking,
  updatingOrderId,
  onQuickStatus,
  hasActiveFilters,
  onResetAllFilters,
}: AdminOrdersDesktopTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-4 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                aria-label="Select all orders"
                className="size-3.5 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
              />
            </TableHead>
            {visibleColumns.date && (
              <TableHead className="min-w-[130px]">Order # &amp; Date</TableHead>
            )}
            {visibleColumns.customer && (
              <TableHead className="min-w-[180px]">Customer &amp; Contact</TableHead>
            )}
            {visibleColumns.items && (
              <TableHead className="text-center whitespace-nowrap">Items</TableHead>
            )}
            {visibleColumns.total && (
              <TableHead className="text-right whitespace-nowrap">Total Amount</TableHead>
            )}
            {visibleColumns.payment && (
              <TableHead className="whitespace-nowrap">Payment</TableHead>
            )}
            {visibleColumns.shipment && (
              <TableHead className="min-w-[140px]">Courier &amp; Tracking</TableHead>
            )}
            {visibleColumns.status && (
              <TableHead className="text-center whitespace-nowrap">Order Status</TableHead>
            )}
            <TableHead className="min-w-[110px] text-right whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadedOrders.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                className="p-12 text-center text-neutral-500"
              >
                <Package className="mx-auto mb-2 size-8 text-neutral-400" />
                <p className="font-semibold text-neutral-700">No orders found</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Try adjusting your search query or filter options.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetAllFilters}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs transition hover:bg-neutral-50"
                  >
                    <RotateCcw className="size-3.5 text-neutral-500" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            loadedOrders.map((order) => (
              <AdminOrdersDesktopRow
                key={order.id}
                order={order}
                isSelected={selectedIds.has(order.id)}
                onToggleSelect={onToggleSelect}
                visibleColumns={visibleColumns}
                copiedTracking={copiedTracking}
                onCopyTracking={onCopyTracking}
                updatingOrderId={updatingOrderId}
                onQuickStatus={onQuickStatus}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

