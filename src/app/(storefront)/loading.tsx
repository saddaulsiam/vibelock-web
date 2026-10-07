import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <Container className="py-24 space-y-12">
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4 max-w-2xl" />
        <Skeleton className="h-6 w-full max-w-3xl" />
        <Skeleton className="h-6 w-5/6 max-w-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </Container>
  );
}
