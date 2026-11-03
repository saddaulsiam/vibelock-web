import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnRequestLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading return request">
      {/* ── Top Navigation Skeleton ── */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36 bg-[#101114]/10" />
        <Skeleton className="h-3 w-28 bg-[#101114]/8" />
      </div>

      {/* ── Return Form Container Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        <div className="border-b border-[#101114]/8 p-5 sm:p-7 md:p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24 bg-[#101114]/8" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="h-3 w-36 bg-[#101114]/8" />
            </div>
            <Skeleton className="h-7 w-48 bg-[#101114]/10 sm:h-8 sm:w-60" />
            <Skeleton className="h-3.5 w-full max-w-md bg-[#101114]/8" />
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7 md:p-8">
          {/* Item Selection Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 bg-[#101114]/10" />
            <div className="rounded-xl border border-[#101114]/10 bg-neutral-50/50 p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="size-5 rounded bg-[#101114]/10" />
                <Skeleton className="size-14 shrink-0 rounded-lg bg-[#101114]/10" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-28 bg-[#101114]/8" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg bg-[#101114]/8" />
              </div>
            </div>
          </div>

          {/* Reason & Details Skeleton */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 bg-[#101114]/10" />
              <Skeleton className="h-24 w-full rounded-xl bg-[#101114]/8" />
            </div>
          </div>

          {/* Submit Action */}
          <div className="border-t border-[#101114]/8 pt-5">
            <Skeleton className="h-11 w-full rounded-xl bg-[#101114]/15 sm:w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}

