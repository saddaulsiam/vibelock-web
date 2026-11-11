import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <Section
      role="status"
      aria-label="Loading shopping cart"
      className="relative z-10 min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 xl:pt-32"
    >
      <Container className="max-w-6xl">
        {/* ── Top Bar Skeleton ── */}
        <div className="border-vl-dark-100 mb-6 flex items-baseline justify-between border-b pb-4 sm:mb-8">
          <div className="flex items-baseline gap-2.5">
            <Skeleton className="bg-vl-dark-900/10 h-6 w-28 sm:h-7 sm:w-36" />
            <Skeleton className="bg-vl-dark-900/8 h-4 w-8 font-mono" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-4 w-32" />
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-14">
          {/* Left Column: Cart Item Skeletons */}
          <div className="divide-vl-dark-100 border-vl-dark-100 min-w-0 divide-y border-t">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="border-vl-dark-100 flex gap-4 border-b py-6 last:border-b-0 sm:gap-6"
              >
                {/* Image Skeleton */}
                <Skeleton className="border-vl-dark-100 bg-vl-dark/10 relative aspect-3/4 w-16 shrink-0 sm:w-20" />

                {/* Details Column */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 sm:w-1/2" />
                        <Skeleton className="bg-vl-dark-900/8 h-3 w-32" />
                      </div>
                      <Skeleton className="bg-vl-dark-900/10 h-4 w-20 shrink-0" />
                    </div>
                  </div>

                  {/* Stepper + Action */}
                  <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                    <Skeleton className="border-vl-dark-200 h-8 w-24 border bg-white" />
                    <Skeleton className="bg-vl-dark-900/8 h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Order Summary Skeleton */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="border-vl-dark-100 bg-vl-white-50/70 border p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] sm:p-7">
              {/* Header */}
              <div className="border-vl-dark-100 flex items-center justify-between border-b pb-4">
                <Skeleton className="bg-vl-dark-900/10 h-4 w-28" />
                <Skeleton className="bg-vl-dark-900/8 h-3 w-12" />
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3.5 py-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-28" />
                </div>
              </div>

              {/* Total Row */}
              <div className="border-vl-dark-200 border-t pt-4">
                <div className="flex items-baseline justify-between">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-12" />
                  <Skeleton className="bg-vl-dark-900/10 h-7 w-28" />
                </div>
              </div>

              {/* Checkout Button Skeleton */}
              <Skeleton className="bg-vl-dark-900/15 mt-5 h-12 w-full rounded-none" />

              {/* COD Badge Skeleton */}
              <Skeleton className="bg-vl-dark-900/10 mt-3.5 h-6 w-full rounded-sm" />

              {/* Trust Features */}
              <div className="border-vl-dark-100 mt-6 space-y-2.5 border-t pt-5">
                <Skeleton className="bg-vl-dark-900/8 h-3.5 w-44" />
                <Skeleton className="bg-vl-dark-900/8 h-3.5 w-52" />
                <Skeleton className="bg-vl-dark-900/8 h-3.5 w-40" />
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
