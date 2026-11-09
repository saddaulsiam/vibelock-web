import { Skeleton } from "@/components/ui/skeleton";

export default function CouponsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading coupons">
      {/* ── Main Coupons Container ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-6 md:p-7">
          <div className="space-y-1.5">
            <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
            <Skeleton className="bg-vl-dark-900/10 h-6 w-48 sm:h-7 sm:w-56" />
            <Skeleton className="bg-vl-dark-900/8 h-3.5 w-64" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-6 w-24 rounded-full" />
        </div>

        {/* Coupons Voucher Grid */}
        <div className="p-4 sm:p-6 md:p-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-vl-dark-900/10 flex flex-col justify-between rounded-xl border bg-white p-5"
              >
                <div className="space-y-4">
                  {/* Top: Value & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Skeleton className="bg-vl-dark-900/10 h-6 w-28 sm:h-7" />
                      <Skeleton className="bg-vl-dark-900/8 h-3.5 w-40" />
                    </div>
                    <Skeleton className="bg-vl-dark-900/8 h-5 w-18 rounded" />
                  </div>

                  {/* Code Snippet Box */}
                  <div className="border-vl-dark-900/20 bg-vl-white-100 flex items-center justify-between rounded-lg border border-dashed p-3">
                    <Skeleton className="bg-vl-dark-900/10 h-5 w-32 font-mono" />
                    <Skeleton className="bg-vl-dark-900/10 h-7 w-20 rounded-md" />
                  </div>
                </div>

                {/* Validity Meta */}
                <div className="border-vl-dark-900/6 mt-4 flex items-center justify-between border-t pt-3">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
