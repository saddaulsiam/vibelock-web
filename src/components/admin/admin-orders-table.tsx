"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  MessageCircle,
  Package,
  Phone,
  Truck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { AdminTableColumnVisibility } from "@/components/admin/admin-table-column-visibility";
import {
  AdminTableSearchInput,
  ADMIN_TABLE_CLASSES,
} from "@/components/admin/admin-table-controls";
import type { AdminOrderItem, AdminOrdersResult } from "@/lib/admin/order-queries";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  bulkUpdateOrderStatusAction,
  loadMoreAdminOrdersAction,
  quickUpdateOrderStatusAction,
} from "@/lib/admin/order-actions";

function formatBdt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatWhatsAppUrl(
  phone: string,
  orderNumber: string,
  customerName?: string | null
): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // already has full BD country code
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  const greeting = customerName ? `Hello ${customerName}` : "Hello";
  const message = `${greeting}, regarding your VibeLock order #${orderNumber}: `;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function getOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 font-semibold text-amber-800"
        >
          <Clock className="mr-1 size-3 text-amber-600" /> Pending
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="outline" className="border-blue-300 bg-blue-50 font-semibold text-blue-800">
          <CheckCircle2 className="mr-1 size-3 text-blue-600" /> Confirmed
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge
          variant="outline"
          className="border-indigo-300 bg-indigo-50 font-semibold text-indigo-800"
        >
          <Package className="mr-1 size-3 text-indigo-600" /> Processing
        </Badge>
      );
    case "SHIPPED":
      return (
        <Badge
          variant="outline"
          className="border-purple-300 bg-purple-50 font-semibold text-purple-800"
        >
          <Truck className="mr-1 size-3 text-purple-600" /> Shipped
        </Badge>
      );
    case "DELIVERED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
        >
          <CheckCircle2 className="mr-1 size-3 text-emerald-600" /> Delivered
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="border-neutral-300 bg-neutral-100 text-neutral-700">
          Cancelled
        </Badge>
      );
    case "RETURN_REQUESTED":
    case "RETURN_PROCESSING":
    case "RETURNED":
      return (
        <Badge
          variant="outline"
          className="border-orange-300 bg-orange-50 font-semibold text-orange-800"
        >
          <AlertCircle className="mr-1 size-3 text-orange-600" /> Return (
          {status.replace("RETURN_", "")})
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getPaymentStatusBadge(status: PaymentStatus) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 font-medium text-emerald-800"
        >
          Paid
        </Badge>
      );
    case "PENDING":
    case "INITIATED":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 font-medium text-amber-800"
        >
          Unpaid
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-rose-300 bg-rose-50 font-medium text-rose-800">
          Failed
        </Badge>
      );
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return (
        <Badge
          variant="outline"
          className="border-neutral-300 bg-neutral-50 font-medium text-neutral-700"
        >
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface AdminOrdersTableProps {
  initialData: AdminOrdersResult;
  currentFilters: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
  };
}

export function AdminOrdersTable({ initialData, currentFilters }: AdminOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q ?? "");
  const [isPending, startTransition] = React.useTransition();
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
  const [visibleColumns, setVisibleColumns] = React.useState({
    date: true,
    customer: true,
    items: true,
    total: true,
    payment: true,
    shipment: true,
    status: true,
  });

  const orderColumnOptions = React.useMemo(
    () => [
      { key: "date" as const, label: "Date & Channel" },
      { key: "customer" as const, label: "Customer & Phone" },
      { key: "items" as const, label: "Items Count" },
      { key: "total" as const, label: "Total Amount" },
      { key: "payment" as const, label: "Payment Info" },
      { key: "shipment" as const, label: "Courier & Tracking" },
      { key: "status" as const, label: "Order Status" },
    ],
    []
  );

  const visibleColumnCount =
    2 +
    (visibleColumns.date ? 1 : 0) +
    (visibleColumns.customer ? 1 : 0) +
    (visibleColumns.items ? 1 : 0) +
    (visibleColumns.total ? 1 : 0) +
    (visibleColumns.payment ? 1 : 0) +
    (visibleColumns.shipment ? 1 : 0) +
    (visibleColumns.status ? 1 : 0);

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

  const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrlParams({ paymentStatus: e.target.value });
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrlParams({ paymentMethod: e.target.value });
  };

  // Safe client-side CSV export (honors active multi-selection if present)
  const exportCsv = () => {
    const safeCell = (val: unknown) => {
      if (val === null || val === undefined) return "";
      const text = String(val);
      const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
    };

    const headers = [
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
    ];

    const targetOrders =
      selectedIds.size > 0 ? loadedOrders.filter((o) => selectedIds.has(o.id)) : loadedOrders;

    const rows = targetOrders.map((o) => [
      safeCell(o.orderNumber),
      safeCell(o.createdAt),
      safeCell(o.salesChannel),
      safeCell(o.customerName ?? "Guest"),
      safeCell(o.customerEmail),
      safeCell(o.customerPhone ?? ""),
      safeCell(o.shippingCity),
      safeCell(o.itemCount),
      safeCell(o.total),
      safeCell(o.paymentMethod),
      safeCell(o.paymentStatus),
      safeCell(o.shipment?.provider ?? ""),
      safeCell(o.shipment?.trackingNumber ?? ""),
      safeCell(o.status),
    ]);

    const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vibelock-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: { key: string; label: string; count?: number; dotColor?: string }[] = [
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
      {/* Status Filter Tabs matching Inventory style */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                isActive
                  ? "bg-[#101114] font-semibold text-white shadow-2xs"
                  : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              {tab.dotColor && (
                <span className={`size-1.5 shrink-0 rounded-full ${tab.dotColor}`} />
              )}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className={`text-[11px] ${isActive ? "text-white/80" : "text-neutral-500"}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs font-medium text-amber-950 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900">
              {selectedIds.size} {selectedIds.size === 1 ? "order" : "orders"} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Confirm */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatus("CONFIRMED")}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-emerald-700 px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-800 disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Confirm Selected</span>
            </button>

            {/* Bulk Mark as Processing / Pack */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatus("PROCESSING")}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#101114] px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#101114]/85 disabled:opacity-50"
            >
              <Package className="size-3.5" />
              <span>Pack Selected</span>
            </button>

            {/* Export Selected to CSV */}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 shadow-2xs hover:bg-amber-100/50"
            >
              <Download className="size-3.5" />
              <span>Export Selected CSV</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-neutral-600 underline-offset-2 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

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

      {/* Search and Secondary Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input with '/' hotkey */}
          <AdminTableSearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder="Search order #, customer, phone..."
            inputRef={searchInputRef}
          />

          {/* Payment Status Filter */}
          <select
            value={currentFilters.paymentStatus || "ALL"}
            onChange={handlePaymentStatusChange}
            aria-label="Filter by payment status"
            className={ADMIN_TABLE_CLASSES.select}
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="SUCCESS">Paid (Success)</option>
            <option value="PENDING">Unpaid (Pending)</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={currentFilters.paymentMethod || "ALL"}
            onChange={handlePaymentMethodChange}
            aria-label="Filter by payment method"
            className={ADMIN_TABLE_CLASSES.select}
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="ONLINE">Online Gateway</option>
          </select>
        </div>

        {/* Column Visibility & CSV Export Controls */}
        <div className="flex items-center gap-2">
          <AdminTableColumnVisibility
            columns={orderColumnOptions}
            visibleColumns={visibleColumns}
            onChange={(key, val) => setVisibleColumns((prev) => ({ ...prev, [key]: val }))}
            onReset={() =>
              setVisibleColumns({
                date: true,
                customer: true,
                items: true,
                total: true,
                payment: true,
                shipment: true,
                status: true,
              })
            }
          />

          <button
            type="button"
            onClick={exportCsv}
            disabled={loadedOrders.length === 0}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export orders to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Meta Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <p>
          Showing <strong className="text-neutral-900">{loadedOrders.length}</strong> of{" "}
          <strong className="text-neutral-900">{total}</strong> {total === 1 ? "order" : "orders"}
          {isPending ? " (Filtering...)" : ""}
        </p>
      </div>

      {/* Orders Table */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all orders"
                  className="size-3.5 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
                />
              </th>
              {visibleColumns.date && (
                <th className="min-w-[130px] px-3 py-3">Order # &amp; Date</th>
              )}
              {visibleColumns.customer && (
                <th className="min-w-[180px] px-3 py-3">Customer &amp; Contact</th>
              )}
              {visibleColumns.items && (
                <th className="px-3 py-3 text-center whitespace-nowrap">Items</th>
              )}
              {visibleColumns.total && (
                <th className="px-3 py-3 text-right whitespace-nowrap">Total Amount</th>
              )}
              {visibleColumns.payment && <th className="px-3 py-3 whitespace-nowrap">Payment</th>}
              {visibleColumns.shipment && (
                <th className="min-w-[140px] px-3 py-3">Courier &amp; Tracking</th>
              )}
              {visibleColumns.status && (
                <th className="px-3 py-3 text-center whitespace-nowrap">Order Status</th>
              )}
              <th className="min-w-[110px] px-4 py-3 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/5">
            {loadedOrders.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="p-12 text-center text-neutral-500">
                  <Package className="mx-auto mb-2 size-8 text-neutral-400" />
                  <p className="font-semibold text-neutral-700">No orders found</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Try adjusting your search query or filter options.
                  </p>
                </td>
              </tr>
            ) : (
              loadedOrders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                return (
                  <tr
                    key={order.id}
                    className={`transition-colors hover:bg-neutral-50/70 ${
                      isSelected ? "bg-amber-50/40" : ""
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        aria-label={`Select order ${order.orderNumber}`}
                        className="size-3.5 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
                      />
                    </td>

                    {/* Order # and Date */}
                    {visibleColumns.date && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-[#101114] hover:text-[#00D9FF] hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <span
                            className={`rounded-2xs py-0.2 inline-flex items-center px-1.5 text-[9px] font-bold tracking-wider uppercase ${
                              order.salesChannel === "POS"
                                ? "border border-purple-200 bg-purple-50 text-purple-700"
                                : "border border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {order.salesChannel === "POS" ? "POS" : "WEB"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-neutral-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                    )}

                    {/* Customer Info with WhatsApp and Phone 1-click links */}
                    {visibleColumns.customer && (
                      <td className="px-3 py-3">
                        <div className="font-semibold text-neutral-900">
                          {order.customerName || "Guest Customer"}
                        </div>
                        <div className="text-[11px] text-neutral-500">{order.customerEmail}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-700">
                          {order.customerPhone && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono">{order.customerPhone}</span>
                              {/* 1-click Direct Call */}
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                                title={`Call ${order.customerPhone}`}
                              >
                                <Phone className="size-3" />
                              </a>
                              {/* 1-click Direct WhatsApp Chat */}
                              <a
                                href={formatWhatsAppUrl(
                                  order.customerPhone,
                                  order.orderNumber,
                                  order.customerName
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                title="Chat on WhatsApp to confirm order"
                              >
                                <MessageCircle className="size-3" />
                              </a>
                            </div>
                          )}
                          {order.shippingCity && (
                            <span className="py-0.2 rounded-xs bg-neutral-100 px-1 text-[10px] font-medium text-neutral-600">
                              {order.shippingCity}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Items */}
                    {visibleColumns.items && (
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[#F3F0E8] px-2 py-0.5 text-xs font-semibold text-[#101114]">
                          <Package className="size-3 text-neutral-600" />
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </span>
                      </td>
                    )}

                    {/* Total Amount in BDT */}
                    {visibleColumns.total && (
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                        <div className="font-bold text-[#101114]">{formatBdt(order.total)}</div>
                        {order.discount > 0 && (
                          <div className="text-[10px] text-neutral-500">
                            Saved {formatBdt(order.discount)}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Payment */}
                    {visibleColumns.payment && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-xs bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800">
                            {order.paymentMethod === "COD" ? (
                              <>
                                <Banknote className="size-3 text-emerald-700" /> COD
                              </>
                            ) : (
                              <>
                                <CreditCard className="size-3 text-blue-700" /> ONLINE
                              </>
                            )}
                          </span>
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </div>
                      </td>
                    )}

                    {/* Courier Provider & Tracking */}
                    {visibleColumns.shipment && (
                      <td className="px-3 py-3">
                        {order.shipment ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-xs border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                                <Truck className="size-2.5 text-purple-600" />
                                {order.shipment.provider}
                              </span>
                              <span className="text-[10px] font-medium text-neutral-500">
                                {order.shipment.status}
                              </span>
                            </div>
                            {order.shipment.trackingNumber && (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-700">
                                <span>{order.shipment.trackingNumber}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyTracking(order.shipment!.trackingNumber!)
                                  }
                                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
                                  title="Copy tracking code"
                                >
                                  {copiedTracking === order.shipment.trackingNumber ? (
                                    <Check className="size-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-2.5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Order Status */}
                    {visibleColumns.status && (
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getOrderStatusBadge(order.status)}
                      </td>
                    )}

                    {/* Quick Action & View link */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click Status Quick Actions */}
                        {order.status === "PENDING" && (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleQuickStatus(order.id, "CONFIRMED")}
                            className="inline-flex h-7 items-center gap-1 rounded-sm bg-emerald-600 px-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            title="Confirm order after customer verification"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>{updatingOrderId === order.id ? "..." : "Confirm"}</span>
                          </button>
                        )}

                        {order.status === "CONFIRMED" && (
                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleQuickStatus(order.id, "PROCESSING")}
                            className="inline-flex h-7 items-center gap-1 rounded-sm border border-neutral-300 bg-white px-2 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 disabled:opacity-50"
                            title="Mark order as Processing / Package"
                          >
                            <Package className="size-3 text-indigo-600" />
                            <span>{updatingOrderId === order.id ? "..." : "Pack"}</span>
                          </button>
                        )}

                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex h-7 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8]"
                        >
                          <Eye className="size-3" />
                          <span>View</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Infinite Scroll Sentinel & Load More Controls ── */}
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
