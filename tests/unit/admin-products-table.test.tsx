import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminProductsTable } from "@/components/admin/products";
import type { AdminProductsResult } from "@/lib/admin/catalog-queries";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/products",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminProductsTable Component", () => {
  const sampleData: AdminProductsResult = {
    products: [
      {
        id: "prod-1",
        name: "Heavyweight Graphic Tee",
        slug: "heavyweight-graphic-tee",
        status: "PUBLISHED",
        isFeatured: true,
        primaryImage: "https://example.com/tee.jpg",
        categories: [{ id: "cat-1", name: "T-Shirts", slug: "t-shirts" }],
        categoryNames: ["T-Shirts"],
        variantCount: 4,
        totalStock: 32,
        skus: ["VL-TEE-BLK-M", "VL-TEE-BLK-L"],
        minCostPrice: 850,
        maxCostPrice: 850,
        minSellingPrice: 1600,
        maxSellingPrice: 1600,
        minDiscountPrice: 1350,
        variants: [
          {
            id: "var-1",
            sku: "VL-TEE-BLK-M",
            size: "M",
            color: "Black",
            costPrice: 850,
            sellingPrice: 1600,
            discountPrice: 1350,
            stock: 20,
          },
          {
            id: "var-2",
            sku: "VL-TEE-BLK-L",
            size: "L",
            color: "Black",
            costPrice: 850,
            sellingPrice: 1600,
            discountPrice: 1350,
            stock: 12,
          },
        ],
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
      },
      {
        id: "prod-2",
        name: "Boxy Fleece Hoodie",
        slug: "boxy-fleece-hoodie",
        status: "DRAFT",
        isFeatured: false,
        primaryImage: null,
        categories: [{ id: "cat-2", name: "Hoodies", slug: "hoodies" }],
        categoryNames: ["Hoodies"],
        variantCount: 3,
        totalStock: 0,
        skus: ["VL-HOD-GRY-L"],
        minCostPrice: 1800,
        maxCostPrice: 1800,
        minSellingPrice: 3200,
        maxSellingPrice: 3200,
        minDiscountPrice: null,
        variants: [
          {
            id: "var-3",
            sku: "VL-HOD-GRY-L",
            size: "L",
            color: "Grey",
            costPrice: 1800,
            sellingPrice: 3200,
            discountPrice: null,
            stock: 0,
          },
        ],
        createdAt: new Date("2026-01-03"),
        updatedAt: new Date("2026-01-04"),
      },
    ],
    allCategories: [
      { id: "cat-1", name: "T-Shirts", slug: "t-shirts" },
      { id: "cat-2", name: "Hoodies", slug: "hoodies" },
    ],
    totalFiltered: 2,
    page: 1,
    pageSize: 15,
    totalPages: 1,
    counts: {
      total: 2,
      published: 1,
      draft: 1,
      archived: 0,
      inStock: 1,
      lowStock: 0,
      outOfStock: 1,
    },
  };

  const defaultFilters = {
    q: "",
    category: "all",
    status: "all",
    stock: "all",
    sort: "newest",
    page: 1,
  };

  test("renders search bar, category dropdown, and quick filter tabs", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    expect(html).toContain("Search by product name, slug, SKU, or category...");
    expect(html).toContain("All Categories");
    expect(html).toContain("All Products");
    expect(html).toContain("Published");
    expect(html).toContain("Drafts");
    expect(html).toContain("Out of Stock");
  });

  test("renders product rows with prices, stock badges, and action buttons", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    expect(html).toContain("Heavyweight Graphic Tee");
    expect(html).toContain("/heavyweight-graphic-tee");
    expect(html).toContain("In Stock (32)");
    expect(html).toContain("Boxy Fleece Hoodie");
    expect(html).toContain("Out of Stock");
    expect(html).toContain("4 variants");
    expect(html).toContain("Edit");
  });

  test("renders empty state when no products match filters", () => {
    const emptyData: AdminProductsResult = {
      ...sampleData,
      products: [],
      totalFiltered: 0,
      totalPages: 1,
    };

    const html = renderToStaticMarkup(
      <AdminProductsTable
        initialData={emptyData}
        currentFilters={{ ...defaultFilters, q: "nonexistent" }}
      />
    );

    expect(html).toContain("No products match your filters");
    expect(html).toContain("Clear all filters");
  });

  test("renders all products loaded completion status when totalFiltered is reached", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    expect(html).toContain('All <strong class="text-[#101114]">2</strong> products loaded');
    expect(html).not.toContain("Previous");
    expect(html).not.toContain("Next");
  });

  test("renders load more button when more products exist beyond initial data", () => {
    const dataWithMore: AdminProductsResult = {
      ...sampleData,
      totalFiltered: 25,
      totalPages: 2,
    };

    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={dataWithMore} currentFilters={defaultFilters} />
    );

    expect(html).toContain("Load more products");
    expect(html).toContain("Showing 2 of 25");
    expect(html).not.toContain("Previous");
    expect(html).not.toContain("Next");
  });

  test("renders product image thumbnails with loading=lazy", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    expect(html).toContain('loading="lazy"');
  });

  test("renders keyboard shortcut badge, Export CSV button, selection checkboxes, and variant breakdown", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    // Keyboard shortcut '/'
    expect(html).toContain("Press / to search");

    // Export CSV button
    expect(html).toContain("Export CSV");

    // Checkboxes
    expect(html).toContain('aria-label="Select all products"');
    expect(html).toContain('aria-label="Select Heavyweight Graphic Tee"');

    // Variant breakdown button
    expect(html).toContain("Click to view variant stock details");
  });

  test("renders clickable category pills, column customizer, and barcode print actions", () => {
    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={sampleData} currentFilters={defaultFilters} />
    );

    // Clickable Category Pills
    expect(html).toContain('title="Filter by category: T-Shirts"');
    expect(html).toContain('title="Filter by category: Hoodies"');

    // Column Visibility Customizer button
    expect(html).toContain("Columns");

    // Barcode / Price Tag Printing action button in rows
    expect(html).toContain('title="Print price tag barcode labels for this product"');

    // Quick edit price & discount button in rows
    expect(html).toContain('title="Quick edit price &amp; discount"');
  });

  test("renders low stock visual indicator and REORDER badge for low stock items", () => {
    const lowStockData: AdminProductsResult = {
      ...sampleData,
      products: [
        {
          ...sampleData.products[0],
          id: "prod-low",
          name: "Low Stock Tee",
          totalStock: 3,
        },
      ],
      totalFiltered: 1,
    };

    const html = renderToStaticMarkup(
      <AdminProductsTable initialData={lowStockData} currentFilters={defaultFilters} />
    );

    expect(html).toContain("Low Stock (3)");
    expect(html).toContain("REORDER");
    expect(html).toContain("animate-ping");
  });
});
