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
import type { PosCartItem, PosReceiptData } from "@/lib/pos/pos-types";

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
});
