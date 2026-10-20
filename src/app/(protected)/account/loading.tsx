import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="flex flex-col min-w-0 animate-fade-in" role="status" aria-label="Loading account dashboard">
      {/* 1. 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-4.5 sm:p-5 shadow-xs"
          >
            <div>
              <Skeleton className="mb-3 h-10 w-10 rounded-xl bg-[#101114]/10" />
              <Skeleton className="h-3 w-20 bg-[#101114]/10" />
              <Skeleton className="mt-2 h-7 w-16 bg-[#101114]/10 sm:h-8" />
            </div>
            <div className="mt-4 pt-2">
              <Skeleton className="h-3 w-24 bg-[#101114]/10" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Recent Orders Card Skeleton */}
      <div className="mt-6 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Skeleton className="h-5 w-32 bg-[#101114]/10" />
          <Skeleton className="h-4 w-24 bg-[#101114]/10" />
        </div>

        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-[#101114]/5 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg bg-[#101114]/10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-36 bg-[#101114]/10" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16 bg-[#101114]/10" />
                <Skeleton className="h-6 w-20 rounded-full bg-[#101114]/10" />
                <Skeleton className="hidden h-7 w-24 rounded-lg bg-[#101114]/10 sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Bottom Two-Column: Addresses & Quick Actions Skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Addresses Skeleton */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
              <Skeleton className="h-5 w-36 bg-[#101114]/10" />
              <Skeleton className="h-4 w-20 bg-[#101114]/10" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[#101114]/10 p-3.5 space-y-2">
                <Skeleton className="h-4 w-16 rounded-full bg-[#101114]/10" />
                <Skeleton className="h-4 w-32 bg-[#101114]/10" />
                <Skeleton className="h-3 w-48 bg-[#101114]/10" />
              </div>
            </div>
          </div>
          <div className="mt-5 pt-2">
            <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
          <div className="border-b border-[#101114]/10 pb-4">
            <Skeleton className="h-5 w-32 bg-[#101114]/10" />
          </div>
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-[#101114]/10 p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg bg-[#101114]/10" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-24 bg-[#101114]/10" />
                    <Skeleton className="h-3 w-36 bg-[#101114]/10" />
                  </div>
                </div>
                <Skeleton className="h-4 w-4 bg-[#101114]/10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Campaign Banner Skeleton */}
      <div className="mt-8 rounded-2xl border border-[#101114]/10 bg-[#101114]/80 p-8 sm:p-10 shadow-lg">
        <Skeleton className="h-3 w-28 bg-white/20" />
        <Skeleton className="mt-3 h-8 w-64 bg-white/20 sm:w-80" />
        <Skeleton className="mt-2 h-4 w-full max-w-sm bg-white/20" />
        <Skeleton className="mt-5 h-9 w-32 rounded-full bg-[#00D9FF]/40" />
      </div>
    </div>
  );
}
