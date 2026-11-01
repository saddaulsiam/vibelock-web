"use client";

import { generateWhatsAppUrl, OrderCopyButton } from "@/components/admin/orders";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
  type ColumnOption,
} from "@/components/admin/shared";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/shared";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import { exportToCsv } from "@/lib/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadMoreAdminReturnsAction } from "@/lib/admin/returns/return-actions";
import type { AdminReturnListItem } from "@/lib/admin/returns/return-queries";
import { parseReturnReason } from "@/lib/returns/utils";
import { ReturnRequestStatus } from "@prisma/client";
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Inbox,
  MessageSquare,
  PackageCheck,
  Phone,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";

export type ReturnColumnKey = "customer" | "items" | "reason" | "financials" | "status" | "dates";

const returnColumnOptions: ColumnOption<ReturnColumnKey>[] = [
  { key: "customer", label: "Customer & Contact" },
  { key: "items", label: "Returned Items" },
  { key: "reason", label: "Return Reason" },
  { key: "financials", label: "Financials (৳)" },
  { key: "status", label: "Review Status" },
  { key: "dates", label: "Request Date" },
];

export interface AdminReturnsTableProps {
  initialReturns: AdminReturnListItem[];
  total: number;
  totalPages: number;
  page: number;
  statusCounts: Record<string, number>;
  currentStatus?: ReturnRequestStatus;
  currentSearch?: string;
}

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(dateValue: string | Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function getReturnStatusBadge(status: ReturnRequestStatus) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
          <Clock className="size-3 text-amber-600" />
          <span>Pending Review</span>
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 shadow-2xs">
          <Truck className="size-3 text-blue-600" />
          <span>Approved (In Transit)</span>
        </span>
      );
    case "RECEIVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-900 shadow-2xs">
          <PackageCheck className="size-3 text-purple-600" />
          <span>Received at Warehouse</span>
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 shadow-2xs">
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span>Completed &amp; Refunded</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-900 shadow-2xs">
          <XCircle className="size-3 text-rose-600" />
          <span>Rejected</span>
        </span>
      );
  }
}

type ReturnFilterTab = "ALL" | ReturnRequestStatus;

export function AdminReturnsTable({
  initialReturns,
  total,
  page: initialPage,
  statusCounts,
  currentStatus,
  currentSearch = "",
}: AdminReturnsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Accumulate returns for infinite scroll
  const [additionalReturns, setAdditionalReturns] = useState<AdminReturnListItem[]>([]);
  const [prevReturns, setPrevReturns] = useState(initialReturns);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Search input state & debounce
  const [searchValue, setSearchValue] = useState<string>(currentSearch);
  const [prevSearch, setPrevSearch] = useState<string>(currentSearch);

  // When initialReturns updates due to navigation or filter change, reset additional items during render
  if (initialReturns !== prevReturns) {
    setPrevReturns(initialReturns);
    setAdditionalReturns([]);
    setCurrentPage(initialPage);
  }

  // When currentSearch changes from URL navigation, sync searchValue during render
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setSearchValue(currentSearch);
  }

  // Combine initial slice with any infinite-scroll loaded items
  const returns = React.useMemo(() => {
    const existingIds = new Set(initialReturns.map((r) => r.id));
    const uniqueAdditional = additionalReturns.filter((r) => !existingIds.has(r.id));
    return [...initialReturns, ...uniqueAdditional];
  }, [initialReturns, additionalReturns]);

  const hasMore = returns.length < total;

  // Column visibility hook
  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(returnColumnOptions);

  // Debounce search update to URL query params
  useEffect(() => {
    if (searchValue === currentSearch) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (searchValue.trim()) {
        params.set("q", searchValue.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.push(`/admin/returns?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, router, searchParams]);

  // Tab definitions with counts
  const tabs: AdminTableTabItem<ReturnFilterTab>[] = [
    { key: "ALL", label: "All Returns", count: statusCounts.ALL },
    { key: "PENDING", label: "Pending", count: statusCounts.PENDING },
    { key: "APPROVED", label: "Approved", count: statusCounts.APPROVED },
    { key: "RECEIVED", label: "Received", count: statusCounts.RECEIVED },
    { key: "COMPLETED", label: "Completed", count: statusCounts.COMPLETED },
    { key: "REJECTED", label: "Rejected", count: statusCounts.REJECTED },
  ];

  const activeTab: ReturnFilterTab = currentStatus ?? "ALL";

  const handleTabChange = (newTab: ReturnFilterTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (newTab === "ALL") {
      params.delete("status");
    } else {
      params.set("status", newTab);
    }
    params.delete("page");
    router.push(`/admin/returns?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(searchValue.trim() || Boolean(currentStatus));

  const handleClearAllFilters = () => {
    setSearchValue("");
    router.push("/admin/returns");
  };

  const handleExportCsv = () => {
    exportToCsv({
      filename: `vibelock-returns-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Return ID",
        "Order Number",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Status",
        "Return Reason",
        "Requested Amount (BDT)",
        "Reverse Tracking Code",
        "Created Date",
      ],
      rows: returns.map((r) => [
        r.id,
        r.order.orderNumber,
        r.order.customerName || "Customer",
        r.order.customerEmail,
        r.order.customerPhone || "",
        r.status,
        r.reason || "",
        r.requestedAmount,
        r.reverseLogistics?.trackingCode || "",
        new Date(r.createdAt).toISOString().slice(0, 10),
      ]),
    });
  };

  // Load more via infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || returns.length >= total) return;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const res = await loadMoreAdminReturnsAction({
        status: currentStatus,
        search: currentSearch || undefined,
        page: nextPage,
      });

      if (res.returns.length > 0) {
        setAdditionalReturns((prev) => [...prev, ...res.returns]);
        setCurrentPage(nextPage);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, returns.length, total, currentPage, currentStatus, currentSearch]);

  return (
    <div className="space-y-6">
      {/* ── 1. KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Returns */}
        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Total Returns
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              <RotateCcw className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-neutral-900">{statusCounts.ALL ?? 0}</p>
          <span className="text-[11px] text-neutral-500">Historical &amp; active requests</span>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-amber-900 uppercase">
              Pending Review
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Clock className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950">{statusCounts.PENDING ?? 0}</p>
          <span className="text-[11px] font-semibold text-amber-700">Needs merchant review</span>
        </div>

        {/* Approved & In-Transit */}
        <div className="rounded-xl border border-blue-200/90 bg-blue-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-blue-900 uppercase">
              Approved
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Truck className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-950">{statusCounts.APPROVED ?? 0}</p>
          <span className="text-[11px] text-blue-700">Returning by customer</span>
        </div>

        {/* Received at Warehouse */}
        <div className="rounded-xl border border-purple-200/90 bg-purple-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-purple-900 uppercase">
              Received
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <PackageCheck className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-950">{statusCounts.RECEIVED ?? 0}</p>
          <span className="text-[11px] text-purple-700">Ready for inspection &amp; refund</span>
        </div>

        {/* Completed & Refunded */}
        <div className="col-span-2 rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-2xs sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-900 uppercase">
              Completed
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{statusCounts.COMPLETED ?? 0}</p>
          <span className="text-[11px] text-emerald-700">Refunded &amp; resolved</span>
        </div>
      </div>

      {/* ── 2. Unified Filter Tabs & Controls Row ── */}
      <div className="space-y-3.5">
        {/* Status Tabs */}
        <AdminTableTabs<ReturnFilterTab>
          tabs={tabs}
          activeKey={activeTab}
          onChange={handleTabChange}
        />

        {/* Search & Actions Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <AdminTableSearchInput
              value={searchValue}
              onChange={setSearchValue}
              onClear={() => setSearchValue("")}
              placeholder="Search by order #, customer, email, product, or reason..."
            />
          </div>

          <div className="flex items-center gap-2">
            <AdminTableColumnVisibility<ReturnColumnKey>
              columns={returnColumnOptions}
              visibleColumns={visibleColumns}
              onChange={handleColumnChange}
              onReset={handleColumnReset}
            />

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={returns.length === 0}
              className={ADMIN_TABLE_CLASSES.buttonSecondary}
              title="Export filtered returns to CSV"
            >
              <Download className="size-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={returns.length}
        totalFiltered={total}
        totalCount={statusCounts.ALL}
        itemName="return request"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleClearAllFilters}
      />

      {/* ── 3. Returns Table Container ── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order &amp; Return</TableHead>
            {visibleColumns.customer && <TableHead>Customer &amp; Contact</TableHead>}
            {visibleColumns.items && <TableHead>Returned Items</TableHead>}
            {visibleColumns.reason && <TableHead>Reason</TableHead>}
            {visibleColumns.financials && <TableHead>Refund Estimate</TableHead>}
            {visibleColumns.status && <TableHead>Status</TableHead>}
            {visibleColumns.dates && <TableHead>Requested</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {returns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalVisibleCols + 2} className="py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                    <Inbox className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800">No return requests found</h4>
                  <p className="max-w-sm text-xs text-neutral-500">
                    {currentSearch || currentStatus
                      ? "Try adjusting your search keywords or switching status tabs."
                      : "Customer return requests will appear here once submitted."}
                  </p>
                  {(currentSearch || currentStatus) && (
                    <button
                      type="button"
                      onClick={() => router.push("/admin/returns")}
                      className="mt-2 inline-flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            returns.map((ret) => {
              const whatsAppUrl = ret.order.customerPhone
                ? generateWhatsAppUrl(
                    ret.order.customerPhone,
                    ret.order.orderNumber,
                    ret.order.customerName
                  )
                : null;

              return (
                <TableRow key={ret.id} className="group">
                  {/* Order & Return ID */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${ret.order.id}`}
                        className="font-mono text-xs font-black text-neutral-900 transition hover:text-blue-600 hover:underline"
                        title="Open full order details"
                      >
                        #{ret.order.orderNumber}
                      </Link>
                      <OrderCopyButton
                        text={ret.order.orderNumber}
                        variant="icon"
                        successMessage="Order # copied"
                        title="Copy order number"
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
                      <span>Return ID:</span>
                      <span className="text-neutral-500">{ret.id.slice(0, 8)}...</span>
                    </div>
                  </TableCell>

                  {/* Customer & Contact */}
                  {visibleColumns.customer && (
                    <TableCell>
                      <p className="font-bold text-neutral-900">
                        {ret.order.customerName || "Guest Customer"}
                      </p>
                      <p className="max-w-[180px] truncate text-[11px] text-neutral-500">
                        {ret.order.customerEmail}
                      </p>
                      {ret.order.customerPhone && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <a
                            href={`tel:${ret.order.customerPhone}`}
                            className="inline-flex items-center gap-1 text-neutral-600 transition hover:text-neutral-900"
                          >
                            <Phone className="size-3 text-neutral-400" />
                            <span>{ret.order.customerPhone}</span>
                          </a>
                          {whatsAppUrl && (
                            <a
                              href={whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800 transition hover:bg-emerald-100"
                              title="Chat with customer on WhatsApp"
                            >
                              <MessageSquare className="size-2.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Returned Items */}
                  {visibleColumns.items && (
                    <TableCell>
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                          <ShoppingBag className="size-2.5" />
                          {ret.totalQuantity} item{ret.totalQuantity === 1 ? "" : "s"} (
                          {ret.items.length} line{ret.items.length === 1 ? "" : "s"})
                        </span>
                        <div className="space-y-1">
                          {ret.items.map((it) => (
                            <div
                              key={it.id}
                              className="max-w-[220px] truncate text-[11px] font-medium text-neutral-800"
                            >
                              <div>
                                {it.orderItem.productName}
                                {it.orderItem.size && (
                                  <span className="font-normal text-neutral-500">
                                    {" "}
                                    ({it.orderItem.size})
                                  </span>
                                )}
                                <span className="font-semibold text-neutral-500">
                                  {" "}
                                  ×{it.quantity}
                                </span>
                              </div>
                              <span className="block font-mono text-[10px] text-neutral-400">
                                {it.orderItem.sku}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Reason */}
                  {visibleColumns.reason && (
                    <TableCell>
                      {(() => {
                        const parsed = parseReturnReason(ret.reason);
                        return ret.reason ? (
                          <div className="max-w-[220px] space-y-1">
                            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800">
                              {parsed.categoryLabel}
                            </span>
                            {parsed.customerNote && (
                              <p className="line-clamp-2 text-[11px] text-neutral-600 italic">
                                &ldquo;{parsed.customerNote}&rdquo;
                              </p>
                            )}
                            {parsed.images.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                                <Camera className="size-2.5 text-blue-500" />
                                <span>{parsed.images.length} photo proof(s)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400">No reason stated</span>
                        );
                      })()}
                    </TableCell>
                  )}

                  {/* Financials */}
                  {visibleColumns.financials && (
                    <TableCell>
                      <p className="text-sm font-black text-neutral-900">
                        {formatBdt(ret.requestedAmount)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-neutral-500">
                        Order Total: {formatBdt(ret.order.total)}
                      </p>
                    </TableCell>
                  )}

                  {/* Status */}
                  {visibleColumns.status && (
                    <TableCell className="whitespace-nowrap">
                      {getReturnStatusBadge(ret.status)}
                      {ret.reverseLogistics?.trackingCode && (
                        <div className="mt-1">
                          <a
                            href={ret.reverseLogistics.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-bold text-cyan-900 transition hover:bg-cyan-100"
                            title="Live Steadfast Reverse Tracking"
                          >
                            <Truck className="size-2.5 text-cyan-700" />
                            <span>Steadfast: {ret.reverseLogistics.trackingCode}</span>
                          </a>
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Dates */}
                  {visibleColumns.dates && (
                    <TableCell className="text-[11px] whitespace-nowrap text-neutral-600">
                      {formatDate(ret.createdAt)}
                    </TableCell>
                  )}

                  {/* Actions */}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {ret.status === "APPROVED" && !ret.reverseLogistics && (
                        <Link
                          href={`/admin/returns/${ret.id}#steadfast-pickup`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                          title="Book Steadfast Return Pickup"
                        >
                          <Truck className="size-3.5 text-emerald-600" />
                          <span>Book Pickup</span>
                        </Link>
                      )}
                      <Link
                        href={`/admin/returns/${ret.id}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-neutral-800"
                        title="Review return items, update status, and process refund"
                      >
                        <Eye className="size-3.5" />
                        <span>Review &amp; Process</span>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── 4. Unified Infinite Scroll Sentinel & Pagination Controls ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadedCount={returns.length}
        totalCount={total}
        itemName="return requests"
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
