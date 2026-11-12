import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnRequestLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading return request">
      {/* ── Top Navigation Skeleton ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="bg-vl-dark-900/10 h-4 w-36" />
        <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
      </div>

      {/* ── Return Form Container Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        <div className="border-vl-dark-900/8 border-b p-5 sm:p-7 md:p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="bg-vl-dark-900/8 h-3 w-36" />
            </div>
            <Skeleton className="bg-vl-dark-900/10 h-7 w-48 sm:h-8 sm:w-60" />
            <Skeleton className="bg-vl-dark-900/8 h-3.5 w-full max-w-md" />
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7 md:p-8">
          {/* Item Selection Skeleton */}
          <div className="space-y-3">
            <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
            <div className="border-vl-dark-900/10 rounded-xl border bg-neutral-50/50 p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="bg-vl-dark-900/10 size-5 rounded" />
                <Skeleton className="bg-vl-dark-900/10 size-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-44" />
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-8 w-24 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Reason & Details Skeleton */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-28" />
              <Skeleton className="bg-vl-dark-900/8 h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-24" />
              <Skeleton className="bg-vl-dark-900/8 h-24 w-full rounded-xl" />
            </div>
          </div>

          {/* Submit Action */}
          <div className="border-vl-dark-900/8 border-t pt-5">
            <Skeleton className="bg-vl-dark-900/15 h-11 w-full rounded-xl sm:w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
