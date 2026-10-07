"use client"; // Error components must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Storefront Error Boundary caught:", error);
  }, [error]);

  return (
    <Container className="py-32 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="space-y-6 max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong!</h1>
        <p className="text-muted-foreground text-lg">
          We encountered an unexpected error while loading this page. Please try again.
        </p>
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} size="lg" className="w-full sm:w-auto">
            Try again
          </Button>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
