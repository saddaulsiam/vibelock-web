import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading profile">
      {/* ── Card 1: Personal Details Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-4 sm:p-6 md:p-8">
        <div className="mb-5 border-b border-[#101114]/8 pb-4 space-y-1.5">
          <Skeleton className="h-3 w-28 bg-[#101114]/8" />
          <Skeleton className="h-6 w-44 bg-[#101114]/10 sm:h-7" />
          <Skeleton className="h-3.5 w-72 bg-[#101114]/8" />
        </div>

        {/* Profile Avatar & Form */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full bg-[#101114]/10 sm:size-20" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-[#101114]/10" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg bg-[#101114]/8" />
                <Skeleton className="h-8 w-20 rounded-lg bg-[#101114]/8" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/8" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Skeleton className="h-3.5 w-28 bg-[#101114]/10" />
              <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/8" />
            </div>
          </div>

          <div className="border-t border-[#101114]/8 pt-5">
            <Skeleton className="h-10 w-32 rounded-xl bg-[#101114]/15" />
          </div>
        </div>
      </div>

      {/* ── Card 2: How You Sign In Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-4 sm:p-6 md:p-8">
        <div className="mb-4 space-y-1.5">
          <Skeleton className="h-3 w-28 bg-[#101114]/8" />
          <Skeleton className="h-6 w-40 bg-[#101114]/10 sm:h-7" />
          <Skeleton className="h-3.5 w-80 bg-[#101114]/8" />
        </div>

        <div className="flex flex-col gap-3.5 border-t border-[#101114]/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-full bg-[#101114]/10" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 bg-[#101114]/10" />
              <Skeleton className="h-3 w-44 bg-[#101114]/8" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-xl bg-[#101114]/8" />
        </div>
      </div>

      {/* ── Card 3: Delivery Addresses Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32 bg-[#101114]/8" />
            <Skeleton className="h-6 w-44 bg-[#101114]/10 sm:h-7" />
            <Skeleton className="h-3.5 w-72 bg-[#101114]/8" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl bg-[#101114]/15" />
        </div>

        <div className="divide-y divide-[#101114]/6 pt-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between py-4 first:pt-2 last:pb-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32 bg-[#101114]/10" />
                  <Skeleton className="h-4 w-16 rounded bg-[#101114]/8" />
                </div>
                <Skeleton className="h-3.5 w-56 bg-[#101114]/8" />
                <Skeleton className="h-3 w-40 bg-[#101114]/8" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-md bg-[#101114]/8" />
                <Skeleton className="h-8 w-16 rounded-md bg-[#101114]/8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 4: Notification Preferences Skeleton ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-4 sm:p-6 md:p-8">
        <div className="mb-5 border-b border-[#101114]/8 pb-4 space-y-1.5">
          <Skeleton className="h-3 w-32 bg-[#101114]/8" />
          <Skeleton className="h-6 w-52 bg-[#101114]/10 sm:h-7" />
          <Skeleton className="h-3.5 w-80 bg-[#101114]/8" />
        </div>

        <div className="divide-y divide-[#101114]/6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-4 first:pt-2 last:pb-1">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36 bg-[#101114]/10" />
                <Skeleton className="h-3 w-56 bg-[#101114]/8" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
