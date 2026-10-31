"use client";

import { AdminMutationForm } from "@/components/admin/shared";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
  type ColumnOption,
} from "@/components/admin/shared";
import {
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  ADMIN_TABLE_CLASSES,
} from "@/components/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkAssignProductCategoryAction,
  bulkDeleteProductsAction,
  bulkUpdateProductStatusAction,
  deleteProductAction,
  exportAdminProductsCsvAction,
  loadMoreAdminProductsAction,
  quickUpdateProductPricesAction,
  toggleProductPublishedAction,
} from "@/lib/admin/catalog-actions";
import type { AdminProductItem, AdminProductsResult } from "@/lib/admin/catalog-queries";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  ImageOff,
  Layers,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

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
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((w, idx) => {
        const x = currentX;
        currentX += w;
        if (idx % 2 === 0) {
          return <rect key={idx} x={x} y={0} width={w} height={height} fill="#000000" />;
        }
        return null;
      })}
    </svg>
  );
}

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return `৳${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

interface AdminProductsTableProps {
  initialData: AdminProductsResult;
  currentFilters: {
    q: string;
    category: string;
    status: string;
    stock: string;
    sort: string;
    page: number;
  };
}

export function AdminProductsTable({ initialData, currentFilters }: AdminProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const { allCategories, totalFiltered, pageSize, counts } = initialData;

  const [loadedProducts, setLoadedProducts] = React.useState<AdminProductItem[]>(
    initialData.products
  );
  const [currentPage, setCurrentPage] = React.useState<number>(initialData.page || 1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);

  // Multi-select & Bulk actions state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [bulkFeedback, setBulkFeedback] = React.useState<string | null>(null);

  // Variant breakdown popover state
  const [expandedVariantId, setExpandedVariantId] = React.useState<string | null>(null);

  // Column visibility hook
  const productColumnOptions: ColumnOption<"categories" | "price" | "stock" | "status">[] =
    React.useMemo(
      () => [
        { key: "categories", label: "Categories" },
        { key: "price", label: "Price" },
        { key: "stock", label: "Inventory Stock" },
        { key: "status", label: "Status" },
      ],
      []
    );

  const { visibleColumns, handleColumnChange, handleColumnReset } =
    useAdminTableColumns(productColumnOptions);

  // Barcode / Price Tag Modal state
  const [barcodeModalProducts, setBarcodeModalProducts] = React.useState<AdminProductItem[] | null>(
    null
  );
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantityMode, setBarcodeQuantityMode] = React.useState<
    "one-per-variant" | "by-stock" | "custom"
  >("one-per-variant");
  const [barcodeCustomQuantity, setBarcodeCustomQuantity] = React.useState<number>(5);
  const [barcodeVariantOverrides, setBarcodeVariantOverrides] = React.useState<
    Record<string, number>
  >({});
  const [showVariantTuning, setShowVariantTuning] = React.useState<boolean>(false);

  // CSV Export state
  const [isExporting, setIsExporting] = React.useState(false);

  // Quick Price Edit state
  const [priceEditProduct, setPriceEditProduct] = React.useState<AdminProductItem | null>(null);
  const [priceForm, setPriceForm] = React.useState<{ sellingPrice: string; discountPrice: string }>(
    {
      sellingPrice: "",
      discountPrice: "",
    }
  );
  const [isUpdatingPrice, setIsUpdatingPrice] = React.useState(false);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  // Bulk Category Assign state
  const [showBulkCategoryMenu, setShowBulkCategoryMenu] = React.useState(false);
  const [selectedBulkCategoryId, setSelectedBulkCategoryId] = React.useState<string>("");
  const [bulkCategoryMode, setBulkCategoryMode] = React.useState<"add" | "replace">("add");
  const [isBulkCategoryApplying, setIsBulkCategoryApplying] = React.useState(false);

  // Barcode Scanner auto-detection state & buffer
  const [scannedIndicator, setScannedIndicator] = React.useState<string | null>(null);
  const scannerBufferRef = React.useRef<{ text: string; times: number[] }>({
    text: "",
    times: [],
  });

  // Adjust state during render when initialData or filters change (React standard pattern)
  const [prevInitialData, setPrevInitialData] = React.useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setLoadedProducts(initialData.products);
    setCurrentPage(initialData.page || 1);
    setIsLoadingMore(false);
    setSelectedIds(new Set());
    setExpandedVariantId(null);
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
        if (!val || val === "all" || val === "ALL") {
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
            setSearchTerm(scanned);
            updateQuery({ q: scanned });
            setScannedIndicator(`Scanned Barcode: ${scanned}`);
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

  // Multi-select helpers
  const isAllSelected =
    loadedProducts.length > 0 && loadedProducts.every((p) => selectedIds.has(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(loadedProducts.map((p) => p.id)));
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

  const handleBulkStatus = async (status: "PUBLISHED" | "DRAFT") => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    setIsBulkOperating(true);
    setBulkFeedback(null);
    try {
      const res = await bulkUpdateProductStatusAction(Array.from(selectedIds), status);
      if (res.error) {
        alert(res.error);
      } else {
        setBulkFeedback(res.message || "Updated successfully.");
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      alert("Bulk status update failed.");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected product(s)? Products with existing orders, reservations, or reviews will be skipped.`
    );
    if (!confirmed) return;

    setIsBulkOperating(true);
    setBulkFeedback(null);
    try {
      const res = await bulkDeleteProductsAction(Array.from(selectedIds));
      if (res.error) {
        alert(res.error);
      } else {
        setBulkFeedback(res.message || "Deleted successfully.");
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      alert("Bulk delete failed.");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAssignCategory = async () => {
    if (selectedIds.size === 0 || !selectedBulkCategoryId || isBulkCategoryApplying) return;
    setIsBulkCategoryApplying(true);
    try {
      const res = await bulkAssignProductCategoryAction(
        Array.from(selectedIds),
        selectedBulkCategoryId,
        bulkCategoryMode
      );
      if (res.error) {
        alert(res.error);
      } else {
        setBulkFeedback(res.message || "Categories updated.");
        setShowBulkCategoryMenu(false);
        setSelectedBulkCategoryId("");
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      alert("Failed to assign category.");
    } finally {
      setIsBulkCategoryApplying(false);
    }
  };

  const handleSaveQuickPrice = async () => {
    if (!priceEditProduct || isUpdatingPrice) return;
    setPriceError(null);
    setIsUpdatingPrice(true);
    try {
      const sNum = Number(priceForm.sellingPrice);
      const dNum = priceForm.discountPrice ? Number(priceForm.discountPrice) : null;
      const res = await quickUpdateProductPricesAction(priceEditProduct.id, {
        sellingPrice: sNum,
        discountPrice: dNum,
      });
      if (res.error) {
        setPriceError(res.error);
      } else {
        setLoadedProducts((prev) =>
          prev.map((p) => {
            if (p.id !== priceEditProduct.id) return p;
            return {
              ...p,
              minSellingPrice: sNum,
              maxSellingPrice: sNum,
              minDiscountPrice: dNum,
              variants: p.variants.map((v) => ({
                ...v,
                sellingPrice: sNum,
                discountPrice: dNum,
              })),
            };
          })
        );
        setBulkFeedback(`Updated prices for "${priceEditProduct.name}".`);
        setPriceEditProduct(null);
        router.refresh();
      }
    } catch {
      setPriceError("Failed to update prices.");
    } finally {
      setIsUpdatingPrice(false);
    }
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

  // Debounced search input handler
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
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace(pathname);
  };

  const hasMore = loadedProducts.length < totalFiltered;

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || loadedProducts.length >= totalFiltered) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await loadMoreAdminProductsAction({
        search: currentFilters.q,
        category: currentFilters.category,
        status: currentFilters.status,
        stockStatus: currentFilters.stock,
        sort: currentFilters.sort,
        page: nextPage,
        pageSize,
      });

      if (res && res.products.length > 0) {
        setLoadedProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = res.products.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loadedProducts.length, totalFiltered, currentPage, currentFilters, pageSize]);

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
          onClick={() => updateQuery({ status: "all", stock: "all" })}
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
          onClick={() => updateQuery({ status: "PUBLISHED", stock: "all" })}
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
          onClick={() => updateQuery({ status: "DRAFT", stock: "all" })}
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
          onClick={() => updateQuery({ stock: "low-stock", status: "all" })}
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
          onClick={() => updateQuery({ stock: "out-of-stock", status: "all" })}
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
            onClick={() => updateQuery({ status: "ARCHIVED", stock: "all" })}
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
            onClick={() => setBulkFeedback(null)}
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
            onChange={(category) => updateQuery({ category })}
            options={[
              { value: "all", label: "All Categories" },
              ...allCategories.map((c) => ({ value: c.slug, label: c.name })),
            ]}
            ariaLabel="Filter by category"
          />

          {/* Stock Filter */}
          <AdminTableFilterSelect
            value={currentFilters.stock}
            onChange={(stock) => updateQuery({ stock })}
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
            onChange={(status) => updateQuery({ status })}
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
            onChange={(sort) => updateQuery({ sort })}
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
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={loadedProducts.length}
        totalFiltered={totalFiltered}
        itemName="product"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      {/* ── 3. Products Data Table ── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-4 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select all products"
                className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            {visibleColumns.categories && (
              <TableHead>Categories</TableHead>
            )}
            {visibleColumns.price && (
              <TableHead>Price</TableHead>
            )}
            {visibleColumns.stock && (
              <TableHead>Inventory Stock</TableHead>
            )}
            {visibleColumns.status && (
              <TableHead>Status</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadedProducts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  2 +
                  (visibleColumns.categories ? 1 : 0) +
                  (visibleColumns.price ? 1 : 0) +
                  (visibleColumns.stock ? 1 : 0) +
                  (visibleColumns.status ? 1 : 0) +
                  1
                }
                className="px-5 py-14 text-center"
              >
                <div className="mx-auto max-w-sm space-y-3">
                  <Boxes className="mx-auto size-8 text-[#101114]/30" />
                  <h3 className="text-sm font-semibold text-[#101114]">
                    {hasActiveFilters ? "No products match your filters" : "No products yet"}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-5">
                    {hasActiveFilters
                      ? "Try clearing your search query or loosening your filters to see more catalog items."
                      : "Create your first product to begin building the VibeLock streetwear catalog."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
                    >
                      <RotateCcw className="size-3.5" /> Clear all filters
                    </button>
                  ) : (
                    <Link
                      href="/admin/products/new"
                      className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-2 text-xs font-semibold text-white hover:bg-[#101114]/85"
                    >
                      Create product
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
              loadedProducts.map((product) => {
                const hasDiscount =
                  product.minDiscountPrice !== null &&
                  product.minSellingPrice !== null &&
                  product.minDiscountPrice < product.minSellingPrice;

                const discountPercent =
                  hasDiscount && product.minSellingPrice
                    ? Math.round(
                        ((product.minSellingPrice - product.minDiscountPrice!) /
                          product.minSellingPrice) *
                          100
                      )
                    : 0;

                const isOutOfStock = product.totalStock <= 0;
                const isLowStock = product.totalStock > 0 && product.totalStock <= 5;
                const isSelected = selectedIds.has(product.id);

                return (
                  <TableRow
                    key={product.id}
                    className={isSelected ? "bg-[#F3F0E8]/50" : undefined}
                  >
                    {/* ── Selection Checkbox ── */}
                    <TableCell className="w-10 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(product.id)}
                        aria-label={`Select ${product.name}`}
                        className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
                      />
                    </TableCell>

                    {/* ── Product Info & Thumbnail ── */}
                    <TableCell>
                      <div className="flex items-center gap-3.5">
                        {/* Thumbnail with High-Res Hover Preview */}
                        <div className="group/thumb relative size-12 shrink-0">
                          <div className="relative size-12 overflow-hidden rounded-sm border border-[#101114]/15 bg-[#F2F2F2]">
                            {product.primaryImage ? (
                              <Image
                                src={product.primaryImage}
                                alt={product.name}
                                fill
                                sizes="48px"
                                loading="lazy"
                                className="object-cover object-center"
                                unoptimized={product.primaryImage.startsWith("blob:")}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-[#101114]/25">
                                <ImageOff className="size-5" />
                              </div>
                            )}
                          </div>

                          {/* Hover preview card */}
                          {product.primaryImage && (
                            <div className="pointer-events-none absolute top-0 left-14 z-50 hidden w-48 rounded-sm border border-[#101114]/20 bg-white p-2 shadow-2xl group-hover/thumb:block">
                              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xs bg-[#F2F2F2]">
                                <Image
                                  src={product.primaryImage}
                                  alt={product.name}
                                  fill
                                  sizes="192px"
                                  loading="lazy"
                                  className="object-cover object-center"
                                  unoptimized={product.primaryImage.startsWith("blob:")}
                                />
                              </div>
                              <p className="mt-2 truncate text-xs font-semibold text-[#101114]">
                                {product.name}
                              </p>
                              <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#101114]/60">
                                <span className="font-mono">/{product.slug}</span>
                                <span>{product.totalStock} in stock</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title, Slug & Variant summary with breakdown popover */}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="font-semibold text-[#101114] hover:underline"
                          >
                            {product.name}
                          </Link>
                          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-mono text-[11px]">/{product.slug}</span>
                            <span>•</span>

                            {/* Variant Breakdown Trigger & Popover */}
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedVariantId(
                                    expandedVariantId === product.id ? null : product.id
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-xs bg-[#101114]/5 px-1.5 py-0.5 text-[10px] font-semibold text-[#101114]/75 transition-colors hover:bg-[#101114]/10 hover:text-[#101114]"
                                title="Click to view variant stock details"
                              >
                                <Layers className="size-3 text-[#101114]/60" />
                                <span>
                                  {product.variantCount}{" "}
                                  {product.variantCount === 1 ? "variant" : "variants"}
                                </span>
                                <ChevronDown
                                  className={`size-2.5 transition-transform ${
                                    expandedVariantId === product.id ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {/* Variant Details Popover Dropdown */}
                              {expandedVariantId === product.id && product.variants && (
                                <div className="animate-in fade-in zoom-in-95 absolute top-full left-0 z-40 mt-1.5 w-80 rounded-sm border border-[#101114]/15 bg-white p-3 shadow-xl duration-150">
                                  <div className="flex items-center justify-between border-b border-[#101114]/10 pb-2">
                                    <p className="text-xs font-semibold text-[#101114]">
                                      Variant Stock Breakdown
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedVariantId(null)}
                                      className="text-[#101114]/40 hover:text-[#101114]"
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </div>

                                  <div className="mt-2 max-h-56 divide-y divide-[#101114]/5 overflow-y-auto pr-1 text-xs">
                                    {product.variants.map((v) => (
                                      <div
                                        key={v.id}
                                        className="flex items-center justify-between py-1.5"
                                      >
                                        <div>
                                          <p className="font-mono text-[11px] font-medium text-[#101114]">
                                            {v.sku}
                                          </p>
                                          <p className="text-[10px] text-[#101114]/60">
                                            {[
                                              v.size ? `Size: ${v.size}` : null,
                                              v.color ? `Color: ${v.color}` : null,
                                            ]
                                              .filter(Boolean)
                                              .join(" • ") || "Default"}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <span
                                            className={`inline-flex items-center rounded-xs px-1.5 py-0.5 text-[10px] font-semibold ${
                                              v.stock <= 0
                                                ? "border border-red-200 bg-red-50 text-red-700"
                                                : v.stock <= 5
                                                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }`}
                                          >
                                            {v.stock <= 0 ? "Out of Stock" : `${v.stock} in stock`}
                                          </span>
                                          <p className="mt-0.5 font-mono text-[10px] text-[#101114]/70">
                                            ৳{v.discountPrice ?? v.sellingPrice}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* ── Categories (Clickable Pills) ── */}
                    {visibleColumns.categories && (
                      <TableCell className="px-5 py-3.5">
                        {product.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.categories.map((c) => {
                              const isSelected = currentFilters.category === c.slug;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() =>
                                    updateQuery({
                                      category: isSelected ? "all" : c.slug,
                                    })
                                  }
                                  className={`inline-flex items-center rounded-xs px-2 py-0.5 text-xs font-medium transition-colors ${
                                    isSelected
                                      ? "bg-[#101114] text-white shadow-2xs"
                                      : "border border-[#101114]/15 bg-[#FBF9F5] text-[#101114] hover:border-[#101114] hover:bg-[#F3F0E8]"
                                  }`}
                                  title={
                                    isSelected
                                      ? `Clear filter: ${c.name}`
                                      : `Filter by category: ${c.name}`
                                  }
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">
                            Uncategorized
                          </span>
                        )}
                      </TableCell>
                    )}

                    {/* ── Price ── */}
                    {visibleColumns.price && (
                      <TableCell className="px-5 py-3.5 tabular-nums">
                        <div className="group/price flex items-center justify-between gap-1.5">
                          {hasDiscount ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#101114]">
                                  {formatPrice(product.minDiscountPrice)}
                                </span>
                                <span className="py-0.2 rounded-xs bg-red-100 px-1.5 text-[10px] font-bold text-red-700">
                                  -{discountPercent}%
                                </span>
                              </div>
                              <span className="text-muted-foreground block text-xs line-through">
                                {formatPrice(product.minSellingPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-[#101114]">
                              {formatPrice(product.minSellingPrice)}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPriceEditProduct(product);
                              setPriceForm({
                                sellingPrice: String(product.minSellingPrice ?? ""),
                                discountPrice: product.minDiscountPrice
                                  ? String(product.minDiscountPrice)
                                  : "",
                              });
                              setPriceError(null);
                            }}
                            className="rounded p-1 text-[#101114]/40 opacity-0 transition-opacity group-hover/price:opacity-100 hover:bg-[#101114]/10 hover:text-[#101114] focus:opacity-100"
                            title="Quick edit price & discount"
                          >
                            <Pencil className="size-3" />
                          </button>
                        </div>
                      </TableCell>
                    )}

                    {/* ── Inventory Stock ── */}
                    {visibleColumns.stock && (
                      <TableCell className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isLowStock ? (
                            <span className="relative flex size-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                            </span>
                          ) : (
                            <span
                              className={`size-2 rounded-full ${
                                isOutOfStock ? "bg-red-500" : "bg-emerald-500"
                              }`}
                            />
                          )}
                          <span
                            className={`text-xs font-semibold ${
                              isOutOfStock
                                ? "text-red-700"
                                : isLowStock
                                  ? "text-amber-800"
                                  : "text-emerald-800"
                            }`}
                          >
                            {isOutOfStock
                              ? "Out of Stock"
                              : isLowStock
                                ? `Low Stock (${product.totalStock})`
                                : `In Stock (${product.totalStock})`}
                          </span>
                          {isLowStock && (
                            <span className="rounded-2xs py-0.2 bg-amber-100 px-1 text-[9px] font-extrabold text-amber-800">
                              REORDER
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* ── Status ── */}
                    {visibleColumns.status && (
                      <TableCell className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                            product.status === "PUBLISHED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : product.status === "DRAFT"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-[#101114]/15 bg-[#F3F0E8] text-[#101114]"
                          }`}
                        >
                          {product.status === "PUBLISHED"
                            ? "Published"
                            : product.status === "DRAFT"
                              ? "Draft"
                              : "Archived"}
                        </span>
                      </TableCell>
                    )}

                    {/* ── Actions ── */}
                    <TableCell className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Link */}
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                          title="Edit product"
                        >
                          <Pencil className="size-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </Link>

                        {/* Duplicate Link */}
                        <Link
                          href={`/admin/products/new?duplicateFrom=${product.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                          title="Duplicate as new product"
                        >
                          <Copy className="size-3.5" />
                        </Link>

                        {/* Print Barcode Price Tag */}
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeModalProducts([product]);
                            setBarcodeVariantOverrides({});
                            setShowVariantTuning(false);
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                          title="Print price tag barcode labels for this product"
                        >
                          <Printer className="size-3.5" />
                        </button>

                        {/* Publish / Unpublish Toggle */}
                        <AdminMutationForm
                          action={toggleProductPublishedAction}
                          id={product.id}
                          label={product.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          size="sm"
                          variant="outline"
                          className="inline-flex"
                        />

                        {/* Delete Action */}
                        <AdminMutationForm
                          action={deleteProductAction}
                          id={product.id}
                          label="Delete"
                          size="sm"
                          destructive
                          variant="outline"
                          className="inline-flex"
                          confirmMessage={`Delete “${product.name}”? This action cannot be undone.`}
                        />

                        {/* Storefront View Link */}
                        {product.status === "PUBLISHED" && (
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center rounded-sm border border-[#101114]/20 bg-white px-2 text-xs text-[#101114]/70 shadow-2xs transition-colors hover:bg-[#F3F0E8] hover:text-[#101114]"
                            title="View product on live store"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
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
        loadedCount={loadedProducts.length}
        totalCount={totalFiltered}
        itemName="products"
        filterSummary={hasActiveFilters ? `filtered from ${counts.total} total` : null}
      />

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-sm border border-white/15 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md duration-200 sm:gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
              {selectedIds.size}
            </span>
            <span className="hidden sm:inline">selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Bulk Publish */}
          <button
            type="button"
            disabled={isBulkOperating}
            onClick={() => handleBulkStatus("PUBLISHED")}
            className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            title="Publish all selected products"
          >
            <Eye className="size-3.5" />
            <span>Publish</span>
          </button>

          {/* Bulk Unpublish (Draft) */}
          <button
            type="button"
            disabled={isBulkOperating}
            onClick={() => handleBulkStatus("DRAFT")}
            className="inline-flex items-center gap-1.5 rounded-xs bg-amber-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            title="Set all selected products to Draft"
          >
            <EyeOff className="size-3.5" />
            <span>Draft</span>
          </button>

          {/* Bulk Assign Category */}
          <div className="relative">
            <button
              type="button"
              disabled={isBulkOperating}
              onClick={() => setShowBulkCategoryMenu(!showBulkCategoryMenu)}
              className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              title="Assign category to selected products"
            >
              <Tag className="size-3.5" />
              <span>Category</span>
              <ChevronDown className="size-3" />
            </button>

            {showBulkCategoryMenu && (
              <div className="animate-in fade-in zoom-in-95 absolute bottom-full left-0 mb-2 w-64 rounded-sm border border-white/20 bg-[#101114] p-3 text-white shadow-2xl">
                <p className="text-[11px] font-semibold text-white/90">Bulk Assign Category</p>
                <select
                  value={selectedBulkCategoryId}
                  onChange={(e) => setSelectedBulkCategoryId(e.target.value)}
                  className="mt-1.5 h-8 w-full rounded-sm border border-white/20 bg-[#1e2024] px-2 text-xs text-white"
                >
                  <option value="">Select category...</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-white/70">
                  <label className="flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name="bulkCatMode"
                      checked={bulkCategoryMode === "add"}
                      onChange={() => setBulkCategoryMode("add")}
                      className="accent-[#00D9FF]"
                    />
                    Add
                  </label>
                  <label className="flex cursor-pointer items-center gap-1">
                    <input
                      type="radio"
                      name="bulkCatMode"
                      checked={bulkCategoryMode === "replace"}
                      onChange={() => setBulkCategoryMode("replace")}
                      className="accent-[#00D9FF]"
                    />
                    Replace All
                  </label>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkCategoryMenu(false)}
                    className="px-2 py-1 text-[11px] text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedBulkCategoryId || isBulkCategoryApplying}
                    onClick={handleBulkAssignCategory}
                    className="rounded-xs bg-[#00D9FF] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#00D9FF]/90 disabled:opacity-50"
                  >
                    {isBulkCategoryApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Print Barcode Tags */}
          <button
            type="button"
            disabled={isBulkOperating}
            onClick={() => {
              const selected = loadedProducts.filter((p) => selectedIds.has(p.id));
              setBarcodeModalProducts(selected);
              setBarcodeVariantOverrides({});
              setShowVariantTuning(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Print price tag barcode labels for selected products"
          >
            <Printer className="size-3.5" />
            <span>Print Tags</span>
          </button>

          {/* Bulk Delete */}
          <button
            type="button"
            disabled={isBulkOperating}
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 rounded-xs bg-red-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            title="Delete all selected products"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </button>

          <div className="h-4 w-px bg-white/20" />

          {/* Deselect All */}
          <button
            type="button"
            disabled={isBulkOperating}
            onClick={() => setSelectedIds(new Set())}
            className="text-white/60 transition-colors hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── 5. Barcode & Price Tag Printing Modal ── */}
      {barcodeModalProducts && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Print Price Tags & Barcodes ({barcodeModalProducts.length}{" "}
                  {barcodeModalProducts.length === 1 ? "product" : "products"})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeModalProducts(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Settings Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Format selection */}
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

                {/* Quantity mode */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Quantity:</span>
                  <select
                    value={barcodeQuantityMode}
                    onChange={(e) => {
                      setBarcodeQuantityMode(
                        e.target.value as "one-per-variant" | "by-stock" | "custom"
                      );
                      setBarcodeVariantOverrides({});
                    }}
                    className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="one-per-variant">1 Label per Variant</option>
                    <option value="by-stock">Match Current Stock Count</option>
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
                        onClick={() => setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))}
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
                        onClick={() => setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))}
                        className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                        title="Increase"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#101114]/10 pl-1">
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
                    {barcodeModalProducts.reduce((acc, product) => {
                      const variants =
                        product.variants && product.variants.length > 0
                          ? product.variants
                          : [{ id: product.id, stock: product.totalStock }];

                      const productTotal = variants.reduce((vAcc, v) => {
                        const count =
                          barcodeVariantOverrides[v.id] !== undefined
                            ? barcodeVariantOverrides[v.id]
                            : barcodeQuantityMode === "by-stock"
                              ? Math.max(1, v.stock > 0 ? v.stock : 1)
                              : barcodeQuantityMode === "custom"
                                ? barcodeCustomQuantity
                                : 1;
                        return vAcc + count;
                      }, 0);

                      return acc + productTotal;
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
            {barcodeModalProducts.some(
              (p) => (p.variants && p.variants.length > 1) || barcodeModalProducts.length > 1
            ) && (
              <div className="border-b border-[#101114]/10 bg-white px-5 py-2">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setShowVariantTuning(!showVariantTuning)}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#101114] hover:underline"
                  >
                    <span>
                      {showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant
                    </span>
                  </button>
                  {Object.keys(barcodeVariantOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBarcodeVariantOverrides({})}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Reset variant overrides
                    </button>
                  )}
                </div>

                {showVariantTuning && (
                  <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                    {barcodeModalProducts.flatMap((product) => {
                      const variants =
                        product.variants && product.variants.length > 0
                          ? product.variants
                          : [
                              {
                                id: product.id,
                                sku: product.skus[0] || product.slug,
                                size: null,
                                color: null,
                                stock: product.totalStock,
                              },
                            ];

                      return variants.map((v) => {
                        const count =
                          barcodeVariantOverrides[v.id] !== undefined
                            ? barcodeVariantOverrides[v.id]
                            : barcodeQuantityMode === "by-stock"
                              ? Math.max(1, v.stock > 0 ? v.stock : 1)
                              : barcodeQuantityMode === "custom"
                                ? barcodeCustomQuantity
                                : 1;

                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 rounded-xs border border-[#101114]/5 bg-white px-2.5 py-1 text-xs"
                          >
                            <div className="min-w-0 flex-1 truncate">
                              <span className="font-semibold text-[#101114]">{product.name}</span>
                              <span className="ml-2 font-mono text-[10px] text-[#101114]/60">
                                {v.sku}
                              </span>
                              <span className="ml-2 text-[10px] text-[#101114]/50">
                                {[
                                  v.size ? `Size: ${v.size}` : null,
                                  v.color ? `Color: ${v.color}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" • ") || "Default"}
                              </span>
                              <span className="ml-2 text-[10px] text-zinc-400">
                                (Stock: {v.stock})
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setBarcodeVariantOverrides((prev) => ({
                                    ...prev,
                                    [v.id]: Math.max(1, count - 1),
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
                                    setBarcodeVariantOverrides((prev) => ({
                                      ...prev,
                                      [v.id]: Math.min(500, val),
                                    }));
                                  }
                                }}
                                className="h-5 w-10 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBarcodeVariantOverrides((prev) => ({
                                    ...prev,
                                    [v.id]: Math.min(500, count + 1),
                                  }))
                                }
                                className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                              >
                                <Plus className="size-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Tag Preview Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div id="vibelock-printable-labels" className="flex flex-wrap justify-center gap-3">
                {barcodeModalProducts.flatMap((product) => {
                  const variants =
                    product.variants && product.variants.length > 0
                      ? product.variants
                      : [
                          {
                            id: product.id,
                            sku: product.skus[0] || product.slug,
                            size: null,
                            color: null,
                            sellingPrice: product.minSellingPrice ?? 0,
                            discountPrice: product.minDiscountPrice,
                            stock: product.totalStock,
                          },
                        ];

                  return variants.flatMap((v) => {
                    const count =
                      barcodeVariantOverrides[v.id] !== undefined
                        ? barcodeVariantOverrides[v.id]
                        : barcodeQuantityMode === "by-stock"
                          ? Math.max(1, v.stock > 0 ? v.stock : 1)
                          : barcodeQuantityMode === "custom"
                            ? barcodeCustomQuantity
                            : 1;

                    return Array.from({ length: count }, (_, idx) => (
                      <div
                        key={`${v.id}-${idx}`}
                        className={`vibelock-label-card relative flex flex-col justify-between rounded-sm border border-dashed border-[#101114]/30 bg-white p-2 text-center text-[#101114] shadow-xs ${
                          barcodeLabelSize === "compact"
                            ? "h-[25mm] w-[40mm]"
                            : barcodeLabelSize === "sheet"
                              ? "h-[30mm] w-[48mm]"
                              : "h-[30mm] w-[50mm]"
                        }`}
                      >
                        {count > 1 && (
                          <span className="no-print absolute top-1 right-1 font-mono text-[8px] text-[#101114]/40">
                            #{idx + 1}
                          </span>
                        )}
                        <div className="border-b border-[#101114]/15 pb-0.5">
                          <span className="text-[9px] font-extrabold tracking-widest uppercase">
                            VIBELOCK
                          </span>
                        </div>
                        <p className="truncate px-0.5 text-[10px] leading-tight font-semibold">
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between px-1 font-mono text-[9px]">
                          <span>{v.size ? `SIZE: ${v.size}` : ""}</span>
                          <span className="text-[11px] font-bold">
                            ৳{v.discountPrice ?? v.sellingPrice}
                          </span>
                        </div>
                        <div className="px-1 py-0.5">
                          <BarcodeSvg value={v.sku} height={20} />
                          <p className="font-mono text-[8px] tracking-wider text-[#101114]/80">
                            {v.sku}
                          </p>
                        </div>
                      </div>
                    ));
                  });
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#101114]/10 bg-white px-5 py-2.5 text-xs text-[#101114]/60">
              <span>Previewing labels before printing. Press Print Now to send to printer.</span>
              <button
                type="button"
                onClick={() => setBarcodeModalProducts(null)}
                className="font-semibold text-[#101114] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Quick Price & Discount Edit Modal ── */}
      {priceEditProduct && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
          <div className="w-full max-w-md rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Quick Price & Discount Edit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPriceEditProduct(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-3">
                {priceEditProduct.primaryImage ? (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xs border border-[#101114]/15 bg-white">
                    <Image
                      src={priceEditProduct.primaryImage}
                      alt={priceEditProduct.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#101114]">
                    {priceEditProduct.name}
                  </p>
                  <p className="font-mono text-[10px] text-[#101114]/60">
                    /{priceEditProduct.slug} • {priceEditProduct.variantCount} variant(s)
                  </p>
                </div>
              </div>

              {priceError && (
                <div className="rounded-sm border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
                  {priceError}
                </div>
              )}

              <div className="space-y-3">
                {/* Cost Price (কেনা দাম - Disabled / Read-only) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#101114]">Cost Price</label>
                    <span className="text-[10px] font-medium text-[#101114]/50">
                      🔒 Disabled (Main Price / No Change)
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={
                      priceEditProduct.minCostPrice !== null
                        ? priceEditProduct.minCostPrice === priceEditProduct.maxCostPrice
                          ? `৳${priceEditProduct.minCostPrice}`
                          : `৳${priceEditProduct.minCostPrice} – ৳${priceEditProduct.maxCostPrice}`
                        : "৳0"
                    }
                    className="mt-1 h-9 w-full cursor-not-allowed rounded-sm border border-[#101114]/15 bg-[#F3F0E8]/70 px-3 text-xs font-semibold text-[#101114]/70 select-none"
                    title="Cost price cannot be edited here. Change it from the full product edit page."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101114]">
                    Selling Price (BDT ৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={priceForm.sellingPrice}
                    onChange={(e) =>
                      setPriceForm((prev) => ({ ...prev, sellingPrice: e.target.value }))
                    }
                    placeholder="e.g. 1600"
                    className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-medium text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101114]">
                    Discount Price (BDT ৳){" "}
                    <span className="font-normal text-[#101114]/60">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={priceForm.discountPrice}
                    onChange={(e) =>
                      setPriceForm((prev) => ({ ...prev, discountPrice: e.target.value }))
                    }
                    placeholder="Leave blank for regular price"
                    className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-medium text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                {/* Live Savings calculation */}
                {(() => {
                  const s = Number(priceForm.sellingPrice);
                  const d = Number(priceForm.discountPrice);
                  if (s > 0 && d > 0 && d < s) {
                    const save = s - d;
                    const pct = Math.round((save / s) * 100);
                    return (
                      <div className="flex items-center justify-between rounded-xs border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                        <span>
                          Customer saves: <strong>৳{save}</strong>
                        </span>
                        <span className="rounded-2xs bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                          -{pct}% OFF
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Profit Margin / Below Cost Warning */}
                {(() => {
                  const effectivePrice =
                    Number(priceForm.discountPrice) || Number(priceForm.sellingPrice);
                  const cost = priceEditProduct.minCostPrice ?? 0;
                  if (cost > 0 && effectivePrice > 0) {
                    const profit = effectivePrice - cost;
                    const profitMargin = Math.round((profit / effectivePrice) * 100);
                    const isLoss = profit < 0;
                    return (
                      <div
                        className={`flex items-center justify-between rounded-xs border px-3 py-1.5 text-xs ${
                          isLoss
                            ? "border-red-300 bg-red-50 text-red-800"
                            : "border-blue-200 bg-blue-50 text-blue-900"
                        }`}
                      >
                        <span>
                          {isLoss ? "⚠️ Selling below cost:" : "Est. Profit over Cost:"}{" "}
                          <strong>{isLoss ? `-৳${Math.abs(profit)}` : `৳${profit}`}</strong>
                        </span>
                        <span
                          className={`rounded-2xs px-1.5 py-0.5 text-[10px] font-bold ${
                            isLoss ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"
                          }`}
                        >
                          {profitMargin}% margin
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <p className="text-[11px] leading-relaxed text-[#101114]/50">
                Note: Updating the price will apply to all variants of this product.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <button
                type="button"
                onClick={() => setPriceEditProduct(null)}
                className="rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingPrice || !priceForm.sellingPrice}
                onClick={handleSaveQuickPrice}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
              >
                {isUpdatingPrice ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Save Prices</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Barcode Scanner Auto-Detection Toast Indicator ── */}
      {scannedIndicator && (
        <div className="animate-in slide-in-from-top-3 fade-in fixed top-6 right-6 z-50 flex items-center gap-2 rounded-sm border border-[#00D9FF]/40 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl duration-200">
          <span className="flex size-2 animate-ping rounded-full bg-[#00D9FF]" />
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
          #vibelock-printable-labels,
          #vibelock-printable-labels * {
            visibility: visible !important;
          }
          #vibelock-printable-labels {
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
          .vibelock-label-card {
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
