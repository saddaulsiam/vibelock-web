"use client";

import * as React from "react";
import { Package, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import type { AdminOrderItem } from "@/lib/admin/orders/order-queries";
import { AdminOrdersMobileCard } from "./admin-orders-mobile-card";

export interface AdminOrdersMobileListProps {
  loadedOrders: AdminOrderItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  updatingOrderId: string | null;
  onQuickStatus: (orderId: string, nextStatus: OrderStatus) => void;
  hasActiveFilters: boolean;
  onResetAllFilters: () => void;
}

export function AdminOrdersMobileList({
  loadedOrders,
  selectedIds,
  onToggleSelect,
  updatingOrderId,
  onQuickStatus,
  hasActiveFilters,
  onResetAllFilters,
}: AdminOrdersMobileListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {loadedOrders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200/90 bg-white p-8 text-center text-neutral-500 shadow-2xs">
          <Package className="mx-auto mb-2 size-8 text-neutral-400" />
          <p className="font-semibold text-neutral-700">No orders found</p>
          <p className="mt-1 text-xs text-neutral-500">
            Try adjusting your search query or filter options.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetAllFilters}
              className="mt-3.5 gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset All Filters</span>
            </Button>
          )}
        </div>
      ) : (
        loadedOrders.map((order) => (
          <AdminOrdersMobileCard
            key={order.id}
            order={order}
            isSelected={selectedIds.has(order.id)}
            onToggleSelect={onToggleSelect}
            updatingOrderId={updatingOrderId}
            onQuickStatus={onQuickStatus}
          />
        ))
      )}
    </div>
  );
}
