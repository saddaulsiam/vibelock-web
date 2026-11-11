import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function FAQLoading() {
  return (
    <div
      role="status"
      aria-label="Loading frequently asked questions"
      className="flex flex-col bg-vl-white-300 text-vl-dark-900"
    >
      {/* ── 1. Hero Header Banner Skeleton ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-vl-dark-900 pt-24 pb-16 text-vl-white-300 sm:pt-28 sm:pb-20">
        <Container className="relative z-10 text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2">
              <Skeleton className="size-2 rounded-full bg-vl-cyan/60" />
              <Skeleton className="h-3.5 w-56 bg-white/10" />
            </div>
            <Skeleton className="mx-auto h-10 w-3/4 bg-white/15 sm:h-14" />
            <Skeleton className="mx-auto h-4 w-4/5 bg-white/10" />

            {/* Search Input Box Skeleton */}
            <div className="pt-4">
              <Skeleton className="mx-auto h-12 w-full max-w-xl rounded-full bg-white/10" />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2. Category Filter Pills Skeleton ── */}
      <div className="sticky top-16 z-20 border-b border-vl-dark-900/10 bg-white/95 py-4 backdrop-blur-md">
        <Container>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-full bg-vl-dark-900/10" />
            ))}
          </div>
        </Container>
      </div>

      {/* ── 3. FAQ Accordion Cards Skeleton ── */}
      <section className="py-12 sm:py-16">
        <Container className="max-w-4xl space-y-8">
          {Array.from({ length: 3 }).map((_, catIdx) => (
            <div key={catIdx} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-vl-dark-900/10 pb-2">
                <Skeleton className="h-5 w-44 bg-vl-dark-900/10" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, qIdx) => (
                  <div
                    key={qIdx}
                    className="rounded-xl border border-black/10 bg-white p-5 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-3/4 bg-vl-dark-900/10" />
                      <Skeleton className="size-4 rounded-full bg-vl-dark-900/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Container>
      </section>
    </div>
  );
}

