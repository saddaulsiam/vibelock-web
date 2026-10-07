import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search } from "lucide-react";

export default function StorefrontNotFound() {
  return (
    <Container className="py-32 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="space-y-6 max-w-md">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-8">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground text-lg">
          We couldn&apos;t find the page you&apos;re looking for. It might have been moved or
          doesn&apos;t exist.
        </p>
        <div className="pt-8">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
