import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Radix Dialog for renderToStaticMarkup SSR testing
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

import { PosParkedModal } from "@/components/pos/pos-parked-modal";
import { PosHeader } from "@/components/pos/pos-header";
import { PosCartPanel } from "@/components/pos/pos-cart-panel";
import type { PosParkedCart } from "@/lib/pos/pos-parked-types";
import type { PosCartItem } from "@/lib/pos/pos-types";

describe("POS Parked / Held Carts", () => {
  describe("PosParkedModal Component", () => {
    test("renders empty state when no parked sales exist", () => {
      const html = renderToStaticMarkup(
        <PosParkedModal
          isOpen={true}
          onClose={vi.fn()}
          parkedCarts={[]}
          onResumeCart={vi.fn()}
          onDiscardCart={vi.fn()}
          currentCartHasItems={false}
        />
      );

      expect(html).toContain("Parked Sales / Held Carts");
      expect(html).toContain("No Carts on Hold");
      expect(html).toContain("Press [F4] or click");
    });

    test("renders list of held carts with customer name, items count, and total amount", () => {
      const sampleParked: PosParkedCart[] = [
        {
          id: "park-1",
          parkedAt: new Date().toISOString(),
          label: "Tanvir Ahmed",
          customerName: "Tanvir Ahmed",
          customerPhone: "01799887766",
          notes: "Checking hoodie rack",
          items: [
            {
              variantId: "v-1",
              productId: "p-1",
              productName: "Vintage Tee",
              sku: "VL-TEE-VINT-M",
              price: 1200,
              costPrice: 500,
              quantity: 2,
              maxStock: 5,
            },
          ],
          discount: 100,
          totalValue: 2300,
          itemsCount: 2,
        },
      ];

      const html = renderToStaticMarkup(
        <PosParkedModal
          isOpen={true}
          onClose={vi.fn()}
          parkedCarts={sampleParked}
          onResumeCart={vi.fn()}
          onDiscardCart={vi.fn()}
          currentCartHasItems={true}
        />
      );

      expect(html).toContain("Tanvir Ahmed");
      expect(html).toContain("01799887766");
      expect(html).toContain("Checking hoodie rack");
      expect(html).toContain("2 items");
      expect(html).toContain("2300");
      expect(html).toContain("Resume Sale");
      expect(html).toContain("Discard");
      expect(html).toContain("Your counter currently has items");
    });
  });

  describe("PosHeader Parked Indicator", () => {
    test("renders Parked badge when held carts count is greater than zero", () => {
      const html = renderToStaticMarkup(
        <PosHeader
          cashierName="Siam"
          cashierRole="STAFF"
          parkedCount={2}
          onOpenParkedModal={vi.fn()}
        />
      );

      expect(html).toContain("Parked");
      expect(html).toContain("2");
    });
  });

  describe("PosCartPanel Hold Action", () => {
    test("renders Hold [F4] button when cart has items and onParkCart handler provided", () => {
      const sampleItems: PosCartItem[] = [
        {
          variantId: "v-1",
          productId: "p-1",
          productName: "Boxy Tee",
          sku: "VL-TEE-M",
          price: 1000,
          costPrice: 500,
          quantity: 1,
          maxStock: 10,
        },
      ];

      const html = renderToStaticMarkup(
        <PosCartPanel
          cartItems={sampleItems}
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
          onParkCart={vi.fn()}
        />
      );

      expect(html).toContain("Hold");
      expect(html).toContain("F4");
    });
  });
});

