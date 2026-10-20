"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Package, ShoppingCart, Heart, Ticket, ArrowRight } from "lucide-react";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  getWishlistServerSnapshot,
} from "@/lib/wishlist";

interface AccountMetricsProps {
  orderCount: number;
  totalSpent: number;
  wishlistCount?: number;
  activeCouponsCount: number;
  onOpenCoupons?: () => void;
}

export function AccountMetrics({
  orderCount,
  totalSpent,
  wishlistCount = 0,
  activeCouponsCount,
  onOpenCoupons,
}: AccountMetricsProps) {
  const rawWishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot
  );

  const liveWishlistCount = useMemo(() => {
    try {
      const list = JSON.parse(rawWishlist);
      return Array.isArray(list) ? list.length : wishlistCount;
    } catch {
      return wishlistCount;
    }
  }, [rawWishlist, wishlistCount]);

  const metrics = [
    {
      label: "Total Orders",
      value: orderCount.toString(),
      icon: Package,
      actionText: "View all orders",
      href: "/account/orders",
    },
    {
      label: "Total Spent",
      value: `৳ ${totalSpent.toLocaleString("en-BD")}`,
      icon: ShoppingCart,
      actionText: "View order history",
      href: "/account/orders",
    },
    {
      label: "Wishlist Items",
      value: liveWishlistCount.toString(),
      icon: Heart,
      actionText: "View wishlist",
      href: "/wishlist",
    },
    {
      label: "Active Coupons",
      value: activeCouponsCount.toString(),
      icon: Ticket,
      actionText: "View coupons",
      href: "#coupons",
      onClick: onOpenCoupons,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-4.5 shadow-xs transition-all hover:border-[#101114]/25 hover:shadow-sm sm:p-5"
        >
          {/* Top Squircle Icon & Label */}
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F0E8] text-[#101114]">
              <metric.icon className="size-5 text-[#101114]" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#101114] sm:text-3xl">
              {metric.value}
            </p>
          </div>

          {/* Bottom Action Link */}
          <div className="mt-4 pt-2">
            {metric.onClick ? (
              <button
                type="button"
                onClick={metric.onClick}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-[#0099b8] transition-colors hover:text-[#00c2e5]"
              >
                <span>{metric.actionText}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <Link
                href={metric.href}
                className="group inline-flex items-center gap-1 text-xs font-semibold text-[#0099b8] transition-colors hover:text-[#00c2e5]"
              >
                <span>{metric.actionText}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
