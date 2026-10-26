"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  Package,
  Search,
  Truck,
  X,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import type { AdminOrderItem, AdminOrdersResult } from "@/lib/admin/order-queries";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { loadMoreAdminOrdersAction } from "@/lib/admin/order-actions";

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

export function getOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 font-semibold"
        >
          <Clock className="mr-1 size-3 text-amber-600" /> Pending
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-800 font-semibold"
        >
          <CheckCircle2 className="mr-1 size-3 text-blue-600" /> Confirmed
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge
          variant="outline"
          className="border-indigo-300 bg-indigo-50 text-indigo-800 font-semibold"
        >
          <Package className="mr-1 size-3 text-indigo-600" /> Processing
        </Badge>
      );
    case "SHIPPED":
      return (
        <Badge
          variant="outline"
          className="border-purple-300 bg-purple-50 text-purple-800 font-semibold"
        >
          <Truck className="mr-1 size-3 text-purple-600" /> Shipped
        </Badge>
      );
    case "DELIVERED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
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
          className="border-orange-300 bg-orange-50 text-orange-800 font-semibold"
        >
          <AlertCircle className="mr-1 size-3 text-orange-600" /> Return ({status.replace("RETURN_", "")})
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
          className="border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
        >
          Paid
        </Badge>
      );
    case "PENDING":
    case "INITIATED":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 font-medium"
        >
          Unpaid
        </Badge>
      );
    case "FAILED":
      return (
        <Badge
          variant="outline"
          className="border-rose-300 bg-rose-50 text-rose-800 font-medium"
        >
          Failed
        </Badge>
      );
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return (
        <Badge
          variant="outline"
          className="border-neutral-300 bg-neutral-50 text-neutral-700 font-medium"
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

  const { total, statusCounts } = initialData;

  // Infinite scroll additional items state
  const [additionalOrders, setAdditionalOrders] = React.useState<AdminOrderItem[]>([]);
  const [prevOrders, setPrevOrders] = React.useState<AdminOrderItem[]>(initialData.orders);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);

  // When initialData.orders updates due to navigation/filtering, reset additional items during render
  if (initialData.orders !== prevOrders) {
    setPrevOrders(initialData.orders);
    setAdditionalOrders([]);
    setCurrentPage(1);
  }

  const loadedOrders = React.useMemo(() => {
    const existingIds = new Set(initialData.orders.map((o) => o.id));
    return [
      ...initialData.orders,
      ...additionalOrders.filter((o) => !existingIds.has(o.id)),
    ];
  }, [initialData.orders, additionalOrders]);

  const hasMore = loadedOrders.length < total;

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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

  // Safe client-side CSV export
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
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "City",
      "Items Count",
      "Total (BDT)",
      "Payment Method",
      "Payment Status",
      "Order Status",
    ];

    const rows = loadedOrders.map((o) => [
      safeCell(o.orderNumber),
      safeCell(o.createdAt),
      safeCell(o.customerName ?? "Guest"),
      safeCell(o.customerEmail),
      safeCell(o.customerPhone ?? ""),
      safeCell(o.shippingCity),
      safeCell(o.itemCount),
      safeCell(o.total),
      safeCell(o.paymentMethod),
      safeCell(o.paymentStatus),
      safeCell(o.status),
    ]);

    const csvContent =
      "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vibelock-orders-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: { key: string; label: string; count?: number; highlight?: boolean }[] = [
    { key: "ALL", label: "All Orders", count: statusCounts.ALL },
    {
      key: "PENDING",
      label: "Pending",
      count: statusCounts.PENDING,
      highlight: (statusCounts.PENDING ?? 0) > 0,
    },
    { key: "CONFIRMED", label: "Confirmed", count: statusCounts.CONFIRMED },
    { key: "PROCESSING", label: "Processing", count: statusCounts.PROCESSING },
    { key: "SHIPPED", label: "Shipped", count: statusCounts.SHIPPED },
    { key: "DELIVERED", label: "Delivered", count: statusCounts.DELIVERED },
    { key: "CANCELLED", label: "Cancelled", count: statusCounts.CANCELLED },
  ];

  const activeStatus = currentFilters.status || "ALL";

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#101114]/10 pb-3">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                isActive
                  ? "bg-[#101114] text-white shadow-2xs"
                  : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/10 hover:text-[#101114]"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white text-[#101114]"
                      : tab.highlight
                        ? "bg-amber-600 text-white"
                        : "bg-[#101114]/15 text-[#101114]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              type="text"
              placeholder="Search order #, customer, phone..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pr-8 pl-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <select
            value={currentFilters.paymentStatus || "ALL"}
            onChange={handlePaymentStatusChange}
            aria-label="Filter by payment status"
            className="border-input h-9 rounded-sm border bg-white px-3 text-xs font-medium text-[#101114] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
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
            className="border-input h-9 rounded-sm border bg-white px-3 text-xs font-medium text-[#101114] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="ONLINE">Online Gateway</option>
          </select>
        </div>

        {/* CSV Export Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={loadedOrders.length === 0}
            className="border-input bg-background hover:bg-muted inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-xs font-semibold text-[#101114] shadow-2xs transition-colors disabled:opacity-50"
          >
            <Download className="size-3.5" />
            Export Orders CSV
          </button>
        </div>
      </div>

      {/* Meta Counter */}
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <p>
          Showing {loadedOrders.length} of {total} {total === 1 ? "order" : "orders"}
          {isPending ? " (Filtering...)" : ""}
        </p>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-sm border border-[#101114]/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50">
            <tr className="text-left text-xs font-semibold tracking-wider text-[#101114]/80 uppercase">
              <th className="p-3">Order # &amp; Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3 text-center">Order Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/5">
            {loadedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-12 text-center">
                  <Package className="mx-auto mb-2 size-8 text-neutral-400" />
                  <p className="font-semibold text-neutral-700">No orders found</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Try adjusting your search query or filter options.
                  </p>
                </td>
              </tr>
            ) : (
              loadedOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-neutral-50/70">
                  {/* Order # and Date */}
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs font-bold text-[#101114] hover:text-[#00D9FF] hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <div className="text-muted-foreground text-[11px]">
                      {formatDate(order.createdAt)}
                    </div>
                  </td>

                  {/* Customer Info */}
                  <td className="p-3">
                    <div className="font-medium text-neutral-900">
                      {order.customerName || "Guest Customer"}
                    </div>
                    <div className="text-muted-foreground text-xs">{order.customerEmail}</div>
                    {(order.customerPhone || order.shippingCity) && (
                      <div className="text-muted-foreground text-[11px]">
                        {[order.customerPhone, order.shippingCity].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>

                  {/* Items */}
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-sm bg-[#F3F0E8] px-2 py-0.5 text-xs font-medium text-[#101114]">
                      <Package className="size-3 text-neutral-600" />
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </span>
                  </td>

                  {/* Total Amount in BDT */}
                  <td className="p-3 text-right">
                    <div className="font-semibold text-[#101114]">{formatBdt(order.total)}</div>
                    {order.discount > 0 && (
                      <div className="text-muted-foreground text-[10px]">
                        Saved {formatBdt(order.discount)}
                      </div>
                    )}
                  </td>

                  {/* Payment */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1 items-start">
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
                    </div>
                  </td>

                  {/* Order Status */}
                  <td className="p-3 text-center">{getOrderStatusBadge(order.status)}</td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8]"
                    >
                      <Eye className="size-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
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
