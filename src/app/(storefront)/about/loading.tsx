import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function AboutLoading() {
  return (
    <div
      role="status"
      aria-label="Loading about manifesto"
      className="bg-vl-white-300 text-vl-dark-900 flex flex-col"
    >
      {/* ── 1. Brutalist Hero Manifesto Skeleton ── */}
      <section className="bg-vl-dark-900 text-vl-white-300 relative overflow-hidden border-b border-white/10 pt-24 pb-16 sm:pt-28 sm:pb-24">
        <Container className="relative z-10">
          <div className="max-w-3xl space-y-4">
            {/* Category / Manifesto Tag */}
            <div className="flex items-center gap-2">
              <Skeleton className="bg-vl-cyan/60 size-2 rounded-full" />
              <Skeleton className="h-3.5 w-48 bg-white/10" />
            </div>

            {/* Giant Headline Skeleton */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-10 w-4/5 bg-white/15 sm:h-14 lg:h-16" />
              <Skeleton className="h-10 w-3/5 bg-white/15 sm:h-14 lg:h-16" />
            </div>

            {/* Subtitle Paragraph */}
            <div className="max-w-xl space-y-2 pt-3">
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-5/6 bg-white/10" />
              <Skeleton className="h-4 w-2/3 bg-white/10" />
            </div>
          </div>

          {/* Quick Metrics Bar Skeleton (4 items) */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-24 bg-white/20 sm:h-9" />
                <Skeleton className="h-3 w-32 bg-white/10" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── 2. The Origin Story & Philosophy Skeleton ── */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Visual Showcase (Col 5) */}
            <div className="relative lg:col-span-5">
              <Skeleton className="bg-vl-dark-900/10 aspect-4/5 w-full rounded-2xl shadow-2xl" />
            </div>

            {/* Philosophy Text (Col 7) */}
            <div className="space-y-5 lg:col-span-7">
              <Skeleton className="bg-vl-dark-900/10 h-3.5 w-36" />
              <Skeleton className="bg-vl-dark-900/10 h-9 w-4/5 sm:h-11" />
              <div className="space-y-2.5 pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-full" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-full" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-5/6" />
              </div>
              <div className="space-y-2.5 pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-full" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-4/5" />
              </div>
              <div className="pt-4">
                <Skeleton className="bg-vl-dark-900/10 h-28 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
