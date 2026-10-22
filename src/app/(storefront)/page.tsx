import { Container } from "@/components/shared/container";
import { HeroSection } from "@/components/storefront/hero-section";
import { StorefrontNewsletterForm } from "@/components/storefront/newsletter-form";
import { ProductCard } from "@/components/storefront/product-card";
import { getCategories, getPublishedProducts } from "@/lib/catalog/queries";
import type { ProductSummary } from "@/lib/catalog/types";
import { SITE_URL } from "@/lib/seo/site";
import {
  ArrowRight,
  Headphones,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const TRUST_BENEFITS = [
  { icon: Truck, label: "FREE SHIPPING OVER ৳2000" },
  { icon: ShieldCheck, label: "100% SECURE PAYMENTS" },
  { icon: Headphones, label: "24/7 DEDICATED SUPPORT" },
  { icon: PackageCheck, label: "CASH ON DELIVERY AVAILABLE" },
  { icon: Sparkles, label: "100% AUTHENTIC QUALITY" },
  { icon: RotateCcw, label: "EASY 7-DAY RETURN POLICY" },
];

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

function toHeroCategory(
  category: { id: string; name: string; slug: string; imageUrl?: string | null },
  index: number
) {
  const cleanName = category.name.replace(/^\d+[.\s-]+/, "").toUpperCase();
  return {
    id: category.id,
    label: `CAT. ${String(index + 1).padStart(2, "0")}`,
    name: cleanName,
    slug: category.slug,
    imageUrl: category.imageUrl || getCategoryImageUrl(category.slug, category.name),
  };
}

export default async function StorefrontHomePage() {
  const [categories, publishedProducts] = await Promise.all([
    getCategories(),
    getPublishedProducts({ take: 15 }),
  ]);

  // Clean and filter categories to the 4 core streetwear categories
  const priorityCategoryKeys = ["t-shirt", "shirt", "pant", "short"];
  const displayCategories = categories
    .filter((category) => {
      const slug = category.slug.toLowerCase();
      const name = category.name.toLowerCase();
      // Exclude automated integration test fixtures
      if (
        name.startsWith("cat-") ||
        name.startsWith("existing") ||
        name.startsWith("new category")
      ) {
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

  // Map all real categories to hero cards (filter out test fixtures)
  const heroCategories = categories
    .filter((c) => {
      const n = c.name.toLowerCase();
      return !n.startsWith("cat-") && !n.startsWith("existing") && !n.startsWith("new category");
    })
    .map(toHeroCategory);

  const fallbackHeroCategories = [
    {
      id: "cat-fb-1",
      label: "CAT. 01",
      name: "T-SHIRTS",
      slug: "t-shirts",
      imageUrl: "/images/categories/cat-t-shirts.jpg",
    },
    {
      id: "cat-fb-2",
      label: "CAT. 02",
      name: "PANTS",
      slug: "pants",
      imageUrl: "/images/categories/cat-pants.jpg",
    },
    {
      id: "cat-fb-3",
      label: "CAT. 03",
      name: "SHIRTS",
      slug: "shirts",
      imageUrl: "/images/categories/cat-shirts.jpg",
    },
    {
      id: "cat-fb-4",
      label: "CAT. 04",
      name: "SHORTS",
      slug: "shorts",
      imageUrl: "/images/categories/cat-shorts.jpg",
    },
  ];

  const finalHeroCategories =
    heroCategories.length > 0 ? heroCategories : fallbackHeroCategories;

  // Typewriter words — category names, always have at least one
  const typewriterWords = finalHeroCategories.map((c) => c.name);

  return (
    <>
      {/* ── 1. Errumbd-style Category Hero ────────────────────── */}
      <HeroSection categories={finalHeroCategories} words={typewriterWords} />

      {/* ── 2. Errumbd-style Continuous Moving Ticker (Trust & Benefits) ── */}
      <section
        className="w-full max-w-full overflow-hidden border-y border-black bg-[#00D9FF] py-3 text-[#080A0C] select-none"
        aria-label="VibeLock Trust and Service Benefits"
      >
        <div className="animate-marquee flex w-max items-center text-xs font-black tracking-[0.2em] whitespace-nowrap uppercase hover:[animation-play-state:paused] sm:text-sm">
          {/* Track 1 */}
          <div className="flex shrink-0 items-center">
            {TRUST_BENEFITS.concat(TRUST_BENEFITS).map((item, idx) => (
              <span key={`t1-${idx}`} className="inline-flex items-center">
                <span className="mx-4 text-xs select-none sm:mx-6 sm:text-sm" aria-hidden="true">
                  ✦
                </span>
                <span className="inline-flex items-center gap-2">
                  <item.icon
                    className="size-4 shrink-0 stroke-[2.25] sm:size-4.5"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </span>
              </span>
            ))}
          </div>

          {/* Track 2 (Duplicate for seamless loop) */}
          <div className="flex shrink-0 items-center" aria-hidden="true">
            {TRUST_BENEFITS.concat(TRUST_BENEFITS).map((item, idx) => (
              <span key={`t2-${idx}`} className="inline-flex items-center">
                <span className="mx-4 text-xs select-none sm:mx-6 sm:text-sm">✦</span>
                <span className="inline-flex items-center gap-2">
                  <item.icon className="size-4 shrink-0 stroke-[2.25] sm:size-4.5" />
                  <span>{item.label}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Shop by Category (OUR CATEGORIES) ───────────────── */}
      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <Container>
          {/* Header */}
          <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                SHOP BY CATEGORY
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl lg:text-4xl">
                OUR CATEGORIES
              </h2>
            </div>
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
            >
              <span>View All</span>
              <ArrowRight
                className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
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
                    className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xs bg-[#101114] p-4 text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:p-5"
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
                      <span className="text-base font-black tracking-wide text-white uppercase sm:text-lg">
                        {cleanName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 transition-colors group-hover:text-[#00D9FF]">
                        <span>Shop Now</span>
                        <ArrowRight
                          className="size-3 text-[#00D9FF] transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground rounded-sm border border-dashed border-[#101114]/20 px-4 py-12 text-center text-sm">
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
              <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                FEATURED PRODUCTS
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl lg:text-4xl">
                BEST SELLERS
              </h2>
            </div>
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
            >
              <span>View All Products</span>
              <ArrowRight
                className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
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
            <div className="border-border text-muted-foreground rounded-sm border border-dashed px-4 py-14 text-center text-sm">
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
              <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                THE VIBELOCK COLLECTION
              </p>
              <h2 className="mt-2 text-3xl leading-[1.0] font-black tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
                BUILT FOR <br />
                <span className="text-[#00D9FF]">REAL ONES</span>
              </h2>
              <p className="mt-4 max-w-sm text-xs leading-relaxed font-medium text-[#F3F0E8]/70 sm:text-sm">
                Streetwear that moves with your story. Crafted for comfort, silhouette, and the
                streets of Dhaka.
              </p>
              <div className="mt-6 sm:mt-7">
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-transparent px-7 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <span>SHOP COLLECTION</span>
                  <ArrowRight
                    className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1 group-hover:text-[#101114]"
                    aria-hidden="true"
                  />
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
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 384px, 400px"
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
                  sizes="96px"
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
                  sizes="96px"
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
                  sizes="96px"
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
                <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                  EXPLORE THE LINEUP
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl">
                  NEW ARRIVALS
                </h2>
              </div>
              <Link
                href="/products?sort=newest"
                className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
              >
                <span>Shop New Drops</span>
                <ArrowRight
                  className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
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
              <p className="text-[10px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
                STAY IN THE LOOP
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white uppercase sm:text-2xl lg:text-3xl">
                JOIN OUR NEWSLETTER
              </h2>
              <p className="mt-1 text-xs text-[#F3F0E8]/60">
                Be the first to know about new drops, exclusive offers and more.
              </p>
            </div>

            {/* Right Newsletter Subscription Form */}
            <StorefrontNewsletterForm />
          </div>
        </Container>
      </section>
    </>
  );
}
