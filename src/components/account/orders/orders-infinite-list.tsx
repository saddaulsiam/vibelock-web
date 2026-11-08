"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Truck } from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";
import { Button } from "@/components/ui/button";
import { getCustomerOrdersAction } from "@/lib/orders/actions";
import type { OrderSummary } from "@/lib/orders/types";
import { formatOrderDate } from "@/lib/format";

interface OrdersInfiniteListProps {
  initialOrders: OrderSummary[];
  total: number;
  pageSize?: number;
}

export function OrdersInfiniteList({
  initialOrders,
  total,
  pageSize = 10,
}: OrdersInfiniteListProps) {
  const [orders, setOrders] = React.useState<OrderSummary[]>(initialOrders);
  const [page, setPage] = React.useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [hasMore, setHasMore] = React.useState<boolean>(initialOrders.length < total);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const [statusMessage, setStatusMessage] = React.useState<string>("");

  const loadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const response = await getCustomerOrdersAction(nextPage, pageSize);
      if (response && response.orders) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const newUniqueOrders = response.orders.filter((o) => !existingIds.has(o.id));
          const updated = [...prev, ...newUniqueOrders];
          setStatusMessage(`Loaded more orders. Showing ${updated.length} of ${total} orders.`);
          return updated;
        });
        setPage(nextPage);
        setHasMore(response.hasMore && response.orders.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[OrdersInfiniteList] Failed to load more orders:", err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, pageSize, isLoadingMore, hasMore, total]);

  // Setup IntersectionObserver for auto-infinite scrolling
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
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
  }, [hasMore, isLoadingMore, loadMore]);

  const formatDate = formatOrderDate;

  return (
    <div className="mt-2">
      {/* Desktop Table View (>= md) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-vl-black/8 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              <th className="py-3.5 pr-4">Order #</th>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Items</th>
              <th className="px-4 py-3.5">Total</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="py-3.5 pl-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vl-black/6 text-sm">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-neutral-50/70">
                {/* Order Number */}
                <td className="py-4 pr-4">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="font-semibold text-[#101114] hover:underline focus-visible:ring-1 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                  >
                    #{order.orderNumber}
                  </Link>
                  {order.shipment?.trackingNumber && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                      <Truck className="size-3 text-neutral-400" />
                      <span>Track: {order.shipment.trackingNumber}</span>
                    </div>
                  )}
                </td>

                {/* Date */}
                <td className="px-4 py-4 text-xs font-medium whitespace-nowrap text-neutral-500">
                  {formatDate(order.createdAt)}
                </td>

                {/* Items */}
                <td className="px-4 py-4 text-xs font-medium whitespace-nowrap text-neutral-600">
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </td>

                {/* Total */}
                <td className="px-4 py-4 font-bold whitespace-nowrap text-[#101114]">
                  ৳ {order.total.toLocaleString("en-BD")}
                </td>

                {/* Status Badges */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <OrderStatusBadge status={order.status} />
                </td>

                {/* Action */}
                <td className="py-4 pl-4 text-right whitespace-nowrap">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="group inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-700 transition-colors hover:text-[#101114]"
                  >
                    <span>Details</span>
                    <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Intentional Stacked View (< md) - Zero horizontal scroll */}
      <div className="flex flex-col divide-y divide-vl-black/8 md:hidden">
        {orders.map((order) => (
          <div key={order.id} className="py-3.5 first:pt-2 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="truncate text-xs font-semibold text-[#101114] hover:underline sm:text-sm"
              >
                #{order.orderNumber}
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <PaymentGatewayBadge
                  gateway={order.paymentGateway}
                  paymentMethod={order.paymentMethod}
                />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{formatDate(order.createdAt)}</span>
              <span>
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {order.shipment?.trackingNumber && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-neutral-100 p-2 text-xs text-neutral-600">
                <Truck className="size-3.5 shrink-0 text-neutral-500" />
                <span className="truncate">Tracking: {order.shipment.trackingNumber}</span>
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-[#101114] sm:text-sm">
                ৳ {order.total.toLocaleString("en-BD")}
              </span>
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="group inline-flex min-h-[38px] items-center gap-1 rounded-md border border-vl-black/10 bg-white px-3 py-1.5 text-xs font-normal text-neutral-800 transition-colors active:scale-95"
              >
                <span>Details</span>
                <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
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

      {/* Infinite Scroll Indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 border-t border-[#101114]/8 py-5 text-xs font-medium text-neutral-500">
          <Loader2 className="size-4 animate-spin text-[#101114]" />
          <span>Loading more orders...</span>
        </div>
      )}

      {/* Fallback button if needed */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center border-t border-[#101114]/8 pt-4 pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
          >
            <span>Load more orders</span>
            <span className="text-[11px] text-neutral-400">({orders.length} of {total})</span>
          </Button>
        </div>
      )}

      {/* End of results message */}
      {!hasMore && orders.length >= pageSize && (
        <div className="flex items-center justify-center border-t border-[#101114]/8 py-5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          <span>All {total} orders loaded</span>
        </div>
      )}
    </div>
  );
}
