import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading returns">
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-44 bg-[#101114]/10" />
            <Skeleton className="h-3.5 w-64 bg-[#101114]/10" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full bg-[#101114]/10" />
        </div>

        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-[#101114]/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#101114]/10 pb-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-40 bg-[#101114]/10" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-[#101114]/10" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-16 bg-[#101114]/10" />
                <Skeleton className="h-3.5 w-32 bg-[#101114]/10" />
                <Skeleton className="h-4 w-24 bg-[#101114]/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
