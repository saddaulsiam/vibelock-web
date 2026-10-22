import { BestSellers } from "@/components/storefront/home/best-sellers";
import { CollectionBanner } from "@/components/storefront/home/collection-banner";
import { FeaturedProducts } from "@/components/storefront/home/featured-products";
import { HeroSection } from "@/components/storefront/home/hero-section";
import { NewArrivals } from "@/components/storefront/home/new-arrivals";
import { TrustBenefits } from "@/components/storefront/home/trust-benefits";
import { getBestSellingProducts, getCategories, getPublishedProducts } from "@/lib/catalog/queries";
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
  const [categories, publishedProducts, bestSellingProducts] = await Promise.all([
    getCategories(),
    getPublishedProducts({ take: 24 }),
    getBestSellingProducts({ take: 8 }),
  ]);

  return (
    <>
      {/* ── 1. Category Hero ────────────────────── */}
      <HeroSection categories={categories} />

      {/* ── 2. Continuous Moving Ticker (Trust & Benefits) ── */}
      <TrustBenefits />

      {/* ── 3. New Arrivals ───────────────────────────────── */}
      <NewArrivals products={publishedProducts} />

      {/* ── 4. Best Sellers ─────────────────────────────── */}
      <BestSellers products={bestSellingProducts} />

      {/* ── 6. Collection Banner (BUILT FOR REAL ONES) ─────────── */}
      <CollectionBanner />

      {/* ── 5. Explore Our Catalog (filtered grid) ──────── */}
      <FeaturedProducts products={publishedProducts} categories={categories} />
    </>
  );
}
