import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <Section role="status" aria-label="Loading account" className="min-h-[60vh] bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-5xl">
        <div className="mb-8 border-b border-[#101114]/10 pb-6">
          <Skeleton className="mb-3 h-3 w-28 bg-[#101114]/10" />
          <Skeleton className="h-9 w-56 bg-[#101114]/10" />
          <Skeleton className="mt-3 h-5 w-full max-w-md bg-[#101114]/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {[0, 1].map((item) => (
            <div key={item} className="space-y-4 border border-[#101114]/10 bg-white p-5 sm:p-6">
              <Skeleton className="size-6 bg-[#101114]/10" />
              <Skeleton className="h-6 w-40 bg-[#101114]/10" />
              <Skeleton className="h-4 w-full max-w-xs bg-[#101114]/10" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
