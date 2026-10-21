import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading profile">
      {/* 1. Personal & Contact Info Skeleton */}
      <div className="space-y-8 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="space-y-1.5 border-b border-[#101114]/10 pb-5">
          <Skeleton className="h-6 w-48 bg-[#101114]/10" />
          <Skeleton className="h-3.5 w-72 bg-[#101114]/10" />
        </div>

        {/* Avatar Section Skeleton */}
        <div className="rounded-2xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-5 sm:p-6">
          <div className="flex items-center gap-4 border-b border-[#101114]/10 pb-5">
            <Skeleton className="h-20 w-20 rounded-full bg-[#101114]/10" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-[#101114]/10" />
              <Skeleton className="h-3 w-56 bg-[#101114]/10" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-10 w-28 rounded-xl bg-[#101114]/10" />
            <Skeleton className="h-10 w-28 rounded-xl bg-[#101114]/10" />
            <Skeleton className="h-10 w-28 rounded-xl bg-[#101114]/10" />
          </div>
        </div>

        {/* Inputs Skeleton */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20 bg-[#101114]/10" />
            <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 bg-[#101114]/10" />
            <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-3.5 w-36 bg-[#101114]/10" />
            <Skeleton className="h-10 w-full rounded-xl bg-[#101114]/10" />
          </div>
        </div>
      </div>

      {/* 2. Notification Preferences Skeleton */}
      <div className="space-y-4 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="space-y-1.5 border-b border-[#101114]/10 pb-5">
          <Skeleton className="h-6 w-52 bg-[#101114]/10" />
          <Skeleton className="h-3.5 w-80 bg-[#101114]/10" />
        </div>

        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-[#101114]/10 p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg bg-[#101114]/10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 bg-[#101114]/10" />
                  <Skeleton className="h-3 w-72 bg-[#101114]/10" />
                </div>
              </div>
              <Skeleton className="h-6 w-11 rounded-full bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Account Membership Skeleton */}
      <div className="space-y-5 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="space-y-1.5 border-b border-[#101114]/10 pb-5">
          <Skeleton className="h-6 w-60 bg-[#101114]/10" />
          <Skeleton className="h-3.5 w-96 bg-[#101114]/10" />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#101114]/10" />
          ))}
        </div>

        <Skeleton className="h-28 w-full rounded-xl bg-[#101114]/10" />
      </div>
    </div>
  );
}
