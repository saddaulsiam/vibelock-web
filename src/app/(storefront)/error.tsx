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
    <Section className="flex min-h-[65vh] items-center justify-center bg-[#F3F0E8] py-16">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center bg-[#F3F0E8] text-[#101114]">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">VibeLock / Storefront</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">Something went wrong</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            We couldn&apos;t load this page. Please try again.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={reset}
              size="lg"
              className="min-h-11 bg-[#101114] text-white hover:bg-[#101114]/85 focus-visible:ring-[#00D9FF]"
            >
              Try again
            </Button>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              Browse products
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
