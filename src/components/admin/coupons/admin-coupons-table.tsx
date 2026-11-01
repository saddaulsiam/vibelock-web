"use client";

import * as React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DiscountType } from "@prisma/client";
import { Check, X } from "lucide-react";
import { useAdminTableColumns, AdminTableInfiniteScroll } from "@/components/admin/shared";
import { CouponCreateModal } from "@/components/admin/coupons/coupon-create-modal";
import { CouponDeleteModal } from "@/components/admin/coupons/coupon-delete-modal";
import {
  bulkDeleteCouponsAction,
  bulkUpdateCouponStatusAction,
  loadMoreAdminCouponsAction,
  toggleCouponStatusAction,
} from "@/lib/admin/coupons/coupon-actions";
import {
  couponStatus,
  type AdminCouponListItem,
  type CouponFilter,
} from "@/lib/admin/coupons/coupon-shared";
import { exportToCsv } from "@/lib/admin/shared";
import { couponColumnOptions } from "./coupon-table-types";
import { sharePromoWhatsApp } from "./coupon-table-utils";
import { AdminCouponsToolbar } from "./admin-coupons-toolbar";
import { AdminCouponsBulkBar } from "./admin-coupons-bulk-bar";
import { AdminCouponsDesktopTable } from "./admin-coupons-desktop-table";
import { AdminCouponsMobileList } from "./admin-coupons-mobile-list";

export { type CouponColumnKey, couponColumnOptions } from "./coupon-table-types";

export interface AdminCouponsTableProps {
  coupons: AdminCouponListItem[];
  total: number;
  currentSearch?: string;
  currentFilter?: CouponFilter;
  currentType?: DiscountType;
  segmentCounts?: {
    all: number;
    active: number;
    expired: number;
    inactive: number;
  };
  allCategories?: { id: string; name: string; slug: string }[];
}

export function AdminCouponsTable({
  coupons: initialCoupons,
  total,
  currentSearch = "",
  currentFilter = "all",
  currentType,
  segmentCounts = { all: total, active: 0, expired: 0, inactive: 0 },
  allCategories = [],
}: AdminCouponsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Local state for search and filtering
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto-dismiss operational feedback after 4s
  useEffect(() => {
    if (!feedbackMessage) return;
    const t = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

  // Column Visibility Hook
  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(couponColumnOptions);

  const visibleColumnCount = 3 + totalVisibleCols; // Checkbox + Code + Actions + visible cols

  // Status overrides for instantaneous UI feedback without cascading useEffect
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});

  // Additional loaded coupons for infinite scroll
  const [additionalCoupons, setAdditionalCoupons] = useState<AdminCouponListItem[]>([]);
  const [prevCoupons, setPrevCoupons] = useState(initialCoupons);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // When initialCoupons updates due to search or filter change, reset additional items & selection
  if (initialCoupons !== prevCoupons) {
    setPrevCoupons(initialCoupons);
    setAdditionalCoupons([]);
    setPageNumber(1);
    setSelectedIds(new Set());
  }

  // Combine initial slice with any infinite-scroll loaded coupons
  const rawCombined = React.useMemo(() => {
    const existingIds = new Set(initialCoupons.map((c) => c.id));
    return [...initialCoupons, ...additionalCoupons.filter((c) => !existingIds.has(c.id))];
  }, [initialCoupons, additionalCoupons]);

  const couponsList = rawCombined.map((c) => ({
    ...c,
    isActive: statusOverrides[c.id] !== undefined ? statusOverrides[c.id] : c.isActive,
  }));

  const hasMore = couponsList.length < total;

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pageNumber + 1;
      const res = await loadMoreAdminCouponsAction({
        search: currentSearch || undefined,
        filter: currentFilter !== "all" ? currentFilter : undefined,
        type: currentType,
        page: nextPage,
      });

      if (res && res.coupons.length > 0) {
        setAdditionalCoupons((prev) => [...prev, ...res.coupons]);
        setPageNumber(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more coupons:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentFilter, currentSearch, currentType, hasMore, isLoadingMore, pageNumber]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<AdminCouponListItem | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<AdminCouponListItem | null>(null);

  // Toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Focus search input with '/' keyboard shortcut (matches orders & products tables)
  useEffect(() => {
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

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 1-Click WhatsApp promotional share
  const handleSharePromoWhatsApp = (coupon: AdminCouponListItem) => {
    sharePromoWhatsApp(coupon);
  };

  // 1-Click quick toggle status
  const handleToggleStatus = (coupon: AdminCouponListItem) => {
    setTogglingId(coupon.id);
    startTransition(async () => {
      const res = await toggleCouponStatusAction(coupon.id);
      if (res.success && typeof res.newStatus === "boolean") {
        setStatusOverrides((prev) => ({ ...prev, [coupon.id]: res.newStatus! }));
        router.refresh();
      }
      setTogglingId(null);
    });
  };

  // Navigation sync for filters
  const updateFilters = (updates: {
    q?: string | null;
    status?: string | null;
    type?: string | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      if (updates.q && updates.q.trim()) {
        params.set("q", updates.q.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
    }

    if (updates.status !== undefined) {
      if (updates.status && updates.status !== "all") {
        params.set("status", updates.status);
      } else {
        params.delete("status");
      }
      params.delete("page");
    }

    if (updates.type !== undefined) {
      if (updates.type && updates.type !== "ALL") {
        params.set("type", updates.type);
      } else {
        params.delete("type");
      }
      params.delete("page");
    }

    const query = params.toString();
    router.push(`/admin/coupons${query ? `?${query}` : ""}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateFilters({ q: "" });
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setSelectedIds(new Set());
    router.push("/admin/coupons");
  };

  // Selection logic
  const isAllSelected = couponsList.length > 0 && couponsList.every((c) => selectedIds.has(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(couponsList.map((c) => c.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk activate selected coupons
  const handleBulkActivate = async () => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateCouponStatusAction(ids, true);
      if (res.success) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          ids.forEach((id) => {
            next[id] = true;
          });
          return next;
        });
        setFeedbackMessage({
          type: "success",
          text: `Activated ${res.updatedCount ?? ids.length} coupon(s).`,
        });
        router.refresh();
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to activate coupons." });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Failed to activate selected coupons." });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Bulk pause selected coupons
  const handleBulkPause = async () => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateCouponStatusAction(ids, false);
      if (res.success) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          ids.forEach((id) => {
            next[id] = false;
          });
          return next;
        });
        setFeedbackMessage({
          type: "success",
          text: `Paused ${res.updatedCount ?? ids.length} coupon(s).`,
        });
        router.refresh();
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to pause coupons." });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Failed to pause selected coupons." });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Bulk export selected coupons to CSV
  const handleBulkExportCsv = () => {
    const selected = couponsList.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    exportCsv(selected);
  };

  // Bulk delete selected coupons (audited)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    const confirmMessage = `Are you sure you want to delete ${selectedIds.size} selected coupon(s)? Coupons with existing order redemptions will be safely deactivated instead of deleted to protect order audit trails.`;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteCouponsAction(ids);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: res.message || `Processed ${ids.length} coupon(s).`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to delete selected coupons.",
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Failed to delete selected coupons." });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // CSV Export with formula injection defense (matches other tables)
  const exportCsv = (itemsToExport?: AdminCouponListItem[]) => {
    const list = itemsToExport && itemsToExport.length > 0 ? itemsToExport : couponsList;

    exportToCsv({
      filename: `vibelock-coupons-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Coupon Code",
        "Discount Type",
        "Discount Value",
        "Min Order Value",
        "Usage Count",
        "Usage Limit",
        "Status",
        "Start Date",
        "End Date",
        "Created Date",
      ],
      rows: list.map((c) => {
        const status = couponStatus(c);
        return [
          c.code,
          c.discountType,
          c.discountValue,
          c.minOrderValue ?? "",
          c.usageCount,
          c.usageLimit ?? "Unlimited",
          status,
          c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : "",
          c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : "",
          new Date(c.createdAt).toISOString().slice(0, 10),
        ];
      }),
    });
  };

  const hasActiveFilters = Boolean(
    currentSearch || currentFilter !== "all" || (currentType && currentType !== ("ALL" as unknown))
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar & Filter Controls ── */}
      <AdminCouponsToolbar
        currentFilter={currentFilter}
        onFilterChange={(seg) => updateFilters({ status: seg })}
        segmentCounts={segmentCounts}
        searchTerm={searchTerm}
        onSearchChange={(val) => setSearchTerm(val)}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        searchInputRef={searchInputRef}
        currentType={currentType}
        onTypeChange={(type) => updateFilters({ type })}
        visibleColumns={visibleColumns}
        onColumnChange={handleColumnChange}
        onColumnReset={handleColumnReset}
        onExportCsv={() => exportCsv()}
        isExportDisabled={couponsList.length === 0}
        onCreateCoupon={() => {
          setCouponToEdit(null);
          setIsCreateOpen(true);
        }}
        currentCount={couponsList.length}
        totalFiltered={total}
        hasActiveFilters={hasActiveFilters}
        onResetAllFilters={handleClearAllFilters}
      />

      {/* ── Floating / Sticky Bulk Action Bar ── */}
      <AdminCouponsBulkBar
        selectedCount={selectedIds.size}
        isBulkOperating={isBulkOperating}
        onBulkActivate={handleBulkActivate}
        onBulkPause={handleBulkPause}
        onBulkExportCsv={handleBulkExportCsv}
        onBulkDelete={handleBulkDelete}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      {/* ── Operational Feedback Toast / Alert Banner ── */}
      {feedbackMessage && (
        <div
          className={`animate-in fade-in flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium shadow-2xs ${
            feedbackMessage.type === "error"
              ? "border-rose-300 bg-rose-50 text-rose-950"
              : "border-emerald-300 bg-emerald-50 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {feedbackMessage.type === "error" ? (
              <X className="size-4 text-rose-700" />
            ) : (
              <Check className="size-4 text-emerald-700" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="cursor-pointer text-neutral-500 hover:text-neutral-900"
            aria-label="Dismiss message"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Coupons Data Table (Desktop & Tablet) ── */}
      <AdminCouponsDesktopTable
        couponsList={couponsList}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleRow={handleToggleRow}
        visibleColumns={visibleColumns}
        visibleColumnCount={visibleColumnCount}
        copiedCode={copiedCode}
        onCopyCode={handleCopyCode}
        togglingId={togglingId}
        onToggleStatus={handleToggleStatus}
        onSharePromoWhatsApp={handleSharePromoWhatsApp}
        onEdit={(c) => {
          setCouponToEdit(c);
          setIsCreateOpen(true);
        }}
        onDelete={(c) => setCouponToDelete(c)}
        hasActiveFilters={hasActiveFilters}
        onCreateCoupon={() => {
          setCouponToEdit(null);
          setIsCreateOpen(true);
        }}
      />

      {/* ── Mobile Responsive Cards View ── */}
      <AdminCouponsMobileList
        couponsList={couponsList}
        selectedIds={selectedIds}
        onToggleRow={handleToggleRow}
        copiedCode={copiedCode}
        onCopyCode={handleCopyCode}
        togglingId={togglingId}
        onToggleStatus={handleToggleStatus}
        onSharePromoWhatsApp={handleSharePromoWhatsApp}
        onEdit={(c) => {
          setCouponToEdit(c);
          setIsCreateOpen(true);
        }}
        onDelete={(c) => setCouponToDelete(c)}
      />

      {/* ── Shared Infinite Scroll Sentinel ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={couponsList.length}
        totalCount={total}
        itemName="coupons"
        filterSummary={
          segmentCounts?.all && segmentCounts.all !== total
            ? `filtered from ${segmentCounts.all} total`
            : null
        }
      />

      {/* ── Create & Edit Modal ── */}
      <CouponCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        couponToEdit={couponToEdit}
        categories={allCategories}
      />

      {/* ── Safe Delete / Deactivation Modal ── */}
      <CouponDeleteModal
        coupon={couponToDelete}
        isOpen={!!couponToDelete}
        onClose={() => setCouponToDelete(null)}
      />
    </div>
  );
}
