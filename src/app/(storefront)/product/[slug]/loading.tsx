import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <Section
      role="status"
      aria-label="Loading product details"
      className="min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16"
    >
      <span className="sr-only">Loading product details...</span>
      <Container className="max-w-6xl">
        {/* Breadcrumbs Skeleton */}
        <div className="mb-2.5 flex items-center gap-1.5 sm:mb-6 sm:gap-2">
          <Skeleton className="h-3.5 w-10 sm:h-4 sm:w-12" />
          <Skeleton className="size-3.5 sm:size-4" />
          <Skeleton className="h-3.5 w-14 sm:h-4 sm:w-16" />
          <Skeleton className="size-3.5 sm:size-4" />
          <Skeleton className="h-3.5 w-16 sm:h-4 sm:w-20" />
          <Skeleton className="size-3.5 sm:size-4" />
          <Skeleton className="h-3.5 w-24 sm:h-4 sm:w-32" />
        </div>

        {/* Product Hero Grid */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] sm:gap-8 lg:gap-12 xl:gap-16">
          {/* Left Column: Image Gallery Skeleton */}
          <div className="min-w-0">
            {/* Mobile Carousel Skeleton (< lg) */}
            <div className="lg:hidden">
              <div className="relative mx-auto w-full max-w-90 xs:max-w-[300px] sm:max-w-110">
                <Skeleton className="aspect-3/4 w-full rounded-xs" />
                {/* Floating Indicators Skeleton */}
                <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-between px-3">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-1.5 w-5 rounded-full" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            </div>

            {/* Desktop Gallery Skeleton (lg: 1024px+) */}
            <div className="hidden lg:flex lg:flex-row lg:gap-4">
              {/* Left Vertical Thumbnails */}
              <div className="flex flex-col gap-2.5">
                <Skeleton className="aspect-3/4 w-20 rounded-xs" />
                <Skeleton className="aspect-3/4 w-20 rounded-xs" />
                <Skeleton className="aspect-3/4 w-20 rounded-xs" />
                <Skeleton className="aspect-3/4 w-20 rounded-xs" />
              </div>
              {/* Main Viewer */}
              <div className="flex-1">
                <Skeleton className="aspect-3/4 w-full rounded-xs" />
              </div>
            </div>
          </div>

          {/* Right Column: Product Details Skeleton */}
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {/* Header border block */}
            <div className="border-border/50 mb-3 border-b pb-2 sm:mb-5 sm:pb-3.5">
              <div className="mb-1 flex items-center justify-between gap-2 pt-1 md:pt-0">
                <Skeleton className="h-3 w-20 sm:h-3.5 sm:w-24" />
                <Skeleton className="h-3 w-24 sm:h-3.5 sm:w-28" />
              </div>
              <Skeleton className="mt-1 h-6 w-3/4 sm:h-8 md:h-9 lg:h-10" />
              <div className="mt-2 flex items-center gap-2">
                <Skeleton className="h-3.5 w-20 sm:h-4 sm:w-24" />
                <Skeleton className="h-3 w-16 sm:h-3.5 sm:w-24" />
              </div>
            </div>

            {/* Variant Selector Stack */}
            <div className="space-y-5.5 sm:space-y-7">
              {/* Price & In-Stock Status */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-2.5 sm:gap-3">
                  <Skeleton className="h-7 w-28 sm:h-8 sm:w-36 md:h-9 md:w-40" />
                  <Skeleton className="h-4 w-16 sm:h-5 sm:w-20" />
                  <Skeleton className="h-4.5 w-16 rounded-xs sm:h-5 sm:w-18" />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-3.5 w-44" />
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Skeleton className="h-7.5 w-20 rounded-xs sm:h-8 sm:w-22" />
                  <Skeleton className="h-7.5 w-20 rounded-xs sm:h-8 sm:w-22" />
                  <Skeleton className="h-7.5 w-20 rounded-xs sm:h-8 sm:w-22" />
                </div>
              </div>

              {/* Size Selection */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-18" />
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Skeleton className="h-8 w-10 rounded-xs sm:h-8.5 sm:w-11" />
                  <Skeleton className="h-8 w-10 rounded-xs sm:h-8.5 sm:w-11" />
                  <Skeleton className="h-8 w-10 rounded-xs sm:h-8.5 sm:w-11" />
                  <Skeleton className="h-8 w-10 rounded-xs sm:h-8.5 sm:w-11" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-vl-dark-900/10 space-y-2 border-t pt-3 sm:space-y-2.5 sm:pt-3.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Skeleton className="h-11 flex-1 rounded-xs sm:h-12" />
                  <Skeleton className="size-11 shrink-0 rounded-xs sm:size-12" />
                  <Skeleton className="size-11 shrink-0 rounded-xs sm:size-12" />
                </div>
                <Skeleton className="h-11 w-full rounded-xs sm:h-12" />
              </div>

              {/* Single-Line Trust Badges */}
              <div className="border-border/50 bg-vl-white-300/30 rounded-xs border p-3 sm:p-3.5">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Skeleton className="size-4 shrink-0 rounded-xs" />
                    <Skeleton className="h-3 w-56 sm:w-64" />
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Skeleton className="size-4 shrink-0 rounded-xs" />
                    <Skeleton className="h-3 w-48 sm:w-56" />
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Skeleton className="size-4 shrink-0 rounded-xs" />
                    <Skeleton className="h-3 w-52 sm:w-60" />
                  </div>
                </div>
              </div>

              {/* Product Info Accordion */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex h-12 items-center justify-between border-b px-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="size-4" />
                </div>
                <div className="flex h-12 items-center justify-between border-b px-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section Skeleton */}
        <div className="border-border/50 mt-7 border-t pt-5 sm:mt-10 sm:pt-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-40 sm:h-7 sm:w-48" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28 rounded-xs sm:h-9 sm:w-32" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <Skeleton className="h-48 rounded-xs lg:col-span-4" />
            <div className="space-y-3 lg:col-span-8">
              <Skeleton className="h-28 rounded-xs" />
              <Skeleton className="h-28 rounded-xs" />
            </div>
          </div>
        </div>

        {/* You May Also Like Section Skeleton */}
        <div className="border-border/50 mt-7 border-t pt-5 sm:mt-10 sm:pt-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <Skeleton className="h-3 w-28 sm:h-3.5 sm:w-32" />
              <Skeleton className="mt-1.5 h-6 w-44 sm:h-7 sm:w-56" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2.5">
                <Skeleton className="aspect-3/4 w-full rounded-xs" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
