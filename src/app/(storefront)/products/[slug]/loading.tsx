import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <Section className="py-8 bg-background min-h-screen">
      <Container>
        {/* Breadcrumbs Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column: Image Gallery Skeleton */}
          <div className="w-full flex flex-col-reverse md:flex-row gap-4 md:gap-6">
            <div className="flex md:flex-col gap-4 shrink-0">
              <Skeleton className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg" />
              <Skeleton className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg hidden md:block" />
              <Skeleton className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg hidden md:block" />
            </div>
            <Skeleton className="w-full aspect-[3/4] md:aspect-auto md:h-[600px] rounded-xl flex-1" />
          </div>

          {/* Right Column: Details Skeleton */}
          <div className="w-full flex flex-col pt-2 lg:pt-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-10 w-3/4 mb-8" />

            <div className="space-y-4 mb-8">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-24" />
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
