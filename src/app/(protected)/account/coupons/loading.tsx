import { Skeleton } from "@/components/ui/skeleton";

export default function CouponsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading coupons">
      {/* ── Main Coupons Container ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white shadow-2xs">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vl-dark-900/8 p-4 sm:p-6 md:p-7">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-28 bg-vl-dark-900/8" />
              <span className="text-neutral-300">•</span>
              <Skeleton className="h-3 w-32 bg-vl-dark-900/8" />
            </div>
            <Skeleton className="h-6 w-48 bg-vl-dark-900/10 sm:h-7 sm:w-56" />
            <Skeleton className="h-3.5 w-64 bg-vl-dark-900/8" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full bg-vl-dark-900/8" />
        </div>

        {/* Coupons Voucher Grid */}
        <div className="p-4 sm:p-6 md:p-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-xl border border-vl-dark-900/10 bg-white p-5"
              >
                <div className="space-y-4">
                  {/* Top: Value & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-28 bg-vl-dark-900/10 sm:h-7" />
                      <Skeleton className="h-3.5 w-40 bg-vl-dark-900/8" />
                    </div>
                    <Skeleton className="h-5 w-18 rounded bg-vl-dark-900/8" />
                  </div>

                  {/* Code Snippet Box */}
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-vl-dark-900/20 bg-vl-white-100 p-3">
                    <Skeleton className="h-5 w-32 font-mono bg-vl-dark-900/10" />
                    <Skeleton className="h-7 w-20 rounded-md bg-vl-dark-900/10" />
                  </div>
                </div>

                {/* Validity Meta */}
                <div className="mt-4 flex items-center justify-between border-t border-vl-dark-900/6 pt-3">
                  <Skeleton className="h-3 w-28 bg-vl-dark-900/8" />
                  <Skeleton className="h-3 w-24 bg-vl-dark-900/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
