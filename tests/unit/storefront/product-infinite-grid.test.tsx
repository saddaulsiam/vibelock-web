import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductInfiniteGrid } from "@/components/storefront/catalog/product-infinite-grid";
import { ProductStatus } from "@prisma/client";
import type { ProductSummary } from "@/lib/catalog/types";

const mockProducts: ProductSummary[] = [
  {
    id: "prod-1",
    name: "Oversized Tee",
    slug: "oversized-tee",
    description: "Drop shoulder tee",
    status: ProductStatus.PUBLISHED,
    primaryImage: { url: "/test-1.jpg", alt: "Test 1", isPrimary: true },
    minPrice: 1200,
    maxPrice: 1200,
    hasDiscount: false,
    categories: [{ id: "cat-1", name: "T-Shirts", slug: "t-shirts", description: null, imageUrl: null }],
    available: true,
  },
  {
    id: "prod-2",
    name: "Cargo Pants",
    slug: "cargo-pants",
    description: "Relaxed fit cargo",
    status: ProductStatus.PUBLISHED,
    primaryImage: { url: "/test-2.jpg", alt: "Test 2", isPrimary: true },
    minPrice: 2500,
    maxPrice: 2500,
    hasDiscount: false,
    categories: [{ id: "cat-2", name: "Pants", slug: "pants", description: null, imageUrl: null }],
    available: true,
  },
];

describe("ProductInfiniteGrid Component", () => {
  it("renders empty state when products list is empty", () => {
    const html = renderToStaticMarkup(
      <ProductInfiniteGrid
        initialProducts={[]}
        totalCount={0}
        totalPages={0}
        searchParams={{}}
        searchTerm="non-existent"
      />
    );

    expect(html).toContain("No products matched");
    expect(html).toContain("non-existent");
    expect(html).toContain("Clear search");
  });

  it("renders product cards when initial products are provided", () => {
    const html = renderToStaticMarkup(
      <ProductInfiniteGrid
        initialProducts={mockProducts}
        totalCount={2}
        totalPages={1}
        searchParams={{}}
      />
    );

    expect(html).toContain("Oversized Tee");
    expect(html).toContain("Cargo Pants");
  });

  it("renders end-of-results indicator when all releases are loaded and count >= 12", () => {
    const twelveProducts = Array.from({ length: 12 }, (_, i) => ({
      ...mockProducts[0],
      id: `prod-${i}`,
      name: `Product ${i}`,
    }));

    const html = renderToStaticMarkup(
      <ProductInfiniteGrid
        initialProducts={twelveProducts}
        totalCount={12}
        totalPages={1}
        searchParams={{}}
      />
    );

    expect(html).toContain("All 12 releases loaded");
  });

  it("renders load more fallback button when hasMore is true", () => {
    const html = renderToStaticMarkup(
      <ProductInfiniteGrid
        initialProducts={mockProducts}
        totalCount={50}
        totalPages={5}
        searchParams={{}}
      />
    );

    expect(html).toContain("Load more releases");
    expect(html).toContain("2 of 50");
  });
});

