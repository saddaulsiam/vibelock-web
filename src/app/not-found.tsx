import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] flex-1 items-center justify-center bg-[#F3F0E8] py-16">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">VibeLock / 404</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">Page not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
            >
              Browse products <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              Return home
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
