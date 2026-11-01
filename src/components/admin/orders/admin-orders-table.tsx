"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import type { OrderStatus, PaymentMethod, PaymentStatus, SalesChannel } from "@prisma/client";
import {
  AdminTableInfiniteScroll,
  useAdminTableColumns,
  type AdminTableTabItem,
} from "@/components/admin/shared";
import {
  bulkUpdateOrderStatusAction,
  loadMoreAdminOrdersAction,
  quickUpdateOrderStatusAction,
} from "@/lib/admin/orders/order-actions";
import type {
  AdminOrderDateRange,
  AdminOrderItem,
  AdminOrdersResult,
} from "@/lib/admin/orders/order-queries";
import { exportToCsv } from "@/lib/admin/shared";
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "@/components/admin/orders/admin-order-badges";
import { orderColumnOptions } from "./order-table-types";
import { AdminOrdersToolbar } from "./admin-orders-toolbar";
import { AdminOrdersBulkBar } from "./admin-orders-bulk-bar";
import { AdminOrdersDesktopTable } from "./admin-orders-desktop-table";
import { AdminOrdersMobileList } from "./admin-orders-mobile-list";

export { getOrderStatusBadge, getPaymentStatusBadge };

export interface AdminOrdersTableProps {
  initialData: AdminOrdersResult;
  currentFilters: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    salesChannel?: string;
    dateRange?: string;
  };
}

export function AdminOrdersTable({ initialData, currentFilters }: AdminOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q ?? "");
  const [, startTransition] = React.useTransition();
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const { total, statusCounts } = initialData;

  // Infinite scroll additional items state
  const [additionalOrders, setAdditionalOrders] = React.useState<AdminOrderItem[]>([]);
  const [prevOrders, setPrevOrders] = React.useState<AdminOrderItem[]>(initialData.orders);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);

  // Operational state
  const [copiedTracking, setCopiedTracking] = React.useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = React.useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Column visibility state
  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(orderColumnOptions);

  const visibleColumnCount = 2 + totalVisibleCols;

  // Focus search input with '/' keyboard shortcut
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-dismiss feedback message after 4s
  React.useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  // When initialData.orders updates due to navigation/filtering, reset additional items during render
  if (initialData.orders !== prevOrders) {
    setPrevOrders(initialData.orders);
    setAdditionalOrders([]);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  const loadedOrders = React.useMemo(() => {
    const existingIds = new Set(initialData.orders.map((o) => o.id));
    return [...initialData.orders, ...additionalOrders.filter((o) => !existingIds.has(o.id))];
  }, [initialData.orders, additionalOrders]);

  const hasMore = loadedOrders.length < total;

  // Multi-selection helpers
  const isAllSelected = loadedOrders.length > 0 && loadedOrders.every((o) => selectedIds.has(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(loadedOrders.map((o) => o.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyTracking = (tracking: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(tracking).then(() => {
        setCopiedTracking(tracking);
        setTimeout(() => setCopiedTracking(null), 2000);
      });
    }
  };

  // Quick 1-click status update without navigating away
  const handleQuickStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setFeedbackMessage(null);
    try {
      const res = await quickUpdateOrderStatusAction({
        orderId,
        status: nextStatus,
        notes: `Quick action: marked as ${nextStatus} from Orders table.`,
      });
      if (res.success) {
        setAdditionalOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        setFeedbackMessage(`Order status updated to ${nextStatus}.`);
        router.refresh();
      } else {
        setFeedbackMessage(res.error || "Failed to update order status.");
      }
    } catch {
      setFeedbackMessage("Unexpected error while updating status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Bulk status update for selected orders
  const handleBulkStatus = async (nextStatus: OrderStatus) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    setFeedbackMessage(null);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateOrderStatusAction({
        orderIds: ids,
        status: nextStatus,
        notes: `Bulk action: marked as ${nextStatus}.`,
      });
      if (res.success) {
        setFeedbackMessage(`${res.updatedCount} orders updated to ${nextStatus}.`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        setFeedbackMessage(res.errors[0] || "Failed to update selected orders.");
      }
    } catch {
      setFeedbackMessage("Unexpected error during bulk status update.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await loadMoreAdminOrdersAction({
        search: currentFilters.q,
        status: currentFilters.status ? (currentFilters.status as OrderStatus) : undefined,
        paymentStatus: currentFilters.paymentStatus
          ? (currentFilters.paymentStatus as PaymentStatus)
          : undefined,
        paymentMethod: currentFilters.paymentMethod
          ? (currentFilters.paymentMethod as PaymentMethod)
          : undefined,
        salesChannel: currentFilters.salesChannel
          ? (currentFilters.salesChannel as SalesChannel)
          : undefined,
        dateRange: currentFilters.dateRange
          ? (currentFilters.dateRange as AdminOrderDateRange)
          : undefined,
        page: nextPage,
        limit: 20,
      });

      if (res && res.orders.length > 0) {
        setAdditionalOrders((prev) => [...prev, ...res.orders]);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more orders:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, currentFilters, hasMore, isLoadingMore]);

  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "" || value === "ALL") {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${current.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateUrlParams({ q: val || null });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateUrlParams({ q: null });
  };

  const handleStatusTab = (statusKey: string) => {
    updateUrlParams({ status: statusKey === "ALL" ? null : statusKey });
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    (currentFilters.status && currentFilters.status !== "ALL") ||
    currentFilters.paymentStatus ||
    currentFilters.paymentMethod ||
    currentFilters.salesChannel ||
    currentFilters.dateRange
  );

  const handleClearAllFilters = () => {
    setSearchTerm("");
    updateUrlParams({
      q: null,
      status: null,
      paymentStatus: null,
      paymentMethod: null,
      salesChannel: null,
      dateRange: null,
    });
  };

  // Safe client-side CSV export (honors active multi-selection if present)
  const exportCsv = () => {
    const targetOrders =
      selectedIds.size > 0 ? loadedOrders.filter((o) => selectedIds.has(o.id)) : loadedOrders;

    exportToCsv({
      filename: `vibelock-orders-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Order Number",
        "Date",
        "Sales Channel",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "City",
        "Items Count",
        "Total (BDT)",
        "Payment Method",
        "Payment Status",
        "Courier Provider",
        "Tracking Number",
        "Order Status",
      ],
      rows: targetOrders.map((o) => [
        o.orderNumber,
        o.createdAt,
        o.salesChannel,
        o.customerName ?? "Guest",
        o.customerEmail,
        o.customerPhone ?? "",
        o.shippingCity,
        o.itemCount,
        o.total,
        o.paymentMethod,
        o.paymentStatus,
        o.shipment?.provider ?? "",
        o.shipment?.trackingNumber ?? "",
        o.status,
      ]),
    });
  };

  const tabs: AdminTableTabItem<string>[] = [
    { key: "ALL", label: "All Orders", count: statusCounts.ALL },
    {
      key: "PENDING",
      label: "Pending",
      count: statusCounts.PENDING,
      dotColor: "bg-amber-500",
    },
    {
      key: "CONFIRMED",
      label: "Confirmed",
      count: statusCounts.CONFIRMED,
      dotColor: "bg-blue-500",
    },
    {
      key: "PROCESSING",
      label: "Processing",
      count: statusCounts.PROCESSING,
      dotColor: "bg-purple-500",
    },
    { key: "SHIPPED", label: "Shipped", count: statusCounts.SHIPPED, dotColor: "bg-cyan-500" },
    {
      key: "DELIVERED",
      label: "Delivered",
      count: statusCounts.DELIVERED,
      dotColor: "bg-emerald-500",
    },
    {
      key: "CANCELLED",
      label: "Cancelled",
      count: statusCounts.CANCELLED,
      dotColor: "bg-rose-500",
    },
  ];

  const activeStatus = currentFilters.status || "ALL";

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs & Toolbar */}
      <AdminOrdersToolbar
        tabs={tabs}
        activeStatus={activeStatus}
        onStatusTabChange={handleStatusTab}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        searchInputRef={searchInputRef}
        currentFilters={currentFilters}
        onUpdateFilter={(key, val) => updateUrlParams({ [key]: val })}
        visibleColumns={visibleColumns}
        onColumnChange={handleColumnChange}
        onColumnReset={handleColumnReset}
        onExportCsv={exportCsv}
        isExportDisabled={loadedOrders.length === 0}
        currentCount={loadedOrders.length}
        totalFiltered={total}
        hasActiveFilters={hasActiveFilters}
        onResetAllFilters={handleClearAllFilters}
      />

      {/* Floating / Sticky Bulk Action Bar */}
      <AdminOrdersBulkBar
        selectedCount={selectedIds.size}
        isBulkUpdating={isBulkUpdating}
        onBulkConfirm={() => handleBulkStatus("CONFIRMED")}
        onBulkPack={() => handleBulkStatus("PROCESSING")}
        onExportCsv={exportCsv}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      {/* Operational Feedback Toast / Alert Banner */}
      {feedbackMessage && (
        <div className="animate-in fade-in flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Check className="size-4 text-emerald-700" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Orders Table (Desktop & Tablet) */}
      <AdminOrdersDesktopTable
        loadedOrders={loadedOrders}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelect={handleToggleSelect}
        visibleColumns={visibleColumns}
        visibleColumnCount={visibleColumnCount}
        copiedTracking={copiedTracking}
        onCopyTracking={handleCopyTracking}
        updatingOrderId={updatingOrderId}
        onQuickStatus={handleQuickStatus}
        hasActiveFilters={hasActiveFilters}
        onResetAllFilters={handleClearAllFilters}
      />

      {/* Mobile View: High-Efficiency Order Cards (< md) */}
      <AdminOrdersMobileList
        loadedOrders={loadedOrders}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        updatingOrderId={updatingOrderId}
        onQuickStatus={handleQuickStatus}
        hasActiveFilters={hasActiveFilters}
        onResetAllFilters={handleClearAllFilters}
      />

      {/* Shared Infinite Scroll Sentinel */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={loadedOrders.length}
        totalCount={total}
        itemName="orders"
        filterSummary={
          statusCounts?.ALL && statusCounts.ALL !== total
            ? `filtered from ${statusCounts.ALL} total`
            : null
        }
      />
    </div>
  );
}
