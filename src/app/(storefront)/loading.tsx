import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <Section role="status" aria-label="Loading storefront" className="min-h-[70vh] bg-[#F3F0E8] py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mb-8 space-y-4 border-b border-[#101114]/10 pb-7 sm:mb-10">
          <Skeleton className="h-3 w-28 bg-[#101114]/10" />
          <Skeleton className="h-10 w-3/4 max-w-xl bg-[#101114]/10 sm:h-12" />
          <Skeleton className="h-5 w-full max-w-2xl bg-[#101114]/10" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full rounded-sm bg-white" />
              <Skeleton className="h-4 w-3/4 bg-[#101114]/10" />
              <Skeleton className="h-4 w-1/3 bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
