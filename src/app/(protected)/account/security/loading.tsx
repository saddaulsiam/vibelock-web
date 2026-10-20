import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading security settings">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6 space-y-1.5">
        <Skeleton className="h-6 w-44 bg-[#101114]/10" />
        <Skeleton className="h-3.5 w-72 bg-[#101114]/10" />
      </div>

      {/* Password Change Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4 mb-4">
          <Skeleton className="h-5 w-36 bg-[#101114]/10" />
        </div>
        <div className="space-y-4 max-w-lg">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-28 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
            </div>
          ))}
          <Skeleton className="h-10 w-36 rounded-xl bg-[#101114]/10" />
        </div>
      </div>

      {/* Sessions Skeleton */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="border-b border-[#101114]/10 pb-4 mb-4">
          <Skeleton className="h-5 w-40 bg-[#101114]/10" />
        </div>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-[#101114]/10 p-3.5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32 bg-[#101114]/10" />
                <Skeleton className="h-3 w-40 bg-[#101114]/10" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
