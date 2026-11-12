"use client";

import * as React from "react";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { InfiniteScroll } from "@/components/shared/infinite-scroll";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMoreProductsAction } from "@/lib/catalog/actions";
import type { ProductSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

export interface ProductInfiniteGridProps {
  initialProducts: ProductSummary[];
  totalCount: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
  searchTerm?: string;
  clearSearchHref?: string;
  className?: string;
}

export function ProductInfiniteGrid({
  initialProducts,
  totalCount,
  totalPages,
  searchParams,
  searchTerm,
  clearSearchHref = "/shop",
  className,
}: ProductInfiniteGridProps) {
  const [products, setProducts] = React.useState<ProductSummary[]>(initialProducts);
  const [page, setPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [hasMore, setHasMore] = React.useState<boolean>(
    initialProducts.length < totalCount && totalPages > 1
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Sync state if initialProducts changes across renders (e.g. from filter changes)
  const [prevInitialProducts, setPrevInitialProducts] = React.useState(initialProducts);
  if (prevInitialProducts !== initialProducts) {
    setPrevInitialProducts(initialProducts);
    setProducts(initialProducts);
    setPage(1);
    setHasMore(initialProducts.length < totalCount && totalPages > 1);
    setLoadError(null);
  }

  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setLoadError(null);
    const nextPage = page + 1;

    try {
      const result = await loadMoreProductsAction(searchParams, nextPage);
      if (result && result.products && result.products.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = result.products.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
        setPage(nextPage);
        setHasMore(nextPage < result.totalPages && result.products.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[ProductInfiniteGrid] Failed to load more products:", err);
      setLoadError("Failed to load more products. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, searchParams]);

  // Empty state handling matching ProductGrid
  if (products.length === 0) {
    if (searchTerm) {
      return (
        <div className="border-vl-dark-200 bg-vl-white-50/60 border border-dashed px-5 py-14 text-center sm:py-20">
          <h2 className="text-vl-dark-900 text-xl font-bold tracking-tight wrap-break-word uppercase">
            No products matched “{searchTerm}”
          </h2>
          <p className="text-vl-dark-400 mx-auto mt-2 max-w-md text-sm leading-6">
            Try a different search term, or clear your search to browse the catalog.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="primary"
              size="default"
              className="rounded-none text-xs font-bold uppercase"
            >
              <Link href={clearSearchHref}>Clear search</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="rounded-none text-xs font-bold uppercase"
            >
              <Link href="/shop">Browse all drops</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="border-vl-dark-200 bg-vl-white-50/60 border border-dashed px-5 py-20 text-center">
        <h3 className="text-vl-dark-900 mb-2 text-xl font-bold tracking-tight uppercase">
          No drops found
        </h3>
        <p className="text-vl-dark-400 text-sm">
          Try adjusting your filters or price range to find available releases.
        </p>
        <div className="mt-6">
          <Button
            asChild
            variant="primary"
            size="default"
            className="rounded-none text-xs font-bold uppercase"
          >
            <Link href="/shop">Reset Filters</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Product Grid */}
      <div
        className={cn(
          "grid grid-cols-2 gap-x-3.5 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Loading Skeletons */}
      {isLoadingMore && (
        <div
          className={cn(
            "grid grid-cols-2 gap-x-3.5 gap-y-8 pt-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4",
            className
          )}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`loading-skeleton-${index}`} className="space-y-3">
              <Skeleton
                className="bg-vl-white-300 w-full rounded-none"
                style={{ aspectRatio: "2 / 3" }}
              />
              <Skeleton className="bg-vl-dark-100 h-3.5 w-3/4 rounded-none" />
              <Skeleton className="bg-vl-dark-100 h-3.5 w-1/3 rounded-none" />
            </div>
          ))}
        </div>
      )}

      {/* Error state with retry button */}
      {loadError && (
        <div className="flex flex-col items-center justify-center gap-2 pt-8 pb-4 text-center">
          <p className="text-xs font-semibold text-rose-500">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="rounded-none text-xs font-bold uppercase"
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* Reusable Shared Infinite Scroll Sentinel & Controls */}
      {!loadError && (
        <InfiniteScroll
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          loadedCount={products.length}
          totalCount={totalCount}
          itemName="releases"
          variant="storefront"
        />
      )}
    </div>
  );
}
