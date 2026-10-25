"use client";

import {
  bulkAdjustInventoryAction,
  loadMoreAdminInventoryAction,
  quickAdjustInventoryAction,
} from "@/lib/admin/inventory-actions";
import type {
  AdminInventoryItem,
  AdminInventoryResult,
  InventoryFilter,
} from "@/lib/admin/inventory-queries";
import type { InventoryTransactionType } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImageOff,
  Loader2,
  Lock,
  Minus,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return "৳0";
  return `৳${Number(val).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function BarcodeSvg({ value, height = 28 }: { value: string; height?: number }) {
  const chars = value.split("");
  const bars: number[] = [2, 1, 1, 2];
  chars.forEach((char) => {
    const code = char.charCodeAt(0);
    bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
  });
  bars.push(2, 3, 1, 1, 2);

  const totalWidth = bars.reduce((acc, b) => acc + b, 0);
  let currentX = 0;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="mx-auto block h-auto w-full max-w-[130px]"
      aria-label={`Barcode: ${value}`}
    >
      {bars.map((barWidth, index) => {
        const isBlack = index % 2 === 0;
        const x = currentX;
        currentX += barWidth;
        if (!isBlack) return null;
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth}
            height={height}
            fill="#101114"
            shapeRendering="crispEdges"
          />
        );
      })}
    </svg>
  );
}

const COMMON_REASONS: Record<InventoryTransactionType, string[]> = {
  RESTOCK: [
    "Factory batch restock",
    "New seasonal shipment",
    "Supplier delivery intake",
    "Warehouse transfer in",
  ],
  ADJUSTMENT: [
    "Physical audit count correction",
    "Discrepancy reconciliation",
    "Storefront sample return",
    "Unrecorded counter movement",
  ],
  DAMAGE: [
    "Damaged in transit / fabric defect",
    "Sewing / zipper defect",
    "Stained / spoiled unit",
    "Counter display wear and tear",
  ],
  RETURN: [
    "Customer return restocked",
    "Courier return inspection pass",
    "Exchange item restocked",
  ],
  SALE: ["POS counter direct sale", "Manual retail order"],
};

export function AdminInventoryTable({
  initialData,
  currentFilters,
}: {
  initialData: AdminInventoryResult;
  currentFilters: {
    q: string;
    filter: InventoryFilter;
    page: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search input state & debounce
  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Loaded items & infinite scroll state
  const [loadedVariants, setLoadedVariants] = React.useState<AdminInventoryItem[]>(
    initialData.variants
  );
  const [currentPage, setCurrentPage] = React.useState(initialData.page || 1);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(
    (initialData.page || 1) < initialData.totalPages
  );
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Quick Stock Adjust Modal state
  const [adjustingItem, setAdjustingItem] = React.useState<AdminInventoryItem | null>(null);
  const [adjustType, setAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [adjustQuantity, setAdjustQuantity] = React.useState<string>("10");
  const [adjustReason, setAdjustReason] = React.useState<string>("Factory batch restock");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  // Bulk Adjust Modal state
  const [showBulkAdjustModal, setShowBulkAdjustModal] = React.useState(false);
  const [bulkAdjustType, setBulkAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [bulkAdjustQuantity, setBulkAdjustQuantity] = React.useState<string>("10");
  const [bulkAdjustReason, setBulkAdjustReason] = React.useState<string>("Bulk factory restock");
  const [isSubmittingBulkAdjust, setIsSubmittingBulkAdjust] = React.useState(false);

  // Barcode / Price Tag Printing Modal state
  const [barcodeModalItems, setBarcodeModalItems] = React.useState<AdminInventoryItem[] | null>(null);
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantityMode, setBarcodeQuantityMode] = React.useState<
    "one-per-variant" | "by-stock" | "custom"
  >("one-per-variant");
  const [barcodeCustomQuantity, setBarcodeCustomQuantity] = React.useState<number>(5);
  const [barcodeItemOverrides, setBarcodeItemOverrides] = React.useState<Record<string, number>>({});
  const [showVariantTuning, setShowVariantTuning] = React.useState<boolean>(false);

  // Hardware Barcode Scanner Detection buffer & indicator
  const [scannedIndicator, setScannedIndicator] = React.useState<string | null>(null);
  const scannerBufferRef = React.useRef<{ text: string; times: number[] }>({
    text: "",
    times: [],
  });

  // Copied SKU feedback
  const [copiedSku, setCopiedSku] = React.useState<string | null>(null);

  // Adjust state during render when initialData changes
  const [prevInitialData, setPrevInitialData] = React.useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setLoadedVariants(initialData.variants);
    setCurrentPage(initialData.page || 1);
    setHasMore((initialData.page || 1) < initialData.totalPages);
    setIsLoadingMore(false);
    setSelectedIds(new Set());
  }

  const [prevFilterQ, setPrevFilterQ] = React.useState(currentFilters.q);
  if (prevFilterQ !== currentFilters.q) {
    setPrevFilterQ(currentFilters.q);
    setSearchTerm(currentFilters.q);
  }

  // Helper to update URL search params
  const updateQuery = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (!val || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Keyboard shortcut '/' to focus search input, 'Escape' to blur, and hardware barcode scanner auto-detect
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      const now = Date.now();
      const buf = scannerBufferRef.current;

      // Reset buffer if more than 70ms passed since last keystroke
      if (buf.times.length > 0 && now - buf.times[buf.times.length - 1] > 70) {
        buf.text = "";
        buf.times = [];
      }

      if (e.key === "Enter") {
        if (buf.text.length >= 3) {
          const deltas = buf.times.slice(1).map((t, idx) => t - buf.times[idx]);
          const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 100;
          if (avgDelta < 50) {
            e.preventDefault();
            const scanned = buf.text.trim();
            buf.text = "";
            buf.times = [];
            setSearchTerm(scanned);
            updateQuery({ q: scanned });
            setScannedIndicator(`Scanned SKU: ${scanned}`);
            setTimeout(() => setScannedIndicator(null), 4000);
            return;
          }
        }
        buf.text = "";
        buf.times = [];
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.text += e.key;
        buf.times.push(now);
      }

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [updateQuery]);

  // Infinite Scroll Handler
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await loadMoreAdminInventoryAction({
        search: currentFilters.q,
        filter: currentFilters.filter,
        page: nextPage,
      });
      setLoadedVariants((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = res.variants.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      setCurrentPage(nextPage);
      setHasMore(nextPage < res.totalPages);
    } catch (err) {
      console.error("Failed to load more inventory items:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, currentFilters, hasMore, isLoadingMore]);

  // Setup IntersectionObserver for auto-infinite scroll
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, isLoadingMore]);

  // Debounced search handler
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateQuery({ q: val.trim() || null });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateQuery({ q: null });
    searchInputRef.current?.focus();
  };

  // Copy SKU helper
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Multi-select helpers
  const isAllSelected =
    loadedVariants.length > 0 && loadedVariants.every((v) => selectedIds.has(v.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(loadedVariants.map((v) => v.id)));
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

  // Quick Stock Adjust Submit
  const handleExecuteAdjust = async () => {
    if (!adjustingItem || isSubmittingAdjust) return;
    setAdjustError(null);

    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      setAdjustError("Please enter a valid non-zero adjustment quantity.");
      return;
    }

    // Client-side reservation validation check
    const projectedPhysical = adjustingItem.totalStock + qty;
    if (projectedPhysical < adjustingItem.reserved) {
      setAdjustError(
        `Adjustment would reduce physical stock (${projectedPhysical}) below active reservations (${adjustingItem.reserved}).`
      );
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await quickAdjustInventoryAction({
        variantId: adjustingItem.id,
        quantity: qty,
        reason: adjustReason.trim() || "Stock adjustment",
        type: adjustType,
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        // Optimistic update of loadedVariants
        setLoadedVariants((prev) =>
          prev.map((item) => {
            if (item.id !== adjustingItem.id) return item;
            const updatedStock = item.totalStock + qty;
            return {
              ...item,
              totalStock: updatedStock,
              available: updatedStock - item.reserved,
            };
          })
        );
        setFeedbackMessage(
          `Adjusted ${adjustingItem.sku} by ${qty > 0 ? `+${qty}` : qty} units.`
        );
        setAdjustingItem(null);
        router.refresh();
      }
    } catch {
      setAdjustError("Failed to adjust inventory. Please try again.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Bulk Stock Adjust Submit
  const handleExecuteBulkAdjust = async () => {
    if (selectedIds.size === 0 || isSubmittingBulkAdjust) return;
    const qty = parseInt(bulkAdjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      alert("Please enter a valid non-zero integer quantity.");
      return;
    }

    setIsSubmittingBulkAdjust(true);
    try {
      const res = await bulkAdjustInventoryAction({
        variantIds: Array.from(selectedIds),
        quantity: qty,
        reason: bulkAdjustReason.trim() || "Bulk inventory adjustment",
        type: bulkAdjustType,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setFeedbackMessage(res.message || "Bulk adjustment completed.");
        setShowBulkAdjustModal(false);
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      alert("Bulk adjustment failed.");
    } finally {
      setIsSubmittingBulkAdjust(false);
    }
  };

  // Open Quick Adjust for single item
  const handleOpenAdjustModal = (item: AdminInventoryItem) => {
    setAdjustingItem(item);
    setAdjustType("RESTOCK");
    setAdjustQuantity("10");
    setAdjustReason("Factory batch restock");
    setAdjustError(null);
  };

  const hasNegativeAnomaly = loadedVariants.some(
    (v) => v.totalStock < 0 || v.available < 0
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Quick Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => updateQuery({ filter: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.filter === "all"
              ? "bg-[#101114] text-white shadow-2xs"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-[#F3F0E8]"
          }`}
        >
          <Boxes className="size-3.5" />
          <span>All Items</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "in-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.filter === "in-stock"
              ? "bg-emerald-800 text-white shadow-2xs"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-emerald-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>In Stock (&gt;0)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "low-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.filter === "low-stock"
              ? "bg-amber-800 text-white shadow-2xs"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-amber-50"
          }`}
        >
          <AlertTriangle className="size-3 text-amber-500" />
          <span>Low Stock (1–5)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "out-of-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.filter === "out-of-stock"
              ? "bg-red-800 text-white shadow-2xs"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-red-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-red-500" />
          <span>Out of Stock (0)</span>
        </button>

        {hasNegativeAnomaly && (
          <button
            type="button"
            onClick={() => updateQuery({ filter: "negative" })}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-bold transition-colors ${
              currentFilters.filter === "negative"
                ? "bg-red-900 text-white shadow-2xs"
                : "border border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
            }`}
          >
            <AlertTriangle className="size-3.5 text-red-600 animate-pulse" />
            <span>Negative Anomaly</span>
          </button>
        )}
      </div>

      {/* ── Optional Feedback Notice ── */}
      {feedbackMessage && (
        <div className="flex items-center justify-between rounded-sm border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Search & Toolbar Controls ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar with '/' shortcut */}
        <div className="relative max-w-lg flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#101114]/40" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by SKU, product name, size, or color..."
            className="h-10 w-full rounded-sm border border-[#101114]/20 bg-white pr-10 pl-9 text-xs text-[#101114] transition-colors outline-none placeholder:text-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd
              className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center rounded border border-[#101114]/20 bg-[#F3F0E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#101114]/60 sm:inline-flex"
              title="Press / to search"
            >
              /
            </kbd>
          )}
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to CSV Button */}
          <a
            href={`/api/admin/inventory/export?q=${encodeURIComponent(currentFilters.q)}&filter=${currentFilters.filter}`}
            download
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            title="Export filtered inventory to CSV"
          >
            <Download className="size-3.5 text-[#101114]/70" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          {/* Intelligence Dashboard Link */}
          <Link
            href="/admin/inventory-intelligence"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-sm border border-[#101114] bg-[#101114] px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <span>Intelligence</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Active Filters Summary ── */}
      {(currentFilters.q || currentFilters.filter !== "all") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active filters:</span>
          {currentFilters.q && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-[#101114]/15 bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]">
              Search: “{currentFilters.q}”
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[#101114]/60 hover:text-[#101114]"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {currentFilters.filter !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-[#101114]/15 bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]">
              Filter: {currentFilters.filter}
              <button
                type="button"
                onClick={() => updateQuery({ filter: "all" })}
                className="text-[#101114]/60 hover:text-[#101114]"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => updateQuery({ q: null, filter: "all" })}
            className="text-xs font-semibold text-[#101114] underline hover:text-[#101114]/70"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── 3. Inventory Table ── */}
      <div className="overflow-x-auto rounded-sm border border-[#101114]/10 bg-white">
        <table className="w-full border-collapse text-left text-xs text-[#101114]">
          <thead className="border-b border-[#101114]/10 bg-[#FBF9F5] text-[11px] font-semibold uppercase tracking-wider text-[#101114]/70">
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all inventory items"
                  className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
                />
              </th>
              <th className="px-5 py-3">Product & Variant</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3 text-center">Physical</th>
              <th className="px-5 py-3 text-center">Reserved</th>
              <th className="px-5 py-3 text-center">Available</th>
              <th className="px-5 py-3">Pricing (Cost / Sell)</th>
              <th className="px-5 py-3">Stock Health</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/5">
            {loadedVariants.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                    <Boxes className="size-8 text-[#101114]/30" />
                    <p className="text-sm font-semibold text-[#101114]">
                      No inventory items match your search
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Try searching for a different SKU, variant attribute, or clear active filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateQuery({ q: null, filter: "all" })}
                      className="mt-2 inline-flex h-8 items-center rounded-sm bg-[#101114] px-3 font-semibold text-white hover:bg-[#101114]/85"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              loadedVariants.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isNegative = item.totalStock < 0 || item.available < 0;
                const isOutOfStock = item.available <= 0 && !isNegative;
                const isLowStock = item.available > 0 && item.available <= 5;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-[#F3F0E8]/70"
                        : isNegative
                          ? "bg-red-50/50 hover:bg-red-50"
                          : "hover:bg-[#FBF9F5]"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        aria-label={`Select ${item.sku}`}
                        className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
                      />
                    </td>

                    {/* Product & Variant Attributes */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail with Hover Zoom */}
                        <div className="group/thumb relative size-11 shrink-0">
                          <div className="relative size-11 overflow-hidden rounded-sm border border-[#101114]/15 bg-[#F2F2F2]">
                            {item.primaryImage ? (
                              <Image
                                src={item.primaryImage}
                                alt={item.product.name}
                                fill
                                sizes="44px"
                                loading="lazy"
                                className="object-cover object-center"
                                unoptimized={item.primaryImage.startsWith("blob:")}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-[#101114]/25">
                                <ImageOff className="size-4" />
                              </div>
                            )}
                          </div>

                          {/* Hover preview card */}
                          {item.primaryImage && (
                            <div className="pointer-events-none absolute top-0 left-13 z-50 hidden w-48 rounded-sm border border-[#101114]/20 bg-white p-2 shadow-2xl group-hover/thumb:block">
                              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xs bg-[#F2F2F2]">
                                <Image
                                  src={item.primaryImage}
                                  alt={item.product.name}
                                  fill
                                  sizes="192px"
                                  loading="lazy"
                                  className="object-cover object-center"
                                />
                              </div>
                              <p className="mt-1.5 truncate text-xs font-semibold text-[#101114]">
                                {item.product.name}
                              </p>
                              <p className="text-[10px] text-[#101114]/60 font-mono">
                                {item.sku}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Product Title & Variant Badge */}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/inventory/${item.id}`}
                            className="font-semibold text-[#101114] hover:underline"
                          >
                            {item.product.name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-2xs border border-[#101114]/15 bg-[#FBF9F5] px-1.5 py-0.2 text-[10px] font-semibold text-[#101114]">
                              {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                                .filter(Boolean)
                                .join(" • ") || "Default"}
                            </span>
                            {item.product.slug && (
                              <span className="text-[10px] text-[#101114]/50 font-mono">
                                /{item.product.slug}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU with 1-click copy */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[#101114]">
                        <span>{item.sku}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySku(item.sku)}
                          className="rounded p-1 text-[#101114]/40 hover:bg-[#101114]/10 hover:text-[#101114]"
                          title="Copy SKU to clipboard"
                        >
                          {copiedSku === item.sku ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Physical Stock */}
                    <td className="px-5 py-3.5 text-center font-mono text-xs font-bold tabular-nums">
                      <span className={item.totalStock < 0 ? "text-red-700" : "text-[#101114]"}>
                        {item.totalStock}
                      </span>
                    </td>

                    {/* Reserved Stock */}
                    <td className="px-5 py-3.5 text-center font-mono text-xs tabular-nums">
                      {item.reserved > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-2xs bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800 border border-amber-200">
                          <Lock className="size-2.5" />
                          {item.reserved}
                        </span>
                      ) : (
                        <span className="text-[#101114]/40">0</span>
                      )}
                    </td>

                    {/* Available Stock */}
                    <td className="px-5 py-3.5 text-center font-mono text-xs font-bold tabular-nums">
                      <span
                        className={
                          isNegative
                            ? "text-red-700 font-extrabold"
                            : isOutOfStock
                              ? "text-red-600"
                              : isLowStock
                                ? "text-amber-700 font-extrabold"
                                : "text-emerald-700 font-extrabold"
                        }
                      >
                        {item.available}
                      </span>
                    </td>

                    {/* Pricing (Cost / Selling) */}
                    <td className="px-5 py-3.5 tabular-nums text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#101114]">
                          {formatCurrency(item.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-[#101114]/50">
                          Cost: {formatCurrency(item.costPrice)}
                        </div>
                      </div>
                    </td>

                    {/* Stock Health Status */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isLowStock ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                          </span>
                        ) : (
                          <span
                            className={`size-2 rounded-full ${
                              isNegative
                                ? "bg-red-700"
                                : isOutOfStock
                                  ? "bg-red-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            isNegative
                              ? "text-red-800"
                              : isOutOfStock
                                ? "text-red-700"
                                : isLowStock
                                  ? "text-amber-800"
                                  : "text-emerald-800"
                          }`}
                        >
                          {isNegative
                            ? "Negative Stock"
                            : isOutOfStock
                              ? "Out of Stock"
                              : isLowStock
                                ? "Low Stock"
                                : "In Stock"}
                        </span>
                        {isLowStock && (
                          <span className="rounded-2xs bg-amber-100 px-1 py-0.2 text-[9px] font-extrabold text-amber-800">
                            REORDER
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Adjust Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(item)}
                          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                          title="Quick adjust stock for this variant"
                        >
                          <Plus className="size-3 text-emerald-600" />
                          <Minus className="size-3 text-red-600 -ml-1" />
                          <span>Adjust</span>
                        </button>

                        {/* Print Tag Button */}
                        <button
                          type="button"
                          onClick={() => setBarcodeModalItems([item])}
                          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                          title="Print barcode price tag for this variant"
                        >
                          <Printer className="size-3.5" />
                        </button>

                        {/* History Link */}
                        <Link
                          href={`/admin/inventory/${item.id}`}
                          className="inline-flex h-8 items-center rounded-sm border border-[#101114]/20 bg-white px-2 text-xs text-[#101114]/70 shadow-2xs transition-colors hover:bg-[#F3F0E8] hover:text-[#101114]"
                          title="View complete transaction audit history"
                        >
                          <ExternalLink className="size-3.5" />
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

      {/* ── 4. Infinite Scroll Sentinel & Load More Controls ── */}
      {initialData.total > 0 && (
        <div className="flex flex-col items-center justify-center gap-3 border-t border-[#101114]/10 pt-4 pb-2">
          <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

          {hasMore ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-[#101114]/20 bg-white px-5 py-2 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-[#101114]" />
                    <span>Loading more items...</span>
                  </>
                ) : (
                  <>
                    <span>Load more items</span>
                    <span className="text-muted-foreground font-normal">
                      • Showing {loadedVariants.length} of {initialData.total}
                    </span>
                  </>
                )}
              </button>
              <p className="text-muted-foreground text-[11px]">
                Scroll down or click the button above to load more items
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-2 text-xs">
              <span className="font-semibold text-emerald-600">✓</span>
              <span>
                All <strong className="text-[#101114]">{loadedVariants.length}</strong> inventory
                variants loaded
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-sm border border-white/15 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md duration-200 sm:gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
              {selectedIds.size}
            </span>
            <span className="hidden sm:inline">selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Bulk Restock Button */}
          <button
            type="button"
            disabled={isSubmittingBulkAdjust}
            onClick={() => setShowBulkAdjustModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            title="Bulk adjust or restock selected variants"
          >
            <Plus className="size-3.5" />
            <span>Bulk Restock</span>
          </button>

          {/* Bulk Print Barcode Tags */}
          <button
            type="button"
            disabled={isSubmittingBulkAdjust}
            onClick={() => {
              const selected = loadedVariants.filter((v) => selectedIds.has(v.id));
              setBarcodeModalItems(selected);
              setBarcodeItemOverrides({});
              setShowVariantTuning(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Print barcode tags for selected items"
          >
            <Printer className="size-3.5" />
            <span>Print Tags</span>
          </button>

          <div className="h-4 w-px bg-white/20" />

          {/* Deselect All */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-white/60 transition-colors hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── 6. Quick Stock Adjust Modal ── */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Quick Stock Adjust: {adjustingItem.sku}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Product Info Snapshot */}
              <div className="flex items-center gap-3 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-3">
                {adjustingItem.primaryImage ? (
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xs border border-[#101114]/15 bg-white">
                    <Image
                      src={adjustingItem.primaryImage}
                      alt={adjustingItem.product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#101114]">
                    {adjustingItem.product.name}
                  </p>
                  <p className="text-[10px] text-[#101114]/60 font-mono mt-0.5">
                    {adjustingItem.sku} • {[adjustingItem.size ? `Size: ${adjustingItem.size}` : null, adjustingItem.color ? `Color: ${adjustingItem.color}` : null].filter(Boolean).join(" / ") || "Default"}
                  </p>
                </div>
              </div>

              {/* Stock Snapshot Cards */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                  <p className="text-[10px] text-[#101114]/60 uppercase font-semibold">Physical</p>
                  <p className="text-base font-bold text-[#101114]">{adjustingItem.totalStock}</p>
                </div>
                <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                  <p className="text-[10px] text-[#101114]/60 uppercase font-semibold">Reserved</p>
                  <p className="text-base font-bold text-amber-800">{adjustingItem.reserved}</p>
                </div>
                <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                  <p className="text-[10px] text-[#101114]/60 uppercase font-semibold">Available</p>
                  <p className="text-base font-bold text-emerald-800">{adjustingItem.available}</p>
                </div>
              </div>

              {adjustError && (
                <div className="rounded-sm border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
                  {adjustError}
                </div>
              )}

              {/* Transaction Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#101114]">
                  Adjustment Type
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-xs">
                  {(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAdjustType(t);
                        setAdjustReason(COMMON_REASONS[t][0]);
                        if (t === "DAMAGE") {
                          setAdjustQuantity("-1");
                        } else if (t === "RESTOCK") {
                          setAdjustQuantity("10");
                        }
                      }}
                      className={`rounded-xs px-2 py-1.5 text-center font-semibold transition-colors ${
                        adjustType === t
                          ? "bg-[#101114] text-white shadow-2xs"
                          : "border border-[#101114]/20 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                      }`}
                    >
                      {t === "RESTOCK"
                        ? "Restock"
                        : t === "ADJUSTMENT"
                          ? "Audit"
                          : t === "DAMAGE"
                            ? "Damage"
                            : "Return"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Input & Preset Pills */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#101114]">
                    Quantity Adjustment <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-[#101114]/50">
                    Use (+) to add, (-) to deduct
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="e.g. 10 or -2"
                  className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 font-mono text-sm font-bold text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                />

                {/* Quick Preset Buttons */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-semibold text-[#101114]/50">Quick:</span>
                  {(adjustType === "DAMAGE"
                    ? ["-1", "-2", "-5", "-10"]
                    : ["+5", "+10", "+25", "+50", "+100"]
                  ).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustQuantity(val.replace("+", ""))}
                      className="rounded-xs border border-[#101114]/15 bg-[#FBF9F5] px-2 py-0.5 font-mono text-xs font-medium text-[#101114] hover:bg-[#F3F0E8]"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Projected Stock Preview */}
              {(() => {
                const q = parseInt(adjustQuantity, 10);
                if (!isNaN(q) && q !== 0) {
                  const projectedTotal = adjustingItem.totalStock + q;
                  const projectedAvail = projectedTotal - adjustingItem.reserved;
                  const isViolation = projectedTotal < adjustingItem.reserved;

                  return (
                    <div
                      className={`flex items-center justify-between rounded-xs border px-3 py-2 text-xs ${
                        isViolation
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-900"
                      }`}
                    >
                      <span>
                        {isViolation ? "⚠️ Exceeds Available:" : "Projected After Adjustment:"}{" "}
                        <strong>
                          {adjustingItem.totalStock} → {projectedTotal}
                        </strong>
                      </span>
                      <span className="font-bold">
                        Available: {projectedAvail}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Reason Input with suggestions */}
              <div>
                <label className="block text-xs font-semibold text-[#101114]">
                  Adjustment Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Factory delivery intake"
                  className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                />
                {/* Reason Suggestions */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {COMMON_REASONS[adjustType].map((reasonText) => (
                    <button
                      key={reasonText}
                      type="button"
                      onClick={() => setAdjustReason(reasonText)}
                      className="rounded-2xs border border-[#101114]/10 bg-[#FBF9F5] px-1.5 py-0.5 text-[10px] text-[#101114]/70 hover:bg-[#F3F0E8] hover:text-[#101114]"
                    >
                      {reasonText}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAdjust || !adjustQuantity}
                onClick={handleExecuteAdjust}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
              >
                {isSubmittingAdjust ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Record Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Bulk Stock Adjust Modal ── */}
      {showBulkAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-[#101114]">
                Bulk Restock ({selectedIds.size} variants selected)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkAdjustModal(false)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#101114]">Type</label>
                <select
                  value={bulkAdjustType}
                  onChange={(e) => setBulkAdjustType(e.target.value as InventoryTransactionType)}
                  className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114]"
                >
                  <option value="RESTOCK">Restock (Add stock)</option>
                  <option value="ADJUSTMENT">Audit Count Adjustment</option>
                  <option value="DAMAGE">Damage write-off (Deduct stock)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#101114]">Quantity to apply to each variant</label>
                <input
                  type="number"
                  step="1"
                  value={bulkAdjustQuantity}
                  onChange={(e) => setBulkAdjustQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 font-mono text-sm font-bold text-[#101114]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#101114]">Reason</label>
                <input
                  type="text"
                  value={bulkAdjustReason}
                  onChange={(e) => setBulkAdjustReason(e.target.value)}
                  placeholder="e.g. Bulk seasonal delivery intake"
                  className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs text-[#101114]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <button
                type="button"
                onClick={() => setShowBulkAdjustModal(false)}
                className="rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBulkAdjust || !bulkAdjustQuantity}
                onClick={handleExecuteBulkAdjust}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
              >
                {isSubmittingBulkAdjust ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Apply Bulk Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Barcode & Price Tag Printing Modal ── */}
      {barcodeModalItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Print Barcodes & Price Tags ({barcodeModalItems.length}{" "}
                  {barcodeModalItems.length === 1 ? "variant" : "variants"})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeModalItems(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Settings Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Format:</span>
                  <select
                    value={barcodeLabelSize}
                    onChange={(e) =>
                      setBarcodeLabelSize(e.target.value as "standard" | "compact" | "sheet")
                    }
                    className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="standard">50mm × 30mm (Thermal Roll)</option>
                    <option value="compact">40mm × 25mm (Compact Tag)</option>
                    <option value="sheet">A4 Sheet (24 Grid)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Quantity:</span>
                  <select
                    value={barcodeQuantityMode}
                    onChange={(e) => {
                      setBarcodeQuantityMode(
                        e.target.value as "one-per-variant" | "by-stock" | "custom"
                      );
                      setBarcodeItemOverrides({});
                    }}
                    className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="one-per-variant">1 Label per Variant</option>
                    <option value="by-stock">Match Available Stock</option>
                    <option value="custom">Custom Quantity</option>
                  </select>
                </div>

                {/* Custom Quantity Stepper & Presets */}
                {barcodeQuantityMode === "custom" && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-2 py-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#101114]/70">Copies:</span>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))
                        }
                        className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                        title="Decrease"
                      >
                        <Minus className="size-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={barcodeCustomQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setBarcodeCustomQuantity(Math.min(500, val));
                          }
                        }}
                        className="h-6 w-12 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))
                        }
                        className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                        title="Increase"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 pl-1 border-l border-[#101114]/10">
                      {[1, 2, 5, 10, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBarcodeCustomQuantity(preset)}
                          className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                            barcodeCustomQuantity === preset
                              ? "bg-[#101114] text-white"
                              : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/15"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total & Print Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-sm bg-[#101114]/5 px-2.5 py-1 text-xs">
                  <span className="text-[#101114]/60">Total:</span>
                  <span className="font-bold text-[#101114]">
                    {barcodeModalItems.reduce((acc, item) => {
                      if (barcodeItemOverrides[item.id] !== undefined) {
                        return acc + Math.max(1, barcodeItemOverrides[item.id]);
                      }
                      if (barcodeQuantityMode === "by-stock") {
                        return acc + Math.max(1, item.available > 0 ? item.available : 1);
                      }
                      if (barcodeQuantityMode === "custom") {
                        return acc + Math.max(1, barcodeCustomQuantity);
                      }
                      return acc + 1;
                    }, 0)}
                  </span>
                  <span className="text-[#101114]/60">Labels</span>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#101114] px-4 font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85"
                >
                  <Printer className="size-3.5" />
                  <span>Print Labels Now</span>
                </button>
              </div>
            </div>

            {/* Individual Variant Fine-Tuning Drawer */}
            {barcodeModalItems.length > 1 && (
              <div className="border-b border-[#101114]/10 bg-white px-5 py-2">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setShowVariantTuning(!showVariantTuning)}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#101114] hover:underline"
                  >
                    <span>{showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant ({barcodeModalItems.length})</span>
                  </button>
                  {Object.keys(barcodeItemOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBarcodeItemOverrides({})}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Reset variant overrides
                    </button>
                  )}
                </div>

                {showVariantTuning && (
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                    {barcodeModalItems.map((item) => {
                      const count =
                        barcodeItemOverrides[item.id] !== undefined
                          ? barcodeItemOverrides[item.id]
                          : barcodeQuantityMode === "by-stock"
                            ? Math.max(1, item.available > 0 ? item.available : 1)
                            : barcodeQuantityMode === "custom"
                              ? barcodeCustomQuantity
                              : 1;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xs border border-[#101114]/5 bg-white px-2.5 py-1 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-[#101114]">{item.product.name}</span>
                            <span className="ml-2 font-mono text-[10px] text-[#101114]/60">{item.sku}</span>
                            <span className="ml-2 text-[10px] text-[#101114]/50">
                              {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                                .filter(Boolean)
                                .join(" • ") || "Default"}
                            </span>
                            <span className="ml-2 text-[10px] text-zinc-400">
                              (Stock: {item.available})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setBarcodeItemOverrides((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(1, count - 1),
                                }))
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                            >
                              <Minus className="size-2.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val > 0) {
                                  setBarcodeItemOverrides((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(500, val),
                                  }));
                                }
                              }}
                              className="h-5 w-10 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setBarcodeItemOverrides((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(500, count + 1),
                                }))
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                            >
                              <Plus className="size-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Tag Preview Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div id="vibelock-inventory-printable-labels" className="flex flex-wrap gap-3 justify-center">
                {barcodeModalItems.flatMap((item) => {
                  const count =
                    barcodeItemOverrides[item.id] !== undefined
                      ? barcodeItemOverrides[item.id]
                      : barcodeQuantityMode === "by-stock"
                        ? Math.max(1, item.available > 0 ? item.available : 1)
                        : barcodeQuantityMode === "custom"
                          ? barcodeCustomQuantity
                          : 1;

                  return Array.from({ length: count }, (_, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`vibelock-inventory-label-card relative flex flex-col justify-between rounded-sm border border-dashed border-[#101114]/30 bg-white p-2 text-center text-[#101114] shadow-xs ${
                        barcodeLabelSize === "compact"
                          ? "h-[25mm] w-[40mm]"
                          : barcodeLabelSize === "sheet"
                            ? "h-[30mm] w-[48mm]"
                            : "h-[30mm] w-[50mm]"
                      }`}
                    >
                      {count > 1 && (
                        <span className="no-print absolute top-1 right-1 text-[8px] font-mono text-[#101114]/40">
                          #{idx + 1}
                        </span>
                      )}
                      <div className="border-b border-[#101114]/15 pb-0.5">
                        <span className="text-[9px] font-extrabold tracking-widest uppercase">
                          VIBELOCK
                        </span>
                      </div>
                      <p className="truncate px-0.5 text-[10px] font-semibold leading-tight">
                        {item.product.name}
                      </p>
                      <div className="flex items-center justify-between px-1 text-[9px] font-mono">
                        <span>{item.size ? `SIZE: ${item.size}` : ""}</span>
                        <span className="text-[11px] font-bold">
                          ৳{item.discountPrice ?? item.sellingPrice}
                        </span>
                      </div>
                      <div className="px-1 py-0.5">
                        <BarcodeSvg value={item.sku} height={20} />
                        <p className="font-mono text-[8px] tracking-wider text-[#101114]/80">
                          {item.sku}
                        </p>
                      </div>
                    </div>
                  ));
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#101114]/10 bg-white px-5 py-2.5 text-xs text-[#101114]/60">
              <span>Previewing labels before printing. Press Print Labels Now to send to printer.</span>
              <button
                type="button"
                onClick={() => setBarcodeModalItems(null)}
                className="font-semibold text-[#101114] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Barcode Scanner Auto-Detection Toast Indicator ── */}
      {scannedIndicator && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-sm border border-[#00D9FF]/40 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl animate-in slide-in-from-top-3 fade-in duration-200">
          <span className="flex size-2 rounded-full bg-[#00D9FF] animate-ping" />
          <span className="font-semibold text-[#00D9FF]">⚡ Scanner Active:</span>
          <span>{scannedIndicator}</span>
        </div>
      )}

      {/* ── Print Stylesheet for Labels ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #vibelock-inventory-printable-labels,
          #vibelock-inventory-printable-labels * {
            visibility: visible !important;
          }
          #vibelock-inventory-printable-labels {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 3mm !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            justify-content: flex-start !important;
            z-index: 999999 !important;
          }
          .vibelock-inventory-label-card {
            border: 1px solid #101114 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 2mm;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
