import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function StorefrontHomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-brand-charcoal text-white overflow-hidden min-h-[70vh] flex items-center">
        {/* Placeholder for future background image or video */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10" />
        <Container className="relative z-20 py-24 md:py-32">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-brand-offwhite">
              Redefining Urban <br />
              <span className="text-brand-cyan">Streetwear.</span>
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-xl text-gray-300">
              Bangladesh&apos;s premium men&apos;s fashion. Minimalist design, confident aesthetics,
              crafted for the modern youth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/collections/new-arrivals">
                <Button size="lg" className="w-full sm:w-auto font-semibold">
                  Shop New Arrivals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/collections/men">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-white border-white hover:bg-white/10 hover:text-white font-semibold"
                >
                  View Collection
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Categories (Placeholder architecture) */}
      <Section className="py-20 bg-background">
        <Container>
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
            <Link
              href="/collections"
              className="text-sm font-medium hover:text-primary hidden sm:block"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category Placeholders */}
            {[
              { title: "Outerwear", href: "/collections/outerwear" },
              { title: "Tees & Polos", href: "/collections/tees" },
              { title: "Bottoms", href: "/collections/bottoms" },
            ].map((cat, i) => (
              <Link
                key={i}
                href={cat.href}
                className="group relative block aspect-[4/5] bg-muted rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <h3 className="text-white text-2xl font-bold tracking-tight">{cat.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* New Arrivals Framework (No real data yet) */}
      <Section className="py-20 bg-brand-offwhite/50">
        <Container>
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tight">New Arrivals</h2>
            <p className="text-muted-foreground max-w-2xl">Fresh drops. Built for the streets.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Product Card Placeholders for Phase 3B */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="group flex flex-col space-y-3">
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative">
                  {/* Image placeholder slot */}
                  <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link href="/collections/new-arrivals">
              <Button variant="outline" size="lg" className="px-8">
                View All New Arrivals
              </Button>
            </Link>
          </div>
        </Container>
      </Section>

      {/* Brand Statement / CTA */}
      <section className="py-24 bg-brand-charcoal text-white text-center">
        <Container className="max-w-4xl space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-brand-offwhite">
            Confidence in every thread.
          </h2>
          <p className="text-lg md:text-xl text-gray-400">
            We believe streetwear is an expression of self. Every piece we create is designed with
            purpose, premium materials, and uncompromised attention to detail.
          </p>
          <div className="pt-4">
            <Link href="/about">
              <Button
                size="lg"
                className="bg-brand-cyan text-brand-charcoal hover:bg-brand-cyan/90 font-bold px-8"
              >
                Our Story
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
