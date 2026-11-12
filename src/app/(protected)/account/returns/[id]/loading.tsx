import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnDetailsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading return details">
      {/* ── Top Navigation Skeleton ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
        <Skeleton className="bg-vl-dark-900/8 h-8 w-36 rounded-lg" />
      </div>

      {/* ── Master Return Details Receipt Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* Header */}
        <div className="border-vl-dark-900/8 border-b p-5 sm:p-7">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="bg-vl-dark-900/8 h-3 w-36" />
              <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="bg-vl-dark-900/10 h-7 w-48 sm:h-8 sm:w-56" />
              <Skeleton className="bg-vl-dark-900/8 h-6 w-24 rounded-md" />
            </div>
            <Skeleton className="bg-vl-dark-900/8 h-3.5 w-72" />
          </div>

          {/* Reason Card Skeleton */}
          <div className="border-vl-dark-900/8 bg-vl-white-100 mt-5 rounded-xl border p-4">
            <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
            <Skeleton className="bg-vl-dark-900/10 mt-1.5 h-4 w-48" />
          </div>

          {/* 4-Step Stepper Skeleton */}
          <div className="border-vl-dark-900/6 mt-6 border-t pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
              {[0, 1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="bg-vl-dark-900/10 size-6 rounded-full" />
                    <Skeleton className="bg-vl-dark-900/10 h-3.5 w-24" />
                  </div>
                  <Skeleton className="bg-vl-dark-900/6 ml-8 h-2.5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Returned Items Section */}
        <div className="p-5 sm:p-7">
          <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="bg-vl-dark-900/10 size-4 rounded-sm" />
              <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
            </div>
            <Skeleton className="bg-vl-dark-900/8 h-5 w-16 rounded-full" />
          </div>

          {/* Item Row */}
          <div className="py-4 sm:py-5">
            <div className="flex items-center gap-4">
              <Skeleton className="bg-vl-dark-900/10 size-14 shrink-0 rounded-xl sm:size-16" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-44" />
                <div className="flex gap-2">
                  <Skeleton className="bg-vl-dark-900/8 h-4 w-14 rounded" />
                  <Skeleton className="bg-vl-dark-900/8 h-4 w-16 rounded" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <Skeleton className="bg-vl-dark-900/10 h-5 w-18" />
                <Skeleton className="bg-vl-dark-900/6 h-3 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Courier Pickup Details Footer Panel */}
        <div className="border-vl-dark-900/8 bg-vl-white-100 space-y-2 border-t p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <Skeleton className="bg-vl-dark-900/10 size-4 rounded-sm" />
            <Skeleton className="bg-vl-dark-900/10 h-3.5 w-40" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-3 w-56" />
          <Skeleton className="bg-vl-dark-900/8 h-3 w-full max-w-lg" />
        </div>
      </div>
    </div>
  );
}
