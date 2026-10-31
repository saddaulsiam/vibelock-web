"use client";

import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
  type ColumnOption,
} from "@/components/admin/shared";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import {
  loadMoreAdminShipmentsAction,
  syncSingleShipmentAction,
} from "@/lib/admin/shipping/shipping-actions";
import {
  getShipmentStatusBadgeInfo,
  type AdminShipmentListItem,
  type ShipmentFilter,
  type ShipmentProviderFilter,
} from "@/lib/admin/shipping/shipping-shared";
import { ShipmentStatus } from "@prisma/client";
import { exportToCsv } from "@/lib/admin/shared";
import {
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export type ShipmentColumnKey =
  | "customer"
  | "courier"
  | "method"
  | "amounts"
  | "status"
  | "dates";

const shipmentColumnOptions: ColumnOption<ShipmentColumnKey>[] = [
  { key: "customer", label: "Customer & Recipient" },
  { key: "courier", label: "Courier & Tracking" },
  { key: "method", label: "Delivery Method" },
  { key: "amounts", label: "Amounts & COD" },
  { key: "status", label: "Parcel Status" },
  { key: "dates", label: "Dispatch & Delivery" },
];

export interface AdminShipmentsTableProps {
  initialShipments: AdminShipmentListItem[];
  total: number;
  segmentCounts: {
    all: number;
    in_transit: number;
    delivered: number;
    returned: number;
    pending: number;
  };
  currentSearch?: string;
  currentFilter?: ShipmentFilter;
  currentProvider?: ShipmentProviderFilter;
}

function formatCurrency(val: unknown): string {
  const num = typeof val === "number" ? val : Number(val || 0);
  return `৳${Math.round(num).toLocaleString()}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateShipmentWhatsAppUrl(
  phone: string | null,
  orderNumber: string,
  customerName: string | null,
  trackingNumber: string | null,
  provider: string,
  status: ShipmentStatus
): string | null {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // Already has full BD country code
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  const namePart = customerName ? `প্রিয় ${customerName}, ` : "প্রিয় গ্রাহক, ";
  const trackingPart = trackingNumber
    ? `ট্র্যাকিং কোড: ${trackingNumber} (${provider})`
    : `কুরিয়ার: ${provider}`;
  const message = `${namePart}আপনার VibeLock অর্ডার #${orderNumber}-এর পার্সেল সংক্রান্ত আপডেট। ${trackingPart}। বর্তমান ডেলিভারি স্ট্যাটাস: ${status}। কোনো তথ্যের প্রয়োজন হলে আমাদের জানান। ধন্যবাদ!`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function AdminShipmentsTable({
  initialShipments,
  total,
  segmentCounts,
  currentSearch = "",
  currentFilter = "all",
  currentProvider = "ALL",
}: AdminShipmentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Search input state
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(currentSearch);

  // Shipments state with infinite scroll and status override support
  const [additionalShipments, setAdditionalShipments] = useState<AdminShipmentListItem[]>([]);
  const [prevShipments, setPrevShipments] = useState(initialShipments);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ShipmentStatus>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // When initialShipments updates due to search or filter change, reset additional items & selection
  if (initialShipments !== prevShipments) {
    setPrevShipments(initialShipments);
    setAdditionalShipments([]);
    setCurrentPage(1);
    setStatusOverrides({});
  }

  // Combine initial slice with any infinite-scroll loaded shipments and apply statusOverrides
  const shipments = React.useMemo(() => {
    const existingIds = new Set(initialShipments.map((s) => s.id));
    const uniqueAdditional = additionalShipments.filter((s) => !existingIds.has(s.id));
    return [...initialShipments, ...uniqueAdditional].map((s) => {
      const override = statusOverrides[s.id];
      return override ? { ...s, status: override } : s;
    });
  }, [initialShipments, additionalShipments, statusOverrides]);

  // Selection & Columns
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column Visibility Hook
  const { visibleColumns, handleColumnChange, handleColumnReset } =
    useAdminTableColumns(shipmentColumnOptions);

  // Row action feedback
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<{ id: string; msg: string; isError?: boolean } | null>(
    null
  );

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update URL params
  const updateQueryParams = useCallback(
    (updates: { q?: string; filter?: ShipmentFilter; provider?: ShipmentProviderFilter }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.q !== undefined) {
        if (updates.q.trim()) params.set("q", updates.q.trim());
        else params.delete("q");
      }
      if (updates.filter !== undefined) {
        if (updates.filter && updates.filter !== "all") params.set("filter", updates.filter);
        else params.delete("filter");
      }
      if (updates.provider !== undefined) {
        if (updates.provider && updates.provider !== "ALL") params.set("provider", updates.provider);
        else params.delete("provider");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/admin/shipping?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Debounced search
  useEffect(() => {
    if (searchValue === currentSearch) return;
    const timer = setTimeout(() => {
      updateQueryParams({ q: searchValue });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateQueryParams]);

  // Load more for infinite scroll
  const handleLoadMore = async () => {
    if (isLoadingMore || shipments.length >= total) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await loadMoreAdminShipmentsAction({
        page: nextPage,
        pageSize: 20,
        search: currentSearch || undefined,
        filter: currentFilter,
        provider: currentProvider !== "ALL" ? currentProvider : undefined,
      });
      setAdditionalShipments((prev) => [...prev, ...res.shipments]);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("[AdminShipmentsTable] loadMore error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(shipments.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy tracking number
  const handleCopyTracking = (id: string, tracking: string | null) => {
    if (!tracking) return;
    navigator.clipboard.writeText(tracking).catch(() => {});
    setCopiedTrackingId(id);
    setTimeout(() => {
      setCopiedTrackingId(null);
    }, 2000);
  };

  // 1-Click Steadfast sync
  const handleSyncShipment = async (shipmentId: string) => {
    setSyncingId(shipmentId);
    setSyncNotice(null);
    try {
      const res = await syncSingleShipmentAction(shipmentId);
      if (res.success && res.status) {
        setStatusOverrides((prev) => ({ ...prev, [shipmentId]: res.status! }));
        setSyncNotice({ id: shipmentId, msg: res.message });
      } else {
        setSyncNotice({ id: shipmentId, msg: res.message || "Sync failed", isError: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync error";
      setSyncNotice({ id: shipmentId, msg, isError: true });
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  // Export CSV
  const exportCsv = (itemsToExport?: AdminShipmentListItem[]) => {
    const data =
      itemsToExport ??
      (selectedIds.size > 0 ? shipments.filter((s) => selectedIds.has(s.id)) : shipments);

    exportToCsv({
      filename: `vibelock-shipments-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Order Number",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Provider",
        "Consignment ID",
        "Tracking Number",
        "Shipping Method",
        "Shipping Amount (BDT)",
        "Order Total (BDT)",
        "Payment Method",
        "Payment Status",
        "Shipment Status",
        "Created At",
        "Shipped At",
        "Delivered At",
      ],
      rows: data.map((s) => [
        s.orderNumber,
        s.customerName || "Guest",
        s.customerPhone || "",
        s.customerEmail,
        s.provider,
        s.providerShipmentId || "",
        s.trackingNumber || "",
        s.shippingMethodName,
        s.shippingAmount,
        s.orderTotal,
        s.paymentMethod,
        s.paymentStatus,
        s.status,
        new Date(s.createdAt).toISOString(),
        s.shippedAt ? new Date(s.shippedAt).toISOString() : "",
        s.deliveredAt ? new Date(s.deliveredAt).toISOString() : "",
      ]),
    });
  };

  // Status tabs definition
  const tabs: AdminTableTabItem<ShipmentFilter>[] = [
    { key: "all", label: "All Shipments", count: segmentCounts.all },
    { key: "in_transit", label: "In Transit", count: segmentCounts.in_transit, dotColor: "bg-purple-500" },
    { key: "delivered", label: "Delivered", count: segmentCounts.delivered, dotColor: "bg-emerald-500" },
    { key: "returned", label: "Returned (RTO)", count: segmentCounts.returned, dotColor: "bg-rose-500" },
    { key: "pending", label: "Pending", count: segmentCounts.pending, dotColor: "bg-amber-500" },
  ];

  const hasActiveFilters = Boolean(
    searchValue || currentFilter !== "all" || currentProvider !== "ALL"
  );

  return (
    <div className="space-y-4">
      {/* ── Status Tabs Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTableTabs<ShipmentFilter>
          tabs={tabs}
          activeKey={currentFilter}
          onChange={(tabKey) => updateQueryParams({ filter: tabKey })}
        />
      </div>

      {/* ── Controls Row (Search, Provider Filter, Column Vis, Export CSV) ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search Input with / shortcut */}
          <AdminTableSearchInput
            inputRef={searchInputRef}
            value={searchValue}
            onChange={setSearchValue}
            onClear={() => {
              setSearchValue("");
              updateQueryParams({ q: "" });
            }}
            placeholder="Search tracking, order #, or customer... (Press / to focus)"
            className="w-full sm:max-w-md"
          />

          {/* Courier Provider Filter */}
          <AdminTableFilterSelect<ShipmentProviderFilter>
            value={currentProvider}
            onChange={(provider) => updateQueryParams({ provider })}
            options={[
              { value: "ALL", label: "All Couriers" },
              { value: "STEADFAST", label: "Steadfast Courier" },
              { value: "MANUAL", label: "Manual / In-House" },
              { value: "PATHAO", label: "Pathao Courier" },
            ]}
            icon={Truck}
            ariaLabel="Filter by Courier Provider"
          />

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                updateQueryParams({ q: "", filter: "all", provider: "ALL" });
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset filters
            </button>
          )}
        </div>

        {/* Right Action Tools: Columns & CSV Export */}
        <div className="flex items-center gap-2">
          <AdminTableColumnVisibility<ShipmentColumnKey>
            columns={shipmentColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />

          <button
            type="button"
            onClick={() => exportCsv()}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export CSV of parcels"
          >
            <Download className="size-4" />
            <span>
              {selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : "Export CSV"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Result Counter & Active Filters Indicator ── */}
      <AdminTableMetaBar
        currentCount={shipments.length}
        totalFiltered={total}
        itemName="shipment"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearchValue("");
          updateQueryParams({ q: "", filter: "all", provider: "ALL" });
        }}
      />

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-900 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#00D9FF] text-[11px] font-bold text-[#101114]">
              {selectedIds.size}
            </span>
            <span className="font-medium text-neutral-200">
              {selectedIds.size} parcel{selectedIds.size === 1 ? "" : "s"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCsv()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Download className="size-3.5" />
              Export Selected CSV
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="size-3.5" />
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* ── Main Shipments Table ── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-3 text-center">
              <input
                type="checkbox"
                checked={
                  shipments.length > 0 && shipments.every((s) => selectedIds.has(s.id))
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label="Select all shipments"
                className="size-4 rounded border-neutral-300 text-[#101114] focus:ring-[#00D9FF]"
              />
            </TableHead>
            <TableHead>Order</TableHead>
            {visibleColumns.customer && <TableHead>Customer & Phone</TableHead>}
            {visibleColumns.courier && (
              <TableHead>Courier & Tracking</TableHead>
            )}
            {visibleColumns.method && <TableHead>Method</TableHead>}
            {visibleColumns.amounts && <TableHead>Amounts & COD</TableHead>}
            {visibleColumns.status && <TableHead>Status</TableHead>}
            {visibleColumns.dates && <TableHead>Timeline</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-14 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Truck className="size-10 text-neutral-300" />
                  <p className="text-sm font-semibold text-neutral-800">No shipments found</p>
                  <p className="max-w-xs text-xs text-neutral-500">
                    {hasActiveFilters
                      ? "Try clearing your search query or filter settings to see more parcels."
                      : "Orders ready for dispatch will appear here once booked."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue("");
                        updateQueryParams({ q: "", filter: "all", provider: "ALL" });
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <RotateCcw className="size-3" />
                      Clear filters
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            shipments.map((shipment) => {
              const isSelected = selectedIds.has(shipment.id);
              const statusBadge = getShipmentStatusBadgeInfo(shipment.status);
              const isSteadfast = shipment.provider.toUpperCase().includes("STEADFAST");
              const isSyncing = syncingId === shipment.id;
              const feedback = syncNotice?.id === shipment.id ? syncNotice : null;
              const waUrl = generateShipmentWhatsAppUrl(
                shipment.customerPhone,
                shipment.orderNumber,
                shipment.customerName,
                shipment.trackingNumber,
                shipment.provider,
                shipment.status
              );

              return (
                <TableRow
                  key={shipment.id}
                  className={isSelected ? "bg-cyan-50/40" : undefined}
                >
                  {/* Row Checkbox */}
                  <TableCell className="w-10 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(shipment.id)}
                      aria-label={`Select shipment for order ${shipment.orderNumber}`}
                      className="size-4 rounded border-neutral-300 text-[#101114] focus:ring-[#00D9FF]"
                    />
                  </TableCell>

                  {/* Order Column */}
                  <TableCell>
                    <div className="font-semibold text-neutral-900">
                      <Link
                        href={`/admin/orders/${shipment.orderId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {shipment.orderNumber}
                      </Link>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {shipment.paymentMethod} • {shipment.paymentStatus}
                    </span>
                  </TableCell>

                  {/* Customer Column */}
                  {visibleColumns.customer && (
                    <TableCell>
                      <div className="font-medium text-neutral-900">
                        {shipment.customerName || "Guest Customer"}
                      </div>
                      {shipment.customerPhone && (
                        <div className="font-mono text-[11px] text-neutral-500">
                          {shipment.customerPhone}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Courier & Tracking Column */}
                  {visibleColumns.courier && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isSteadfast
                              ? "border border-amber-200/90 bg-amber-50 text-amber-900 shadow-2xs"
                              : "border border-neutral-200 bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isSteadfast ? "bg-amber-500" : "bg-neutral-500"
                            }`}
                          />
                          {shipment.provider}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {shipment.trackingNumber || shipment.providerShipmentId ? (
                          <>
                            <span className="font-mono text-[11px] font-medium text-neutral-800">
                              {shipment.trackingNumber || shipment.providerShipmentId}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyTracking(
                                  shipment.id,
                                  shipment.trackingNumber || shipment.providerShipmentId
                                )
                              }
                              title="Copy tracking number"
                              className="rounded p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                            >
                              {copiedTrackingId === shipment.id ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            Pending assignment
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Method Column */}
                  {visibleColumns.method && (
                    <TableCell>
                      <span className="font-medium text-neutral-800">
                        {shipment.shippingMethodName || "Standard Shipping"}
                      </span>
                    </TableCell>
                  )}

                  {/* Amounts Column */}
                  {visibleColumns.amounts && (
                    <TableCell>
                      <div className="font-medium text-neutral-900">
                        {formatCurrency(shipment.shippingAmount)}
                        <span className="text-[10px] text-neutral-400 ml-1">fee</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Total: {formatCurrency(shipment.orderTotal)}
                      </div>
                    </TableCell>
                  )}

                  {/* Status Column */}
                  {visibleColumns.status && (
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge.badgeClass}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusBadge.dotColor}`} />
                          {statusBadge.label}
                        </span>

                        {/* Live sync inline feedback */}
                        {feedback && (
                          <span
                            className={`text-[10px] font-medium ${
                              feedback.isError ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {feedback.msg}
                          </span>
                        )}

                        {shipment.failureReason && (
                          <span className="text-[10px] text-rose-600 max-w-[180px] truncate" title={shipment.failureReason}>
                            {shipment.failureReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Dates Column */}
                  {visibleColumns.dates && (
                    <TableCell className="text-[11px] text-neutral-500">
                      <div>Created: {formatDate(shipment.createdAt)}</div>
                      {shipment.deliveredAt ? (
                        <div className="text-emerald-700 font-medium">
                          Delivered: {formatDate(shipment.deliveredAt)}
                        </div>
                      ) : shipment.shippedAt ? (
                        <div>Dispatched: {formatDate(shipment.shippedAt)}</div>
                      ) : null}
                    </TableCell>
                  )}

                  {/* Action Buttons Column */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* 1-Click Steadfast Sync Button */}
                      {isSteadfast && shipment.providerShipmentId && (
                        <button
                          type="button"
                          onClick={() => handleSyncShipment(shipment.id)}
                          disabled={isSyncing}
                          title="Sync live status from Steadfast"
                          aria-label="Sync live status from Steadfast"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-50"
                        >
                          {isSyncing ? (
                            <Loader2 className="size-3.5 animate-spin text-amber-600" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                        </button>
                      )}

                      {/* 1-Click WhatsApp Parcel Alert */}
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Send parcel status update via WhatsApp"
                          aria-label="Send parcel update via WhatsApp"
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      ) : null}

                      {/* View Shipment in Order Link */}
                      <Link
                        href={`/admin/orders/${shipment.orderId}#courier-dispatch-card`}
                        title="View order and courier dispatch details"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
                      >
                        <Eye className="size-3.5 text-neutral-500" />
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

      {/* ── Infinite Scroll Sentinel & Loader ── */}
      <AdminTableInfiniteScroll
        hasMore={shipments.length < total}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={shipments.length}
        totalCount={total}
        itemName="shipments"
      />
    </div>
  );
}
