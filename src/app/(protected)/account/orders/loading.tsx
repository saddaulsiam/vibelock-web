import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading orders">
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 pb-4 sm:pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 bg-[#101114]/10" />
            <Skeleton className="h-3 w-64 bg-[#101114]/8" />
          </div>
          <Skeleton className="h-5.5 w-18 rounded-md bg-[#101114]/8" />
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="mt-2 hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#101114]/8">
                <th className="py-3.5 pr-4"><Skeleton className="h-3 w-16 bg-[#101114]/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-12 bg-[#101114]/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-12 bg-[#101114]/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-14 bg-[#101114]/8" /></th>
                <th className="px-4 py-3.5"><Skeleton className="h-3 w-16 bg-[#101114]/8" /></th>
                <th className="py-3.5 pl-4 text-right"><Skeleton className="ml-auto h-3 w-12 bg-[#101114]/8" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101114]/6">
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td className="py-4 pr-4">
                    <Skeleton className="h-4 w-32 bg-[#101114]/10" />
                    {i % 2 === 0 && <Skeleton className="mt-1.5 h-3 w-24 bg-[#101114]/6" />}
                  </td>
                  <td className="px-4 py-4"><Skeleton className="h-3.5 w-20 bg-[#101114]/8" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-3.5 w-14 bg-[#101114]/8" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-18 bg-[#101114]/10" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-md bg-[#101114]/8" /></td>
                  <td className="py-4 pl-4 text-right"><Skeleton className="ml-auto h-4 w-14 bg-[#101114]/8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked View (< md) */}
        <div className="mt-2 flex flex-col divide-y divide-[#101114]/8 md:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3.5 first:pt-2 last:pb-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-32 bg-[#101114]/10" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4.5 w-14 rounded bg-[#101114]/8" />
                  <Skeleton className="h-4.5 w-18 rounded bg-[#101114]/8" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24 bg-[#101114]/8" />
                <Skeleton className="h-3 w-16 bg-[#101114]/8" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4.5 w-20 bg-[#101114]/10" />
                <Skeleton className="h-8 w-18 rounded-md bg-[#101114]/8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
