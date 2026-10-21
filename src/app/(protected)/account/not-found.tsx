import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export default function AccountNotFound() {
  return (
    <Section className="flex min-h-[60vh] items-center justify-center bg-[#F3F0E8] py-14">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / Account
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            We couldn&apos;t find that account page
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            The order or page may no longer be available.
          </p>
          <Link
            href="/account"
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Account overview <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
