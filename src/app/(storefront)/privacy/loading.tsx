import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrivacyLoading() {
  return (
    <div
      role="status"
      aria-label="Loading privacy policy"
      className="flex flex-col bg-vl-white-300 text-vl-dark-900"
    >
      {/* ── 1. Hero Header Skeleton ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-vl-dark-900 pt-24 pb-16 text-vl-white-300 sm:pt-28 sm:pb-20">
        <Container className="relative z-10">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-full bg-vl-cyan/60" />
              <Skeleton className="h-3.5 w-36 bg-white/10" />
            </div>
            <Skeleton className="h-10 w-3/4 bg-white/15 sm:h-12" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-4/5 bg-white/10" />
            </div>
            <div className="flex items-center gap-3 pt-3">
              <Skeleton className="h-3 w-32 bg-white/10" />
              <span className="text-white/20">•</span>
              <Skeleton className="h-3 w-40 bg-white/10" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2. Legal Body Content Skeleton (Split Layout) ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left Sticky Table of Contents Skeleton (Col 4) */}
            <aside className="hidden lg:col-span-4 lg:block">
              <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-3">
                <Skeleton className="h-3 w-28 bg-vl-dark-900/10" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full bg-vl-dark-900/10" />
                  <Skeleton className="h-4 w-5/6 bg-vl-dark-900/10" />
                  <Skeleton className="h-4 w-4/5 bg-vl-dark-900/10" />
                  <Skeleton className="h-4 w-full bg-vl-dark-900/10" />
                  <Skeleton className="h-4 w-3/4 bg-vl-dark-900/10" />
                </div>
              </div>
            </aside>

            {/* Right Prose Content Skeleton (Col 8) */}
            <div className="space-y-8 lg:col-span-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 space-y-4"
                >
                  <Skeleton className="h-6 w-1/2 bg-vl-dark-900/10" />
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-4 w-full bg-vl-dark-900/10" />
                    <Skeleton className="h-4 w-full bg-vl-dark-900/10" />
                    <Skeleton className="h-4 w-4/5 bg-vl-dark-900/10" />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-vl-dark-900/5">
                    <Skeleton className="h-3.5 w-3/4 bg-vl-dark-900/10" />
                    <Skeleton className="h-3.5 w-2/3 bg-vl-dark-900/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

