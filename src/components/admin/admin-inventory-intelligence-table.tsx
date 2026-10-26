"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Flame, Package, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type {
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
      return <Badge variant="destructive">Negative stock</Badge>;
    case "OUT_OF_STOCK":
      return (
        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
          Out of stock
        </Badge>
      );
    case "STOCKOUT_RISK":
      return (
        <Badge className="border border-rose-300 bg-rose-100 font-semibold text-rose-800 hover:bg-rose-100">
          <Flame className="mr-1 size-3 text-rose-600" /> Stockout Risk (&le;14d)
        </Badge>
      );
    case "DEAD":
      return (
        <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800">
          Dead stock (&gt;14d)
        </Badge>
      );
    case "SLOW":
      return (
        <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800">
          Slow moving (&gt;180d)
        </Badge>
      );
    case "HEALTHY":
      return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
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

  const { items, total, totalPages, summary, window } = initialData;

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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

  const handleWindowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrlParams({ window: e.target.value, page: 1 });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrlParams({ sort: e.target.value, page: 1 });
  };

  // Build CSV export href
  const exportQuery = new URLSearchParams();
  if (searchTerm) exportQuery.set("q", searchTerm);
  if (window !== "90d") exportQuery.set("window", window);
  if (currentFilters.status !== "all") exportQuery.set("status", currentFilters.status);
  if (currentFilters.sort !== "valuation") exportQuery.set("sort", currentFilters.sort);
  const exportQueryString = exportQuery.toString();
  const exportHref = `/api/admin/inventory-intelligence/export${exportQueryString ? `?${exportQueryString}` : ""}`;

  const tabs: {
    key: InventoryIntelligenceStatusFilter;
    label: string;
    count?: number;
    badgeVariant?: "urgent" | "warning" | "default";
  }[] = [
    { key: "all", label: "All Items", count: summary.totalVariants },
    {
      key: "stockout-risk",
      label: "Stockout Risk",
      count: summary.stockoutRiskCount,
      badgeVariant: "urgent",
    },
    {
      key: "dead",
      label: "Dead Stock",
      count: summary.deadStockCount,
      badgeVariant: "warning",
    },
    {
      key: "slow",
      label: "Slow Moving",
      count: summary.slowMovingCount,
      badgeVariant: "default",
    },
    {
      key: "healthy",
      label: "Healthy",
      count: summary.healthyCount,
    },
    {
      key: "out-of-stock",
      label: "Out of Stock",
      count: summary.outOfStockCount,
      badgeVariant: "urgent",
    },
  ];

  if (summary.negativeStockCount > 0) {
    tabs.push({
      key: "negative",
      label: "Negative",
      count: summary.negativeStockCount,
      badgeVariant: "urgent",
    });
  }

  return (
    <div className="space-y-4">
      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#101114]/10 pb-3">
        {tabs.map((tab) => {
          const isActive = currentFilters.status === tab.key;
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
                      : tab.badgeVariant === "urgent" && tab.count > 0
                        ? "bg-rose-600 text-white"
                        : tab.badgeVariant === "warning" && tab.count > 0
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

      {/* Search, Window, Sort, and Export Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              type="text"
              placeholder="Search product or SKU..."
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

          <select
            value={window}
            onChange={handleWindowChange}
            aria-label="Trailing sales velocity window"
            className="border-input h-9 rounded-sm border bg-white px-3 text-xs font-medium text-[#101114] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            <option value="30d">Trailing 30 Days</option>
            <option value="60d">Trailing 60 Days</option>
            <option value="90d">Trailing 90 Days</option>
          </select>

          <select
            value={currentFilters.sort}
            onChange={handleSortChange}
            aria-label="Sort inventory intelligence"
            className="border-input h-9 rounded-sm border bg-white px-3 text-xs font-medium text-[#101114] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            <option value="valuation">Sort: Capital Value</option>
            <option value="runout">Sort: Days of Supply (Urgent)</option>
            <option value="velocity">Sort: Sales Velocity</option>
            <option value="stock">Sort: Available Stock</option>
            <option value="age">Sort: Inflow Age</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportHref}
            download
            className="border-input bg-background hover:bg-muted inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-xs font-semibold text-[#101114] shadow-2xs transition-colors"
            title="Download CSV of current inventory intelligence"
          >
            <Download className="size-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Meta counters */}
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <p>
          Showing {items.length} of {total} {total === 1 ? "variant" : "variants"}
          {isPending ? " (Updating...)" : ""}
        </p>
        <p>
          Calculated using trailing <strong>{window}</strong> net sales (sales &minus; returns).
        </p>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-sm border border-[#101114]/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50">
            <tr className="text-left text-xs font-semibold tracking-wider text-[#101114]/80 uppercase">
              <th className="p-3">SKU / Product</th>
              <th className="p-3 text-right">Available Stock</th>
              <th className="p-3 text-right">Available Capital</th>
              <th className="p-3 text-right">Daily Velocity</th>
              <th className="p-3 text-right">Days of Supply</th>
              <th className="p-3 text-right">Suggested Restock (30d)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground p-12 text-center">
                  <Package className="mx-auto mb-2 size-8 text-neutral-400" />
                  <p className="font-semibold text-neutral-700">No inventory variants found</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Try adjusting your search terms or filter selections.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isUrgent = item.status === "STOCKOUT_RISK" || item.status === "OUT_OF_STOCK";

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-neutral-50 ${
                      item.status === "STOCKOUT_RISK" ? "bg-rose-50/30" : ""
                    }`}
                  >
                    {/* SKU & Product */}
                    <td className="p-3">
                      <div className="font-mono text-xs font-semibold text-[#101114]">
                        {item.sku}
                      </div>
                      <div className="line-clamp-1 font-medium text-neutral-900">
                        {item.productName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {[item.size, item.color].filter(Boolean).join(" / ") || "Standard"}
                      </div>
                    </td>

                    {/* Available Stock */}
                    <td className="p-3 text-right">
                      <div
                        className={`font-semibold ${
                          item.availableStock <= 0
                            ? "text-rose-600"
                            : item.status === "STOCKOUT_RISK"
                              ? "text-rose-700"
                              : "text-neutral-900"
                        }`}
                      >
                        {item.availableStock.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {item.physicalStock} phys ({item.reservedStock} res)
                      </div>
                    </td>

                    {/* Capital Value */}
                    <td className="p-3 text-right">
                      <div className="font-semibold text-neutral-900">
                        {formatBdt(item.availableCostValue)}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Cost: {item.costUnavailable ? "N/A" : formatBdt(item.costPrice)}
                      </div>
                    </td>

                    {/* Velocity */}
                    <td className="p-3 text-right">
                      <div className="font-mono text-xs font-semibold text-neutral-900">
                        {item.dailyVelocity > 0 ? `${item.dailyVelocity.toFixed(2)}/d` : "0.00/d"}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {item.netRetainedUnits} units ({item.soldUnits} sold &minus;{" "}
                        {item.returnedUnits} ret)
                      </div>
                    </td>

                    {/* Days of Supply */}
                    <td className="p-3 text-right">
                      {item.daysOfSupply !== null ? (
                        <div>
                          <span
                            className={`font-semibold ${
                              item.daysOfSupply <= 14
                                ? "text-rose-600"
                                : item.daysOfSupply > 180
                                  ? "text-amber-700"
                                  : "text-neutral-900"
                            }`}
                          >
                            {Math.round(item.daysOfSupply)} days
                          </span>
                          <div className="text-muted-foreground text-[11px]">
                            {item.daysOfSupply <= 7 ? "Stockout critical" : "Runout pace"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Suggested Restock */}
                    <td className="p-3 text-right">
                      {item.suggestedRestockQty !== null && item.suggestedRestockQty > 0 ? (
                        <div className="font-semibold text-rose-700">
                          +{item.suggestedRestockQty.toLocaleString()} units
                          <div className="text-[11px] font-normal text-rose-600">
                            Covers 30d sales
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">{getStatusBadge(item.status)}</td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className={`inline-flex h-7 items-center rounded-sm px-2.5 text-xs font-semibold shadow-2xs transition-colors ${
                          isUrgent
                            ? "bg-[#101114] text-white hover:bg-[#101114]/85"
                            : "border border-[#101114]/20 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                        }`}
                        title="View inventory transactions, adjustments, and supplier purchase orders"
                      >
                        {isUrgent ? "Restock →" : "Ledger →"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Inventory intelligence pages"
          className="flex items-center justify-center gap-3 pt-2"
        >
          {currentFilters.page > 1 ? (
            <button
              type="button"
              onClick={() => updateUrlParams({ page: currentFilters.page - 1 })}
              className="inline-flex size-9 items-center justify-center rounded-sm border border-[#101114]/20 bg-white text-sm font-semibold transition-colors hover:bg-[#F3F0E8]"
            >
              &larr;
            </button>
          ) : null}
          <span className="text-xs font-medium text-[#101114]">
            Page {currentFilters.page} of {totalPages}
          </span>
          {currentFilters.page < totalPages ? (
            <button
              type="button"
              onClick={() => updateUrlParams({ page: currentFilters.page + 1 })}
              className="inline-flex size-9 items-center justify-center rounded-sm border border-[#101114]/20 bg-white text-sm font-semibold transition-colors hover:bg-[#F3F0E8]"
            >
              &rarr;
            </button>
          ) : null}
        </nav>
      )}
    </div>
  );
}
