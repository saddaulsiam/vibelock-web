import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminInventoryDetail } from "@/components/admin/inventory/admin-inventory-detail";
import type { AdminInventoryDetailResult } from "@/lib/admin/inventory-queries";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/inventory/var-1",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminInventoryDetail Component", () => {
  const sampleDetail: AdminInventoryDetailResult = {
    variant: {
      id: "var-1",
      sku: "VL-TSHIRT-BLK-L",
      size: "L",
      color: "Vintage Black",
      weight: 0.45,
      costPrice: 650,
      sellingPrice: 1550,
      discountPrice: 1350,
      primaryImage: "https://example.com/tshirt.jpg",
      product: {
        id: "prod-1",
        name: "Vintage Heavyweight Oversized Tee",
        slug: "vintage-heavyweight-oversized-tee",
        images: [{ url: "https://example.com/tshirt.jpg", isPrimary: true }],
      },
    },
    totalStock: 45,
    reservedStock: 5,
    availableStock: 40,
    totalSold: 120,
    totalRestocked: 165,
    totalDamaged: 2,
    totalTransactions: 3,
    totalPages: 1,
    page: 1,
    typeFilter: "ALL",
    transactions: [
      {
        id: "tx-1",
        type: "RESTOCK",
        quantity: 50,
        referenceId: "PO-2026-001",
        notes: "Factory batch intake",
        salesChannel: "WEBSITE",
        createdAt: new Date("2026-10-25T10:00:00Z"),
      },
      {
        id: "tx-2",
        type: "SALE",
        quantity: -2,
        referenceId: "ORD-9901",
        notes: "Storefront POS counter purchase",
        salesChannel: "POS",
        createdAt: new Date("2026-10-25T14:30:00Z"),
      },
      {
        id: "tx-3",
        type: "DAMAGE",
        quantity: -1,
        referenceId: "AUDIT-DMG-04",
        notes: "Zipper snag defect",
        salesChannel: null,
        createdAt: new Date("2026-10-25T16:00:00Z"),
      },
    ],
  };

  test("renders variant identity, SKU, and status badge correctly", () => {
    const html = renderToStaticMarkup(<AdminInventoryDetail data={sampleDetail} />);

    expect(html).toContain("Vintage Heavyweight Oversized Tee");
    expect(html).toContain("VL-TSHIRT-BLK-L");
    expect(html).toContain("Vintage Black");
    expect(html).toContain("0.45 kg");
    expect(html).toContain("In Stock");
    expect(html).toContain("Margin: 58%");
  });

  test("renders KPI metric cards and valuations", () => {
    const html = renderToStaticMarkup(<AdminInventoryDetail data={sampleDetail} />);

    expect(html).toContain("Physical Stock");
    expect(html).toContain("45"); // totalStock
    expect(html).toContain("Reserved Stock");
    expect(html).toContain("5"); // reservedStock
    expect(html).toContain("Available to Sell");
    expect(html).toContain("40"); // availableStock
    expect(html).toContain("Cost Valuation");
    expect(html).toContain("Retail Valuation");
    expect(html).toContain("120 units"); // totalSold
    expect(html).toContain("+165 units"); // totalRestocked
    expect(html).toContain("2 units"); // totalDamaged
  });

  test("renders transaction ledger rows and badges", () => {
    const html = renderToStaticMarkup(<AdminInventoryDetail data={sampleDetail} />);

    expect(html).toContain("RESTOCK");
    expect(html).toContain("+50");
    expect(html).toContain("PO-2026-001");
    expect(html).toContain("Factory batch intake");

    expect(html).toContain("SALE");
    expect(html).toContain("-2");
    expect(html).toContain("ORD-9901");
    expect(html).toContain("Storefront POS counter purchase");

    expect(html).toContain("DAMAGE");
    expect(html).toContain("-1");
    expect(html).toContain("Zipper snag defect");
  });

  test("renders action triggers: Export CSV, Adjust Stock, Print Tag", () => {
    const html = renderToStaticMarkup(<AdminInventoryDetail data={sampleDetail} />);

    expect(html).toContain("Export Ledger CSV");
    expect(html).toContain("Adjust Stock");
    expect(html).toContain("Print Tag");
    expect(html).toContain("Storefront View");
  });
});
