import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Headphones, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { ProductCard } from "@/components/storefront/product-card";
import { getHomepageHeroBanners } from "@/lib/catalog/hero-banners";
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

function getCategoryImageUrl(slug: string, name: string) {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes("t-shirt") || n.includes("t-shirt")) return "/images/categories/cat-t-shirts.jpg";
  if (s.includes("shirt") || n.includes("shirt")) return "/images/categories/cat-shirts.jpg";
  if (s.includes("pant") || n.includes("pant")) return "/images/categories/cat-pants.jpg";
  if (s.includes("short") || n.includes("short")) return "/images/categories/cat-shorts.jpg";
  return "/images/categories/cat-t-shirts.jpg";
}

export default async function StorefrontHomePage() {
  const [categories, publishedProducts, heroBanners] = await Promise.all([
    getCategories(),
    getPublishedProducts({ take: 15 }),
    getHomepageHeroBanners(),
  ]);

  // Clean and filter categories to the 4 core streetwear categories
  const priorityCategoryKeys = ["t-shirt", "shirt", "pant", "short"];
  const displayCategories = categories
    .filter((category) => {
      const slug = category.slug.toLowerCase();
      const name = category.name.toLowerCase();
      // Exclude automated integration test fixtures
      if (name.startsWith("cat-") || name.startsWith("existing") || name.startsWith("new category")) {
        return false;
      }
      return priorityCategoryKeys.some((k) => slug.includes(k) || name.includes(k));
    })
    .slice(0, 4);

  // Fallback to first 4 categories if no priority categories matched
  const finalCategories = displayCategories.length > 0 ? displayCategories : categories.slice(0, 4);

  // Select 5 products for Best Sellers row (matching mockup 5-column layout)
  const bestSellers = publishedProducts.slice(0, 5);
  // Secondary rotation products
  const moreArrivals = publishedProducts.slice(5, 10);

  return (
    <>
      {/* ── 1. Dynamic Hero Carousel ──────────────────────────── */}
      <HeroCarousel banners={heroBanners} />

      {/* ── 2. Trust / Service Benefits Bar ───────────────────── */}
      <section className="border-y border-black/10 bg-[#F0ECE6] py-5 sm:py-6">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-black/10">
            {/* Free Shipping */}
            <div className="flex items-center justify-center gap-3.5 px-4 lg:gap-4">
              <Truck className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#101114] sm:text-sm">
                  FREE SHIPPING
                </p>
                <p className="text-xs text-[#101114]/65">
                  On orders over ৳2000
                </p>
              </div>
            </div>

            {/* Secure Payments */}
            <div className="flex items-center justify-center gap-3.5 px-4 lg:gap-4">
              <ShieldCheck className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#101114] sm:text-sm">
                  SECURE PAYMENTS
                </p>
                <p className="text-xs text-[#101114]/65">
                  100% safe &amp; trusted
                </p>
              </div>
            </div>

            {/* 24/7 Support */}
            <div className="flex items-center justify-center gap-3.5 px-4 lg:gap-4">
              <Headphones className="size-6 shrink-0 text-[#101114] sm:size-7" aria-hidden="true" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#101114] sm:text-sm">
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

      {/* ── 3. Shop by Category (OUR CATEGORIES) ───────────────── */}
      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <Container>
          {/* Header */}
          <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.20em] text-[#00D9FF]">
                SHOP BY CATEGORY
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#101114] sm:text-3xl lg:text-4xl">
                OUR CATEGORIES
              </h2>
            </div>
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#101114] transition-colors hover:text-[#00D9FF] sm:text-sm"
            >
              <span>View All</span>
              <ArrowRight className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          {/* 4 Category Cards */}
          {finalCategories.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {finalCategories.map((category) => {
                const cleanName = category.name.replace(/^\d+[\.\s\-]+/, "").toUpperCase();
                const imageUrl = getCategoryImageUrl(category.slug, category.name);

                return (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xs bg-[#101114] p-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-5"
                  >
                    {/* Category Image */}
                    <Image
                      src={imageUrl}
                      alt={cleanName}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 50vw"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Editorial Gradient Scrim Overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity group-hover:from-black/95"
                      aria-hidden="true"
                    />

                    {/* Bottom Text Content */}
                    <div className="relative z-10 flex flex-col items-start gap-1">
                      <span className="text-base font-black uppercase tracking-wide text-white sm:text-lg">
                        {cleanName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 transition-colors group-hover:text-[#00D9FF]">
                        <span>Shop Now</span>
                        <ArrowRight className="size-3 text-[#00D9FF] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-[#101114]/20 px-4 py-12 text-center text-sm text-muted-foreground">
              No categories available yet.
            </div>
          )}
        </Container>
      </section>

      {/* ── 4. Featured Products (BEST SELLERS) ────────────────── */}
      <section className="border-t border-black/5 bg-[#F8F7F5] py-12 sm:py-16 lg:py-20">
        <Container>
          {/* Header */}
          <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.20em] text-[#00D9FF]">
                FEATURED PRODUCTS
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#101114] sm:text-3xl lg:text-4xl">
                BEST SELLERS
              </h2>
            </div>
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#101114] transition-colors hover:text-[#00D9FF] sm:text-sm"
            >
              <span>View All Products</span>
              <ArrowRight className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          {/* 5-Column Grid */}
          {bestSellers.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={toCardProduct(product)} />
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
              No products available yet.
            </div>
          )}
        </Container>
      </section>

      {/* ── 5. Collection Banner (BUILT FOR REAL ONES) ─────────── */}
      <section className="relative overflow-hidden border-y border-white/10 bg-[#0B0F11] py-12 text-white sm:py-14 lg:py-16">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1.3fr_0.8fr] lg:gap-6">
            {/* Left Column: Typography & Action */}
            <div className="z-10 flex flex-col items-start">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.20em] text-[#00D9FF]">
                THE VIBELOCK COLLECTION
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase leading-[1.0] tracking-tight text-white sm:text-4xl lg:text-5xl">
                BUILT FOR <br />
                <span className="text-[#00D9FF]">REAL ONES</span>
              </h2>
              <p className="mt-4 max-w-sm text-xs font-medium leading-relaxed text-[#F3F0E8]/70 sm:text-sm">
                Streetwear that moves with your story. Crafted for comfort, silhouette, and the streets of Dhaka.
              </p>
              <div className="mt-6 sm:mt-7">
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-transparent px-7 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                >
                  <span>SHOP COLLECTION</span>
                  <ArrowRight className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1 group-hover:text-[#101114]" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Center Column: Streetwear Cutout Graphic */}
            <div className="relative flex items-center justify-center">
              <div className="relative h-44 w-full max-w-sm sm:h-52 lg:h-60">
                <Image
                  src="/images/collection/collection-hoodie.png"
                  alt="VibeLock Collection Feature"
                  fill
                  className="object-contain object-center"
                />
              </div>
            </div>

            {/* Right Column: 3 Accessory Detail Cards */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 lg:justify-end">
              <Link
                href="/products"
                className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
              >
                <Image
                  src="/images/collection/acc-chain.png"
                  alt="VibeLock Signature Chain"
                  fill
                  className="object-cover"
                />
              </Link>
              <Link
                href="/products"
                className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
              >
                <Image
                  src="/images/collection/acc-cap.png"
                  alt="VibeLock Snapback Cap"
                  fill
                  className="object-cover"
                />
              </Link>
              <Link
                href="/products"
                className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
              >
                <Image
                  src="/images/collection/acc-tag.png"
                  alt="VibeLock Editorial Hangtag"
                  fill
                  className="object-cover"
                />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 6. Secondary Rotation / More Arrivals ───────────────── */}
      {moreArrivals.length > 0 && (
        <section className="bg-white py-12 sm:py-16">
          <Container>
            <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.20em] text-[#00D9FF]">
                  EXPLORE THE LINEUP
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#101114] sm:text-3xl">
                  NEW ARRIVALS
                </h2>
              </div>
              <Link
                href="/products?sort=newest"
                className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#101114] transition-colors hover:text-[#00D9FF] sm:text-sm"
              >
                <span>Shop New Drops</span>
                <ArrowRight className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              {moreArrivals.map((product) => (
                <ProductCard key={product.id} product={toCardProduct(product)} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── 7. Newsletter Signup (STAY IN THE LOOP) ─────────────── */}
      <section className="relative border-y border-white/10 bg-[#070B0E] py-10 text-white sm:py-12">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            {/* Left Content */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-[#00D9FF]">
                STAY IN THE LOOP
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white sm:text-2xl lg:text-3xl">
                JOIN OUR NEWSLETTER
              </h2>
              <p className="mt-1 text-xs text-[#F3F0E8]/60">
                Be the first to know about new drops, exclusive offers and more.
              </p>
            </div>

            {/* Right Form with Coming Soon Notice */}
            <div className="flex w-full flex-col items-start gap-1.5 sm:max-w-md md:items-end">
              <div className="flex w-full items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  disabled
                  aria-label="Email address for newsletter"
                  className="h-10 w-full rounded-full border border-white/15 bg-[#1A1D21] px-4 text-xs text-white placeholder:text-[#F3F0E8]/40 focus:outline-none"
                />
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-full bg-[#00D9FF] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#101114] opacity-90 transition-opacity cursor-not-allowed"
                >
                  SUBSCRIBE
                </button>
              </div>
              <span className="text-[10px] text-[#F3F0E8]/45">
                Newsletter subscription launching soon with next seasonal drop.
              </span>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
