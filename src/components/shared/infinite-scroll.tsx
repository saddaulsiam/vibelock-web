"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import * as React from "react";

export interface InfiniteScrollProps {
  /** Whether there are more items available to load */
  hasMore: boolean;
  /** Whether a background fetch is currently in progress */
  isLoadingMore: boolean;
  /** Callback fired when user scrolls past sentinel or clicks load more button */
  onLoadMore: () => void;
  /** Number of items currently loaded and visible in list/table */
  loadedCount: number;
  /** Total count of items matching current query/filter */
  totalCount: number;
  /** Plural noun of item being listed, e.g. "orders", "products", "drops", "coupons" */
  itemName?: string;
  /** Optional filter summary note displayed when all items loaded, e.g. "filtered from 50 total" */
  filterSummary?: string | null;
  /** Optional external ref if caller needs direct access to sentinel */
  sentinelRef?: React.RefObject<HTMLDivElement | null>;
  /** IntersectionObserver rootMargin (defaults to "300px" or "400px" in storefront) */
  rootMargin?: string;
  /** Visual variant: "default" (admin/table style) or "storefront" (brutalist minimal style) */
  variant?: "default" | "storefront";
  /** Custom wrapper class */
  className?: string;
}

export function InfiniteScroll({
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadedCount,
  totalCount,
  itemName = "items",
  filterSummary,
  sentinelRef: externalSentinelRef,
  rootMargin,
  variant = "default",
  className,
}: InfiniteScrollProps) {
  const localSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = externalSentinelRef ?? localSentinelRef;
  const effectiveRootMargin = rootMargin ?? (variant === "storefront" ? "400px" : "300px");

  // Setup IntersectionObserver for auto-infinite scrolling
  React.useEffect(() => {
    const sentinel = activeRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: effectiveRootMargin,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeRef, hasMore, isLoadingMore, onLoadMore, effectiveRootMargin]);

  if (totalCount <= 0) return null;

  // Storefront minimalist brutalist variant
  if (variant === "storefront") {
    return (
      <div className={cn("flex flex-col items-center justify-center", className)}>
        {/* Sentinel for IntersectionObserver to trigger infinite scroll */}
        <div ref={activeRef} className="h-1 w-full" aria-hidden="true" />

        {hasMore ? (
          <div className="flex justify-center pt-8 pb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="border-vl-dark-200 text-vl-dark-800 hover:text-vl-dark-900 rounded-none text-xs font-bold tracking-wider uppercase"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="text-vl-cyan mr-1.5 size-3.5 animate-spin" />
                  <span>Loading more {itemName}...</span>
                </>
              ) : (
                <>
                  <span>Load more {itemName}</span>
                  <span className="text-vl-dark-400 font-normal">
                    ({loadedCount} of {totalCount})
                  </span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center pt-10 pb-4 text-center select-none">
            <div className="bg-vl-dark-200 h-px w-10 sm:w-16" aria-hidden="true" />
            <span className="text-vl-dark-400 px-4 text-[11px] font-bold tracking-wider uppercase">
              All {totalCount} {itemName} loaded
              {filterSummary ? ` (${filterSummary})` : ""}
            </span>
            <div className="bg-vl-dark-200 h-px w-10 sm:w-16" aria-hidden="true" />
          </div>
        )}

        {/* Screen reader live region */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Showing {loadedCount} of {totalCount} {itemName}.
        </div>
      </div>
    );
  }

  // Default admin / POS table variant
  return (
    <div
      className={cn(
        "border-vl-dark-900/10 flex flex-col items-center justify-center gap-3 border-t pt-4 pb-2",
        className
      )}
    >
      {/* Sentinel for IntersectionObserver to trigger infinite scroll */}
      <div ref={activeRef} className="h-1 w-full" aria-hidden="true" />

      {hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="text-vl-dark-900 hover:bg-vl-white-300 gap-2 px-5 text-xs font-semibold shadow-2xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="text-vl-dark-900 size-3.5 animate-spin" />
                <span>Loading more {itemName}...</span>
              </>
            ) : (
              <>
                <span>Load more {itemName}</span>
                <span className="text-muted-foreground font-normal">
                  • Showing {loadedCount} of {totalCount}
                </span>
              </>
            )}
          </Button>
          <p className="text-muted-foreground text-[11px]">
            Scroll down or click the button above to load more items
          </p>
        </div>
      ) : (
        <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-2 text-xs">
          <span className="font-semibold text-emerald-600">✓</span>
          <span>
            All <strong className="text-vl-dark-900">{loadedCount}</strong> {itemName} loaded
            {filterSummary ? ` (${filterSummary})` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
