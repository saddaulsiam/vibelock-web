"use client";

import {
  AdminMutationForm,
  AdminTableInfiniteScroll,
  useAdminTableColumns,
  type ColumnOption,
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
  deleteProductAction,
  loadMoreAdminProductsAction,
  toggleProductPublishedAction,
} from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductItem, AdminProductsResult } from "@/lib/admin/catalog/catalog-queries";
import {
  Boxes,
  ChevronDown,
  Copy,
  ExternalLink,
  ImageOff,
  Layers,
  Pencil,
  Printer,
  RotateCcw,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { AdminProductBarcodeModal } from "./admin-product-barcode-modal";
import { AdminProductBulkBar } from "./admin-product-bulk-bar";
import { AdminProductQuickPriceModal } from "./admin-product-quick-price-modal";
import { AdminProductsToolbar } from "./admin-products-toolbar";

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

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const { allCategories, totalFiltered, pageSize, counts } = initialData;

  const [loadedProducts, setLoadedProducts] = React.useState<AdminProductItem[]>(
    initialData.products
  );
  const [currentPage, setCurrentPage] = React.useState<number>(initialData.page || 1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);

  // Multi-select & Bulk feedback state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
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

  // Quick Price Edit state
  const [priceEditProduct, setPriceEditProduct] = React.useState<AdminProductItem | null>(null);

  // Barcode Scanner auto-detection state & buffer
  const [scannedIndicator, setScannedIndicator] = React.useState<string | null>(null);
  const scannerBufferRef = React.useRef<{ text: string; times: number[] }>({
    text: "",
    times: [],
  });

  // Adjust state during render when initialData changes
  const [prevInitialData, setPrevInitialData] = React.useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setLoadedProducts(initialData.products);
    setCurrentPage(initialData.page || 1);
    setIsLoadingMore(false);
    setSelectedIds(new Set());
    setExpandedVariantId(null);
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

  const handleResetFilters = () => {
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
      {/* ── 1. Products Toolbar (Quick Tabs, Filters, Search, Export, Columns) ── */}
      <AdminProductsToolbar
        counts={counts}
        currentFilters={currentFilters}
        allCategories={allCategories}
        loadedCount={loadedProducts.length}
        totalFiltered={totalFiltered}
        bulkFeedback={bulkFeedback}
        onClearBulkFeedback={() => setBulkFeedback(null)}
        onUpdateQuery={updateQuery}
        onResetFilters={handleResetFilters}
        productColumnOptions={productColumnOptions}
        visibleColumns={visibleColumns}
        onColumnChange={handleColumnChange}
        onColumnReset={handleColumnReset}
        searchInputRef={searchInputRef}
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
            {visibleColumns.categories && <TableHead>Categories</TableHead>}
            {visibleColumns.price && <TableHead>Price</TableHead>}
            {visibleColumns.stock && <TableHead>Inventory Stock</TableHead>}
            {visibleColumns.status && <TableHead>Status</TableHead>}
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
                <TableRow key={product.id} className={isSelected ? "bg-[#F3F0E8]/50" : undefined}>
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
                        <span className="text-muted-foreground text-xs italic">Uncategorized</span>
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
                          onClick={() => setPriceEditProduct(product)}
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
                        onClick={() => setBarcodeModalProducts([product])}
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
      <AdminProductBulkBar
        selectedIds={selectedIds}
        loadedProducts={loadedProducts}
        allCategories={allCategories}
        onClearSelection={() => setSelectedIds(new Set())}
        onOpenBarcodeModal={(selected) => setBarcodeModalProducts(selected)}
        onSuccess={(msg) => {
          setBulkFeedback(msg);
          router.refresh();
        }}
      />

      {/* ── Barcode & Price Tag Printing Modal ── */}
      <AdminProductBarcodeModal
        products={barcodeModalProducts}
        onClose={() => setBarcodeModalProducts(null)}
      />

      {/* ── Quick Price & Discount Edit Modal ── */}
      <AdminProductQuickPriceModal
        product={priceEditProduct}
        onClose={() => setPriceEditProduct(null)}
        onSuccess={(updatedProduct, msg) => {
          setLoadedProducts((prev) =>
            prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
          );
          setBulkFeedback(msg);
          router.refresh();
        }}
      />

      {/* ── Barcode Scanner Auto-Detection Toast Indicator ── */}
      {scannedIndicator && (
        <div className="animate-in slide-in-from-top-3 fade-in fixed top-6 right-6 z-50 flex items-center gap-2 rounded-sm border border-[#00D9FF]/40 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl duration-200">
          <span className="flex size-2 animate-ping rounded-full bg-[#00D9FF]" />
          <span className="font-semibold text-[#00D9FF]">⚡ Scanner Active:</span>
          <span>{scannedIndicator}</span>
        </div>
      )}
    </div>
  );
}
