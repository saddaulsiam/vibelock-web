import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading orders">
      <div className="border-vl-dark-900/8 rounded-xl border bg-white p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b pb-4 sm:pb-5">
          <div className="space-y-1.5">
            <Skeleton className="bg-vl-dark-900/10 h-5 w-36" />
            <Skeleton className="bg-vl-dark-900/8 h-3 w-64" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-5.5 w-18 rounded-md" />
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="mt-2 hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-vl-dark-900/8 border-b">
                <th className="py-3.5 pr-4">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-12" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-12" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-14" />
                </th>
                <th className="px-4 py-3.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                </th>
                <th className="py-3.5 pl-4 text-right">
                  <Skeleton className="bg-vl-dark-900/8 ml-auto h-3 w-12" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-vl-dark-900/6 divide-y">
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td className="py-4 pr-4">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
                    {i % 2 === 0 && <Skeleton className="bg-vl-dark-900/6 mt-1.5 h-3 w-24" />}
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-3.5 w-20" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-3.5 w-14" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-18" />
                  </td>
                  <td className="px-4 py-4">
                    <Skeleton className="bg-vl-dark-900/8 h-5 w-20 rounded-md" />
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <Skeleton className="bg-vl-dark-900/8 ml-auto h-4 w-14" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked View (< md) */}
        <div className="divide-vl-dark-900/8 mt-2 flex flex-col divide-y md:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 py-3.5 first:pt-2 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="bg-vl-dark-900/8 h-4.5 w-14 rounded" />
                  <Skeleton className="bg-vl-dark-900/8 h-4.5 w-18 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
                <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="bg-vl-dark-900/10 h-4.5 w-20" />
                <Skeleton className="bg-vl-dark-900/8 h-8 w-18 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
