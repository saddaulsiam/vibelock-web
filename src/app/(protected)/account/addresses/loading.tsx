import { Skeleton } from "@/components/ui/skeleton";

export default function AddressesLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading addresses">
      {/* Saved Addresses List Card Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5 mb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-44 bg-[#101114]/10" />
            <Skeleton className="h-3.5 w-64 bg-[#101114]/10" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full bg-[#101114]/10" />
        </div>

        {/* Address Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-xl border border-[#101114]/10 bg-white p-4.5 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 bg-[#101114]/10" />
                  <Skeleton className="h-4 w-12 rounded-full bg-[#101114]/10" />
                </div>
                <Skeleton className="h-3 w-40 bg-[#101114]/10" />
                <Skeleton className="h-3 w-48 bg-[#101114]/10" />
                <Skeleton className="h-3 w-32 bg-[#101114]/10" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-[#101114]/5">
                <Skeleton className="h-7 w-16 rounded-lg bg-[#101114]/10" />
                <Skeleton className="h-7 w-16 rounded-lg bg-[#101114]/10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Address Form Card Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <Skeleton className="h-5 w-36 bg-[#101114]/10 border-b border-[#101114]/10 pb-4 mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-10 w-36 rounded-xl bg-[#101114]/10" />
      </div>
    </div>
  );
}
