import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminInventoryTable } from "@/components/admin/admin-inventory-table";
import type { AdminInventoryResult } from "@/lib/admin/inventory-queries";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/inventory",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminInventoryTable Component", () => {
  const sampleData: AdminInventoryResult = {
    variants: [
      {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        costPrice: 650,
        sellingPrice: 1450,
        discountPrice: 1250,
        primaryImage: "https://example.com/tee.jpg",
        productSlug: "heavyweight-tee",
        productId: "prod-1",
        product: {
          id: "prod-1",
          name: "Heavyweight Graphic Tee",
          slug: "heavyweight-tee",
        },
        totalStock: 25,
        reserved: 3,
        available: 22,
      },
      {
        id: "var-2",
        sku: "VL-HOOD-GRY-L",
        size: "L",
        color: "Heather Grey",
        costPrice: 1200,
        sellingPrice: 2800,
        discountPrice: null,
        primaryImage: null,
        productSlug: "fleece-hoodie",
        productId: "prod-2",
        product: {
          id: "prod-2",
          name: "Boxy Fleece Hoodie",
          slug: "fleece-hoodie",
        },
        totalStock: 4,
        reserved: 1,
        available: 3,
      },
      {
        id: "var-3",
        sku: "VL-CAP-BLK-OS",
        size: "OS",
        color: "Black",
        costPrice: 400,
        sellingPrice: 950,
        discountPrice: null,
        primaryImage: null,
        productSlug: "dad-cap",
        productId: "prod-3",
        product: {
          id: "prod-3",
          name: "Embroidered Dad Cap",
          slug: "dad-cap",
        },
        totalStock: 0,
        reserved: 0,
        available: 0,
      },
      {
        id: "var-4",
        sku: "VL-PANT-CARGO-32",
        size: "32",
        color: "Olive",
        costPrice: 1100,
        sellingPrice: 2400,
        discountPrice: null,
        primaryImage: null,
        productSlug: "cargo-pant",
        productId: "prod-4",
        product: {
          id: "prod-4",
          name: "Relaxed Cargo Pants",
          slug: "cargo-pant",
        },
        totalStock: -2,
        reserved: 1,
        available: -3,
      },
    ],
    total: 4,
    totalPages: 1,
    page: 1,
  };

  test("renders search input with placeholder and keyboard shortcut hint", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain('placeholder="Search by SKU, product name, size, or color..."');
    expect(html).toContain("/");
  });

  test("renders quick filter chips including Negative Anomaly", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain("All Items");
    expect(html).toContain("In Stock (&gt;0)");
    expect(html).toContain("Low Stock (1–5)");
    expect(html).toContain("Out of Stock (0)");
    expect(html).toContain("Negative Anomaly");
  });

  test("renders inventory variant items with names, skus, and sizes", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain("Heavyweight Graphic Tee");
    expect(html).toContain("VL-TEE-BLK-M");
    expect(html).toContain("Size: M • Color: Black");

    expect(html).toContain("Boxy Fleece Hoodie");
    expect(html).toContain("VL-HOOD-GRY-L");
    expect(html).toContain("Size: L • Color: Heather Grey");
  });

  test("renders correct physical, reserved, and available stock numbers", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    // var-1: totalStock 25, reserved 3, available 22
    expect(html).toContain("25");
    expect(html).toContain("3");
    expect(html).toContain("22");
  });

  test("renders appropriate status badges for in-stock, low-stock, out-of-stock, and negative stock", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain("In Stock");
    expect(html).toContain("Low Stock");
    expect(html).toContain("REORDER");
    expect(html).toContain("Out of Stock");
    expect(html).toContain("Negative Stock");
  });

  test("renders Quick Adjust, Barcode Print, and CSV Export action buttons", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={sampleData}
        currentFilters={{ q: "", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain("Adjust");
    expect(html).toContain("Print barcode price tag for this variant");
    expect(html).toContain("Export CSV");
    expect(html).toContain("Stocktake Audit");
  });

  test("renders empty state when no items match", () => {
    const emptyData: AdminInventoryResult = {
      variants: [],
      total: 0,
      totalPages: 0,
      page: 1,
    };

    const html = renderToStaticMarkup(
      <AdminInventoryTable
        initialData={emptyData}
        currentFilters={{ q: "nonexistent", filter: "all", page: 1 }}
      />
    );

    expect(html).toContain("No inventory items match your search");
  });
});
