"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Copy, Download, Flame, Package, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
} from "@/components/admin/shared";
import {
  AdminTableFilterSelect,
  AdminTableSearchInput,
  AdminTableTabs,
  ADMIN_TABLE_CLASSES,
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
import { loadMoreAdminInventoryIntelligenceAction } from "@/lib/admin/inventory-actions";
import type {
  InventoryIntelligenceItem,
  InventoryIntelligenceResult,
  InventoryIntelligenceSort,
  InventoryIntelligenceStatus,
  InventoryIntelligenceStatusFilter,
  InventoryIntelligenceWindow,
} from "@/lib/admin/inventory-intelligence-queries";

function formatBdt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

export function getStatusBadge(status: InventoryIntelligenceStatus) {
  switch (status) {
    case "NEGATIVE":
      return (
        <Badge variant="destructive" className="text-[10px] font-bold tracking-wide uppercase">
          Negative stock
        </Badge>
      );
    case "OUT_OF_STOCK":
      return (
        <Badge
          variant="outline"
          className="border-red-300 bg-red-50 text-[10px] font-semibold text-red-700"
        >
          Out of stock
        </Badge>
      );
    case "STOCKOUT_RISK":
      return (
        <Badge className="border border-rose-300 bg-rose-100 text-[10px] font-bold text-rose-800 hover:bg-rose-100">
          <Flame className="mr-1 size-3 animate-pulse text-rose-600" /> Stockout Risk (&le;14d)
        </Badge>
      );
    case "DEAD":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-800"
        >
          Dead stock (&gt;14d)
        </Badge>
      );
    case "SLOW":
      return (
        <Badge
          variant="outline"
          className="border-yellow-300 bg-yellow-50 text-[10px] font-semibold text-yellow-800"
        >
          Slow moving (&gt;180d)
        </Badge>
      );
    case "HEALTHY":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-[10px] font-semibold text-emerald-800"
        >
          Healthy
        </Badge>
      );
  }
}

interface AdminInventoryIntelligenceTableProps {
  initialData: InventoryIntelligenceResult;
  currentFilters: {
    q?: string;
    window: InventoryIntelligenceWindow;
    status: InventoryIntelligenceStatusFilter;
    sort: InventoryIntelligenceSort;
    page: number;
  };
}

export function AdminInventoryIntelligenceTable({
  initialData,
  currentFilters,
}: AdminInventoryIntelligenceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q ?? "");
  const [isPending, startTransition] = React.useTransition();
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const { total, summary, window: activeWindow } = initialData;

  // Infinite scroll state
  const [additionalItems, setAdditionalItems] = React.useState<InventoryIntelligenceItem[]>([]);
  const [prevItems, setPrevItems] = React.useState<InventoryIntelligenceItem[]>(initialData.items);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [copiedSku, setCopiedSku] = React.useState<string | null>(null);

  // Column visibility hook
  const intelligenceColumnOptions = React.useMemo(
    () => [
      { key: "stock" as const, label: "Available Stock" },
      { key: "capital" as const, label: "Available Capital" },
      { key: "velocity" as const, label: "Daily Velocity" },
      { key: "daysOfSupply" as const, label: "Days of Supply" },
      { key: "restock" as const, label: "Suggested Restock" },
      { key: "status" as const, label: "Health Status" },
    ],
    []
  );

  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(intelligenceColumnOptions);

  const visibleColumnCount = 2 + totalVisibleCols;

  // When initialData.items changes due to search/tab switch, reset additional items during render
  if (initialData.items !== prevItems) {
    setPrevItems(initialData.items);
    setAdditionalItems([]);
    setCurrentPage(1);
  }

  const loadedItems = React.useMemo(() => {
    const existingIds = new Set(initialData.items.map((i) => i.id));
    return [...initialData.items, ...additionalItems.filter((i) => !existingIds.has(i.id))];
  }, [initialData.items, additionalItems]);

  const hasMore = loadedItems.length < total;

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await loadMoreAdminInventoryIntelligenceAction({
        search: currentFilters.q,
        window: currentFilters.window,
        status: currentFilters.status,
        sort: currentFilters.sort,
        page: nextPage,
        pageSize: 20,
      });

      if (res && res.items.length > 0) {
        setAdditionalItems((prev) => [...prev, ...res.items]);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more intelligence items:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, currentFilters, hasMore, isLoadingMore]);

  const handleCopySku = (sku: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sku).then(() => {
        setCopiedSku(sku);
        setTimeout(() => setCopiedSku(null), 2000);
      });
    }
  };

  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
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
      updateUrlParams({ q: val || null, page: 1 });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateUrlParams({ q: null, page: 1 });
  };

  const handleStatusTab = (status: InventoryIntelligenceStatusFilter) => {
    updateUrlParams({ status: status === "all" ? null : status, page: 1 });
  };

  // Keyboard shortcut '/' to focus search input
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

  // Build CSV export href
  const exportQuery = new URLSearchParams();
  if (searchTerm) exportQuery.set("q", searchTerm);
  if (activeWindow !== "90d") exportQuery.set("window", activeWindow);
  if (currentFilters.status !== "all") exportQuery.set("status", currentFilters.status);
  if (currentFilters.sort !== "valuation") exportQuery.set("sort", currentFilters.sort);
  const exportQueryString = exportQuery.toString();
  const exportHref = `/api/admin/inventory-intelligence/export${exportQueryString ? `?${exportQueryString}` : ""}`;

  const tabs: AdminTableTabItem<InventoryIntelligenceStatusFilter>[] = [
    { key: "all", label: "All Items", count: summary.totalVariants },
    {
      key: "stockout-risk",
      label: "Stockout Risk",
      count: summary.stockoutRiskCount,
      dotColor: "bg-rose-500",
    },
    {
      key: "dead",
      label: "Dead Stock",
      count: summary.deadStockCount,
      dotColor: "bg-amber-500",
    },
    {
      key: "slow",
      label: "Slow Moving",
      count: summary.slowMovingCount,
      dotColor: "bg-amber-400",
    },
    {
      key: "healthy",
      label: "Healthy",
      count: summary.healthyCount,
      dotColor: "bg-emerald-500",
    },
    {
      key: "out-of-stock",
      label: "Out of Stock",
      count: summary.outOfStockCount,
      dotColor: "bg-rose-600",
    },
  ];

  if (summary.negativeStockCount > 0) {
    tabs.push({
      key: "negative",
      label: "Negative Anomaly",
      count: summary.negativeStockCount,
      dotColor: "bg-red-600 animate-pulse",
    });
  }

  return (
    <div className="space-y-4">
      {/* Quick Status Filter Tabs */}
      <AdminTableTabs<InventoryIntelligenceStatusFilter>
        tabs={tabs}
        activeKey={currentFilters.status}
        onChange={handleStatusTab}
      />

      {/* Search, Window, Sort, and Export Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search bar with / hotkey */}
          <AdminTableSearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder="Search product or SKU..."
            inputRef={searchInputRef}
          />

          {/* Window selector */}
          <AdminTableFilterSelect<InventoryIntelligenceWindow>
            value={activeWindow}
            onChange={(window) => updateUrlParams({ window })}
            options={[
              { value: "30d", label: "Trailing 30 Days" },
              { value: "60d", label: "Trailing 60 Days" },
              { value: "90d", label: "Trailing 90 Days" },
            ]}
            ariaLabel="Trailing sales velocity window"
          />

          {/* Sort selector */}
          <AdminTableFilterSelect<InventoryIntelligenceSort>
            value={currentFilters.sort}
            onChange={(sort) => updateUrlParams({ sort })}
            options={[
              { value: "valuation", label: "Sort: Capital Value" },
              { value: "runout", label: "Sort: Days of Supply (Urgent)" },
              { value: "velocity", label: "Sort: Sales Velocity" },
              { value: "stock", label: "Sort: Available Stock" },
              { value: "age", label: "Sort: Inflow Age" },
            ]}
            ariaLabel="Sort inventory intelligence"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={intelligenceColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />

          <a
            href={exportHref}
            download
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Download CSV of current inventory intelligence"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Meta counters & active filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Showing <strong className="text-zinc-900">{loadedItems.length}</strong> of{" "}
            <strong className="text-zinc-900">{total}</strong>{" "}
            {total === 1 ? "variant" : "variants"}
            {isPending ? " (Updating...)" : ""}
          </span>
          {currentFilters.status !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-800">
              Status: {currentFilters.status}
              <button
                type="button"
                onClick={() => updateUrlParams({ status: null, page: 1 })}
                className="text-zinc-500 hover:text-zinc-900"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
        <p>
          Calculated using trailing <strong className="text-zinc-800">{activeWindow}</strong> net
          sales (sales &minus; returns).
        </p>
      </div>

      {/* Fresh, Clean Data Table matching Inventory Control Center */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Product & Variant</TableHead>
            {visibleColumns.stock && (
              <TableHead className="text-center whitespace-nowrap">Available Stock</TableHead>
            )}
            {visibleColumns.capital && (
              <TableHead className="text-right whitespace-nowrap">Available Capital</TableHead>
            )}
            {visibleColumns.velocity && (
              <TableHead className="text-center whitespace-nowrap">Daily Velocity</TableHead>
            )}
            {visibleColumns.daysOfSupply && (
              <TableHead className="text-center whitespace-nowrap">Days of Supply</TableHead>
            )}
            {visibleColumns.restock && (
              <TableHead className="text-right whitespace-nowrap">Suggested Restock (30d)</TableHead>
            )}
            {visibleColumns.status && (
              <TableHead className="text-center whitespace-nowrap">Health Status</TableHead>
            )}
            <TableHead className="min-w-[95px] text-right whitespace-nowrap">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="px-5 py-12 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                  <Package className="size-8 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-900">
                    No inventory intelligence variants found
                  </p>
                  <p className="text-xs text-zinc-500">
                    Try adjusting your search terms or clearing active status filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => updateUrlParams({ q: null, status: null, page: 1 })}
                    className="mt-2 inline-flex h-8 items-center rounded-lg bg-[#101114] px-3 font-semibold text-white shadow-2xs hover:bg-[#101114]/85"
                  >
                    Clear all filters
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            loadedItems.map((item) => {
              const isUrgent = item.status === "STOCKOUT_RISK" || item.status === "OUT_OF_STOCK";

              return (
                <TableRow
                  key={item.id}
                  className={
                    item.status === "STOCKOUT_RISK" ? "bg-rose-50/30 hover:bg-rose-50/50" : undefined
                  }
                >
                  {/* Product & Variant with SKU at bottom */}
                  <TableCell className="min-w-[180px]">
                    <div className="line-clamp-1 font-semibold text-zinc-900">
                      {item.productName}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-sm border border-zinc-200/80 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                        {[
                          item.size ? `Size: ${item.size}` : null,
                          item.color ? `Color: ${item.color}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "Default"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                      <span className="max-w-[220px] truncate" title={item.sku}>
                        {item.sku}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySku(item.sku)}
                        className="rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-800"
                        title="Copy SKU to clipboard"
                      >
                        {copiedSku === item.sku ? (
                          <Check className="size-2.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-2.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>

                  {/* Available Stock */}
                  {visibleColumns.stock && (
                    <TableCell className="text-center font-mono text-xs whitespace-nowrap tabular-nums">
                      <div
                        className={`font-bold ${
                          item.availableStock <= 0
                            ? "font-extrabold text-rose-600"
                            : item.status === "STOCKOUT_RISK"
                              ? "font-extrabold text-rose-700"
                              : "font-extrabold text-zinc-900"
                        }`}
                      >
                        {item.availableStock.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {item.physicalStock} phys ({item.reservedStock} res)
                      </div>
                    </TableCell>
                  )}

                  {/* Available Capital */}
                  {visibleColumns.capital && (
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      <div className="font-semibold text-zinc-900">
                        {formatBdt(item.availableCostValue)}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Cost: {item.costUnavailable ? "N/A" : formatBdt(item.costPrice)}
                      </div>
                    </TableCell>
                  )}

                  {/* Daily Velocity */}
                  {visibleColumns.velocity && (
                    <TableCell className="text-center font-mono text-xs whitespace-nowrap tabular-nums">
                      <div className="font-bold text-zinc-900">
                        {item.dailyVelocity > 0 ? `${item.dailyVelocity.toFixed(2)}/d` : "0.00/d"}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {item.netRetainedUnits} units ({item.soldUnits} sold &minus;{" "}
                        {item.returnedUnits} ret)
                      </div>
                    </TableCell>
                  )}

                  {/* Days of Supply */}
                  {visibleColumns.daysOfSupply && (
                    <TableCell className="text-center whitespace-nowrap tabular-nums">
                      {item.daysOfSupply !== null ? (
                        <div className="flex flex-col items-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                              item.daysOfSupply <= 14
                                ? "border border-rose-200 bg-rose-100 text-rose-700"
                                : item.daysOfSupply > 180
                                  ? "border border-amber-200 bg-amber-100 text-amber-800"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {item.daysOfSupply <= 14 && (
                              <Flame className="size-3 text-rose-600" />
                            )}
                            {Math.round(item.daysOfSupply)} days
                          </span>
                          <span className="mt-0.5 text-[10px] text-zinc-500">
                            {item.daysOfSupply <= 7
                              ? "Stockout critical"
                              : item.daysOfSupply <= 14
                                ? "Risk window"
                                : "Runout pace"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* Suggested Restock */}
                  {visibleColumns.restock && (
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {item.suggestedRestockQty !== null && item.suggestedRestockQty > 0 ? (
                        <div className="font-semibold text-rose-700">
                          +{item.suggestedRestockQty.toLocaleString()} units
                          <div className="text-[11px] font-normal text-rose-600">
                            Covers 30d sales
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* Health Status Badge */}
                  {visibleColumns.status && (
                    <TableCell className="text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </TableCell>
                  )}

                  {/* Action */}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors ${
                          isUrgent
                            ? "bg-[#101114] text-white hover:bg-[#101114]/85"
                            : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-950"
                        }`}
                        title="View inventory transactions, adjustments, and supplier purchase orders"
                      >
                        <span>{isUrgent ? "Restock" : "Ledger"}</span>
                        <ArrowRight className="size-3.5 shrink-0" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Infinite Scroll Sentinel & Load More Controls matching Inventory Control Center */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={loadedItems.length}
        totalCount={total}
        itemName="inventory variants"
        filterSummary={
          summary.totalVariants !== total ? `filtered from ${summary.totalVariants} total` : null
        }
      />
    </div>
  );
}
