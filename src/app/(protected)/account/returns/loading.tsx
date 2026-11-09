import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading returns">
      {/* ── Main Returns Container Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-7">
          <div className="space-y-1.5">
            <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
            <Skeleton className="bg-vl-dark-900/10 h-6 w-48 sm:h-7 sm:w-56" />
            <Skeleton className="bg-vl-dark-900/8 h-3.5 w-72" />
          </div>

          <div className="flex items-center gap-2.5">
            <Skeleton className="bg-vl-dark-900/8 h-6 w-20 rounded-full" />
            <Skeleton className="bg-vl-dark-900/8 hidden h-9 w-28 rounded-xl sm:inline-flex" />
          </div>
        </div>

        {/* Returns List */}
        <div className="divide-vl-dark-900/8 divide-y p-5 sm:p-7">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4 py-5 first:pt-0 last:pb-0">
              {/* Return ID & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="bg-vl-dark-900/10 h-4.5 w-36" />
                    <Skeleton className="bg-vl-dark-900/8 h-5 w-20 rounded" />
                  </div>
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-48" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-8 w-24 rounded-lg" />
              </div>

              {/* Progress Milestones Skeleton */}
              <div className="border-vl-dark-900/6 bg-vl-white-100 grid grid-cols-2 gap-3 rounded-xl border p-3.5 sm:grid-cols-4">
                {[0, 1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <Skeleton className="bg-vl-dark-900/10 size-5 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="bg-vl-dark-900/10 h-3 w-16" />
                      <Skeleton className="bg-vl-dark-900/6 h-2.5 w-12" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Items Preview */}
              <div className="flex items-center gap-3">
                <Skeleton className="bg-vl-dark-900/10 size-12 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-40" />
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
