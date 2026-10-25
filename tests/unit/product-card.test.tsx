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
        url: "/uploads/products/hoodie-front.webp",
        alt: "Front view",
        isPrimary: true,
      },
      secondaryImage: {
        url: "/uploads/products/hoodie-back.webp",
        alt: "Back view",
        isPrimary: false,
      },
      images: [
        { url: "/uploads/products/hoodie-front.webp", alt: "Front view", isPrimary: true },
        { url: "/uploads/products/hoodie-back.webp", alt: "Back view", isPrimary: false },
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

    // 2:3 aspect ratio
    expect(html).toContain("aspect-ratio:2 / 3");

    // Both images rendered
    expect(html).toContain("hoodie-front.webp");
    expect(html).toContain("hoodie-back.webp");

    // Hover opacity transition classes
    expect(html).toContain("group-hover:opacity-0");
    expect(html).toContain("group-hover:opacity-100");
  });
});
