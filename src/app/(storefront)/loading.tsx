import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontHomeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading VibeLock storefront"
      className="bg-vl-dark-900 min-h-screen"
    >
      {/* ── 1. Hero Section Canvas Skeleton ── */}
      <section className="bg-vl-dark-900 relative flex h-screen overflow-hidden">
        {/* Left Content Area */}
        <div className="relative z-20 flex flex-col justify-start px-6 pt-24 sm:px-10 sm:pt-28 lg:px-14 lg:pt-32 xl:px-20">
          <div className="max-w-xl space-y-4">
            {/* Headline Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-12 w-48 bg-white/15 sm:h-16 sm:w-72" />
              <Skeleton className="h-12 w-64 bg-white/15 sm:h-16 sm:w-96" />
            </div>

            {/* Divider */}
            <Skeleton className="bg-vl-cyan/30 mt-3 h-px w-32" />

            {/* Tagline */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3 w-80 bg-white/10" />
              <Skeleton className="h-3 w-64 bg-white/10" />
            </div>

            {/* Subtagline */}
            <Skeleton className="bg-vl-cyan/30 h-3 w-48 pt-1" />

            {/* CTA Button Skeleton */}
            <div className="pt-4">
              <Skeleton className="bg-vl-cyan/20 h-11 w-44 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Sloped Cards Carousel Skeleton */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[75vh] sm:inset-0 sm:h-full">
          <div className="flex h-full items-end gap-2 overflow-hidden">
            <div className="relative h-full w-[290px] shrink-0 sm:w-[380px] lg:w-[480px]">
              <Skeleton className="absolute inset-x-0 top-[60%] bottom-0 rounded-t-sm bg-white/5" />
            </div>
            <div className="relative h-full w-[290px] shrink-0 sm:w-[380px] lg:w-[480px]">
              <Skeleton className="absolute inset-x-0 top-[40%] bottom-0 rounded-t-sm bg-white/5" />
            </div>
            <div className="relative h-full w-[290px] shrink-0 sm:w-[380px] lg:w-[480px]">
              <Skeleton className="absolute inset-x-0 top-[20%] bottom-0 rounded-t-sm bg-white/5" />
            </div>
            <div className="relative h-full w-[290px] shrink-0 sm:w-[380px] lg:w-[480px]">
              <Skeleton className="absolute inset-x-0 top-[5%] bottom-0 rounded-t-sm bg-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Trust Benefits Bar Skeleton ── */}
      <div className="bg-vl-dark-800 border-y border-white/10 py-6">
        <Container>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 bg-white/15" />
                  <Skeleton className="h-2.5 w-16 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── 3. Featured Drops Grid Preview Skeleton ── */}
      <section className="text-vl-dark-900 bg-white py-16">
        <Container>
          <div className="border-vl-dark-900/10 mb-10 flex items-end justify-between border-b pb-5">
            <div className="space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-3 w-28" />
              <Skeleton className="bg-vl-dark-900/10 h-8 w-60" />
            </div>
            <Skeleton className="bg-vl-dark-900/10 h-4 w-24" />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="bg-vl-dark-900/10 aspect-3/4 w-full rounded-sm" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-3/4" />
                <Skeleton className="bg-vl-dark-900/10 h-3.5 w-1/3" />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
