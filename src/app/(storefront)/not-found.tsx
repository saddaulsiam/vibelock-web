import { Container } from "@/components/shared/container";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Section } from "@/components/shared/section";

export default function StorefrontNotFound() {
  return (
    <Section className="flex min-h-[75vh] items-center justify-center bg-[#F3F0E8] pt-24 pb-16 sm:pt-28 sm:pb-20">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center bg-[#F3F0E8] text-[#101114]">
            <Search className="size-7" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / Storefront
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
            Page not found
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            We couldn&apos;t find the page you&apos;re looking for.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Browse products <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            >
              Return home
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
