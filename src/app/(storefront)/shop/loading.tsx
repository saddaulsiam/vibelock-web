import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <Section
      role="status"
      aria-label="Loading shop releases"
      className="relative z-10 min-h-screen bg-white pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24"
    >
      <Container>
        {/* ── 2. Header, Breadcrumbs & Sort ── */}
        <header className="mb-4">
          <nav aria-label="Breadcrumb" className="mb-1">
            <div className="flex items-center gap-1.5 py-1">
              <Skeleton className="bg-vl-dark-900/10 h-3 w-16" />
              <span className="text-vl-dark-900/20 text-xs">/</span>
              <Skeleton className="bg-vl-dark-900/10 h-3 w-12" />
            </div>
          </nav>
          <div className="border-border/50 mb-8 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Skeleton className="bg-vl-dark-900/10 h-8 w-48 sm:h-9 sm:w-64" />
              <Skeleton className="bg-vl-dark-900/10 h-4 w-40 sm:w-56" />
            </div>

            {/* Desktop Count + Sort on right */}
            <div className="hidden shrink-0 items-center gap-4 sm:flex">
              <Skeleton className="bg-vl-dark-900/10 h-4 w-20" />
              <div className="bg-vl-dark-200 h-4 w-px" aria-hidden="true" />
              <Skeleton className="bg-vl-dark-900/10 h-9 w-36 rounded-xs" />
            </div>
          </div>
        </header>

        {/* ── 3. Main Catalog Layout: Sidebar + Product Grid ── */}
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Desktop Filter Sidebar Skeleton (w-64) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="border-border/60 bg-background space-y-6 rounded-xs border p-5">
              {/* Filter Header */}
              <div className="border-vl-dark-900/10 flex items-center justify-between border-b pb-3">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
                <Skeleton className="bg-vl-dark-900/10 h-3 w-12" />
              </div>

              {/* Search Filter Skeleton */}
              <div className="space-y-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-14" />
                <Skeleton className="bg-vl-dark-900/10 h-9 w-full rounded-xs" />
              </div>

              {/* Category Filter Skeleton */}
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-20" />
                <div className="space-y-2">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-3/4" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-2/3" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-4/5" />
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-1/2" />
                </div>
              </div>

              {/* Price Range Skeleton */}
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="bg-vl-dark-900/10 h-8 flex-1 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-8 flex-1 rounded-xs" />
                </div>
              </div>

              {/* Size Filter Pills Skeleton */}
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-12" />
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-9 rounded-xs" />
                </div>
              </div>

              {/* Color Filter Circles Skeleton */}
              <div className="border-vl-dark-900/5 space-y-2.5 border-t pt-2">
                <Skeleton className="bg-vl-dark-900/10 h-3 w-14" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="bg-vl-dark-900/10 size-5 rounded-full" />
                  <Skeleton className="bg-vl-dark-900/10 size-5 rounded-full" />
                  <Skeleton className="bg-vl-dark-900/10 size-5 rounded-full" />
                  <Skeleton className="bg-vl-dark-900/10 size-5 rounded-full" />
                </div>
              </div>
            </div>
          </aside>

          {/* Right Area: Grid & Mobile Header */}
          <div className="min-w-0 flex-1">
            {/* Mobile Filter & Sort Bar Skeleton */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:hidden">
              <Skeleton className="bg-vl-dark-900/10 h-9 w-28 rounded-xs" />
              <Skeleton className="bg-vl-dark-900/10 h-9 w-36 rounded-xs" />
            </div>

            {/* Product Infinite Grid Skeleton (8 Items) */}
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
