import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div
      className="flex min-w-0 flex-col"
      role="status"
      aria-label="Loading account dashboard"
    >
      {/* 1. Unified Architectural 4-Metric Surface */}
      <div className="overflow-hidden rounded-xl border border-vl-dark-900/8 bg-white">
        <div className="grid grid-cols-2 divide-x divide-y divide-vl-dark-900/6 sm:grid-cols-4 sm:divide-y-0">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between p-4 sm:p-5"
            >
              <div>
                <Skeleton className="h-3 w-20 bg-vl-dark-900/8" />
                <Skeleton className="mt-2 h-7 w-24 bg-vl-dark-900/10 sm:h-8" />
              </div>
              <div className="mt-3 pt-1 sm:mt-4">
                <Skeleton className="h-3.5 w-16 bg-vl-dark-900/8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Recent Orders Section */}
      <div className="mt-6 rounded-xl border border-vl-dark-900/8 bg-white p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-vl-dark-900/8 pb-3.5 sm:pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4.5 w-28 bg-vl-dark-900/10" />
            <Skeleton className="h-3 w-52 bg-vl-dark-900/8" />
          </div>
          <Skeleton className="h-4 w-16 bg-vl-dark-900/8" />
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-vl-dark-900/8">
                <th className="py-3.5 pr-4"><Skeleton className="h-3 w-16 bg-vl-dark-900/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-12 bg-vl-dark-900/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-12 bg-vl-dark-900/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-14 bg-vl-dark-900/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-16 bg-vl-dark-900/8" /></th>
                <th className="py-3.5 pl-4 text-right"><Skeleton className="ml-auto h-3 w-12 bg-vl-dark-900/8" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vl-dark-900/6">
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className="py-4 pr-4"><Skeleton className="h-4 w-28 bg-vl-dark-900/10" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-3.5 w-20 bg-vl-dark-900/8" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-3.5 w-14 bg-vl-dark-900/8" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-16 bg-vl-dark-900/10" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-md bg-vl-dark-900/8" /></td>
                  <td className="py-4 pl-4 text-right"><Skeleton className="ml-auto h-4 w-14 bg-vl-dark-900/8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Scannable List (< md) */}
        <div className="divide-y divide-vl-dark-900/6 md:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-3.5 first:pt-3 last:pb-1">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-28 bg-vl-dark-900/10" />
                <Skeleton className="h-5 w-18 rounded-md bg-vl-dark-900/8" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Skeleton className="h-3 w-32 bg-vl-dark-900/8" />
                <Skeleton className="h-4 w-16 bg-vl-dark-900/10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Two-Column: Saved Addresses & Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Saved Addresses Skeleton */}
        <div className="flex flex-col justify-between rounded-xl border border-vl-dark-900/8 bg-white p-4 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-vl-dark-900/8 pb-3.5 sm:pb-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4.5 w-32 bg-vl-dark-900/10" />
                <Skeleton className="h-3 w-48 bg-vl-dark-900/8" />
              </div>
              <Skeleton className="h-4 w-14 bg-vl-dark-900/8" />
            </div>
            <div className="divide-y divide-vl-dark-900/6">
              {[0, 1].map((i) => (
                <div key={i} className="py-3.5 first:pt-4 last:pb-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28 bg-vl-dark-900/10" />
                    <Skeleton className="h-4 w-16 rounded bg-vl-dark-900/8" />
                  </div>
                  <Skeleton className="h-3 w-44 bg-vl-dark-900/8" />
                  <Skeleton className="h-3 w-36 bg-vl-dark-900/8" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-vl-dark-900/8 pt-4">
            <Skeleton className="h-9 w-full rounded-lg bg-vl-dark-900/8" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="flex flex-col justify-between rounded-xl border border-vl-dark-900/8 bg-white p-4 sm:p-6">
          <div>
            <div className="border-b border-vl-dark-900/8 pb-3.5 sm:pb-4 space-y-1.5">
              <Skeleton className="h-4.5 w-36 bg-vl-dark-900/10" />
              <Skeleton className="h-3 w-56 bg-vl-dark-900/8" />
            </div>
            <div className="divide-y divide-vl-dark-900/6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-h-[48px] items-center justify-between py-3 first:pt-3.5 last:pb-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-sm bg-vl-dark-900/10" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28 bg-vl-dark-900/10" />
                      <Skeleton className="h-3 w-48 bg-vl-dark-900/8" />
                    </div>
                  </div>
                  <Skeleton className="size-3.5 rounded-sm bg-vl-dark-900/8" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-vl-dark-900/8 pt-4">
            <Skeleton className="h-9 w-full rounded-lg bg-vl-dark-900/8" />
          </div>
        </div>
      </div>

      {/* 4. Campaign Banner Skeleton */}
      <div className="mt-6 sm:mt-10 overflow-hidden rounded-xl border border-white/10 bg-vl-dark-900 p-5 sm:p-8 lg:p-10">
        <Skeleton className="h-3 w-28 bg-white/20" />
        <Skeleton className="mt-3 h-7 w-64 bg-white/20 sm:w-80" />
        <Skeleton className="mt-2 h-4 w-full max-w-sm bg-white/15" />
        <Skeleton className="mt-5 h-9 w-36 rounded-lg bg-vl-cyan-100" />
      </div>
    </div>
  );
}
