"use client";

import Link from "next/link";
import { ArrowRight, Check, ClipboardList, Copy, ExternalLink, MapPin, User } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { formatBdt } from "./dashboard-financial-kpis";

export interface DashboardRecentOrderItem {
  id?: string;
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: { toFixed: (decimalPlaces?: number) => string } | number;
  customerName?: string | null;
  customerEmail?: string | null;
  shippingCity?: string | null;
  _count: { items: number };
}

interface DashboardRecentOrdersProps {
  recentOrders: DashboardRecentOrderItem[];
  totalOrderCount: number;
}

export function formatOrderDisplayNumber(orderNumber: string) {
  // Format long raw seed UUIDs gracefully (e.g. BOTH-1cd10491-bea0... -> BOTH · #1cd10491)
  if (orderNumber.length > 25 && orderNumber.includes("-")) {
    const parts = orderNumber.split("-");
    const prefix = parts[0];
    const uuidFrag = parts[1] ? parts[1].slice(0, 8) : parts[0].slice(0, 8);
    return `${prefix} · #${uuidFrag}`;
  }
  return orderNumber;
}

export function DashboardRecentOrders({
  recentOrders,
  totalOrderCount,
}: DashboardRecentOrdersProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyOrderNumber = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    setCopiedId(orderNumber);
    toast.success(`Copied #${orderNumber} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section aria-labelledby="recent-orders-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-vl-dark-900 size-4" />
          <h2
            id="recent-orders-heading"
            className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase"
          >
            Live Order Stream
          </h2>
          <span className="text-muted-foreground font-mono text-[11px]">
            (Latest {recentOrders.length} of {totalOrderCount.toLocaleString("en-BD")})
          </span>
        </div>

        <Link
          href="/admin/orders"
          className="text-muted-foreground hover:text-vl-dark-900 inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline"
        >
          <span>All Orders Stream</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="border-vl-dark-900/10 overflow-hidden rounded-sm border bg-white shadow-xs">
        {recentOrders.length === 0 ? (
          <div className="px-4 py-12 text-center sm:px-5">
            <ClipboardList className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden="true" />
            <h4 className="text-vl-dark-900 text-sm font-bold">No orders recorded yet</h4>
            <p className="text-muted-foreground mt-1 text-xs">
              Orders placed on storefront or POS counter will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-vl-dark-900/10 divide-y">
            {recentOrders.map((order) => {
              const orderId = order.id || order.orderNumber;
              const formattedDate = new Intl.DateTimeFormat("en-BD", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(order.createdAt));

              const displayOrderNumber = formatOrderDisplayNumber(order.orderNumber);

              return (
                <div
                  key={order.orderNumber}
                  className="hover:bg-vl-white-100 flex flex-col gap-3 p-3.5 transition-colors sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4"
                >
                  {/* Left: Clean Technical Identifier, Customer & City */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${orderId}`}
                        className="text-vl-dark-900 hover:text-vl-cyan-700 font-mono text-xs font-bold tracking-tight transition-colors sm:text-sm"
                        title={order.orderNumber}
                      >
                        {displayOrderNumber}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderNumber(order.orderNumber)}
                        className="text-muted-foreground hover:text-vl-dark-900 inline-flex items-center p-0.5 transition-colors"
                        title="Copy full order identifier"
                      >
                        {copiedId === order.orderNumber ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-500">
                      <span className="font-mono text-[11px]">{formattedDate}</span>
                      <span>•</span>
                      {order.customerName ? (
                        <span className="text-vl-dark-900 inline-flex items-center gap-1 font-medium">
                          <User className="size-3 text-neutral-400" />
                          {order.customerName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-1 italic text-[11px]">
                          <User className="size-3 text-neutral-300" />
                          Guest
                        </span>
                      )}
                      {order.shippingCity && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <MapPin className="size-3 text-neutral-400" />
                            {order.shippingCity}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Middle: Focused Status Badges & Muted Payment Channel */}
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge status={order.paymentStatus} />
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod === "BKASH" ? "bKash" : "Online"}
                    </span>
                  </div>

                  {/* Right: Items, Amount & Manage Trigger */}
                  <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 sm:border-0 sm:pt-0">
                    <div className="text-right">
                      <p className="text-vl-dark-900 font-mono text-sm font-bold">
                        {formatBdt(order.total)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {order._count.items} {order._count.items === 1 ? "item" : "items"}
                      </p>
                    </div>

                    <Link
                      href={`/admin/orders/${orderId}`}
                      className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 hover:border-vl-dark-900 inline-flex items-center gap-1 rounded-sm border bg-white px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all"
                    >
                      <span>Manage</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
