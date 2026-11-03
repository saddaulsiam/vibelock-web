import { Skeleton } from "@/components/ui/skeleton";

export default function OrderSuccessLoading() {
  return (
    <div className="relative min-h-screen bg-white" role="status" aria-label="Loading order confirmation">
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <Skeleton className="h-4 w-36 bg-[#101114]/10" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg bg-[#101114]/8" />
            <Skeleton className="h-9 w-28 rounded-lg bg-[#101114]/8" />
          </div>
        </div>

        {/* Master Receipt Container */}
        <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
          {/* Header */}
          <div className="border-b border-[#101114]/8 p-5 sm:p-7 md:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-32 bg-[#101114]/8" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="h-3 w-28 bg-[#101114]/8" />
            </div>
            <Skeleton className="h-8 w-64 bg-[#101114]/10 sm:h-9 sm:w-80" />
            <Skeleton className="h-4 w-full max-w-md bg-[#101114]/8" />

            {/* Stepper Skeleton */}
            <div className="mt-6 border-t border-[#101114]/6 pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-6 rounded-full bg-[#101114]/10" />
                      <Skeleton className="h-3.5 w-20 bg-[#101114]/10" />
                    </div>
                    <Skeleton className="ml-8 h-2.5 w-20 bg-[#101114]/6" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="p-5 sm:p-7 md:p-8">
            <div className="flex items-center justify-between border-b border-[#101114]/8 pb-4">
              <Skeleton className="h-4 w-32 bg-[#101114]/10" />
              <Skeleton className="h-5 w-16 rounded-full bg-[#101114]/8" />
            </div>

            <div className="divide-y divide-[#101114]/6">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5">
                  <Skeleton className="size-14 shrink-0 rounded-xl bg-[#101114]/10 sm:size-16" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 bg-[#101114]/10" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-16 rounded bg-[#101114]/8" />
                      <Skeleton className="h-4 w-14 rounded bg-[#101114]/8" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 bg-[#101114]/10" />
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="mt-4 border-t border-[#101114]/8 pt-5 sm:flex sm:justify-end">
              <div className="w-full space-y-2.5 sm:w-72">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-16 bg-[#101114]/8" />
                  <Skeleton className="h-3.5 w-16 bg-[#101114]/10" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24 bg-[#101114]/8" />
                  <Skeleton className="h-3.5 w-14 bg-[#101114]/10" />
                </div>
                <div className="my-2 flex items-baseline justify-between border-t border-[#101114]/8 pt-3">
                  <Skeleton className="h-4 w-24 bg-[#101114]/10" />
                  <Skeleton className="h-6 w-24 bg-[#101114]/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata Grid */}
          <div className="border-t border-[#101114]/8 bg-[#FAF9F5] p-5 sm:p-7 md:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-3.5 w-28 bg-[#101114]/10" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36 bg-[#101114]/10" />
                    <Skeleton className="h-3 w-48 bg-[#101114]/8" />
                    <Skeleton className="h-3 w-40 bg-[#101114]/8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-44 rounded-xl bg-[#101114]/8" />
          <Skeleton className="h-11 w-52 rounded-xl bg-[#101114]/15" />
        </div>
      </div>
    </div>
  );
}

