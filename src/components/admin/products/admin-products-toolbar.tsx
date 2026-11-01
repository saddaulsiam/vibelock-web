"use client";

import {
  ADMIN_TABLE_CLASSES,
  AdminTableColumnVisibility,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  type ColumnOption,
} from "@/components/admin/shared";
import { exportAdminProductsCsvAction } from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductsResult } from "@/lib/admin/catalog/catalog-queries";
import { AlertTriangle, Download, Layers, Loader2, X } from "lucide-react";
import * as React from "react";

export interface AdminProductsToolbarProps {
  counts: AdminProductsResult["counts"];
  currentFilters: {
    q: string;
    category: string;
    status: string;
    stock: string;
    sort: string;
    page: number;
  };
  allCategories: { id: string; name: string; slug: string }[];
  loadedCount: number;
  totalFiltered: number;
  bulkFeedback: string | null;
  onClearBulkFeedback: () => void;
  onUpdateQuery: (updates: Record<string, string | null>) => void;
  onResetFilters: () => void;
  productColumnOptions: ColumnOption<"categories" | "price" | "stock" | "status">[];
  visibleColumns: Record<"categories" | "price" | "stock" | "status", boolean>;
  onColumnChange: (key: "categories" | "price" | "stock" | "status", value: boolean) => void;
  onColumnReset: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function AdminProductsToolbar({
  counts,
  currentFilters,
  allCategories,
  loadedCount,
  totalFiltered,
  bulkFeedback,
  onClearBulkFeedback,
  onUpdateQuery,
  onResetFilters,
  productColumnOptions,
  visibleColumns,
  onColumnChange,
  onColumnReset,
  searchInputRef,
}: AdminProductsToolbarProps) {
  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  // Sync search input if currentFilters.q changes from external (e.g. barcode scanner)
  const [prevQ, setPrevQ] = React.useState(currentFilters.q);
  if (prevQ !== currentFilters.q) {
    setPrevQ(currentFilters.q);
    setSearchTerm(currentFilters.q);
  }

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateQuery({ q: val.trim() || null });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateQuery({ q: null });
  };

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await exportAdminProductsCsvAction({
        search: currentFilters.q,
        category: currentFilters.category,
        status: currentFilters.status,
        stockStatus: currentFilters.stock,
        sort: currentFilters.sort,
      });

      if (res.error || !res.csv) {
        alert(res.error || "Failed to export CSV.");
        return;
      }

      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename || "vibelock-products.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export products.");
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    Boolean(currentFilters.q) ||
    currentFilters.category !== "all" ||
    currentFilters.status !== "all" ||
    currentFilters.stock !== "all" ||
    currentFilters.sort !== "newest";

  return (
    <div className="space-y-4">
      {/* ── 1. Top Quick-Filter Status Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onUpdateQuery({ status: "all", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.status === "all" && currentFilters.stock === "all"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <Layers className="size-3.5" />
          <span>All Products</span>
          <span
            className={
              currentFilters.status === "all" && currentFilters.stock === "all"
                ? "text-white/80"
                : "text-neutral-500"
            }
          >
            ({counts.total})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateQuery({ status: "PUBLISHED", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.status === "PUBLISHED" && currentFilters.stock === "all"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span>Published</span>
          <span
            className={
              currentFilters.status === "PUBLISHED" && currentFilters.stock === "all"
                ? "text-white/80"
                : "text-neutral-500"
            }
          >
            ({counts.published})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateQuery({ status: "DRAFT", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.status === "DRAFT" && currentFilters.stock === "all"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>Drafts</span>
          <span
            className={
              currentFilters.status === "DRAFT" && currentFilters.stock === "all"
                ? "text-white/80"
                : "text-neutral-500"
            }
          >
            ({counts.draft})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateQuery({ stock: "low-stock", status: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.stock === "low-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <AlertTriangle className="size-3 shrink-0 text-amber-500" />
          <span>Low Stock</span>
          <span
            className={currentFilters.stock === "low-stock" ? "text-white/80" : "text-neutral-500"}
          >
            ({counts.lowStock})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateQuery({ stock: "out-of-stock", status: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.stock === "out-of-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
          <span>Out of Stock</span>
          <span
            className={
              currentFilters.stock === "out-of-stock" ? "text-white/80" : "text-neutral-500"
            }
          >
            ({counts.outOfStock})
          </span>
        </button>

        {counts.archived > 0 && (
          <button
            type="button"
            onClick={() => onUpdateQuery({ status: "ARCHIVED", stock: "all" })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
              currentFilters.status === "ARCHIVED"
                ? "bg-[#101114] font-semibold text-white shadow-2xs"
                : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <span>Archived</span>
            <span
              className={
                currentFilters.status === "ARCHIVED" ? "text-white/80" : "text-neutral-500"
              }
            >
              ({counts.archived})
            </span>
          </button>
        )}
      </div>

      {/* ── Optional Bulk Feedback Notice ── */}
      {bulkFeedback && (
        <div className="flex items-center justify-between rounded-sm border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
          <span>{bulkFeedback}</span>
          <button
            type="button"
            onClick={onClearBulkFeedback}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Search & Filter Controls Toolbar ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar with '/' shortcut */}
        <AdminTableSearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          placeholder="Search by product name, slug, SKU, or category..."
          inputRef={searchInputRef}
        />

        {/* Filter, Sort & Export Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <AdminTableFilterSelect
            value={currentFilters.category}
            onChange={(category) => onUpdateQuery({ category })}
            options={[
              { value: "all", label: "All Categories" },
              ...allCategories.map((c) => ({ value: c.slug, label: c.name })),
            ]}
            ariaLabel="Filter by category"
          />

          {/* Stock Filter */}
          <AdminTableFilterSelect
            value={currentFilters.stock}
            onChange={(stock) => onUpdateQuery({ stock })}
            options={[
              { value: "all", label: "All Stock Levels" },
              { value: "in-stock", label: "In Stock (>0)" },
              { value: "low-stock", label: "Low Stock (1–5)" },
              { value: "out-of-stock", label: "Out of Stock (0)" },
            ]}
            ariaLabel="Filter by stock level"
          />

          {/* Status Filter */}
          <AdminTableFilterSelect
            value={currentFilters.status}
            onChange={(status) => onUpdateQuery({ status })}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Draft" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
            ariaLabel="Filter by status"
          />

          {/* Sort Selector */}
          <AdminTableFilterSelect
            value={currentFilters.sort}
            onChange={(sort) => onUpdateQuery({ sort })}
            options={[
              { value: "newest", label: "Sort: Newest First" },
              { value: "updated", label: "Sort: Recently Updated" },
              { value: "oldest", label: "Sort: Oldest First" },
              { value: "name_asc", label: "Sort: Name (A to Z)" },
              { value: "name_desc", label: "Sort: Name (Z to A)" },
              { value: "price_asc", label: "Sort: Price (Low to High)" },
              { value: "price_desc", label: "Sort: Price (High to Low)" },
              { value: "stock_desc", label: "Sort: Stock (High to Low)" },
              { value: "stock_asc", label: "Sort: Stock (Low to High)" },
            ]}
            ariaLabel="Sort products"
          />

          {/* Export to CSV Button */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportCsv}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export filtered catalog to CSV"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5 text-neutral-500" />
            )}
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={productColumnOptions}
            visibleColumns={visibleColumns}
            onChange={onColumnChange}
            onReset={onColumnReset}
          />
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={loadedCount}
        totalFiltered={totalFiltered}
        itemName="product"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />
    </div>
  );
}
