"use client"; // Error components must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Section } from "@/components/shared/section";

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
    <Section className="bg-vl-white-300 flex min-h-[75vh] items-center justify-center pt-24 pb-16 sm:pt-28 sm:pb-20">
      <Container>
        <div className="border-vl-dark-900/10 mx-auto max-w-lg border bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <div className="bg-vl-white-300 text-vl-dark-900 mx-auto mb-6 flex size-14 items-center justify-center">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground tracking-streetwear mb-2 text-xs font-semibold uppercase">
            VibeLock / Storefront
          </p>
          <h1 className="text-vl-dark-900 text-2xl font-semibold tracking-tight sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            We couldn&apos;t load this page. Please try again.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset} size="lg">
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shop">Browse products</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
