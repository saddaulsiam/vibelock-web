"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { subscribeWishlist, getWishlistSnapshot, getWishlistServerSnapshot } from "@/lib/wishlist";

interface AccountMetricsProps {
  orderCount: number;
  totalSpent: number;
  wishlistCount?: number;
  activeCouponsCount: number;
}

export function AccountMetrics({
  orderCount,
  totalSpent,
  wishlistCount = 0,
  activeCouponsCount,
}: AccountMetricsProps) {
  const rawWishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const isServer = rawWishlist === "__SSR__";

  const liveWishlistCount = useMemo(() => {
    if (isServer) return null;
    try {
      const list = JSON.parse(rawWishlist);
      return Array.isArray(list) ? list.length : wishlistCount;
    } catch {
      return wishlistCount;
    }
  }, [rawWishlist, wishlistCount, isServer]);

  const metrics = [
    {
      label: "Orders Placed",
      value: orderCount.toString(),
      actionText: "View all",
      href: "/account/orders",
    },
    {
      label: "Total Spend",
      value: `৳ ${totalSpent.toLocaleString("en-BD")}`,
      actionText: "Order history",
      href: "/account/orders",
    },
    {
      label: "Wishlist",
      value: isServer ? "—" : (liveWishlistCount ?? 0).toString(),
      actionText: "Saved items",
      href: "/wishlist",
    },
    {
      label: "Active Coupons",
      value: activeCouponsCount.toString(),
      actionText: "View coupons",
      href: "/account/coupons",
    },
  ];

  return (
    /* Unified, Architectural Metrics Surface (No separate SaaS widget boxes) */
    <div className="overflow-hidden rounded-xl border border-[#101114]/8 bg-white">
      <div className="grid grid-cols-2 divide-x divide-y divide-[#101114]/6 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col justify-between p-4 transition-colors hover:bg-neutral-50/50 sm:p-5"
          >
            <div>
              <span className="block truncate text-[10px] font-semibold tracking-wider text-neutral-400 uppercase sm:text-[11px]">
                {metric.label}
              </span>
              <p className="mt-1 truncate text-lg font-bold tracking-tight text-[#101114] sm:mt-2 sm:text-2xl lg:text-3xl">
                {metric.value}
              </p>
            </div>

            <div className="mt-3 pt-1 sm:mt-4">
              <Link
                href={metric.href}
                className="group inline-flex min-h-8 items-center gap-1 text-[11px] font-normal text-neutral-500 transition-colors hover:text-[#101114]"
              >
                <span>{metric.actionText}</span>
                <ArrowRight className="size-2.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
