import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <Section className="bg-vl-white-300 flex min-h-[70vh] flex-1 items-center justify-center py-16">
      <Container>
        <div className="border-vl-dark-900/10 mx-auto max-w-lg border bg-white px-5 py-12 text-center sm:px-10 sm:py-14">
          <p className="text-muted-foreground tracking-streetwear mb-3 text-xs font-semibold uppercase">
            VibeLock / 404
          </p>
          <h1 className="font-heading text-vl-black text-3xl font-black tracking-tight sm:text-4xl">
            Page not found
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-6 sm:text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
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
