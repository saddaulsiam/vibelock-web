"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Account error boundary caught:", error);
  }, [error]);

  return (
    <Section className="flex min-h-[60vh] items-center justify-center bg-[#F3F0E8] py-14">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10">
          <AlertCircle className="mx-auto mb-5 size-8 text-[#101114]" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight text-[#101114]">
            Account page unavailable
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Please try again, or return to your account overview.
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
              href="/account"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            >
              Account overview
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
