import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnDetailsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading return details">
      {/* ── Top Navigation Skeleton ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-32 bg-vl-dark-900/10" />
        <Skeleton className="h-8 w-36 rounded-lg bg-vl-dark-900/8" />
      </div>

      {/* ── Master Return Details Receipt Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white shadow-2xs">
        {/* Header */}
        <div className="border-b border-vl-dark-900/8 p-5 sm:p-7">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-36 bg-vl-dark-900/8" />
              <Skeleton className="h-3 w-32 bg-vl-dark-900/8" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-7 w-48 bg-vl-dark-900/10 sm:h-8 sm:w-56" />
              <Skeleton className="h-6 w-24 rounded-md bg-vl-dark-900/8" />
            </div>
            <Skeleton className="h-3.5 w-72 bg-vl-dark-900/8" />
          </div>

          {/* Reason Card Skeleton */}
          <div className="mt-5 rounded-xl border border-vl-dark-900/8 bg-vl-white-100 p-4">
            <Skeleton className="h-3 w-24 bg-vl-dark-900/8" />
            <Skeleton className="mt-1.5 h-4 w-48 bg-vl-dark-900/10" />
          </div>

          {/* 4-Step Stepper Skeleton */}
          <div className="mt-6 border-t border-vl-dark-900/6 pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
              {[0, 1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 rounded-full bg-vl-dark-900/10" />
                    <Skeleton className="h-3.5 w-24 bg-vl-dark-900/10" />
                  </div>
                  <Skeleton className="ml-8 h-2.5 w-20 bg-vl-dark-900/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Returned Items Section */}
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-vl-dark-900/8 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-sm bg-vl-dark-900/10" />
              <Skeleton className="h-4 w-32 bg-vl-dark-900/10" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-vl-dark-900/8" />
          </div>

          {/* Item Row */}
          <div className="py-4 sm:py-5">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 shrink-0 rounded-xl bg-vl-dark-900/10 sm:size-16" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44 bg-vl-dark-900/10" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-14 rounded bg-vl-dark-900/8" />
                  <Skeleton className="h-4 w-16 rounded bg-vl-dark-900/8" />
                </div>
                <Skeleton className="h-3 w-28 bg-vl-dark-900/8" />
              </div>
              <div className="shrink-0 text-right space-y-1">
                <Skeleton className="h-5 w-18 bg-vl-dark-900/10" />
                <Skeleton className="h-3 w-20 bg-vl-dark-900/6" />
              </div>
            </div>
          </div>
        </div>

        {/* Courier Pickup Details Footer Panel */}
        <div className="border-t border-vl-dark-900/8 bg-vl-white-100 p-5 sm:p-7 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-sm bg-vl-dark-900/10" />
            <Skeleton className="h-3.5 w-40 bg-vl-dark-900/10" />
          </div>
          <Skeleton className="h-3 w-56 bg-vl-dark-900/8" />
          <Skeleton className="h-3 w-full max-w-lg bg-vl-dark-900/8" />
        </div>
      </div>
    </div>
  );
}

