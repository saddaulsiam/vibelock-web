import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export default function AccountNotFound() {
  return (
    <Section className="bg-vl-white-300 flex min-h-[60vh] items-center justify-center py-14">
      <Container>
        <div className="border-vl-dark-900/10 mx-auto max-w-lg border bg-white px-5 py-12 text-center sm:px-10">
          <p className="text-muted-foreground tracking-streetwear mb-3 text-xs font-semibold uppercase">
            VibeLock / Account
          </p>
          <h1 className="text-vl-dark-900 text-2xl font-semibold tracking-tight sm:text-3xl">
            We couldn&apos;t find that account page
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            The order or page may no longer be available.
          </p>
          <Link
            href="/account"
            className="bg-vl-dark-900 hover:bg-vl-dark-900/85 focus-visible:ring-vl-cyan mt-7 inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Account overview <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
