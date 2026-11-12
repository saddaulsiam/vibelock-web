import { Container } from "@/components/shared/container";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";

export default function StorefrontNotFound() {
  return (
    <Section className="bg-vl-white-300 flex min-h-[75vh] items-center justify-center pt-24 pb-16 sm:pt-28 sm:pb-20">
      <Container>
        <div className="border-vl-dark-900/10 mx-auto max-w-lg border bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <div className="bg-vl-white-300 text-vl-dark-900 mx-auto mb-6 flex size-14 items-center justify-center">
            <Search className="size-7" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground tracking-streetwear mb-2 text-xs font-semibold uppercase">
            VibeLock / Storefront
          </p>
          <h1 className="text-vl-dark-900 text-3xl font-semibold tracking-tight sm:text-4xl">
            Page not found
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            We couldn&apos;t find the page you&apos;re looking for.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/shop">
                Browse products <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
