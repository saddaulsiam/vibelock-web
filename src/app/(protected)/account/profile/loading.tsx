import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading profile">
      {/* ── Card 1: Personal Details Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 md:p-8">
        <div className="border-vl-dark-900/8 mb-5 space-y-1.5 border-b pb-4">
          <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
          <Skeleton className="bg-vl-dark-900/10 h-6 w-44 sm:h-7" />
          <Skeleton className="bg-vl-dark-900/8 h-3.5 w-72" />
        </div>

        {/* Profile Avatar & Form */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="bg-vl-dark-900/10 size-16 rounded-full sm:size-20" />
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="bg-vl-dark-900/8 h-8 w-24 rounded-lg" />
                <Skeleton className="bg-vl-dark-900/8 h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-20" />
              <Skeleton className="bg-vl-dark-900/8 h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-24" />
              <Skeleton className="bg-vl-dark-900/8 h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-28" />
              <Skeleton className="bg-vl-dark-900/8 h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="border-vl-dark-900/8 border-t pt-5">
            <Skeleton className="bg-vl-dark-900/15 h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── Card 2: How You Sign In Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 md:p-8">
        <div className="mb-4 space-y-1.5">
          <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
          <Skeleton className="bg-vl-dark-900/10 h-6 w-40 sm:h-7" />
          <Skeleton className="bg-vl-dark-900/8 h-3.5 w-80" />
        </div>

        <div className="border-vl-dark-900/8 flex flex-col gap-3.5 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="bg-vl-dark-900/10 size-7 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
              <Skeleton className="bg-vl-dark-900/8 h-3 w-44" />
            </div>
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* ── Card 3: Delivery Addresses Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 md:p-8">
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="space-y-1.5">
            <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
            <Skeleton className="bg-vl-dark-900/10 h-6 w-44 sm:h-7" />
            <Skeleton className="bg-vl-dark-900/8 h-3.5 w-72" />
          </div>
          <Skeleton className="bg-vl-dark-900/15 h-9 w-32 rounded-xl" />
        </div>

        <div className="divide-vl-dark-900/6 divide-y pt-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between py-4 first:pt-2 last:pb-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-32" />
                  <Skeleton className="bg-vl-dark-900/8 h-4 w-16 rounded" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-3.5 w-56" />
                <Skeleton className="bg-vl-dark-900/8 h-3 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="bg-vl-dark-900/8 h-8 w-16 rounded-md" />
                <Skeleton className="bg-vl-dark-900/8 h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 4: Notification Preferences Skeleton ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 md:p-8">
        <div className="border-vl-dark-900/8 mb-5 space-y-1.5 border-b pb-4">
          <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
          <Skeleton className="bg-vl-dark-900/10 h-6 w-52 sm:h-7" />
          <Skeleton className="bg-vl-dark-900/8 h-3.5 w-80" />
        </div>

        <div className="divide-vl-dark-900/6 divide-y">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-4 first:pt-2 last:pb-1">
              <div className="space-y-1">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-36" />
                <Skeleton className="bg-vl-dark-900/8 h-3 w-56" />
              </div>
              <Skeleton className="bg-vl-dark-900/10 h-6 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
