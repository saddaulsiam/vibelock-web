"use client";

import {
  AdminTableColumnVisibility,
  AdminTableInfiniteScroll,
  AdminTableSearchInput,
  useAdminTableColumns,
} from "@/components/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadMoreAdminInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type {
  AdminInventoryItem,
  AdminInventoryResult,
  InventoryFilter,
} from "@/lib/admin/inventory/inventory-queries";
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Boxes,
  Check,
  Copy,
  Download,
  ExternalLink,
  Factory,
  ImageOff,
  Lock,
  Minus,
  Plus,
  Printer,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { AdminInventoryAdjustModal } from "./admin-inventory-adjust-modal";
import { AdminInventoryBarcodeModal } from "./admin-inventory-barcode-modal";
import { AdminInventoryBulkAdjustModal } from "./admin-inventory-bulk-adjust-modal";
import { AdminInventoryPoModal } from "./admin-inventory-po-modal";
import { AdminInventoryStocktakeModal } from "./admin-inventory-stocktake-modal";

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return "৳0";
  return `৳${Number(val).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

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
  const [hasMore, setHasMore] = React.useState((initialData.page || 1) < initialData.totalPages);

  // Column visibility hook
  const inventoryColumnOptions = React.useMemo(
    () => [
      { key: "sku" as const, label: "SKU" },
      { key: "physical" as const, label: "Physical Stock" },
      { key: "reserved" as const, label: "Reserved Stock" },
      { key: "available" as const, label: "Available Stock" },
      { key: "pricing" as const, label: "Pricing (Cost / Sell)" },
      { key: "health" as const, label: "Stock Health" },
    ],
    []
  );

  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(inventoryColumnOptions);

  const visibleColumnCount = 3 + totalVisibleCols;

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Quick Stock Adjust Modal state
  const [adjustingItem, setAdjustingItem] = React.useState<AdminInventoryItem | null>(null);

  // Bulk Adjust Modal state
  const [showBulkAdjustModal, setShowBulkAdjustModal] = React.useState(false);

  // Barcode / Price Tag Printing Modal state
  const [barcodeModalItems, setBarcodeModalItems] = React.useState<AdminInventoryItem[] | null>(
    null
  );

  // Rapid Stocktake / Physical Audit Mode state
  const [showStocktakeModal, setShowStocktakeModal] = React.useState(false);

  // Supplier Purchase Order (PO) & Reorder Sheet Modal state
  const [showPoModal, setShowPoModal] = React.useState(false);
  const [poInitialItems, setPoInitialItems] = React.useState<AdminInventoryItem[]>([]);

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
          const avgDelta =
            deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 100;
          if (avgDelta < 50) {
            e.preventDefault();
            const scanned = buf.text.trim();
            buf.text = "";
            buf.times = [];

            if (!showStocktakeModal) {
              setSearchTerm(scanned);
              updateQuery({ q: scanned });
              setScannedIndicator(`Scanned SKU: ${scanned}`);
              setTimeout(() => setScannedIndicator(null), 4000);
            }
            return;
          }
        }
        buf.text = "";
        buf.times = [];
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.text += e.key;
        buf.times.push(now);
      }

      if (e.key === "/" && !isInput && !showStocktakeModal) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showStocktakeModal, updateQuery]);

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

  // Open Quick Adjust for single item
  const handleOpenAdjustModal = (item: AdminInventoryItem) => {
    setAdjustingItem(item);
  };

  const hasNegativeAnomaly = loadedVariants.some((v) => v.totalStock < 0 || v.available < 0);

  return (
    <div className="space-y-4">
      {/* ── 1. Quick Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => updateQuery({ filter: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "all"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <Boxes className="size-3.5" />
          <span>All Items</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "in-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "in-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>In Stock (&gt;0)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "low-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "low-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <AlertTriangle className="size-3 text-amber-500" />
          <span>Low Stock (1–5)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "out-of-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "out-of-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-rose-500" />
          <span>Out of Stock (0)</span>
        </button>

        {hasNegativeAnomaly && (
          <button
            type="button"
            onClick={() => updateQuery({ filter: "negative" })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
              currentFilters.filter === "negative"
                ? "bg-red-900 text-white shadow-2xs"
                : "border border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
            }`}
          >
            <AlertTriangle className="size-3.5 animate-pulse text-red-600" />
            <span>Negative Anomaly</span>
          </button>
        )}
      </div>

      {/* ── Optional Feedback Notice ── */}
      {feedbackMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
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
        <AdminTableSearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          placeholder="Search by SKU, product name, size, or color..."
          inputRef={searchInputRef}
        />

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Purchase Order (PO) / Reorder Sheet Button */}
          <button
            type="button"
            onClick={() => {
              setPoInitialItems([]);
              setShowPoModal(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            title="Generate Supplier Purchase Order / Factory Reorder Sheet"
          >
            <Factory className="size-4 text-neutral-500" />
            <span>Purchase Order (PO)</span>
          </button>

          {/* Rapid Stocktake / Audit Mode Button */}
          <button
            type="button"
            onClick={() => {
              setShowStocktakeModal(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Open Rapid Barcode Stocktaking & Physical Audit Station"
          >
            <Barcode className="size-4 text-emerald-700" />
            <span>Stocktake Audit</span>
          </button>

          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={inventoryColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />

          {/* Export to CSV Button */}
          <a
            href={`/api/admin/inventory/export?q=${encodeURIComponent(currentFilters.q)}&filter=${currentFilters.filter}`}
            download
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            title="Export filtered inventory to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          {/* Intelligence Dashboard Link */}
          <Link
            href="/admin/inventory-intelligence"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
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

      {/* Meta Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <p>
          Showing <strong className="text-neutral-900">{loadedVariants.length}</strong> of{" "}
          <strong className="text-neutral-900">{initialData.total}</strong>{" "}
          {initialData.total === 1 ? "variant" : "variants"}
        </p>
      </div>

      {/* ── 3. Inventory Table ── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-4 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select all inventory items"
                className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
              />
            </TableHead>
            <TableHead>Product & Variant</TableHead>
            {visibleColumns.sku && <TableHead>SKU</TableHead>}
            {visibleColumns.physical && <TableHead className="text-center">Physical</TableHead>}
            {visibleColumns.reserved && <TableHead className="text-center">Reserved</TableHead>}
            {visibleColumns.available && <TableHead className="text-center">Available</TableHead>}
            {visibleColumns.pricing && <TableHead>Pricing (Cost / Sell)</TableHead>}
            {visibleColumns.health && <TableHead>Stock Health</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadedVariants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="px-5 py-12 text-center">
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
              </TableCell>
            </TableRow>
          ) : (
            loadedVariants.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isNegative = item.totalStock < 0 || item.available < 0;
              const isOutOfStock = item.available <= 0 && !isNegative;
              const isLowStock = item.available > 0 && item.available <= 5;

              return (
                <TableRow
                  key={item.id}
                  className={
                    isSelected
                      ? "bg-[#F3F0E8]/70"
                      : isNegative
                        ? "bg-red-50/50 hover:bg-red-50"
                        : undefined
                  }
                >
                  {/* Checkbox */}
                  <TableCell className="w-10 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      aria-label={`Select ${item.sku}`}
                      className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
                    />
                  </TableCell>

                  {/* Product & Variant Attributes */}
                  <TableCell>
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
                            <p className="font-mono text-[10px] text-[#101114]/60">{item.sku}</p>
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
                          <span className="rounded-2xs py-0.2 inline-flex items-center border border-[#101114]/15 bg-[#FBF9F5] px-1.5 text-[10px] font-semibold text-[#101114]">
                            {[
                              item.size ? `Size: ${item.size}` : null,
                              item.color ? `Color: ${item.color}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Default"}
                          </span>
                          {item.product.slug && (
                            <span className="font-mono text-[10px] text-[#101114]/50">
                              /{item.product.slug}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* SKU with 1-click copy */}
                  {visibleColumns.sku && (
                    <TableCell>
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
                    </TableCell>
                  )}

                  {/* Physical Stock */}
                  {visibleColumns.physical && (
                    <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                      <span className={item.totalStock < 0 ? "text-red-700" : "text-[#101114]"}>
                        {item.totalStock}
                      </span>
                    </TableCell>
                  )}

                  {/* Reserved Stock */}
                  {visibleColumns.reserved && (
                    <TableCell className="text-center font-mono text-xs tabular-nums">
                      {item.reserved > 0 ? (
                        <span className="rounded-2xs inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                          <Lock className="size-2.5" />
                          {item.reserved}
                        </span>
                      ) : (
                        <span className="text-[#101114]/40">0</span>
                      )}
                    </TableCell>
                  )}

                  {/* Available Stock */}
                  {visibleColumns.available && (
                    <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                      <span
                        className={
                          isNegative
                            ? "font-extrabold text-red-700"
                            : isOutOfStock
                              ? "text-red-600"
                              : isLowStock
                                ? "font-extrabold text-amber-700"
                                : "font-extrabold text-emerald-700"
                        }
                      >
                        {item.available}
                      </span>
                    </TableCell>
                  )}

                  {/* Pricing (Cost / Selling) */}
                  {visibleColumns.pricing && (
                    <TableCell className="text-xs tabular-nums">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#101114]">
                          {formatCurrency(item.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-[#101114]/50">
                          Cost: {formatCurrency(item.costPrice)}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Stock Health Status */}
                  {visibleColumns.health && (
                    <TableCell>
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
                          <span className="rounded-2xs py-0.2 bg-amber-100 px-1 text-[9px] font-extrabold text-amber-800">
                            REORDER
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Quick Adjust Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                        title="Quick adjust stock for this variant"
                      >
                        <Plus className="size-3 text-emerald-600" />
                        <Minus className="-ml-1 size-3 text-red-600" />
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

                      {/* Add to PO / Reorder Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPoInitialItems([item]);
                          setShowPoModal(true);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                        title="Add variant to Supplier Purchase Order / Reorder Sheet"
                      >
                        <Factory className="size-3.5 text-amber-700" />
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
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── 4. Infinite Scroll Sentinel & Load More Controls ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={loadedVariants.length}
        totalCount={initialData.total}
        itemName="inventory variants"
      />

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
            onClick={() => {
              const selected = loadedVariants.filter((v) => selectedIds.has(v.id));
              setBarcodeModalItems(selected);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Print barcode tags for selected items"
          >
            <Printer className="size-3.5" />
            <span>Print Tags</span>
          </button>

          {/* Bulk Create Purchase Order (PO) */}
          <button
            type="button"
            onClick={() => {
              const selected = loadedVariants.filter((v) => selectedIds.has(v.id));
              setPoInitialItems(selected);
              setShowPoModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Create Supplier Purchase Order for selected variants"
          >
            <Factory className="size-3.5" />
            <span>Create PO ({selectedIds.size})</span>
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
      <AdminInventoryAdjustModal
        item={adjustingItem}
        onClose={() => setAdjustingItem(null)}
        onSuccess={({ id, qty, sku }) => {
          setLoadedVariants((prev) =>
            prev.map((item) => {
              if (item.id !== id) return item;
              const updatedStock = item.totalStock + qty;
              return {
                ...item,
                totalStock: updatedStock,
                available: updatedStock - item.reserved,
              };
            })
          );
          setFeedbackMessage(`Adjusted ${sku} by ${qty > 0 ? `+${qty}` : qty} units.`);
          router.refresh();
        }}
      />

      {/* ── 7. Bulk Stock Adjust Modal ── */}
      <AdminInventoryBulkAdjustModal
        isOpen={showBulkAdjustModal}
        selectedIds={selectedIds}
        onClose={() => setShowBulkAdjustModal(false)}
        onSuccess={(msg) => {
          setFeedbackMessage(msg);
          setSelectedIds(new Set());
          router.refresh();
        }}
      />

      {/* ── 8. Barcode & Price Tag Printing Modal ── */}
      <AdminInventoryBarcodeModal
        items={barcodeModalItems}
        onClose={() => setBarcodeModalItems(null)}
      />

      {/* ── 9. Rapid Barcode Stocktake & Physical Audit Modal ── */}
      <AdminInventoryStocktakeModal
        isOpen={showStocktakeModal}
        onClose={() => setShowStocktakeModal(false)}
        variants={loadedVariants}
        onReconciled={(scanMap, msg) => {
          setLoadedVariants((prev) =>
            prev.map((v) => {
              if (!scanMap.has(v.id)) return v;
              const newPhysical = scanMap.get(v.id)!;
              return {
                ...v,
                totalStock: newPhysical,
                available: newPhysical - v.reserved,
              };
            })
          );
          setFeedbackMessage(msg);
          router.refresh();
        }}
      />

      {/* ── 9. Barcode Scanner Auto-Detection Toast Indicator ── */}
      {scannedIndicator && (
        <div className="animate-in slide-in-from-top-3 fade-in fixed top-6 right-6 z-50 flex items-center gap-2 rounded-sm border border-[#00D9FF]/40 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl duration-200">
          <span className="flex size-2 animate-ping rounded-full bg-[#00D9FF]" />
          <span className="font-semibold text-[#00D9FF]">⚡ Scanner Active:</span>
          <span>{scannedIndicator}</span>
        </div>
      )}

      {/* ── Supplier Purchase Order (PO) & Reorder Sheet Modal ── */}
      <AdminInventoryPoModal
        key={poInitialItems.map((i) => i.id).join(",") || "po-modal"}
        isOpen={showPoModal}
        onClose={() => setShowPoModal(false)}
        initialItems={poInitialItems}
        availableVariants={loadedVariants}
      />
    </div>
  );
}
