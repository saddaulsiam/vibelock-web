import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container>
        {/* Wishlist Header Skeleton */}
        <header className="mb-8 border-b border-[#101114]/10 pb-6 sm:mb-10">
          <Skeleton className="mb-2 h-3.5 w-32 bg-[#101114]/10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-[#101114]/10 sm:h-10 sm:w-60" />
            <Skeleton className="h-4 w-72 bg-[#101114]/10" />
          </div>
        </header>

        {/* Action bar Skeleton */}
        <div className="mb-6 flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Skeleton className="h-4 w-28 bg-[#101114]/10" />
          <Skeleton className="h-4 w-16 bg-[#101114]/10" />
        </div>

        {/* Wishlist Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="aspect-3/4 w-full rounded-2xl bg-[#101114]/10" />
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-3/4 bg-[#101114]/10" />
                <Skeleton className="h-4 w-1/3 bg-[#101114]/10" />
              </div>
              <Skeleton className="h-8 w-full rounded-xl bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
