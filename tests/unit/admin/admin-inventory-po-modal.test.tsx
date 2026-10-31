import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminInventoryPoModal } from "@/components/admin/inventory/admin-inventory-po-modal";
import type { AdminInventoryItem } from "@/lib/admin/inventory";

// Mock server action
vi.mock("@/lib/admin/inventory", () => ({
  getReorderSuggestionsAction: vi.fn().mockResolvedValue({
    error: null,
    items: [],
  }),
}));

describe("AdminInventoryPoModal Component", () => {
  const sampleVariants: AdminInventoryItem[] = [
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
      totalStock: 5,
      reserved: 2,
      available: 3,
    },
    {
      id: "var-2",
      sku: "VL-HOOD-GRY-L",
      size: "L",
      color: "Grey",
      costPrice: 1200,
      sellingPrice: 2800,
      discountPrice: null,
      primaryImage: null,
      productSlug: "boxy-hoodie",
      productId: "prod-2",
      product: {
        id: "prod-2",
        name: "Boxy Fleece Hoodie",
        slug: "boxy-hoodie",
      },
      totalStock: 0,
      reserved: 0,
      available: 0,
    },
  ];

  test("does not render when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryPoModal
        isOpen={false}
        onClose={vi.fn()}
        initialItems={sampleVariants}
        availableVariants={sampleVariants}
      />
    );
    expect(html).toBe("");
  });

  test("renders PO sheet header, supplier parameters, and order items", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryPoModal
        isOpen={true}
        onClose={vi.fn()}
        initialItems={sampleVariants}
        availableVariants={sampleVariants}
      />
    );

    expect(html).toContain("Supplier Purchase Order (PO) &amp; Reorder Sheet");
    expect(html).toContain("Supplier / Factory Name");
    expect(html).toContain("Target Par Stock Buffer");
    expect(html).toContain("Heavyweight Graphic Tee");
    expect(html).toContain("VL-TEE-BLK-M");
    expect(html).toContain("Boxy Fleece Hoodie");
    expect(html).toContain("VL-HOOD-GRY-L");
  });

  test("calculates correct reorder quantities and totals", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryPoModal
        isOpen={true}
        onClose={vi.fn()}
        initialItems={sampleVariants}
        availableVariants={sampleVariants}
      />
    );

    // Default target buffer is 30.
    // var-1 available = 3, so orderQuantity = 30 - 3 = 27
    // var-2 available = 0, so orderQuantity = 30 - 0 = 30
    // Total pieces = 27 + 30 = 57 pcs
    expect(html).toContain("57 pcs");
    expect(html).toContain("Total Garments to Produce");
    expect(html).toContain("Total Estimated PO Value");
  });

  test("renders factory outputs: CSV export, WhatsApp memo, and print triggers", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryPoModal
        isOpen={true}
        onClose={vi.fn()}
        initialItems={sampleVariants}
        availableVariants={sampleVariants}
      />
    );

    expect(html).toContain("⚡ Auto-fill Low &amp; Out-of-Stock");
    expect(html).toContain("Copy WhatsApp / Email Memo");
    expect(html).toContain("Export PO CSV");
    expect(html).toContain("Print Factory PO (A4)");
    expect(html).toContain("VIBELOCK APPAREL");
    expect(html).toContain("PURCHASE ORDER");
  });
});
