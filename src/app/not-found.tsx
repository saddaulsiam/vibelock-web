import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] flex-1 items-center justify-center bg-[#F3F0E8] py-16">
      <Container>
        <div className="mx-auto max-w-lg border border-[#101114]/10 bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / 404
          </p>
          <h1 className="font-heading text-3xl font-black tracking-tight text-vl-black sm:text-4xl">
            Page not found
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xs bg-vl-black px-5 font-heading text-sm font-black tracking-widest text-vl-white uppercase transition-colors hover:bg-vl-black/85 focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Browse products <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center border border-vl-black/20 px-5 font-heading text-sm font-black tracking-widest text-vl-black uppercase transition-colors hover:bg-vl-white focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none"
            >
              Return home
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
