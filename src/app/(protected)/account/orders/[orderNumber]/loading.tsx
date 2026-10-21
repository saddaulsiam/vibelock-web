import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading order details">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-52 bg-[#101114]/10" />
            <Skeleton className="h-3.5 w-40 bg-[#101114]/10" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full bg-[#101114]/10" />
        </div>

        {/* Order Items Skeleton */}
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-[#101114]/5 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-xl bg-[#101114]/10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-24 bg-[#101114]/10" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
