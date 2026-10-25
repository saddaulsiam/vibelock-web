"use client";

import { AdminMutationForm } from "@/components/admin/admin-action-form";
import {
  deleteProductAction,
  loadMoreAdminProductsAction,
  toggleProductPublishedAction,
} from "@/lib/admin/catalog-actions";
import type { AdminProductItem, AdminProductsResult } from "@/lib/admin/catalog-queries";
import {
  AlertTriangle,
  Boxes,
  Copy,
  ExternalLink,
  ImageOff,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

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

  const { allCategories, totalFiltered, pageSize, counts } = initialData;

  const [loadedProducts, setLoadedProducts] = React.useState<AdminProductItem[]>(
    initialData.products
  );
  const [currentPage, setCurrentPage] = React.useState<number>(initialData.page || 1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Adjust state during render when initialData or filters change (React standard pattern)
  const [prevInitialData, setPrevInitialData] = React.useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setLoadedProducts(initialData.products);
    setCurrentPage(initialData.page || 1);
    setIsLoadingMore(false);
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

  // Infinite scroll observer: trigger handleLoadMore when sentinel enters viewport
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoadingMore) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, isLoadingMore]);

  const hasActiveFilters =
    Boolean(currentFilters.q) ||
    currentFilters.category !== "all" ||
    currentFilters.status !== "all" ||
    currentFilters.stock !== "all" ||
    currentFilters.sort !== "newest";

  return (
    <div className="space-y-4">
      {/* ── 1. Top Quick-Filter Status Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#101114]/10 pb-3 text-xs">
        <button
          type="button"
          onClick={() => updateQuery({ status: "all", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.status === "all" && currentFilters.stock === "all"
              ? "bg-[#101114] text-white"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-[#F3F0E8]"
          }`}
        >
          All Products
          <span className="opacity-70">({counts.total})</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ status: "PUBLISHED", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.status === "PUBLISHED" && currentFilters.stock === "all"
              ? "bg-emerald-800 text-white"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-emerald-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Published
          <span className="opacity-70">({counts.published})</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ status: "DRAFT", stock: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.status === "DRAFT" && currentFilters.stock === "all"
              ? "bg-amber-800 text-white"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-amber-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-amber-500" />
          Drafts
          <span className="opacity-70">({counts.draft})</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ stock: "low-stock", status: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.stock === "low-stock"
              ? "bg-amber-700 text-white"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-amber-50"
          }`}
        >
          <AlertTriangle className="size-3 text-amber-500" />
          Low Stock
          <span className="opacity-70">({counts.lowStock})</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ stock: "out-of-stock", status: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
            currentFilters.stock === "out-of-stock"
              ? "bg-red-800 text-white"
              : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-red-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-red-500" />
          Out of Stock
          <span className="opacity-70">({counts.outOfStock})</span>
        </button>

        {counts.archived > 0 && (
          <button
            type="button"
            onClick={() => updateQuery({ status: "ARCHIVED", stock: "all" })}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium transition-colors ${
              currentFilters.status === "ARCHIVED"
                ? "bg-[#101114] text-white"
                : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-[#F3F0E8]"
            }`}
          >
            Archived
            <span className="opacity-70">({counts.archived})</span>
          </button>
        )}
      </div>

      {/* ── 2. Search & Filter Controls Toolbar ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative max-w-lg flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#101114]/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by product name, slug, SKU, or category..."
            className="h-10 w-full rounded-sm border border-[#101114]/20 bg-white pr-9 pl-9 text-xs text-[#101114] transition-colors outline-none placeholder:text-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Sort Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <select
              value={currentFilters.category}
              onChange={(e) => updateQuery({ category: e.target.value })}
              className="h-10 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] transition-colors outline-none hover:border-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <select
            value={currentFilters.stock}
            onChange={(e) => updateQuery({ stock: e.target.value })}
            className="h-10 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] transition-colors outline-none hover:border-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <option value="all">All Stock Levels</option>
            <option value="in-stock">In Stock (&gt;0)</option>
            <option value="low-stock">Low Stock (1–5)</option>
            <option value="out-of-stock">Out of Stock (0)</option>
          </select>

          {/* Status Filter */}
          <select
            value={currentFilters.status}
            onChange={(e) => updateQuery({ status: e.target.value })}
            className="h-10 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] transition-colors outline-none hover:border-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <option value="all">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <select
              value={currentFilters.sort}
              onChange={(e) => updateQuery({ sort: e.target.value })}
              className="h-10 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-medium text-[#101114] transition-colors outline-none hover:border-[#101114]/40 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="updated">Sort: Recently Updated</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name_asc">Sort: Name (A to Z)</option>
              <option value="name_desc">Sort: Name (Z to A)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
              <option value="stock_desc">Sort: Stock (High to Low)</option>
              <option value="stock_asc">Sort: Stock (Low to High)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-50"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Products Data Table ── */}
      <div className="overflow-x-auto rounded-sm border border-[#101114]/10 bg-white">
        <table className="w-full min-w-5xl text-left text-sm">
          <thead className="bg-[#F3F0E8]/70 text-[11px] font-semibold tracking-wider text-[#101114]/70 uppercase">
            <tr>
              <th scope="col" className="px-5 py-3">
                Product
              </th>
              <th scope="col" className="px-5 py-3">
                Categories
              </th>
              <th scope="col" className="px-5 py-3">
                Price
              </th>
              <th scope="col" className="px-5 py-3">
                Inventory Stock
              </th>
              <th scope="col" className="px-5 py-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/10">
            {loadedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
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
                </td>
              </tr>
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

                return (
                  <tr key={product.id} className="transition-colors hover:bg-[#FAFAF9]">
                    {/* ── Product Info & Thumbnail ── */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3.5">
                        {/* Thumbnail */}
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-sm border border-[#101114]/15 bg-[#F2F2F2]">
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

                        {/* Title, Slug & Variant summary */}
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
                            <span className="py-0.2 rounded-xs bg-[#101114]/5 px-1.5 text-[10px] font-semibold text-[#101114]/70">
                              {product.variantCount}{" "}
                              {product.variantCount === 1 ? "variant" : "variants"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ── Categories ── */}
                    <td className="px-5 py-3.5">
                      {product.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.categories.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex rounded-xs border border-[#101114]/15 bg-[#FBF9F5] px-2 py-0.5 text-xs font-medium text-[#101114]"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Uncategorized</span>
                      )}
                    </td>

                    {/* ── Price ── */}
                    <td className="px-5 py-3.5 tabular-nums">
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
                    </td>

                    {/* ── Inventory Stock ── */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${
                            isOutOfStock
                              ? "bg-red-500"
                              : isLowStock
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                        />
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
                      </div>
                    </td>

                    {/* ── Status ── */}
                    <td className="px-5 py-3.5">
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
                    </td>

                    {/* ── Actions ── */}
                    <td className="px-5 py-3.5 text-right">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 4. Infinite Scroll Sentinel & Load More Controls ── */}
      {totalFiltered > 0 && (
        <div className="flex flex-col items-center justify-center gap-3 border-t border-[#101114]/10 pt-4 pb-2">
          {/* Sentinel for IntersectionObserver to trigger infinite scroll */}
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
                    <span>Loading more products...</span>
                  </>
                ) : (
                  <>
                    <span>Load more products</span>
                    <span className="text-muted-foreground font-normal">
                      • Showing {loadedProducts.length} of {totalFiltered}
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
                All <strong className="text-[#101114]">{loadedProducts.length}</strong> products
                loaded
                {hasActiveFilters && ` (filtered from ${counts.total} total)`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
