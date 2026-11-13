import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    AUTH_GOOGLE_ID: "mock-google-id",
    AUTH_GOOGLE_SECRET: "mock-google-secret",
    NEXT_PUBLIC_APP_URL: "https://vibelock.bd",
  },
}));

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
  Space_Grotesk: () => ({ variable: "--font-heading" }),
}));

vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      product: {
        findMany: vi.fn(async () => [
          { slug: "heavyweight-tee", updatedAt: new Date("2026-11-01") },
        ]),
      },
      category: {
        findMany: vi.fn(async (query: any) => {
          // If query checks for published products, return only categories with products
          if (query?.where?.products?.some?.status === "PUBLISHED") {
            return [
              { slug: "oversized-t-shirts", updatedAt: new Date("2026-11-01") },
              { slug: "hoodies", updatedAt: new Date("2026-11-01") },
            ];
          }
          return [
            { slug: "oversized-t-shirts", updatedAt: new Date("2026-11-01") },
            { slug: "hoodies", updatedAt: new Date("2026-11-01") },
            { slug: "pants", updatedAt: new Date("2026-11-01") },
            { slug: "shirts", updatedAt: new Date("2026-11-01") },
            { slug: "accessories", updatedAt: new Date("2026-11-01") },
          ];
        }),
      },
    },
  };
});

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { HeroSection } from "@/components/storefront/home/hero-section";
import { Footer } from "@/components/storefront/layout/footer";
import { metadata as rootMetadata } from "@/app/layout";
import { generateMetadata as generateProductMetadata } from "@/app/(storefront)/product/[slug]/page";
import sitemap from "@/app/sitemap";
import nextConfig from "@/../next.config";

import { metadata as aboutMetadata } from "@/app/(storefront)/about/page";
import { metadata as contactMetadata } from "@/app/(storefront)/contact/page";
import { metadata as faqMetadata } from "@/app/(storefront)/faq/page";
import { metadata as privacyMetadata } from "@/app/(storefront)/privacy/page";
import { metadata as termsMetadata } from "@/app/(storefront)/terms/page";
import { metadata as shippingMetadata } from "@/app/(storefront)/shipping-policy/page";
import { metadata as returnMetadata } from "@/app/(storefront)/return-policy/page";
import { metadata as shopMetadata } from "@/app/(storefront)/shop/page";
import { metadata as cartMetadata } from "@/app/(storefront)/cart/page";
import { metadata as checkoutMetadata } from "@/app/(storefront)/checkout/page";
import { metadata as wishlistMetadata } from "@/app/(storefront)/wishlist/page";
import { metadata as orderSuccessMetadata } from "@/app/(storefront)/order-success/[orderNumber]/page";

vi.mock("@/lib/catalog/queries", () => ({
  getProductBySlug: vi.fn(async (slug: string) => {
    if (slug === "non-existent") return null;
    return {
      id: "prod-1",
      name: "Cyber Heavyweight Tee",
      slug,
      description: "Cyber heavyweight streetwear tee",
      images: [{ url: "/images/tee.jpg", isPrimary: true }],
    };
  }),
  getRelatedProducts: vi.fn(async () => []),
}));

vi.mock("@/lib/reviews/queries", () => ({
  getProductReviews: vi.fn(async () => ({ reviews: [], summary: {} })),
  getUserReviewEligibility: vi.fn(async () => ({ canReview: false })),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

describe("Phase 1 SEO: HeroSection Initial SSR H1", () => {
  it("renders non-empty initial H1 in server-side render output", () => {
    const mockCategories = [
      {
        id: "cat-1",
        name: "OVERSIZED T-SHIRTS",
        slug: "oversized-t-shirts",
        imageUrl: "/cat.jpg",
        description: null,
      },
      { id: "cat-2", name: "HOODIES", slug: "hoodies", imageUrl: "/cat2.jpg", description: null },
    ];

    const html = renderToStaticMarkup(<HeroSection categories={mockCategories} />);

    // Initial SSR H1 must contain the first word "OVERSIZED T-SHIRTS"
    expect(html).toContain("OVERSIZED T-SHIRTS");
    expect(html).toMatch(/<h1[^>]*>OVERSIZED T-SHIRTS<span/);
  });

  it("renders fallback word in initial H1 when no categories provided", () => {
    const html = renderToStaticMarkup(<HeroSection categories={[]} />);

    expect(html).toContain("STREETWEAR");
    expect(html).toMatch(/<h1[^>]*>STREETWEAR<span/);
  });
});

describe("Phase 1 SEO: Root Metadata", () => {
  it("does not define root alternates.canonical so sub-pages do not inherit homepage canonical", () => {
    expect(rootMetadata.alternates).toBeUndefined();
    expect(rootMetadata.metadataBase).toBeDefined();
    expect(rootMetadata.metadataBase?.toString()).toContain("vibelock.bd");
  });
});

describe("Phase 1 SEO: Product Metadata Canonical", () => {
  it("generates canonical and openGraph pointing to /product/[slug], never /shop/, across multiple slugs", async () => {
    const testSlugs = [
      "cyber-heavyweight-tee",
      "oversized-hoodie-black",
      "vintage-denim-jacket",
      "streetwear-cap-raw",
    ];

    for (const slug of testSlugs) {
      const metadata = await generateProductMetadata({
        params: Promise.resolve({ slug }),
      });

      expect(metadata.alternates?.canonical).toBe(`https://vibelock.bd/product/${slug}`);
      expect(metadata.openGraph?.url).toBe(`https://vibelock.bd/product/${slug}`);
      expect(metadata.alternates?.canonical).not.toContain("/shop/");
      expect(metadata.openGraph?.url).not.toContain("/shop/");
    }
  });
});

describe("Phase 1 SEO: Sitemap Generation", () => {
  it("excludes empty categories and keeps valid pages intact", async () => {
    const sitemapEntries = await sitemap();
    const urls = sitemapEntries.map((e) => e.url);

    // Static pages
    expect(urls).toContain("https://vibelock.bd");
    expect(urls).toContain("https://vibelock.bd/shop");
    expect(urls).toContain("https://vibelock.bd/about");
    expect(urls).toContain("https://vibelock.bd/contact");

    // Product pages
    expect(urls).toContain("https://vibelock.bd/product/heavyweight-tee");

    // Populated category pages
    expect(urls).toContain("https://vibelock.bd/category/oversized-t-shirts");
    expect(urls).toContain("https://vibelock.bd/category/hoodies");

    // Empty categories must NOT be present
    expect(urls).not.toContain("https://vibelock.bd/category/pants");
    expect(urls).not.toContain("https://vibelock.bd/category/shirts");
    expect(urls).not.toContain("https://vibelock.bd/category/accessories");

    // Canonical privacy route in sitemap, NOT obsolete privacy-policy
    expect(urls).toContain("https://vibelock.bd/privacy");
    expect(urls).not.toContain("https://vibelock.bd/privacy-policy");
  });
});

describe("Phase 2 SEO: Internal Linking to /about and /contact", () => {
  it("renders crawlable links to /about and /contact in footer", () => {
    const html = renderToStaticMarkup(<Footer />);

    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/privacy"');
  });
});

describe("Phase 2 SEO: Page Title Deduplication", () => {
  it("ensures public storefront pages do not duplicate '| VibeLock'", () => {
    const pages = [
      { name: "About", title: aboutMetadata.title },
      { name: "Contact", title: contactMetadata.title },
      { name: "FAQ", title: faqMetadata.title },
      { name: "Privacy", title: privacyMetadata.title },
      { name: "Terms", title: termsMetadata.title },
      { name: "Shipping", title: shippingMetadata.title },
      { name: "Return", title: returnMetadata.title },
      { name: "Shop", title: shopMetadata.title },
      { name: "Cart", title: cartMetadata.title },
      { name: "Checkout", title: checkoutMetadata.title },
      { name: "Wishlist", title: wishlistMetadata.title },
      { name: "OrderSuccess", title: orderSuccessMetadata.title },
    ];

    for (const page of pages) {
      const titleStr = String(page.title);
      expect(
        titleStr.endsWith("| VibeLock") || titleStr.includes("| VibeLock |"),
        `Page ${page.name} title "${titleStr}" contains redundant '| VibeLock'`
      ).toBe(false);
    }
  });
});

describe("Phase 2 SEO: Legacy Redirects Configuration", () => {
  it("defines permanent 308 redirects for confirmed obsolete routes", async () => {
    expect(nextConfig.redirects).toBeDefined();
    const redirects = await (nextConfig.redirects as () => Promise<any[]>)();

    const redirectMap = new Map(redirects.map((r: any) => [r.source, r]));

    // /privacy-policy -> /privacy
    expect(redirectMap.has("/privacy-policy")).toBe(true);
    expect(redirectMap.get("/privacy-policy")?.destination).toBe("/privacy");
    expect(redirectMap.get("/privacy-policy")?.permanent).toBe(true);

    // /products -> /shop
    expect(redirectMap.has("/products")).toBe(true);
    expect(redirectMap.get("/products")?.destination).toBe("/shop");
    expect(redirectMap.get("/products")?.permanent).toBe(true);

    // /products/:slug -> /product/:slug
    expect(redirectMap.has("/products/:slug")).toBe(true);
    expect(redirectMap.get("/products/:slug")?.destination).toBe("/product/:slug");
    expect(redirectMap.get("/products/:slug")?.permanent).toBe(true);

    // /search -> /shop
    expect(redirectMap.has("/search")).toBe(true);
    expect(redirectMap.get("/search")?.destination).toBe("/shop");
    expect(redirectMap.get("/search")?.permanent).toBe(true);
  });
});
