"use client";

import {
  AdminTableColumnVisibility,
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  type ColumnOption,
} from "@/components/admin/shared";
import { exportAdminProductsCsvAction } from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductsResult } from "@/lib/admin/catalog/catalog-queries";
import { AlertTriangle, Download, Layers, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          size="sm"
          variant={
            currentFilters.status === "all" && currentFilters.stock === "all"
              ? "primary"
              : "outline"
          }
          onClick={() => onUpdateQuery({ status: "all", stock: "all" })}
          className="gap-1.5 rounded-lg text-xs font-semibold"
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
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            currentFilters.status === "PUBLISHED" && currentFilters.stock === "all"
              ? "primary"
              : "outline"
          }
          onClick={() => onUpdateQuery({ status: "PUBLISHED", stock: "all" })}
          className="gap-1.5 rounded-lg text-xs font-semibold"
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
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            currentFilters.status === "DRAFT" && currentFilters.stock === "all"
              ? "primary"
              : "outline"
          }
          onClick={() => onUpdateQuery({ status: "DRAFT", stock: "all" })}
          className="gap-1.5 rounded-lg text-xs font-semibold"
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
        </Button>

        <Button
          type="button"
          size="sm"
          variant={currentFilters.stock === "low-stock" ? "primary" : "outline"}
          onClick={() => onUpdateQuery({ stock: "low-stock", status: "all" })}
          className="gap-1.5 rounded-lg text-xs font-semibold"
        >
          <AlertTriangle className="size-3 shrink-0 text-amber-500" />
          <span>Low Stock</span>
          <span
            className={currentFilters.stock === "low-stock" ? "text-white/80" : "text-neutral-500"}
          >
            ({counts.lowStock})
          </span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant={currentFilters.stock === "out-of-stock" ? "primary" : "outline"}
          onClick={() => onUpdateQuery({ stock: "out-of-stock", status: "all" })}
          className="gap-1.5 rounded-lg text-xs font-semibold"
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
        </Button>

        {counts.archived > 0 && (
          <Button
            type="button"
            size="sm"
            variant={currentFilters.status === "ARCHIVED" ? "primary" : "outline"}
            onClick={() => onUpdateQuery({ status: "ARCHIVED", stock: "all" })}
            className="gap-1.5 rounded-lg text-xs font-semibold"
          >
            <span>Archived</span>
            <span
              className={
                currentFilters.status === "ARCHIVED" ? "text-white/80" : "text-neutral-500"
              }
            >
              ({counts.archived})
            </span>
          </Button>
        )}
      </div>

      {/* ── Optional Bulk Feedback Notice ── */}
      {bulkFeedback && (
        <div className="flex items-center justify-between rounded-sm border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
          <span>{bulkFeedback}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClearBulkFeedback}
            className="size-6 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
          >
            <X className="size-3.5" />
          </Button>
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
          <Button
            type="button"
            size="default"
            variant="outline"
            disabled={isExporting}
            loading={isExporting}
            onClick={handleExportCsv}
            className="h-10 gap-1.5 px-3.5 text-xs font-semibold"
            title="Export filtered catalog to CSV"
          >
            {!isExporting && <Download className="size-3.5 text-neutral-500" />}
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

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
