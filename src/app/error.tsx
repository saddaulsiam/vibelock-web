"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <Section className="flex min-h-[70vh] flex-1 items-center justify-center bg-[#F3F0E8] py-16">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / Error
          </p>
          <h1 className="font-heading text-vl-black text-2xl font-black tracking-tight sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            We couldn&apos;t load this page. Please try again.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={reset}
              size="lg"
              className="bg-vl-black font-heading text-vl-white hover:bg-vl-black/85 focus-visible:ring-vl-cyan min-h-11 rounded-xs font-black tracking-widest uppercase"
            >
              Try again
            </Button>
            <Link
              href="/products"
              className="border-vl-black/20 font-heading text-vl-black hover:bg-vl-white focus-visible:ring-vl-cyan inline-flex min-h-11 items-center justify-center border px-5 text-sm font-black tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Browse products
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
