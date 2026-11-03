"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { getCustomerReturnsAction } from "@/lib/account/actions";
import { formatOrderDate } from "@/lib/format";

type ReturnSummary = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: Date;
  order: { orderNumber: string; createdAt: Date };
  itemCount: number;
  requestedAmount: number;
  items: { id: string; quantity: number; productName: string }[];
};

interface ReturnsInfiniteListProps {
  initialReturns: ReturnSummary[];
  total: number;
  pageSize?: number;
}

export function ReturnsInfiniteList({
  initialReturns,
  total,
  pageSize = 10,
}: ReturnsInfiniteListProps) {
  const [returns, setReturns] = React.useState<ReturnSummary[]>(initialReturns);
  const [page, setPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [hasMore, setHasMore] = React.useState<boolean>(initialReturns.length < total);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const [statusMessage, setStatusMessage] = React.useState<string>("");

  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await getCustomerReturnsAction(nextPage, pageSize);
      if (response?.returns) {
        setReturns((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newUnique = response.returns.filter((r) => !existingIds.has(r.id));
          const updated = [...prev, ...newUnique];
          setStatusMessage(`Loaded more returns. Showing ${updated.length} of ${total} returns.`);
          return updated;
        });
        setPage(nextPage);
        setHasMore(response.hasMore && response.returns.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[ReturnsInfiniteList] Failed to load more returns:", err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, pageSize, isLoadingMore, hasMore, total]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) loadMore();
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  return (
    <div>
      {/* Desktop Table View (>= md) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#101114]/8 bg-[#FAF9F5] text-[10px] font-semibold tracking-wider text-neutral-500 uppercase sm:text-[11px]">
              <th className="py-4 pr-4 pl-7">Return ID</th>
              <th className="px-4 py-4">Order &amp; Date</th>
              <th className="px-4 py-4">Items Returned</th>
              <th className="px-4 py-4">Reason</th>
              <th className="px-4 py-4">Est. Refund</th>
              <th className="px-4 py-4">Status</th>
              <th className="py-4 pr-7 pl-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/6 text-sm">
            {returns.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-neutral-50/70">
                {/* Return ID */}
                <td className="py-4 pr-4 pl-7">
                  <Link
                    href={`/account/returns/${request.id}`}
                    className="font-semibold text-[#101114] hover:underline"
                  >
                    #RET-{request.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                    <ShieldCheck className="size-3" />
                    <span>Steadfast Pickup</span>
                  </div>
                </td>

                {/* Order & Date */}
                <td className="px-4 py-4 text-xs">
                  <Link
                    href={`/account/orders/${request.order.orderNumber}`}
                    className="font-semibold text-[#101114] hover:underline"
                  >
                    #{request.order.orderNumber}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {formatOrderDate(request.createdAt)}
                  </p>
                </td>

                {/* Items Returned */}
                <td className="px-4 py-4 text-xs">
                  <div className="max-w-[220px]">
                    <span className="font-semibold text-[#101114]">
                      {request.itemCount} {request.itemCount === 1 ? "item" : "items"}
                    </span>
                    {request.items && request.items.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                        {request.items.map((it) => it.productName).join(", ")}
                      </p>
                    )}
                  </div>
                </td>

                {/* Reason */}
                <td className="px-4 py-4 text-xs font-medium text-neutral-700">
                  <span className="inline-block max-w-[150px] truncate rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                    {request.reason || "General Return"}
                  </span>
                </td>

                {/* Est. Refund */}
                <td className="px-4 py-4 font-bold whitespace-nowrap text-[#101114]">
                  ৳ {request.requestedAmount.toLocaleString("en-BD")}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <OrderStatusBadge status={request.status} />
                </td>

                {/* Action */}
                <td className="py-4 pr-7 pl-4 text-right whitespace-nowrap">
                  <Link
                    href={`/account/returns/${request.id}`}
                    className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-normal text-neutral-700 transition-colors hover:text-[#101114]"
                  >
                    <span>Details</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked View (< md) */}
      <div className="divide-y divide-[#101114]/8 p-4 sm:p-5 md:hidden">
        {returns.map((request) => (
          <div key={request.id} className="py-4 first:pt-1 last:pb-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/account/returns/${request.id}`}
                  className="text-xs font-semibold text-[#101114] hover:underline"
                >
                  #RET-{request.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Order{" "}
                  <Link
                    href={`/account/orders/${request.order.orderNumber}`}
                    className="font-semibold text-[#101114] hover:underline"
                  >
                    #{request.order.orderNumber}
                  </Link>{" "}
                  • {formatOrderDate(request.createdAt)}
                </p>
              </div>
              <OrderStatusBadge status={request.status} />
            </div>

            {request.items && request.items.length > 0 && (
              <div className="mt-2.5 rounded-xl border border-[#101114]/6 bg-neutral-50/80 p-2.5">
                <p className="text-[11px] font-semibold text-neutral-700">
                  {request.itemCount} {request.itemCount === 1 ? "Item" : "Items"}:
                </p>
                <ul className="mt-1 space-y-1">
                  {request.items.map((it, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between text-[11px] text-neutral-600"
                    >
                      <span className="truncate pr-2">• {it.productName}</span>
                      <span className="shrink-0 font-semibold text-[#101114]">
                        Qty: {it.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  Est. Refund
                </span>
                <span className="text-sm font-bold text-[#101114]">
                  ৳ {request.requestedAmount.toLocaleString("en-BD")}
                </span>
              </div>
              <Link
                href={`/account/returns/${request.id}`}
                className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#101114] px-4 py-1.5 text-xs font-semibold tracking-wider text-white uppercase shadow-2xs transition-colors hover:bg-neutral-800"
              >
                <span>View Details</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Screen Reader Live Region (WCAG 4.1.3 compliant status announcements) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

      {/* Loading indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 border-t border-[#101114]/8 py-5 text-xs font-medium text-neutral-500">
          <Loader2 className="size-4 animate-spin text-[#101114]" />
          <span>Loading more returns...</span>
        </div>
      )}

      {/* Manual fallback button */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center border-t border-[#101114]/8 pt-4 pb-2">
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#101114]/10 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-[#101114]"
          >
            <span>Load more returns</span>
            <span className="text-[11px] text-neutral-400">
              ({returns.length} of {total})
            </span>
          </button>
        </div>
      )}

      {/* End of results */}
      {!hasMore && returns.length >= pageSize && (
        <div className="flex items-center justify-center border-t border-[#101114]/8 py-5 text-[11px] font-medium tracking-wider text-neutral-400 uppercase">
          <span>All {total} returns loaded</span>
        </div>
      )}
    </div>
  );
}

