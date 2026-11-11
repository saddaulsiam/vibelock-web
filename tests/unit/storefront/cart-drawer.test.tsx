import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CartDrawer } from "@/components/storefront/cart/cart-drawer";
import { CartPageContent } from "@/components/storefront/cart/cart-page-content";
import type { CartDTO } from "@/lib/cart/types";

const mockCart: CartDTO = {
  id: "cart-1",
  totalQuantity: 2,
  subtotal: 3500,
  items: [
    {
      id: "item-1",
      variantId: "var-1",
      quantity: 2,
      productName: "Heavyweight Boxy Tee",
      productSlug: "heavyweight-boxy-tee",
      productImage: "/test-tee.jpg",
      lineTotal: 3500,
      availableQuantity: 5,
      variant: {
        id: "var-1",
        sku: "VL-TEE-BLK-L",
        size: "L",
        color: "BLACK",
        sellingPrice: 1750,
        discountPrice: null,
        effectivePrice: 1750,
        available: true,
      },
    },
  ],
};

describe("Cart Sheet & Cart Page Unit Tests", () => {
  it("renders CartSheet trigger button with item count badge", () => {
    const html = renderToStaticMarkup(<CartDrawer initialCart={mockCart} />);
    expect(html).toContain('aria-label="Shopping bag, 2 items"');
    expect(html).toContain("2");
  });

  it("renders CartPageContent empty state when cart is null or empty", () => {
    const html = renderToStaticMarkup(<CartPageContent cart={null} />);
    expect(html).toContain("Your cart is empty");
    expect(html).toContain("Shop products");
  });

  it("renders CartPageContent items, subtotal, and checkout CTA when items exist", () => {
    const html = renderToStaticMarkup(<CartPageContent cart={mockCart} />);
    expect(html).toContain("Heavyweight Boxy Tee");
    expect(html).toContain("Size: L");
    expect(html).toContain("Color: BLACK");
    expect(html).toContain("Order summary");
    expect(html).toContain("Continue to checkout");
  });
});
