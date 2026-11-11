import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <Section
      role="status"
      aria-label="Loading checkout"
      className="relative z-10 min-h-screen bg-white pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 xl:pt-32"
    >
      <Container className="max-w-6xl">
        {/* ── Clean & Minimal Top Bar Skeleton (Matching Checkout Page) ── */}
        <div className="border-vl-dark-100 mb-6 flex items-baseline justify-between border-b pb-4 sm:mb-8">
          <div className="flex items-baseline gap-2.5">
            <Skeleton className="bg-vl-dark-900/10 h-6 w-28 sm:h-7 sm:w-36" />
            <Skeleton className="bg-vl-dark-900/8 font-mono h-4 w-8" />
          </div>
          <Skeleton className="bg-vl-dark-900/8 h-4 w-28" />
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
          {/* Left Column: Form Cards Skeleton */}
          <div className="min-w-0 space-y-7">
            {/* Card 1: Delivery Details */}
            <div className="border-border bg-background rounded-xs border p-5 sm:p-6">
              <div className="border-border flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="bg-vl-dark-900/15 size-6 rounded-full" />
                  <Skeleton className="bg-vl-dark-900/10 h-5 w-36" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-4 w-32" />
              </div>

              <div className="mt-5 space-y-4">
                {/* Row 1: Full Name & Mobile Number */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-20" />
                    <Skeleton className="bg-vl-dark-900/6 h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
                    <Skeleton className="bg-vl-dark-900/6 h-10 w-full rounded-md" />
                  </div>
                </div>

                {/* Row 2: Delivery Address (Textarea) */}
                <div className="space-y-1.5">
                  <Skeleton className="bg-vl-dark-900/8 h-3 w-24" />
                  <Skeleton className="bg-vl-dark-900/6 h-16 w-full rounded-md" />
                </div>

                {/* Row 3: Country & Delivery District */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                    <Skeleton className="bg-vl-dark-900/6 h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="bg-vl-dark-900/8 h-3 w-28" />
                    <Skeleton className="bg-vl-dark-900/6 h-10 w-full rounded-md" />
                  </div>
                </div>

                {/* Optional Links Skeleton */}
                <div className="flex items-center gap-4 pt-1">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-44" />
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-36" />
                </div>
              </div>
            </div>

            {/* Card 2: Payment Method */}
            <div className="border-border bg-background rounded-xs border p-5 sm:p-6">
              <div className="border-border flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="bg-vl-dark-900/15 size-6 rounded-full" />
                  <Skeleton className="bg-vl-dark-900/10 h-5 w-36" />
                </div>
                <Skeleton className="bg-vl-dark-900/8 h-4 w-32" />
              </div>

              {/* Payment Selectable Cards */}
              <div className="mt-5 space-y-3">
                <Skeleton className="border-border bg-vl-white-100/50 h-20 w-full rounded-xs border" />
                <Skeleton className="border-border bg-vl-white-100/50 h-20 w-full rounded-xs border" />
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar Skeleton */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="border-border bg-background rounded-xs border p-5 sm:p-6">
              {/* Summary Header */}
              <div className="border-border flex items-center justify-between border-b pb-2.5">
                <Skeleton className="bg-vl-dark-900/10 h-5 w-32" />
                <Skeleton className="bg-vl-dark-900/8 font-mono h-3.5 w-14" />
              </div>

              {/* Items List (matching CheckoutSummaryItem) */}
              <div className="space-y-3 py-2">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="border-border grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b py-3.5 last:border-b-0"
                  >
                    <Skeleton className="bg-vl-white-200 relative aspect-3/4 w-[3.75rem] shrink-0 overflow-hidden rounded-xs" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="bg-vl-dark-900/10 h-3.5 w-3/4" />
                      <Skeleton className="bg-vl-dark-900/8 h-3 w-1/2" />
                      <Skeleton className="bg-vl-dark-900/8 h-3 w-16" />
                    </div>
                    <Skeleton className="bg-vl-dark-900/10 h-3.5 w-14 shrink-0" />
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="border-border border-t py-3.5">
                <Skeleton className="bg-vl-dark-900/8 mb-2 h-3 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="bg-vl-dark-900/6 h-9 flex-1 rounded-md" />
                  <Skeleton className="bg-vl-dark-900/10 h-9 w-16 rounded-md" />
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border-border space-y-2.5 border-t py-3.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
                  <Skeleton className="bg-vl-dark-900/10 h-3.5 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-16" />
                  <Skeleton className="bg-vl-dark-900/8 h-3.5 w-24" />
                </div>
              </div>

              {/* Total to Pay */}
              <div className="border-border border-t pt-3.5">
                <div className="flex items-baseline justify-between">
                  <Skeleton className="bg-vl-dark-900/10 h-4 w-24" />
                  <Skeleton className="bg-vl-dark-900/10 h-6 w-28" />
                </div>
              </div>

              {/* Primary Action Button */}
              <Skeleton className="bg-vl-dark-900/15 mt-5 h-12 w-full rounded-none" />

              {/* Microcopy Note under Button */}
              <Skeleton className="bg-vl-dark-900/8 mx-auto mt-2.5 h-3 w-48" />
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
