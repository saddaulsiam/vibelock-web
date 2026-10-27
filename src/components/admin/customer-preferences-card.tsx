"use client";

import * as React from "react";
import {
  Sparkles,
  Shirt,
  CreditCard,
  Globe,
  Clock,
  Package,
} from "lucide-react";
import type { AdminCustomerPreferences } from "@/lib/admin/customer-queries";

interface CustomerPreferencesCardProps {
  preferences: AdminCustomerPreferences;
}

export function CustomerPreferencesCard({ preferences }: CustomerPreferencesCardProps) {
  const {
    preferredSize,
    topSizes,
    topProducts,
    preferredChannel,
    preferredPayment,
    daysSinceLastOrder,
  } = preferences;

  const hasAnyData =
    preferredSize || topSizes.length > 0 || topProducts.length > 0 || daysSinceLastOrder !== null;

  if (!hasAnyData) {
    return (
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Shopping Preferences &amp; Insights
            </h3>
            <p className="text-xs text-neutral-500">
              Customer size fitting, top purchased apparel, and buying cadence
            </p>
          </div>
        </div>
        <div className="py-6 text-center text-xs text-neutral-400">
          No past purchase data yet to calculate sizing and channel preferences.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-200">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Shopping Preferences &amp; Insights
            </h3>
            <p className="text-xs text-neutral-500">
              Customer size fitting, top apparel styles, and buying cadence
            </p>
          </div>
        </div>
        {preferredSize && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-800">
            <Shirt className="size-3 text-purple-600" />
            Most Bought: Size {preferredSize}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Preferred Size & Sizing Distribution */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Shirt className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Size History</span>
          </div>
          {topSizes.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {topSizes.map((s, idx) => (
                <span
                  key={s.size}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                    idx === 0
                      ? "border border-purple-300 bg-purple-100/70 text-purple-900"
                      : "border border-neutral-200 bg-white text-neutral-700"
                  }`}
                >
                  <span>Size {s.size}</span>
                  <span className="text-[10px] opacity-75">({s.count}x)</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-neutral-400">No size records</div>
          )}
        </div>

        {/* Top Purchased Products */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Package className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Purchased Items</span>
          </div>
          {topProducts.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {topProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-neutral-800 pr-2" title={p.name}>
                    {p.name}
                  </span>
                  <span className="shrink-0 font-bold text-neutral-600">
                    {p.quantity} qty
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-neutral-400">No items recorded</div>
          )}
        </div>

        {/* Preferred Channel & Payment */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Globe className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Channel &amp; Payment</span>
          </div>
          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Main Channel:</span>
              <span className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 font-bold text-neutral-800">
                {preferredChannel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Preferred Pay:</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 font-bold text-neutral-800">
                <CreditCard className="size-3 text-neutral-500" />
                {preferredPayment}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase Cadence & Recency */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Clock className="size-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Cadence &amp; Recency</span>
          </div>
          <div className="mt-2">
            {daysSinceLastOrder !== null ? (
              <div>
                <div className="text-lg font-black text-neutral-900">
                  {daysSinceLastOrder === 0
                    ? "Today"
                    : daysSinceLastOrder === 1
                    ? "Yesterday"
                    : `${daysSinceLastOrder} days ago`}
                </div>
                <div className="mt-1 text-[11px]">
                  {daysSinceLastOrder <= 30 ? (
                    <span className="font-semibold text-emerald-600">● Active Buyer</span>
                  ) : daysSinceLastOrder <= 90 ? (
                    <span className="font-semibold text-amber-600">● Needs Re-engagement</span>
                  ) : (
                    <span className="font-semibold text-rose-600">● Churn Risk (&gt;90d)</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400">No order history</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
