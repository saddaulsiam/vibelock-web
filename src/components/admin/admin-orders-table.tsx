"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
} from "@/components/admin/admin-table-column-visibility";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/admin-table-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToCsv } from "@/lib/admin/admin-csv-export";
import type {
  AdminOrderDateRange,
  AdminOrderItem,
  AdminOrdersResult,
} from "@/lib/admin/order-queries";
import { OrderStatus, PaymentMethod, PaymentStatus, SalesChannel } from "@prisma/client";
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

import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "@/components/admin/admin-order-badges";
export { getOrderStatusBadge, getPaymentStatusBadge };

const DATE_RANGE_OPTIONS = [
  { value: "ALL", label: "All Time" },
  { value: "today", label: "Today (Live)" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
] as const;

const SALES_CHANNEL_OPTIONS = [
  { value: "ALL", label: "All Channels" },
  { value: "WEBSITE", label: "Online Store (WEB)" },
  { value: "POS", label: "POS Counter" },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All Payment Statuses" },
  { value: "SUCCESS", label: "Paid (Success)" },
  { value: "PENDING", label: "Unpaid (Pending)" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "ALL", label: "All Payment Methods" },
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "ONLINE", label: "Online Gateway" },
] as const;

interface AdminOrdersTableProps {
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
      {/* Status Filter Tabs */}
      <AdminTableTabs
        tabs={tabs}
        activeKey={activeStatus}
        onChange={handleStatusTab}
      />

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

          {/* Date Range Filter */}
          <AdminTableFilterSelect
            value={currentFilters.dateRange || "ALL"}
            onChange={(val) => updateUrlParams({ dateRange: val })}
            options={DATE_RANGE_OPTIONS}
            ariaLabel="Filter by date range"
          />

          {/* Sales Channel Filter */}
          <AdminTableFilterSelect
            value={currentFilters.salesChannel || "ALL"}
            onChange={(val) => updateUrlParams({ salesChannel: val })}
            options={SALES_CHANNEL_OPTIONS}
            ariaLabel="Filter by sales channel"
          />

          {/* Payment Status Filter */}
          <AdminTableFilterSelect
            value={currentFilters.paymentStatus || "ALL"}
            onChange={(val) => updateUrlParams({ paymentStatus: val })}
            options={PAYMENT_STATUS_OPTIONS}
            ariaLabel="Filter by payment status"
          />

          {/* Payment Method Filter */}
          <AdminTableFilterSelect
            value={currentFilters.paymentMethod || "ALL"}
            onChange={(val) => updateUrlParams({ paymentMethod: val })}
            options={PAYMENT_METHOD_OPTIONS}
            ariaLabel="Filter by payment method"
          />
        </div>

        {/* Column Visibility & CSV Export Controls */}
        <div className="flex items-center gap-2">
          <AdminTableColumnVisibility
            columns={orderColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
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

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={loadedOrders.length}
        totalFiltered={total}
        itemName="order"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleClearAllFilters}
      />

      {/* Orders Table (Desktop & Tablet) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
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
              {visibleColumns.payment && <TableHead className="whitespace-nowrap">Payment</TableHead>}
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
                <TableCell colSpan={visibleColumnCount} className="p-12 text-center text-neutral-500">
                  <Package className="mx-auto mb-2 size-8 text-neutral-400" />
                  <p className="font-semibold text-neutral-700">No orders found</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Try adjusting your search query or filter options.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearAllFilters}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs transition hover:bg-neutral-50"
                    >
                      <RotateCcw className="size-3.5 text-neutral-500" />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              loadedOrders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                return (
                  <TableRow
                    key={order.id}
                    className={isSelected ? "bg-amber-50/40" : undefined}
                  >
                    {/* Row Checkbox */}
                    <TableCell className="px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        aria-label={`Select order ${order.orderNumber}`}
                        className="size-3.5 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
                      />
                    </TableCell>

                    {/* Order # and Date */}
                    {visibleColumns.date && (
                      <TableCell>
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
                      </TableCell>
                    )}

                    {/* Customer Info with WhatsApp and Phone 1-click links */}
                    {visibleColumns.customer && (
                      <TableCell>
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
                      </TableCell>
                    )}

                    {/* Items */}
                    {visibleColumns.items && (
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-sm bg-[#F3F0E8] px-2 py-0.5 text-xs font-semibold text-[#101114]">
                            <Package className="size-3 text-neutral-600" />
                            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                          </span>
                          {order.itemsSummary ? (
                            <span
                              className="block max-w-[150px] truncate text-[10px] text-neutral-500 hover:text-neutral-900 transition-colors"
                              title={order.itemsSummary}
                            >
                              {order.itemsSummary}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    )}

                    {/* Total Amount in BDT */}
                    {visibleColumns.total && (
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        <div className="font-bold text-[#101114]">{formatBdt(order.total)}</div>
                        {order.discount > 0 && (
                          <div className="text-[10px] text-neutral-500">
                            Saved {formatBdt(order.discount)}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {/* Payment */}
                    {visibleColumns.payment && (
                      <TableCell className="whitespace-nowrap">
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
                      </TableCell>
                    )}

                    {/* Courier Provider & Tracking */}
                    {visibleColumns.shipment && (
                      <TableCell>
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
                      </TableCell>
                    )}

                    {/* Order Status */}
                    {visibleColumns.status && (
                      <TableCell className="text-center whitespace-nowrap">
                        {getOrderStatusBadge(order.status)}
                      </TableCell>
                    )}

                    {/* Quick Action & View link */}
                    <TableCell className="text-right whitespace-nowrap">
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile View: High-Efficiency Order Cards (< md) ── */}
      <div className="space-y-3 md:hidden">
        {loadedOrders.length === 0 ? (
          <div className="rounded-xl border border-neutral-200/90 bg-white p-8 text-center text-neutral-500 shadow-2xs">
            <Package className="mx-auto mb-2 size-8 text-neutral-400" />
            <p className="font-semibold text-neutral-700">No orders found</p>
            <p className="mt-1 text-xs text-neutral-500">
              Try adjusting your search query or filter options.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs transition hover:bg-neutral-50"
              >
                <RotateCcw className="size-3.5 text-neutral-500" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          loadedOrders.map((order) => {
            const isSelected = selectedIds.has(order.id);
            return (
              <div
                key={order.id}
                className={`rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs transition-colors ${
                  isSelected ? "bg-amber-50/40 border-amber-300" : ""
                }`}
              >
                {/* Header: Checkbox, Order #, Channel & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(order.id)}
                      aria-label={`Select order ${order.orderNumber}`}
                      className="size-4 rounded-xs border-neutral-300 accent-[#101114] focus:ring-1 focus:ring-[#00D9FF]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs font-bold text-[#101114] hover:text-[#00D9FF] hover:underline"
                        >
                          #{order.orderNumber}
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
                      <div className="text-[10px] text-neutral-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div>{getOrderStatusBadge(order.status)}</div>
                </div>

                {/* Customer Info & Direct Quick Contacts */}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-neutral-900">
                      {order.customerName || "Guest Customer"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                      {order.shippingCity && (
                        <span className="rounded-xs bg-neutral-100 px-1 py-0.2 text-[10px] font-medium text-neutral-600">
                          {order.shippingCity}
                        </span>
                      )}
                      <span className="font-mono">{order.customerPhone}</span>
                    </div>
                  </div>

                  {order.customerPhone && (
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                        title="Call customer"
                      >
                        <Phone className="size-3" />
                      </a>
                      <a
                        href={formatWhatsAppUrl(
                          order.customerPhone,
                          order.orderNumber,
                          order.customerName
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        title="WhatsApp chat"
                      >
                        <MessageCircle className="size-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Items & Payment Strip */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50/80 p-2 text-xs">
                  <div>
                    <div className="flex items-center gap-1">
                      <Package className="size-3 text-neutral-500" />
                      <span className="font-semibold text-neutral-800">
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    {order.itemsSummary ? (
                      <p className="mt-0.5 max-w-[170px] truncate text-[10px] text-neutral-500">
                        {order.itemsSummary}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[#101114]">{formatBdt(order.total)}</div>
                    <div className="flex items-center justify-end gap-1 text-[10px]">
                      <span className="font-semibold text-neutral-600">{order.paymentMethod}</span>
                      <span>&middot;</span>
                      <span
                        className={
                          order.paymentStatus === "SUCCESS"
                            ? "text-emerald-700 font-bold"
                            : "text-amber-700"
                        }
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Courier info (if dispatched) */}
                {order.shipment ? (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-600">
                    <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                      <Truck className="size-3" />
                      {order.shipment.provider}
                    </span>
                    {order.shipment.trackingNumber && (
                      <span className="font-mono text-[10px] text-neutral-500">
                        Trk: {order.shipment.trackingNumber}
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Actions Footer */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-2.5">
                  {order.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleQuickStatus(order.id, "CONFIRMED")}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{updatingOrderId === order.id ? "..." : "Confirm"}</span>
                    </button>
                  )}

                  {order.status === "CONFIRMED" && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleQuickStatus(order.id, "PROCESSING")}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <Package className="size-3.5 text-indigo-600" />
                      <span>{updatingOrderId === order.id ? "..." : "Pack"}</span>
                    </button>
                  )}

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] shadow-2xs hover:bg-[#F3F0E8]"
                  >
                    <Eye className="size-3.5" />
                    <span>View Details</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
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
