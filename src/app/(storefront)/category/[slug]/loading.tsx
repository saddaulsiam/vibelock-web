import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryLoading() {
  return (
    <Section
      role="status"
      aria-label="Loading category collection"
      className="relative z-10 min-h-screen bg-white pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24"
    >
      <Container>
        {/* ── 2. Category Breadcrumb & Header ── */}
        <header className="mb-6 sm:mb-8">
          <nav aria-label="Breadcrumb" className="mb-1">
            <div className="flex items-center gap-1.5 py-1">
              <Skeleton className="bg-vl-dark-900/10 h-3 w-16" />
              <span className="text-vl-dark-900/20 text-xs">/</span>
              <Skeleton className="bg-vl-dark-900/10 h-3 w-16" />
              <span className="text-vl-dark-900/20 text-xs">/</span>
              <Skeleton className="bg-vl-dark-900/10 h-3 w-24" />
            </div>
          </nav>
          <div className="border-border/50 mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
            <div className="min-w-0 space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-8 w-44 sm:h-9 sm:w-60" />
              <Skeleton className="bg-vl-dark-900/10 h-4 w-36 sm:w-48" />
            </div>

            <div className="flex items-center gap-4">
              <Skeleton className="bg-vl-dark-900/10 h-4 w-20" />
              <div className="bg-vl-dark-200 h-4 w-px" aria-hidden="true" />
              <Skeleton className="bg-vl-dark-900/10 h-9 w-36 rounded-xs" />
            </div>
          </div>
        </header>

        {/* ── 3. Main Catalog Layout: Sidebar + Product Grid ── */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Desktop Filter Sidebar Skeleton (w-64) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="border-border/60 bg-background space-y-6 rounded-xs border p-5">
              <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
                <Skeleton className="bg-vl-dark-900/10 h-3 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-14" />
                <Skeleton className="bg-vl-dark-900/10 h-9 w-full rounded-xs" />
              </div>
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-20" />
                <div className="space-y-2">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-3/4" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-2/3" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-1/2" />
                </div>
              </div>
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="bg-vl-dark-900/10 h-8 flex-1 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-8 flex-1 rounded-xs" />
                </div>
              </div>
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-12" />
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                </div>
              </div>
            </div>
          </aside>

          {/* Right Product Grid */}
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-9 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col space-y-2.5">
                  <Skeleton className="bg-vl-dark-900/10 aspect-3/4 w-full rounded-sm" />
                  <div className="space-y-1.5 pt-1">
                    <Skeleton className="bg-vl-dark-900/10 h-3.5 w-4/5" />
                    <Skeleton className="bg-vl-dark-900/10 h-3 w-2/5" />
                    <Skeleton className="bg-vl-dark-900/10 h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
