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
    <Section className="flex min-h-[75vh] items-center justify-center bg-vl-white-300 pt-24 pb-16 sm:pt-28 sm:pb-20">
      <Container>
        <div className="mx-auto max-w-lg border border-vl-dark-900/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center bg-vl-white-300 text-vl-dark-900">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / Storefront
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-vl-dark-900 sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            We couldn&apos;t load this page. Please try again.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={reset}
              size="lg"
            >
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shop">
                Browse products
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
