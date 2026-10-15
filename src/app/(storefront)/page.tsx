import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowDownRight, ArrowRight, Headphones, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ProductCard } from "@/components/storefront/product-card";
import { getCategories, getPublishedProducts } from "@/lib/catalog/queries";
import type { ProductSummary } from "@/lib/catalog/types";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Modern Dhaka Streetwear",
  description:
    "Shop VibeLock's modern men's streetwear, everyday essentials, and new arrivals in Bangladesh.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "VibeLock | Modern Dhaka Streetwear",
    description: "Minimal, confident, and made for everyday movement.",
    url: SITE_URL,
  },
};

function toCardProduct(product: ProductSummary) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.minPrice,
    originalPrice: product.hasDiscount ? product.maxPrice : undefined,
    image: product.primaryImage?.url ?? "",
    badge: product.hasDiscount ? { label: "Sale", variant: "sale" as const } : undefined,
  };
}

function ProductSection({
  title,
  description,
  products,
  emptyMessage,
}: {
  title: string;
  description: string;
  products: ProductSummary[];
  emptyMessage: string;
}) {
  return (
    <Section className="py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              VibeLock / 01
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline sm:inline-flex"
          >
            Shop all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={toCardProduct(product)} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </Container>
    </Section>
  );
}

export default async function StorefrontHomePage() {
  const [categories, publishedProducts] = await Promise.all([
    getCategories(),
    getPublishedProducts({ take: 12 }),
  ]);

  const newArrivals = publishedProducts.slice(0, 6);
  const arrivalIds = new Set(newArrivals.map((product) => product.id));
  const featuredProducts = publishedProducts
    .filter((product) => !arrivalIds.has(product.id) && product.hasDiscount)
    .concat(
      publishedProducts.filter((product) => !arrivalIds.has(product.id) && !product.hasDiscount)
    )
    .slice(0, 4);

  return (
    <>
      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#EDE9E0] text-[#101114]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:pl-10 lg:pr-0 xl:pl-16">
          <div className="grid min-h-[460px] items-center lg:min-h-[500px] lg:grid-cols-[1.05fr_0.95fr] xl:min-h-[540px] xl:grid-cols-[1fr_1fr]">
            {/* Left — Text Column */}
            <div className="z-10 flex flex-col justify-center py-10 sm:py-14 lg:py-16 lg:pr-8">
              {/* Eyebrow */}
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#101114]/60 sm:text-[13px]">
                Vibelock Streetwear
              </p>

              {/* Bold Headline */}
              <h1 className="mt-4 text-4xl font-black uppercase leading-[0.92] tracking-tight text-[#101114] sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem]">
                Wear Your<br />
                <span className="text-[#00D9FF]">Vibe</span> Daily
              </h1>

              {/* Supporting Text */}
              <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-[#101114]/70 sm:mt-6 sm:text-base lg:text-lg">
                Premium streetwear for the bold, the real, and the everyday dreamers.
              </p>

              {/* CTA Button */}
              <div className="mt-7 sm:mt-8">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-3 bg-[#101114] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                >
                  <span>SHOP NOW</span>
                  <ArrowRight className="size-4 text-[#00D9FF]" aria-hidden="true" />
                </Link>
              </div>

              {/* Carousel Indicators */}
              <div className="mt-10 flex items-center gap-2 sm:mt-12 lg:mt-14" aria-hidden="true">
                <span className="h-1.5 w-6 rounded-full bg-[#00D9FF]" />
                <span className="h-1.5 w-5 rounded-full bg-[#101114]/25" />
                <span className="h-1.5 w-5 rounded-full bg-[#101114]/25" />
              </div>
            </div>

            {/* Right — Model Graphic Image */}
            <div className="relative flex items-end justify-center self-end lg:justify-end">
              <div className="relative w-full max-w-[560px] lg:max-w-none">
                <Image
                  src="/images/hero/hero-clean.png"
                  alt="VibeLock Streetwear Model"
                  width={550}
                  height={440}
                  priority
                  className="h-auto w-full object-contain [mask-image:linear-gradient(to_right,transparent_0%,black_6%,black_100%)] lg:max-h-[540px] xl:max-h-[580px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Feature Bar ──────────────────────────────── */}
      <section className="border-t border-black/10 bg-[#F2EFE8] py-5 sm:py-6">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0">
            {/* Free Shipping */}
            <div className="flex items-center justify-center gap-3.5 sm:justify-center lg:gap-4">
              <Truck className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#101114] sm:text-sm">
                  FREE SHIPPING
                </p>
                <p className="text-xs text-[#101114]/65">
                  On orders over ৳2000
                </p>
              </div>
            </div>

            {/* Secure Payments */}
            <div className="flex items-center justify-center gap-3.5 border-t border-black/10 pt-4 sm:border-l sm:border-t-0 sm:pt-0 lg:gap-4">
              <ShieldCheck className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#101114] sm:text-sm">
                  SECURE PAYMENTS
                </p>
                <p className="text-xs text-[#101114]/65">
                  100% safe & trusted
                </p>
              </div>
            </div>

            {/* 24/7 Support */}
            <div className="flex items-center justify-center gap-3.5 border-t border-black/10 pt-4 sm:border-l sm:border-t-0 sm:pt-0 lg:gap-4">
              <Headphones className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#101114] sm:text-sm">
                  24/7 SUPPORT
                </p>
                <p className="text-xs text-[#101114]/65">
                  We&apos;re here to help
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <ProductSection
        title="New arrivals"
        description="The latest pieces in the VibeLock rotation."
        products={newArrivals}
        emptyMessage="No products available yet."
      />

      <Section className="bg-[#F3F0E8] py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Find your fit
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Shop by category
              </h2>
            </div>
            <ArrowDownRight className="mb-1 hidden h-6 w-6 sm:block" aria-hidden="true" />
          </div>
          {categories.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group flex min-h-36 flex-col justify-between border border-[#101114]/15 bg-white/55 p-4 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:min-h-48 sm:p-6"
                >
                  <span className="text-xs font-medium text-muted-foreground">0{index + 1}</span>
                  <span className="flex items-center justify-between gap-2 text-lg font-semibold tracking-tight sm:text-2xl">
                    {category.name}
                    <ArrowRight
                      className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-[#101114]/20 px-4 py-12 text-center text-sm text-muted-foreground">
              No categories available yet.
            </div>
          )}
        </Container>
      </Section>

      <ProductSection
        title="Worth a closer look"
        description="More from the current published collection."
        products={featuredProducts}
        emptyMessage="No featured products available yet."
      />

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <Container className="grid gap-6 sm:grid-cols-[0.35fr_1fr] sm:gap-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The VibeLock point of view
          </p>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Wear what feels like you.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              VibeLock is an everyday wardrobe shaped by personal style and city life.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-[#00D9FF] py-14 text-[#101114] sm:py-16">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              Your next everyday favorite
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your rotation.
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#101114] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#101114] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00D9FF]"
          >
            Shop all products <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Container>
      </section>
    </>
  );
}
