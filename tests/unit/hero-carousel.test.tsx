import { describe, expect, test } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { getHomepageHeroBanners, type HeroBanner } from "@/lib/catalog/hero-banners";

describe("Hero Banners Service", () => {
  test("getHomepageHeroBanners returns active banners sorted by sortOrder", async () => {
    const banners = await getHomepageHeroBanners();
    expect(banners.length).toBeGreaterThanOrEqual(1);

    // Verify all returned banners are active
    banners.forEach((b) => {
      expect(b.isActive).toBe(true);
    });

    // Verify sorted ascending by sortOrder
    for (let i = 1; i < banners.length; i++) {
      expect(banners[i].sortOrder).toBeGreaterThanOrEqual(banners[i - 1].sortOrder);
    }
  });

  test("banners contain required typography and link properties", async () => {
    const banners = await getHomepageHeroBanners();
    const primary = banners[0];
    expect(primary.eyebrow).toBeDefined();
    expect(primary.headline).toBeDefined();
    expect(primary.ctaLabel).toBeDefined();
    expect(primary.ctaUrl).toBeDefined();
    expect(primary.imageUrl).toBeDefined();
  });
});

describe("HeroCarousel Component", () => {
  const sampleBanners: HeroBanner[] = [
    {
      id: "slide-1",
      eyebrow: "Vibelock Streetwear",
      headline: "Wear Your",
      highlightText: "Vibe",
      headlineSuffix: "Daily",
      description: "Premium streetwear for Dhaka.",
      ctaLabel: "SHOP NOW",
      ctaUrl: "/products",
      imageUrl: "/images/hero/hero-clean.png",
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "slide-2",
      eyebrow: "New Drop",
      headline: "Heavyweight",
      highlightText: "Boxy",
      headlineSuffix: "Tees",
      description: "280 GSM cotton.",
      ctaLabel: "EXPLORE TEES",
      ctaUrl: "/category/t-shirts",
      imageUrl: "/images/hero/hero-slide-2.jpg",
      sortOrder: 2,
      isActive: true,
    },
  ];

  test("renders accessible carousel landmark container with proper roles", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(HeroCarousel, { banners: sampleBanners })
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Homepage Hero Streetwear Drops"');
    expect(html).toContain("Vibelock Streetwear");
    expect(html).toContain("Wear Your");
    expect(html).toContain("SHOP NOW");
  });

  test("renders null safely when empty banners array is passed", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(HeroCarousel, { banners: [] })
    );
    expect(html).toBe("");
  });

  test("single banner renders without breaking and hides carousel arrow controls", () => {
    const singleBanner = [sampleBanners[0]];
    const html = ReactDOMServer.renderToString(
      React.createElement(HeroCarousel, { banners: singleBanner })
    );
    expect(html).toContain('role="region"');
    expect(html).toContain("Wear Your");
    // Multi-banner controls (previous slide button) should NOT be rendered
    expect(html).not.toContain('aria-label="Previous slide"');
    expect(html).not.toContain('aria-label="Next slide"');
  });
});
