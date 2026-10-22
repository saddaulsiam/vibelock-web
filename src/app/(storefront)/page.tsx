import { CollectionBanner } from "@/components/storefront/home/collection-banner";
import { FeaturedCategories } from "@/components/storefront/home/featured-categories";
import { FeaturedProducts } from "@/components/storefront/home/featured-products";
import { HeroSection } from "@/components/storefront/home/hero-section";
import {
  getFeaturedCategories,
  getHeroCategories,
} from "@/components/storefront/home/home-categories";
import { NewArrivals } from "@/components/storefront/home/new-arrivals";
import { Newsletter } from "@/components/storefront/home/newsletter";
import { TrustBenefits } from "@/components/storefront/home/trust-benefits";
import { getCategories, getPublishedProducts } from "@/lib/catalog/queries";
import { SITE_URL } from "@/lib/seo/site";
import type { Metadata } from "next";

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

export default async function StorefrontHomePage() {
  const [categories, publishedProducts] = await Promise.all([
    getCategories(),
    getPublishedProducts({ take: 15 }),
  ]);

  const finalCategories = getFeaturedCategories(categories);
  const { heroCategories, typewriterWords } = getHeroCategories(categories);
  const bestSellers = publishedProducts.slice(0, 5);
  const moreArrivals = publishedProducts.slice(5, 10);

  return (
    <>
      {/* ── 1. Category Hero ────────────────────── */}
      <HeroSection categories={heroCategories} words={typewriterWords} />

      {/* ── 2. Continuous Moving Ticker (Trust & Benefits) ── */}
      <TrustBenefits />

      {/* ── 3. Featured Categories ─────────────────────────────── */}
      <FeaturedCategories categories={finalCategories} />

      {/* ── 4. Featured Products (BEST SELLERS) ────────────────── */}
      <FeaturedProducts bestSellers={bestSellers} />

      {/* ── 5. Collection Banner (BUILT FOR REAL ONES) ─────────── */}
      <CollectionBanner />

      {/* ── 6. Secondary Rotation / More Arrivals ───────────────── */}
      <NewArrivals moreArrivals={moreArrivals} />

      {/* ── 7. Newsletter Signup (STAY IN THE LOOP) ─────────────── */}
      <Newsletter />
    </>
  );
}
