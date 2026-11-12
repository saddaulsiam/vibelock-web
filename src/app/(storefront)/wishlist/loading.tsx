import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <Section className="bg-background min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16">
      <Container>
        {/* Wishlist Header Skeleton */}
        <header className="border-vl-dark-900/10 mb-8 border-b pb-6 sm:mb-10">
          <Skeleton className="bg-vl-dark-900/10 mb-2 h-3.5 w-32" />
          <div className="space-y-2">
            <Skeleton className="bg-vl-dark-900/10 h-8 w-48 sm:h-10 sm:w-60" />
            <Skeleton className="bg-vl-dark-900/10 h-4 w-72" />
          </div>
        </header>

        {/* Action bar Skeleton */}
        <div className="border-vl-dark-900/10 mb-6 flex items-center justify-between border-b pb-4">
          <Skeleton className="bg-vl-dark-900/10 h-4 w-28" />
          <Skeleton className="bg-vl-dark-900/10 h-4 w-16" />
        </div>

        {/* Wishlist Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="bg-vl-dark-900/10 aspect-3/4 w-full rounded-2xl" />
              <div className="space-y-1.5 pt-1">
                <Skeleton className="bg-vl-dark-900/10 h-3.5 w-3/4" />
                <Skeleton className="bg-vl-dark-900/10 h-4 w-1/3" />
              </div>
              <Skeleton className="bg-vl-dark-900/10 h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
