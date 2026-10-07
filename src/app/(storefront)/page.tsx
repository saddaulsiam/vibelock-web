import Link from "next/link";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { ProductCard } from "@/components/storefront/product-card";
import { getCategories, getPublishedProducts } from "@/lib/catalog/queries";
import type { ProductSummary } from "@/lib/catalog/types";

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
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p>
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
    .concat(publishedProducts.filter((product) => !arrivalIds.has(product.id) && !product.hasDiscount))
    .slice(0, 4);

  return (
    <>
      <section className="overflow-hidden bg-[#101114] text-[#F3F0E8]">
        <Container className="grid min-h-[32rem] items-center gap-10 py-16 sm:min-h-[38rem] sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#00D9FF]">
              Everyday pieces / Dhaka
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]">
              Built for the <span className="text-[#00D9FF]">city.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/70 sm:text-lg">
              Easy layers and everyday essentials, made to move with you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#00D9FF] px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#00D9FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101114]"
              >
                  Shop all products <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/products?sort=newest"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/35 bg-transparent px-5 text-sm font-semibold text-[#F3F0E8] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101114]"
              >
                Explore new arrivals
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative hidden min-h-[20rem] items-end justify-end lg:flex">
            <span className="absolute right-0 top-0 h-48 w-48 rounded-full border border-white/15" />
            <span className="absolute right-16 top-16 h-48 w-48 rounded-full border border-[#00D9FF]/60" />
            <div className="relative z-10 max-w-xs border-l-2 border-[#00D9FF] py-2 pl-5 text-sm leading-6 text-white/65">
              A considered rotation for the everyday.
            </div>
            <span className="absolute bottom-10 left-4 text-[10rem] font-semibold leading-none tracking-[-0.1em] text-white/[0.04]">
              VL
            </span>
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Find your fit</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shop by category</h2>
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
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">The VibeLock point of view</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Your next everyday favorite</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Find your rotation.</h2>
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
