import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading returns">
      {/* ── Main Returns Container Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white shadow-2xs">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vl-dark-900/8 p-5 sm:p-7">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24 bg-vl-dark-900/8" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="h-3 w-44 bg-vl-dark-900/8" />
            </div>
            <Skeleton className="h-6 w-48 bg-vl-dark-900/10 sm:h-7 sm:w-56" />
            <Skeleton className="h-3.5 w-72 bg-vl-dark-900/8" />
          </div>

          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-20 rounded-full bg-vl-dark-900/8" />
            <Skeleton className="hidden h-9 w-28 rounded-xl bg-vl-dark-900/8 sm:inline-flex" />
          </div>
        </div>

        {/* Returns List */}
        <div className="divide-y divide-vl-dark-900/8 p-5 sm:p-7">
          {[0, 1].map((i) => (
            <div key={i} className="py-5 first:pt-0 last:pb-0 space-y-4">
              {/* Return ID & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4.5 w-36 bg-vl-dark-900/10" />
                    <Skeleton className="h-5 w-20 rounded bg-vl-dark-900/8" />
                  </div>
                  <Skeleton className="h-3 w-48 bg-vl-dark-900/8" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg bg-vl-dark-900/8" />
              </div>

              {/* Progress Milestones Skeleton */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-vl-dark-900/6 bg-vl-white-100 p-3.5 sm:grid-cols-4">
                {[0, 1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <Skeleton className="size-5 rounded-full bg-vl-dark-900/10" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16 bg-vl-dark-900/10" />
                      <Skeleton className="h-2.5 w-12 bg-vl-dark-900/6" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Items Preview */}
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-lg bg-vl-dark-900/10" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-40 bg-vl-dark-900/10" />
                  <Skeleton className="h-3 w-28 bg-vl-dark-900/8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
