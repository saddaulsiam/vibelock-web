"use client";

import {
  AdminTableColumnVisibility,
  type ColumnOption,
} from "@/components/admin/admin-table-column-visibility";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/admin-table-controls";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { CouponCreateModal } from "@/components/admin/coupon-create-modal";
import { CouponDeleteModal } from "@/components/admin/coupon-delete-modal";
import { loadMoreAdminCouponsAction, toggleCouponStatusAction } from "@/lib/admin/coupon-actions";
import {
  couponStatus,
  type AdminCouponListItem,
  type CouponFilter,
} from "@/lib/admin/coupon-shared";
import { DiscountType } from "@prisma/client";
import {
  Check,
  Copy,
  Download,
  Edit,
  Loader2,
  MessageCircle,
  Plus,
  Power,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useRef, useState, useTransition } from "react";

export type CouponColumnKey = "benefit" | "usage" | "validity" | "status";

const couponColumnOptions: ColumnOption<CouponColumnKey>[] = [
  { key: "benefit", label: "Discount Benefit" },
  { key: "usage", label: "Usage / Redemptions" },
  { key: "validity", label: "Validity Schedule" },
  { key: "status", label: "Status" },
];

interface AdminCouponsTableProps {
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
}

function formatCurrency(val: unknown): string {
  const num = typeof val === "number" ? val : Number(val || 0);
  return `৳${Math.round(num).toLocaleString()}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "No expiry";
  return new Date(date).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getValidityNote(
  startDate: Date | null,
  endDate: Date | null
): { text: string; tone: "normal" | "warning" | "expired" } {
  const now = new Date();
  if (endDate && endDate < now) {
    return { text: `Expired on ${formatDate(endDate)}`, tone: "expired" };
  }
  if (startDate && startDate > now) {
    return { text: `Starts on ${formatDate(startDate)}`, tone: "warning" };
  }
  if (endDate) {
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return { text: `Expires in ${diffDays} day${diffDays === 1 ? "" : "s"}!`, tone: "warning" };
    }
    return { text: `Valid until ${formatDate(endDate)}`, tone: "normal" };
  }
  return { text: "No expiration date", tone: "normal" };
}

export function AdminCouponsTable({
  coupons: initialCoupons,
  total,
  currentSearch = "",
  currentFilter = "all",
  currentType,
  segmentCounts = { all: total, active: 0, expired: 0, inactive: 0 },
}: AdminCouponsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Local state for search and filtering
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<CouponColumnKey, boolean>>({
    benefit: true,
    usage: true,
    validity: true,
    status: true,
  });

  const visibleColumnCount =
    2 +
    (visibleColumns.benefit ? 1 : 0) +
    (visibleColumns.usage ? 1 : 0) +
    (visibleColumns.validity ? 1 : 0) +
    (visibleColumns.status ? 1 : 0);

  // Status overrides for instantaneous UI feedback without cascading useEffect
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});

  // Additional loaded coupons for infinite scroll
  const [additionalCoupons, setAdditionalCoupons] = useState<AdminCouponListItem[]>([]);
  const [prevCoupons, setPrevCoupons] = useState(initialCoupons);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // When initialCoupons updates due to search or filter change, reset additional items
  if (initialCoupons !== prevCoupons) {
    setPrevCoupons(initialCoupons);
    setAdditionalCoupons([]);
    setPageNumber(1);
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

  // 1-Click WhatsApp promotional share text generator
  const handleSharePromoWhatsApp = (coupon: AdminCouponListItem) => {
    const discountText =
      coupon.discountType === "PERCENTAGE"
        ? `${coupon.discountValue}% OFF`
        : `${formatCurrency(coupon.discountValue)} OFF`;

    const minSpendText =
      coupon.minOrderValue && Number(coupon.minOrderValue) > 0
        ? ` (Min order: ${formatCurrency(coupon.minOrderValue)})`
        : "";

    const promoMessage = `🔥 *Special Offer from VibeLock Streetwear!* 🔥\n\nUse exclusive coupon code *${coupon.code}* at checkout to enjoy *${discountText}* on your order${minSpendText}!\n\n🛒 Claim your discount here:\nhttps://vibelock.bd/cart\n\n_Hurry, limited-time promotion!_`;

    const url = `https://wa.me/?text=${encodeURIComponent(promoMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
    router.push("/admin/coupons");
  };

  // CSV Export with formula injection defense (matches other tables)
  const exportCsv = () => {
    const safeCell = (val: unknown) => {
      const text = String(val ?? "");
      const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
    };

    const headers = [
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
    ];

    const rows = couponsList.map((c) => {
      const status = couponStatus(c);
      return [
        safeCell(c.code),
        safeCell(c.discountType),
        safeCell(c.discountValue),
        safeCell(c.minOrderValue ?? ""),
        safeCell(c.usageCount),
        safeCell(c.usageLimit ?? "Unlimited"),
        safeCell(status),
        safeCell(c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : ""),
        safeCell(c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : ""),
        safeCell(new Date(c.createdAt).toISOString().slice(0, 10)),
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vibelock-coupons-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tab definitions
  const tabs: AdminTableTabItem<CouponFilter>[] = [
    { key: "all", label: "All Coupons", count: segmentCounts.all },
    {
      key: "active",
      label: "Active & Live",
      count: segmentCounts.active,
      dotColor: "bg-emerald-500",
    },
    {
      key: "expired",
      label: "Expired / Depleted",
      count: segmentCounts.expired,
      dotColor: "bg-rose-500",
    },
    {
      key: "inactive",
      label: "Paused / Inactive",
      count: segmentCounts.inactive,
      dotColor: "bg-neutral-400",
    },
  ];

  const hasActiveFilters = Boolean(
    currentSearch || currentFilter !== "all" || (currentType && currentType !== ("ALL" as unknown))
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Segment Status Filter Tabs (Matches Customers & Orders) ── */}
      <AdminTableTabs
        tabs={tabs}
        activeKey={currentFilter}
        onChange={(seg) => updateFilters({ status: seg })}
      />

      {/* ── 2. Search & Toolbar Controls (Matches Products, Orders & Customers) ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Form with '/' hotkey */}
          <form onSubmit={handleSearchSubmit} className="max-w-md flex-1">
            <AdminTableSearchInput
              value={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              onClear={handleClearSearch}
              placeholder="Search coupon code (press / to focus)..."
              inputRef={searchInputRef}
            />
          </form>

          {/* Discount Type Filter Dropdown */}
          <select
            value={currentType || "ALL"}
            onChange={(e) => updateFilters({ type: e.target.value })}
            aria-label="Filter by discount type"
            className={ADMIN_TABLE_CLASSES.select}
          >
            <option value="ALL">All Discount Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Amount (৳)</option>
          </select>
        </div>

        {/* Right Action Controls: Columns Customizer, Export CSV & Create Coupon */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={couponColumnOptions}
            visibleColumns={visibleColumns}
            onChange={(key, val) => setVisibleColumns((prev) => ({ ...prev, [key]: val }))}
            buttonClassName={ADMIN_TABLE_CLASSES.buttonSecondary}
            onReset={() =>
              setVisibleColumns({
                benefit: true,
                usage: true,
                validity: true,
                status: true,
              })
            }
          />

          <button
            type="button"
            onClick={exportCsv}
            disabled={couponsList.length === 0}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export coupons to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCouponToEdit(null);
              setIsCreateOpen(true);
            }}
            className={ADMIN_TABLE_CLASSES.buttonPrimary}
          >
            <Plus className="size-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* ── 3. Meta Counter & Active Filter Reset (Matches Orders Table) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <p>
            Showing <strong className="text-neutral-900">{couponsList.length}</strong> of{" "}
            <strong className="text-neutral-900">{total}</strong>{" "}
            {total === 1 ? "coupon" : "coupons"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 font-semibold text-[#101114] hover:text-[#00D9FF] hover:underline"
              title="Reset all active filters"
            >
              <RotateCcw className="size-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Coupons Data Table (Desktop & Tablet) ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              <th className="py-3.5 pr-3 pl-5">Coupon Code</th>
              {visibleColumns.benefit && <th className="px-3 py-3.5">Discount Benefit</th>}
              {visibleColumns.usage && <th className="px-3 py-3.5">Usage / Redemptions</th>}
              {visibleColumns.validity && <th className="px-3 py-3.5">Validity Schedule</th>}
              {visibleColumns.status && <th className="px-3 py-3.5">Status</th>}
              <th className="py-3.5 pr-5 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {couponsList.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="py-16 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-4 ring-purple-50">
                    <Tag className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-neutral-900">No coupons found</h4>
                  <p className="mt-1 text-xs text-neutral-500">
                    {hasActiveFilters
                      ? "Try adjusting your search terms or filters."
                      : "Create your first promotional discount coupon to boost customer orders."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponToEdit(null);
                      setIsCreateOpen(true);
                    }}
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#101114] px-4 text-xs font-bold text-white shadow-2xs hover:bg-neutral-800"
                  >
                    <Plus className="size-3.5" />
                    <span>Create Coupon</span>
                  </button>
                </td>
              </tr>
            ) : (
              couponsList.map((coupon) => {
                const status = couponStatus(coupon);
                const validity = getValidityNote(coupon.startDate, coupon.endDate);
                const isToggling = togglingId === coupon.id;
                const usagePercent =
                  coupon.usageLimit && coupon.usageLimit > 0
                    ? Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100))
                    : null;

                return (
                  <tr key={coupon.id} className={ADMIN_TABLE_CLASSES.tr}>
                    {/* 1. Code & Copy */}
                    <td className="py-4 pr-3 pl-5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-purple-900 shadow-2xs">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          title="Copy coupon code"
                          className="flex size-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="mt-1 block text-[10px] text-neutral-400">
                        Created {formatDate(coupon.createdAt)}
                      </span>
                    </td>

                    {/* 2. Discount Benefit */}
                    {visibleColumns.benefit && (
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            {coupon.discountType === "PERCENTAGE"
                              ? `${coupon.discountValue}% OFF`
                              : `${formatCurrency(coupon.discountValue)} OFF`}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">
                          {coupon.minOrderValue && Number(coupon.minOrderValue) > 0
                            ? `Min spend ${formatCurrency(coupon.minOrderValue)}`
                            : "No minimum spend"}
                        </div>
                      </td>
                    )}

                    {/* 3. Usage / Redemptions Meter */}
                    {visibleColumns.usage && (
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">
                            {coupon.usageCount.toLocaleString()}
                          </span>
                          <span className="text-neutral-400">
                            / {coupon.usageLimit ? coupon.usageLimit.toLocaleString() : "∞"}
                          </span>
                        </div>

                        {usagePercent !== null ? (
                          <div className="mt-1.5 w-32">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent >= 100
                                    ? "bg-rose-500"
                                    : usagePercent >= 80
                                      ? "bg-amber-500"
                                      : "bg-purple-600"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <span className="mt-0.5 block text-[10px] text-neutral-400">
                              {usagePercent}% redeemed
                            </span>
                          </div>
                        ) : (
                          <span className="mt-0.5 block text-[10px] text-neutral-400">
                            Unlimited uses
                          </span>
                        )}
                      </td>
                    )}

                    {/* 4. Validity Schedule */}
                    {visibleColumns.validity && (
                      <td className="px-3 py-4">
                        <div
                          className={`font-semibold ${
                            validity.tone === "expired"
                              ? "text-rose-600"
                              : validity.tone === "warning"
                                ? "font-bold text-amber-600"
                                : "text-neutral-700"
                          }`}
                        >
                          {validity.text}
                        </div>
                        <span className="mt-0.5 block text-[10px] text-neutral-400">
                          {coupon.startDate ? `From ${formatDate(coupon.startDate)}` : "Immediate"}
                        </span>
                      </td>
                    )}

                    {/* 5. Status Badge */}
                    {visibleColumns.status && (
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            status === "ACTIVE"
                              ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                              : status === "DEPLETED"
                                ? "border border-amber-300 bg-amber-50 text-amber-800"
                                : status === "EXPIRED"
                                  ? "border border-rose-300 bg-rose-50 text-rose-800"
                                  : "border border-neutral-300 bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              status === "ACTIVE"
                                ? "animate-pulse bg-emerald-500"
                                : status === "DEPLETED"
                                  ? "bg-amber-500"
                                  : status === "EXPIRED"
                                    ? "bg-rose-500"
                                    : "bg-neutral-400"
                            }`}
                          />
                          <span>{status}</span>
                        </span>
                      </td>
                    )}

                    {/* 6. Quick Action Hub */}
                    <td className="py-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Active Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon)}
                          disabled={isToggling}
                          title={coupon.isActive ? "Pause Coupon" : "Activate Coupon"}
                          className={`flex size-8 items-center justify-center rounded-lg border transition ${
                            coupon.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-neutral-200 bg-white text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Power className="size-3.5" />
                          )}
                        </button>

                        {/* WhatsApp Promo Blast Share */}
                        <button
                          type="button"
                          onClick={() => handleSharePromoWhatsApp(coupon)}
                          title="Share promotional message on WhatsApp"
                          className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <MessageCircle className="size-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCouponToEdit(coupon);
                            setIsCreateOpen(true);
                          }}
                          title="Edit coupon settings"
                          className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
                        >
                          <Edit className="size-3.5" />
                        </button>

                        {/* Safe Delete / Deactivate Button */}
                        <button
                          type="button"
                          onClick={() => setCouponToDelete(coupon)}
                          title={
                            coupon.usageCount > 0 ? "Deactivate Coupon" : "Delete Unused Coupon"
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 5. Mobile Responsive Cards View ── */}
      <div className="space-y-3 md:hidden">
        {couponsList.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-500">
            No coupons found matching your criteria.
          </div>
        ) : (
          couponsList.map((coupon) => {
            const status = couponStatus(coupon);
            const validity = getValidityNote(coupon.startDate, coupon.endDate);
            const isToggling = togglingId === coupon.id;

            return (
              <div
                key={coupon.id}
                className="space-y-3 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-purple-900">
                      {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-1 text-neutral-400 hover:text-neutral-700"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      status === "ACTIVE"
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900">
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}% OFF`
                        : `${formatCurrency(coupon.discountValue)} OFF`}
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      {coupon.minOrderValue && Number(coupon.minOrderValue) > 0
                        ? `Min ${formatCurrency(coupon.minOrderValue)}`
                        : "No minimum"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900">
                      {coupon.usageCount} / {coupon.usageLimit ?? "∞"} used
                    </span>
                    <span className="block text-[10px] text-neutral-400">{validity.text}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(coupon)}
                    disabled={isToggling}
                    className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${
                      coupon.isActive
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <Power className="size-3" />
                    <span>{coupon.isActive ? "Active" : "Paused"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSharePromoWhatsApp(coupon)}
                    className="flex h-8 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700"
                  >
                    <MessageCircle className="size-3" />
                    <span>Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCouponToEdit(coupon);
                      setIsCreateOpen(true);
                    }}
                    className="flex h-8 items-center gap-1 rounded-md border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700"
                  >
                    <Edit className="size-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponToDelete(coupon)}
                    className="flex h-8 items-center justify-center rounded-md border border-neutral-200 px-2 text-neutral-500 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 6. Shared AdminTableInfiniteScroll Sentinel & Load More Controls (Matches Orders & Customers) ── */}
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
