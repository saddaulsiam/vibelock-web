import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductBadge } from "@/components/storefront/catalog/product-badge";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { NewArrivals } from "@/components/storefront/home/new-arrivals";
import { ProductStatus } from "@prisma/client";

describe("Option A (Elevated): Streetwear Brutalist ProductBadge with Distinct Colors", () => {
  it("renders Option A brutalist architectural box structure", () => {
    const html = renderToStaticMarkup(<ProductBadge label="NEW DROP" variant="new" />);

    // Brutalist micro-radius, signature cyan background and technical mono font
    expect(html).toContain("rounded-2xs");
    expect(html).toContain("bg-vl-cyan");
    expect(html).toContain("font-mono");
    expect(html).toContain("text-[10px]");
    expect(html).toContain("uppercase");
    expect(html).toContain("NEW DROP");
  });

  it("renders Supreme-style high-impact red box for 'sale' variant", () => {
    const html = renderToStaticMarkup(<ProductBadge label="-25%" variant="sale" />);

    expect(html).toContain("bg-status-sale");
    expect(html).toContain("text-white");
    expect(html).toContain("-25%");
  });

  it("renders signature cyber cyan box for 'new' variant", () => {
    const html = renderToStaticMarkup(<ProductBadge label="NEW" variant="new" />);

    expect(html).toContain("bg-vl-cyan");
    expect(html).toContain("text-vl-dark-900");
    expect(html).toContain("NEW");
  });

  it("renders flame amber box for 'hot' variant", () => {
    const html = renderToStaticMarkup(<ProductBadge label="HOT" variant="hot" />);

    expect(html).toContain("bg-amber-400");
    expect(html).toContain("text-vl-dark-900");
    expect(html).toContain("HOT");
  });

  it("auto-normalizes variant based on semantic label when default", () => {
    const htmlHot = renderToStaticMarkup(<ProductBadge label="HOT" />);
    expect(htmlHot).toContain("bg-amber-400"); // auto-detected hot

    const htmlNew = renderToStaticMarkup(<ProductBadge label="NEW" />);
    expect(htmlNew).toContain("bg-vl-cyan"); // auto-detected new

    const htmlSale = renderToStaticMarkup(<ProductBadge label="-20%" />);
    expect(htmlSale).toContain("bg-status-sale"); // auto-detected sale
  });

  it("renders in ProductCard with top-2 left-2 placement and percentage discount", () => {
    const product = {
      id: "prod-sale",
      name: "Represent Heavyweight Tee",
      slug: "represent-heavyweight-tee",
      description: "Streetwear boxy tee",
      status: ProductStatus.PUBLISHED,
      primaryImage: {
        url: "/uploads/product/tee.webp",
        alt: "Front view",
        isPrimary: true,
      },
      minPrice: 800,
      maxPrice: 1000,
      hasDiscount: true,
      categories: [{ id: "c1", name: "T-Shirts", slug: "t-shirts", description: null, imageUrl: null }],
      available: true,
    };

    const html = renderToStaticMarkup(<ProductCard product={product} />);

    // Placement in corner with symmetry
    expect(html).toContain("top-2 left-2");

    // Automatically converted 20% discount into high-end red box
    expect(html).toContain("-20%");
    expect(html).toContain("rounded-2xs");
    expect(html).toContain("bg-status-sale");
  });

  it("renders exact percentage badge when single-price discounted product uses originalPrice", () => {
    const product = {
      id: "prod-single-discount",
      name: "Cyber Heavyweight Hoodie",
      slug: "cyber-heavyweight-hoodie",
      description: "Streetwear hoodie with 20% discount",
      status: ProductStatus.PUBLISHED,
      primaryImage: null,
      minPrice: 1200,
      maxPrice: 1200, // minPrice === maxPrice for single variant
      originalPrice: 1500, // original selling price before discount
      hasDiscount: true,
      categories: [],
      available: true,
    };

    const html = renderToStaticMarkup(<ProductCard product={product} />);
    // Correctly calculates (1500 - 1200) / 1500 = 20%
    expect(html).toContain("-20%");
    expect(html).not.toContain(">Sale<");
  });

  it("renders SOLD OUT badge when product is unavailable", () => {
    const product = {
      id: "prod-sold-out",
      name: "Vintage Acid Wash Tee",
      slug: "vintage-acid-wash-tee",
      description: "Sold out limited drop",
      status: ProductStatus.PUBLISHED,
      primaryImage: {
        url: "/uploads/product/sold.webp",
        alt: "Front view",
        isPrimary: true,
      },
      minPrice: 1200,
      maxPrice: 1200,
      hasDiscount: false,
      categories: [{ id: "c1", name: "T-Shirts", slug: "t-shirts", description: null, imageUrl: null }],
      available: false,
    };

    const html = renderToStaticMarkup(<ProductCard product={product} />);
    expect(html).toContain("SOLD OUT");
  });

  it("NewArrivals prioritizes in-stock items and preserves custom admin badges", () => {
    const mockProducts = [
      {
        id: "p-sold-out",
        name: "Old Out of Stock Item",
        slug: "old-out-of-stock-item",
        description: null,
        status: ProductStatus.PUBLISHED,
        primaryImage: null,
        minPrice: 500,
        maxPrice: 500,
        hasDiscount: false,
        categories: [],
        available: false,
      },
      {
        id: "p-in-stock-custom",
        name: "Fresh In-Stock Custom Item",
        slug: "fresh-in-stock-custom-item",
        description: null,
        status: ProductStatus.PUBLISHED,
        primaryImage: null,
        minPrice: 800,
        maxPrice: 800,
        hasDiscount: false,
        categories: [],
        available: true,
        badge: { label: "LIMITED", variant: "hot" as const },
      },
    ];

    const html = renderToStaticMarkup(<NewArrivals products={mockProducts} />);
    // In-stock item with custom LIMITED badge is rendered
    expect(html).toContain("LIMITED");
    expect(html).toContain("SOLD OUT");
    // Does NOT render forced "NEW" badge on products (bg-vl-cyan)
    expect(html).not.toContain("bg-vl-cyan");
  });

  it("renders no badge for regular in-stock products with no discount or custom badge", () => {
    const cleanProduct = {
      id: "prod-clean",
      name: "Standard Heavyweight Tee",
      slug: "standard-heavyweight-tee",
      description: "Clean luxury look",
      status: ProductStatus.PUBLISHED,
      primaryImage: null,
      minPrice: 900,
      maxPrice: 900,
      hasDiscount: false,
      categories: [],
      available: true,
    };

    const html = renderToStaticMarkup(<ProductCard product={cleanProduct} />);
    expect(html).not.toContain("SOLD OUT");
    expect(html).not.toContain("SALE");
    expect(html).not.toContain("FEATURED");
    expect(html).not.toContain("NEW");
    expect(html).not.toContain("HOT");
  });
});
