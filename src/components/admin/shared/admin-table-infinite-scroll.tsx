"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminTableInfiniteScrollProps {
  /** Whether there are more items available to load */
  hasMore: boolean;
  /** Whether a background fetch is currently in progress */
  isLoadingMore: boolean;
  /** Callback fired when user scrolls past sentinel or clicks load more button */
  onLoadMore: () => void;
  /** Number of items currently loaded and visible in table */
  loadedCount: number;
  /** Total count of items matching current query/filter */
  totalCount: number;
  /** Plural noun of item being listed, e.g. "orders", "products", "inventory variants" */
  itemName?: string;
  /** Optional filter summary note displayed when all items loaded, e.g. "filtered from 50 total" */
  filterSummary?: string | null;
  /** Optional external ref if caller needs direct access to sentinel */
  sentinelRef?: React.RefObject<HTMLDivElement | null>;
  /** IntersectionObserver rootMargin (defaults to "300px") */
  rootMargin?: string;
  /** Custom wrapper class */
  className?: string;
}

export function AdminTableInfiniteScroll({
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadedCount,
  totalCount,
  itemName = "items",
  filterSummary,
  sentinelRef: externalSentinelRef,
  rootMargin = "300px",
  className,
}: AdminTableInfiniteScrollProps) {
  const localSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = externalSentinelRef ?? localSentinelRef;

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
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeRef, hasMore, isLoadingMore, onLoadMore, rootMargin]);

  if (totalCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border-t border-[#101114]/10 pt-4 pb-2",
        className
      )}
    >
      {/* Sentinel for IntersectionObserver to trigger infinite scroll */}
      <div ref={activeRef} className="h-1 w-full" aria-hidden="true" />

      {hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-[#101114]/20 bg-white px-5 py-2 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-[#101114]" />
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
          </button>
          <p className="text-muted-foreground text-[11px]">
            Scroll down or click the button above to load more items
          </p>
        </div>
      ) : (
        <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-2 text-xs">
          <span className="font-semibold text-emerald-600">✓</span>
          <span>
            All <strong className="text-[#101114]">{loadedCount}</strong> {itemName} loaded
            {filterSummary ? ` (${filterSummary})` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
