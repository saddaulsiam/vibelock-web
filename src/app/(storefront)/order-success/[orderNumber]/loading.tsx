import { Skeleton } from "@/components/ui/skeleton";

export default function OrderSuccessLoading() {
  return (
    <div
      className="relative min-h-screen bg-white"
      role="status"
      aria-label="Loading order confirmation"
    >
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <Skeleton className="bg-vl-dark-900/10 h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="bg-vl-dark-900/8 h-9 w-24 rounded-lg" />
            <Skeleton className="bg-vl-dark-900/8 h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Master Receipt Container */}
        <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
          {/* Header */}
          <div className="border-vl-dark-900/8 space-y-3 border-b p-5 sm:p-7 md:p-8">
            <div className="flex items-center gap-2">
              <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
            </div>
            <Skeleton className="bg-vl-dark-900/10 h-8 w-64 sm:h-9 sm:w-80" />
            <Skeleton className="bg-vl-dark-900/8 h-4 w-full max-w-md" />

            {/* Stepper Skeleton */}
            <div className="border-vl-dark-900/6 mt-6 border-t pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="bg-vl-dark-900/10 size-6 rounded-full" />
                      <Skeleton className="bg-vl-dark-900/10 h-3.5 w-20" />
                    </div>
                    <Skeleton className="bg-vl-dark-900/6 ml-8 h-2.5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="p-5 sm:p-7 md:p-8">
            <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-4">
              <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
              <Skeleton className="bg-vl-dark-900/8 h-5 w-16 rounded-full" />
            </div>

            <div className="divide-vl-dark-900/6 divide-y">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5">
                  <Skeleton className="bg-vl-dark-900/10 size-14 shrink-0 rounded-xl sm:size-16" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="bg-vl-dark-900/8 h-4 w-16 rounded" />
                      <Skeleton className="bg-vl-dark-900/8 h-4 w-14 rounded" />
                    </div>
                  </div>
                  <Skeleton className="bg-vl-dark-900/10 h-5 w-20" />
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="border-vl-dark-900/8 mt-4 border-t pt-5 sm:flex sm:justify-end">
              <div className="w-full space-y-2.5 sm:w-72">
                <div className="flex justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-24" />
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-14" />
                </div>
                <div className="border-vl-dark-900/8 my-2 flex items-baseline justify-between border-t pt-3">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-24" />
                  <Skeleton className="bg-vl-dark-900/10 h-6 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata Grid */}
          <div className="border-vl-dark-900/8 bg-vl-white-100 border-t p-5 sm:p-7 md:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-28" />
                  <div className="space-y-1.5">
                    <Skeleton className="bg-vl-dark-900/10 h-3.5 w-36" />
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-48" />
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="bg-vl-dark-900/8 h-11 w-44 rounded-xl" />
          <Skeleton className="bg-vl-dark-900/15 h-11 w-52 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
