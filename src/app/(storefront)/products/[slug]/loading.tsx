import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <Section role="status" aria-label="Loading product details" className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container>
        {/* Breadcrumbs Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column: Image Gallery Skeleton */}
          <div className="w-full min-w-0">
            <Skeleton className="aspect-[3/4] w-full rounded-sm bg-white" />
            <div className="mt-3 flex gap-3 overflow-hidden">
              <Skeleton className="aspect-[3/4] w-16 shrink-0 rounded-sm bg-white sm:w-20" />
              <Skeleton className="aspect-[3/4] w-16 shrink-0 rounded-sm bg-white sm:w-20" />
              <Skeleton className="aspect-[3/4] w-16 shrink-0 rounded-sm bg-white sm:w-20" />
            </div>
          </div>

          {/* Right Column: Details Skeleton */}
          <div className="w-full min-w-0 pt-2 lg:pt-6">
            <Skeleton className="mb-4 h-4 w-24 bg-[#101114]/10" />
            <Skeleton className="mb-8 h-10 w-3/4 bg-[#101114]/10" />

            <div className="space-y-4 mb-8">
              <Skeleton className="h-8 w-32 bg-[#101114]/10" />
              <Skeleton className="h-6 w-24 bg-[#101114]/10" />
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 w-16" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-12" />
                  <Skeleton className="h-10 w-12" />
                  <Skeleton className="h-10 w-12" />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t">
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>

            <div className="mt-12 pt-8 border-t space-y-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
