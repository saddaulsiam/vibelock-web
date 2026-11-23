import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { ProductStatus } from "@prisma/client";

describe("ProductCard Secondary Image Hover Effect", () => {
  it("renders primary and secondary images with cross-fade hover transition classes", () => {
    const product = {
      id: "prod-1",
      name: "Vibe Heavyweight Hoodie",
      slug: "vibe-heavyweight-hoodie",
      description: "Organic cotton heavyweight hoodie",
      status: ProductStatus.PUBLISHED,
      primaryImage: {
        url: "/uploads/product/hoodie-front.webp",
        alt: "Front view",
        isPrimary: true,
      },
      secondaryImage: {
        url: "/uploads/product/hoodie-back.webp",
        alt: "Back view",
        isPrimary: false,
      },
      images: [
        { url: "/uploads/product/hoodie-front.webp", alt: "Front view", isPrimary: true },
        { url: "/uploads/product/hoodie-back.webp", alt: "Back view", isPrimary: false },
      ],
      minPrice: 1850,
      maxPrice: 2200,
      hasDiscount: true,
      categories: [
        { id: "c1", name: "Hoodies", slug: "hoodies", description: null, imageUrl: null },
      ],
      available: true,
    };

    const html = renderToStaticMarkup(<ProductCard product={product} />);

    // 3:4 aspect ratio
    expect(html).toContain("aspect-ratio:3 / 4");

    // Both images rendered
    expect(html).toContain("hoodie-front.webp");
    expect(html).toContain("hoodie-back.webp");

    // Hover opacity transition classes
    expect(html).toContain("group-hover:opacity-0");
    expect(html).toContain("group-hover:opacity-100");
  });

  it("renders wishlist button with frosted glass backdrop for high contrast against dark media", () => {
    const product = {
      id: "prod-dark",
      name: "Pitch Black Obsidian Hoodie",
      slug: "pitch-black-obsidian-hoodie",
      description: "Stealth black heavyweight hoodie",
      status: ProductStatus.PUBLISHED,
      primaryImage: {
        url: "/uploads/black-hoodie.webp",
        alt: "Dark view",
        isPrimary: true,
      },
      minPrice: 2400,
      maxPrice: 2400,
      hasDiscount: false,
      categories: [],
      available: true,
    };

    const html = renderToStaticMarkup(<ProductCard product={product} />);

    // Frosted glass contrast surface classes
    expect(html).toContain("bg-white/85");
    expect(html).toContain("backdrop-blur-md");
    expect(html).toContain("border-black/10");
    expect(html).toContain("aria-label=\"Add Pitch Black Obsidian Hoodie to wishlist\"");
  });
});
