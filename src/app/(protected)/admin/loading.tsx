import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div role="status" aria-label="Loading admin dashboard" className="mx-auto w-full max-w-[100rem] space-y-7 sm:space-y-9">
      <div className="space-y-3 border-b border-[#101114]/10 pb-5">
        <Skeleton className="h-3 w-32 bg-[#101114]/10" />
        <Skeleton className="h-9 w-64 bg-[#101114]/10" />
        <Skeleton className="h-5 w-full max-w-xl bg-[#101114]/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-sm bg-white" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-sm bg-white" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-sm bg-white" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-sm bg-white" />
      <span className="sr-only">Loading dashboard data…</span>
    </div>
  );
}
