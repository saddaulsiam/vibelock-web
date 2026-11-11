import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading order details">
      {/* ── Top Navigation Toolbar Skeleton ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-32 bg-vl-dark-900/10" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-vl-dark-900/8" />
          <Skeleton className="h-9 w-24 rounded-lg bg-vl-dark-900/8" />
        </div>
      </div>

      {/* ── Unified Master Order Receipt Canvas ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white shadow-2xs">
        {/* 1. Header Section: Order Identity & Meta */}
        <div className="border-b border-vl-dark-900/8 p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24 bg-vl-dark-900/8" />
                <span className="text-neutral-300">•</span>
                <Skeleton className="h-3 w-32 bg-vl-dark-900/8" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-7 w-48 bg-vl-dark-900/10 sm:h-8 sm:w-56" />
                <Skeleton className="h-6 w-24 rounded-md bg-vl-dark-900/8" />
              </div>
            </div>
          </div>

          {/* 4-Step Tracker Milestones Skeleton */}
          <div className="mt-6 border-t border-vl-dark-900/6 pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full bg-vl-dark-900/10" />
                    <Skeleton className="h-3.5 w-20 bg-vl-dark-900/10" />
                  </div>
                  <Skeleton className="ml-8 h-2.5 w-24 bg-vl-dark-900/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Purchased Items Section */}
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-vl-dark-900/8 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-sm bg-vl-dark-900/10" />
              <Skeleton className="h-4 w-32 bg-vl-dark-900/10" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-vl-dark-900/8" />
          </div>

          {/* Item List */}
          <div className="divide-y divide-vl-dark-900/6">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5">
                <Skeleton className="size-14 shrink-0 rounded-xl bg-vl-dark-900/10 sm:size-16" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 max-w-xs bg-vl-dark-900/10" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-20 rounded bg-vl-dark-900/8" />
                    <Skeleton className="h-4 w-14 rounded bg-vl-dark-900/8" />
                    <Skeleton className="h-4 w-16 rounded bg-vl-dark-900/8" />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Skeleton className="h-5 w-20 bg-vl-dark-900/10" />
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown (Right-aligned receipt) */}
          <div className="mt-4 border-t border-vl-dark-900/8 pt-5 sm:flex sm:justify-end">
            <div className="w-full space-y-2.5 sm:w-72">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-16 bg-vl-dark-900/8" />
                <Skeleton className="h-3.5 w-16 bg-vl-dark-900/10" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24 bg-vl-dark-900/8" />
                <Skeleton className="h-3.5 w-14 bg-vl-dark-900/10" />
              </div>
              <div className="my-2 flex items-baseline justify-between border-t border-vl-dark-900/8 pt-3">
                <Skeleton className="h-4 w-24 bg-vl-dark-900/10" />
                <Skeleton className="h-6 w-24 bg-vl-dark-900/10" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integrated Metadata Grid (Address, Payment & Delivery) */}
        <div className="border-t border-vl-dark-900/8 bg-vl-white-100 p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 divide-y divide-vl-dark-900/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {/* Delivery Address */}
            <div className="space-y-3 sm:pr-6">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm bg-vl-dark-900/10" />
                <Skeleton className="h-3.5 w-28 bg-vl-dark-900/10" />
              </div>
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-28 bg-vl-dark-900/10" />
                <Skeleton className="h-3 w-36 bg-vl-dark-900/8" />
                <Skeleton className="h-3 w-48 bg-vl-dark-900/8" />
                <Skeleton className="h-3 w-40 bg-vl-dark-900/8" />
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3 pt-5 sm:px-6 sm:pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm bg-vl-dark-900/10" />
                <Skeleton className="h-3.5 w-28 bg-vl-dark-900/10" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-vl-dark-900/8" />
                  <Skeleton className="h-4 w-20 rounded bg-vl-dark-900/10" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-vl-dark-900/8" />
                  <Skeleton className="h-4 w-20 rounded bg-vl-dark-900/10" />
                </div>
              </div>
            </div>

            {/* Shipment Tracking */}
            <div className="space-y-3 pt-5 sm:pl-6 sm:pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded-sm bg-vl-dark-900/10" />
                <Skeleton className="h-3.5 w-32 bg-vl-dark-900/10" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-vl-dark-900/8" />
                  <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-vl-dark-900/8" />
                  <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
