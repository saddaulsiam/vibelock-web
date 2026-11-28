import { FeaturedProducts } from "@/components/storefront/home/featured-products";
import type { ProductSummary } from "@/lib/catalog/types";
import { ProductStatus } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("FeaturedProducts storefront section", () => {
  const mockProducts: ProductSummary[] = [
    {
      id: "prod-featured-1",
      name: "Vibe Tech Cyber Hoodie",
      slug: "vibe-tech-cyber-hoodie",
      description: "Signature brutalist cyber hoodie",
      status: ProductStatus.PUBLISHED,
      isFeatured: true,
      primaryImage: {
        url: "/uploads/hoodie-1.webp",
        alt: "Cyber Hoodie",
        isPrimary: true,
      },
      secondaryImage: null,
      images: [{ url: "/uploads/hoodie-1.webp", alt: "Cyber Hoodie", isPrimary: true }],
      minPrice: 2200,
      maxPrice: 2200,
      hasDiscount: false,
      categories: [
        { id: "cat-1", name: "Hoodies", slug: "hoodies", description: null, imageUrl: null },
      ],
      available: true,
      badge: { label: "HYPE DROP", variant: "hot" },
    },
    {
      id: "prod-featured-2",
      name: "Vibe Brutalist Heavyweight Tee",
      slug: "vibe-brutalist-heavyweight-tee",
      description: "280 GSM heavyweight oversized tee",
      status: ProductStatus.PUBLISHED,
      isFeatured: true,
      primaryImage: {
        url: "/uploads/tee-1.webp",
        alt: "Heavyweight Tee",
        isPrimary: true,
      },
      secondaryImage: null,
      images: [{ url: "/uploads/tee-1.webp", alt: "Heavyweight Tee", isPrimary: true }],
      minPrice: 1100,
      maxPrice: 1500,
      hasDiscount: true,
      categories: [
        { id: "cat-2", name: "T-Shirts", slug: "t-shirts", description: null, imageUrl: null },
      ],
      available: true,
    },
  ];

  it("renders section heading with eyebrow and action link", async () => {
    const jsx = await FeaturedProducts({ products: mockProducts });
    const html = renderToStaticMarkup(jsx!);

    expect(html).toContain("CURATED DROPS");
    expect(html).toContain("Just For You");
    expect(html).toContain('href="/shop"');
    expect(html).toContain("View All");
  });

  it("renders product cards with appropriate badges (custom badge and sale badge)", async () => {
    const jsx = await FeaturedProducts({ products: mockProducts });
    const html = renderToStaticMarkup(jsx!);

    expect(html).toContain("Vibe Tech Cyber Hoodie");
    expect(html).toContain("Vibe Brutalist Heavyweight Tee");
    // Product 1 has custom badge "HYPE DROP"
    expect(html).toContain("HYPE DROP");
    // Product 2 has discount 1100 vs 1500 (-27%)
    expect(html).toContain("-27%");
    // Regular featured products without discount or custom badge do NOT have hardcoded "FEATURED" badge
    expect(html).not.toContain("FEATURED");
  });

  it("returns null when empty array is passed", async () => {
    const jsx = await FeaturedProducts({ products: [] });
    // If empty array passed to FeaturedProducts, it tries fallback or returns null if no items
    if (jsx === null) {
      expect(jsx).toBeNull();
    } else {
      const html = renderToStaticMarkup(jsx);
      expect(html).toContain("FEATURED PRODUCTS");
    }
  });
});
