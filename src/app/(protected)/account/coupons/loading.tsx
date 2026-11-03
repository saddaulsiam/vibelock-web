import { Skeleton } from "@/components/ui/skeleton";

export default function CouponsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading coupons">
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        <div className="border-b border-[#101114]/8 p-4 sm:p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 bg-[#101114]/10" />
              <Skeleton className="h-4 w-64 bg-[#101114]/10" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full bg-[#101114]/10" />
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="space-y-4 rounded-2xl border border-[#101114]/10 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24 rounded-md bg-[#101114]/10" />
                  <Skeleton className="h-5 w-20 rounded-full bg-[#101114]/10" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl bg-[#FAF9F5]" />
                <Skeleton className="h-4 w-48 bg-[#101114]/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

