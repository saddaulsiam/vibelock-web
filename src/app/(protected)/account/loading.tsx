import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="flex min-w-0 flex-col" role="status" aria-label="Loading account dashboard">
      {/* 1. Unified Architectural 4-Metric Surface */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-xl border bg-white">
        <div className="divide-vl-dark-900/6 grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col justify-between p-4 sm:p-5">
              <div>
                <Skeleton className="bg-vl-dark-900/8 h-3 w-20" />
                <Skeleton className="bg-vl-dark-900/10 mt-2 h-7 w-24 sm:h-8" />
              </div>
              <div className="mt-3 pt-1 sm:mt-4">
                <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Recent Orders Section */}
      <div className="border-vl-dark-900/8 mt-6 rounded-xl border bg-white p-4 sm:p-6">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-3.5 sm:pb-4">
          <div className="space-y-1.5">
            <Skeleton className="bg-vl-dark-900/10 h-4.5 w-28" />
            <Skeleton className="bg-vl-dark-900/8 h-3 w-52" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-4 w-16" />
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-vl-dark-900/8 border-b">
                <th className="py-3.5 pr-4">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-12" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-12" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-14" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                </th>
                <th className="py-3.5 pl-4 text-right">
                  <Skeleton className="bg-vl-dark-900/8 ml-auto h-3 w-12" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-vl-dark-900/6 divide-y">
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className="py-4 pr-4">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-28" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-3.5 w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-3.5 w-14" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-5 w-20 rounded-md" />
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <Skeleton className="bg-vl-dark-900/8 ml-auto h-4 w-14" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Scannable List (< md) */}
        <div className="divide-vl-dark-900/6 divide-y md:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-3.5 first:pt-3 last:pb-1">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-28" />
                <Skeleton className="bg-vl-dark-900/8 h-5 w-18 rounded-md" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Two-Column: Saved Addresses & Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Saved Addresses Skeleton */}
        <div className="border-vl-dark-900/8 flex flex-col justify-between rounded-xl border bg-white p-4 sm:p-6">
          <div>
            <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-3.5 sm:pb-4">
              <div className="space-y-1.5">
                <Skeleton className="bg-vl-dark-900/10 h-4.5 w-32" />
                <Skeleton className="bg-vl-dark-900/8 h-3 w-48" />
              </div>
              <Skeleton className="bg-vl-dark-900/8 h-4 w-14" />
            </div>
            <div className="divide-vl-dark-900/6 divide-y">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2 py-3.5 first:pt-4 last:pb-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-28" />
                    <Skeleton className="bg-vl-dark-900/8 h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-44" />
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-36" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-vl-dark-900/8 mt-5 border-t pt-4">
            <Skeleton className="bg-vl-dark-900/8 h-9 w-full rounded-lg" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="border-vl-dark-900/8 flex flex-col justify-between rounded-xl border bg-white p-4 sm:p-6">
          <div>
            <div className="border-vl-dark-900/8 space-y-1.5 border-b pb-3.5 sm:pb-4">
              <Skeleton className="bg-vl-dark-900/10 h-4.5 w-36" />
              <Skeleton className="bg-vl-dark-900/8 h-3 w-56" />
            </div>
            <div className="divide-vl-dark-900/6 divide-y">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex min-h-[48px] items-center justify-between py-3 first:pt-3.5 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="bg-vl-dark-900/10 size-4 rounded-sm" />
                    <div className="space-y-1">
                      <Skeleton className="bg-vl-dark-900/10 h-3.5 w-28" />
                      <Skeleton className="bg-vl-dark-900/8 h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="bg-vl-dark-900/8 size-3.5 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-vl-dark-900/8 mt-5 border-t pt-4">
            <Skeleton className="bg-vl-dark-900/8 h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* 4. Campaign Banner Skeleton */}
      <div className="bg-vl-dark-900 mt-6 overflow-hidden rounded-xl border border-white/10 p-5 sm:mt-10 sm:p-8 lg:p-10">
        <Skeleton className="h-3 w-28 bg-white/20" />
        <Skeleton className="mt-3 h-7 w-64 bg-white/20 sm:w-80" />
        <Skeleton className="mt-2 h-4 w-full max-w-sm bg-white/15" />
        <Skeleton className="bg-vl-cyan-100 mt-5 h-9 w-36 rounded-lg" />
      </div>
    </div>
  );
}
