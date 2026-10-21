import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading orders">
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        {/* Header Skeleton */}
        <div className="mb-5 flex items-center justify-between border-b border-[#101114]/10 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36 bg-[#101114]/10" />
            <Skeleton className="h-3.5 w-60 bg-[#101114]/10" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full bg-[#101114]/10" />
        </div>

        {/* Rows Skeleton */}
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-start justify-between gap-4 border-b border-[#101114]/5 py-3.5 last:border-b-0 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-[#101114]/10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-40 bg-[#101114]/10" />
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:justify-end">
                <Skeleton className="h-4 w-20 bg-[#101114]/10" />
                <Skeleton className="h-6 w-24 rounded-full bg-[#101114]/10" />
                <Skeleton className="h-8 w-28 rounded-lg bg-[#101114]/10" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-6 flex items-center justify-between border-t border-[#101114]/10 pt-4">
          <Skeleton className="h-8 w-24 rounded-xl bg-[#101114]/10" />
          <Skeleton className="h-3 w-20 bg-[#101114]/10" />
          <Skeleton className="h-8 w-24 rounded-xl bg-[#101114]/10" />
        </div>
      </div>
    </div>
  );
}
