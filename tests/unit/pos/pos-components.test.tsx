import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Radix UI dialog for renderToStaticMarkup SSR testing
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

import { PosHeader } from "@/components/pos/pos-header";
import { PosCartPanel } from "@/components/pos/pos-cart-panel";
import { PosThermalReceipt } from "@/components/pos/pos-thermal-receipt";
import { PosProductScanner } from "@/components/pos/pos-product-scanner";
import { PosProductGrid } from "@/components/pos/pos-product-grid";
import type { PosCartItem, PosCategory, PosProductSummary, PosReceiptData } from "@/lib/pos/pos-types";

describe("POS UI Components", () => {
  describe("PosHeader", () => {
    test("renders cashier name, role, and store title", () => {
      const html = renderToStaticMarkup(
        <PosHeader cashierName="Siam Ahmed" cashierRole="STAFF" />
      );

      expect(html).toContain("VIBELOCK");
      expect(html).toContain("POS");
      expect(html).toContain("Outlet Counter 01");
      expect(html).toContain("Siam Ahmed");
      expect(html).toContain("staff");
    });
  });

  describe("PosCartPanel", () => {
    test("renders empty cart state when no items present", () => {
      const html = renderToStaticMarkup(
        <PosCartPanel
          cartItems={[]}
          customerPhone=""
          setCustomerPhone={vi.fn()}
          customerName=""
          setCustomerName={vi.fn()}
          discount={0}
          setDiscount={vi.fn()}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          onClearCart={vi.fn()}
          onOpenPaymentModal={vi.fn()}
        />
      );

      expect(html).toContain("Counter Cart is Empty");
      expect(html).toContain("Scan barcode or select an item");
    });

    test("renders cart line items, subtotal, and payable total", () => {
      const sampleItems: PosCartItem[] = [
        {
          variantId: "var-1",
          productId: "prod-1",
          productName: "Oversized Vintage Tee",
          sku: "VL-TEE-VINT-M",
          size: "M",
          color: "Washed Black",
          price: 1350,
          costPrice: 600,
          quantity: 2,
          maxStock: 5,
        },
      ];

      const html = renderToStaticMarkup(
        <PosCartPanel
          cartItems={sampleItems}
          customerPhone="01700000000"
          setCustomerPhone={vi.fn()}
          customerName="Karim"
          setCustomerName={vi.fn()}
          discount={100}
          setDiscount={vi.fn()}
          onUpdateQuantity={vi.fn()}
          onRemoveItem={vi.fn()}
          onClearCart={vi.fn()}
          onOpenPaymentModal={vi.fn()}
        />
      );

      expect(html).toContain("Oversized Vintage Tee");
      expect(html).toContain("VL-TEE-VINT-M");
      expect(html).toContain("Washed Black");
      // Subtotal = 2 * 1350 = 2700, Discount = 100, Total = 2600
      expect(html).toContain("2700");
      expect(html).toContain("100");
      expect(html).toContain("2600");
      expect(html).toContain("CHARGE ৳2600");
    });
  });

  describe("PosThermalReceipt", () => {
    test("renders 58mm/80mm thermal receipt with complete transaction details", () => {
      const sampleReceipt: PosReceiptData = {
        orderId: "ord-1",
        orderNumber: "VL-POS-202611-001",
        createdAt: "2026-11-01T15:30:00Z",
        cashierName: "Staff Siam",
        cashierEmail: "siam@vibelock.com",
        customerName: "Mahmud Hasan",
        customerPhone: "01819000000",
        items: [
          {
            name: "Cargo Pants",
            sku: "VL-CARGO-BLK-32",
            size: "32",
            color: "Olive",
            unitPrice: 2200,
            quantity: 1,
            lineTotal: 2200,
          },
        ],
        subtotal: 2200,
        discount: 200,
        total: 2000,
        paymentMethod: "CASH",
        amountPaid: 2500,
        changeDue: 500,
      };

      const html = renderToStaticMarkup(
        <PosThermalReceipt receipt={sampleReceipt} isOpen={true} onNewSale={vi.fn()} />
      );

      expect(html).toContain("VIBELOCK BD");
      expect(html).toContain("VL-POS-202611-001");
      expect(html).toContain("Staff Siam");
      expect(html).toContain("Mahmud Hasan");
      expect(html).toContain("01819000000");
      expect(html).toContain("Cargo Pants");
      expect(html).toContain("2200");
      expect(html).toContain("2000");
      expect(html).toContain("2500");
      expect(html).toContain("500");
      expect(html).toContain("Exchange within 7 days");
    });
  });

  describe("PosProductScanner", () => {
    test("renders scanner input bar with sound toggle button", () => {
      const html = renderToStaticMarkup(
        <PosProductScanner onAddVariant={vi.fn()} />
      );

      expect(html).toContain("SCAN SKU:");
      expect(html).toContain("Scan barcode or type SKU");
      expect(html).toContain("Scan beep is enabled. Click to mute.");
    });
  });

  describe("PosProductGrid", () => {
    const mockCategories: PosCategory[] = [
      { id: "cat-clothing", name: "Clothing", slug: "clothing", parentId: null },
      { id: "cat-tees", name: "T-Shirts", slug: "t-shirts", parentId: "cat-clothing" },
      { id: "cat-shoes", name: "Shoes", slug: "shoes", parentId: null },
    ];

    const mockProducts: PosProductSummary[] = [
      {
        id: "prod-1",
        name: "Cyber Graphic Tee",
        slug: "cyber-graphic-tee",
        imageUrl: "/tee.jpg",
        categoryIds: ["cat-tees", "cat-clothing"],
        categoryNames: ["T-Shirts"],
        variants: [
          {
            id: "var-1",
            sku: "CYBER-TEE-M",
            size: "M",
            color: "Black",
            costPrice: 500,
            sellingPrice: 1200,
            discountPrice: null,
            effectivePrice: 1200,
            availableStock: 10,
          },
        ],
        minPrice: 1200,
        maxPrice: 1200,
        totalAvailableStock: 10,
      },
      {
        id: "prod-2",
        name: "Stealth Hoodie",
        slug: "stealth-hoodie",
        imageUrl: null,
        categoryIds: ["cat-clothing"],
        categoryNames: ["Clothing"],
        variants: [
          {
            id: "var-2a",
            sku: "STEALTH-HD-S",
            size: "S",
            color: "Grey",
            costPrice: 900,
            sellingPrice: 2200,
            discountPrice: null,
            effectivePrice: 2200,
            availableStock: 4,
          },
          {
            id: "var-2b",
            sku: "STEALTH-HD-L",
            size: "L",
            color: "Grey",
            costPrice: 900,
            sellingPrice: 2400,
            discountPrice: null,
            effectivePrice: 2400,
            availableStock: 2,
          },
        ],
        minPrice: 2200,
        maxPrice: 2400,
        totalAvailableStock: 6,
      },
      {
        id: "prod-3",
        name: "Vintage Pin (Uncategorized)",
        slug: "vintage-pin",
        imageUrl: null,
        categoryIds: [],
        categoryNames: [],
        variants: [],
        minPrice: 0,
        maxPrice: 0,
        totalAvailableStock: 0,
      },
    ];

    test("renders catalog items, category counts with parent-child hierarchy, and uncategorized tab", () => {
      const html = renderToStaticMarkup(
        <PosProductGrid
          products={mockProducts}
          categories={mockCategories}
          onAddVariant={vi.fn()}
        />
      );

      // Verify category pills and counts
      expect(html).toContain("All Items");
      expect(html).toContain("Clothing");
      expect(html).toContain("T-Shirts");
      expect(html).toContain("Shoes");
      expect(html).toContain("Uncategorized");

      // Verify product card details
      expect(html).toContain("Cyber Graphic Tee");
      expect(html).toContain("Stealth Hoodie");
      expect(html).toContain("Vintage Pin (Uncategorized)");

      // Verify single variant vs multi-variant vs no-variant actions
      expect(html).toContain("Add to Cart");
      expect(html).toContain("Select Variant:");
      expect(html).toContain("No Variants");
    });

    test("filters catalog items in real-time when searchQuery prop is provided", () => {
      const html = renderToStaticMarkup(
        <PosProductGrid
          products={mockProducts}
          categories={mockCategories}
          onAddVariant={vi.fn()}
          searchQuery="Cyber"
        />
      );

      expect(html).toContain("Cyber Graphic Tee");
      expect(html).not.toContain("Stealth Hoodie");
    });

    test("renders empty catalog state with Reset Filters button when no products match", () => {
      const html = renderToStaticMarkup(
        <PosProductGrid
          products={[]}
          categories={mockCategories}
          onAddVariant={vi.fn()}
        />
      );

      expect(html).toContain("No products match your filter.");
      expect(html).toContain("Reset Filters");
    });

    test("renders category bar with hidden scrollbar classes for smooth mouse wheel navigation", () => {
      const html = renderToStaticMarkup(
        <PosProductGrid
          products={mockProducts}
          categories={mockCategories}
          onAddVariant={vi.fn()}
        />
      );

      expect(html).toContain("no-scrollbar");
      expect(html).not.toContain("scrollbar-thin");
    });

    test("renders AdminTableInfiniteScroll sentinel and status in PosProductGrid", () => {
      // 1. With <= 24 items: renders all loaded state
      const htmlFew = renderToStaticMarkup(
        <PosProductGrid
          products={mockProducts}
          categories={mockCategories}
          onAddVariant={vi.fn()}
        />
      );
      expect(htmlFew).toContain("All");
      expect(htmlFew).toContain("products loaded");

      // 2. With > 24 items: renders load more controls
      const manyProducts: PosProductSummary[] = Array.from({ length: 30 }, (_, i) => ({
        ...mockProducts[0],
        id: `prod-batch-${i}`,
        name: `Batch Item ${i}`,
        variants: [],
      }));

      const htmlMany = renderToStaticMarkup(
        <PosProductGrid
          products={manyProducts}
          categories={mockCategories}
          onAddVariant={vi.fn()}
        />
      );
      expect(htmlMany).toContain("Load more products");
      expect(htmlMany).toContain("Showing 24 of 30");
    });
  });
});
