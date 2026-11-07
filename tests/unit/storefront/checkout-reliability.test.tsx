import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";
import { checkoutSchema } from "@/lib/checkout/validation";
import type { CartDTO } from "@/lib/cart/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock actions
vi.mock("@/lib/checkout/actions", () => ({
  getShippingMethodsAction: vi.fn(),
  validateCouponAction: vi.fn(),
  createOrderAction: vi.fn(),
}));

describe("Checkout Reliability (P0)", () => {
  const mockCart: CartDTO = {
    id: "cart-123",
    totalQuantity: 2,
    subtotal: 3500,
    items: [
      {
        id: "item-1",
        variantId: "var-1",
        quantity: 2,
        productName: "Classic Streetwear Tee",
        productSlug: "classic-streetwear-tee",
        productImage: null,
        lineTotal: 3500,
        availableQuantity: 10,
        variant: {
          id: "var-1",
          sku: "VL-TSHIRT-BLK-L",
          size: "L",
          color: "Black",
          sellingPrice: 1750,
          discountPrice: null,
          effectivePrice: 1750,
          available: true,
        },
      },
    ],
  };

  it("renders non-editable Bangladesh country input with readOnly attribute", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        cart={mockCart}
        defaultName="Tanvir Ahmed"
        defaultEmail="tanvir@example.com"
        defaultPhone="01711223344"
      />
    );

    // Verify country input exists with fixed "Bangladesh" value
    expect(html).toContain('id="shippingCountry"');
    expect(html).toContain('value="Bangladesh"');
    expect(html).toContain("readonly");
    expect(html).toContain('aria-readonly="true"');
    expect(html).toContain("cursor-not-allowed");
  });

  it("pre-populates fresh database customer profile data into checkout form inputs", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        cart={mockCart}
        defaultName="Updated Customer Name"
        defaultEmail="fresh.email@example.com"
        defaultPhone="01899001122"
      />
    );

    expect(html).toContain('value="Updated Customer Name"');
    expect(html).toContain('value="01899001122"');
  });

  it("renders Delivery District dropdown with Bangladesh districts", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        cart={mockCart}
        defaultName="Tanvir Ahmed"
        defaultEmail="tanvir@example.com"
        defaultPhone="01711223344"
      />
    );

    expect(html).toContain('id="shippingCity"');
    expect(html).toContain("Dhaka");
    expect(html).toContain("Chattogram");
    expect(html).toContain("Sylhet");
  });

  it("provides dedicated delivery instructions note option and keeps physical address input separate", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        cart={mockCart}
        defaultName="Tanvir Ahmed"
        defaultEmail="tanvir@example.com"
        defaultPhone="01711223344"
      />
    );

    // Dedicated delivery instructions note toggle button is rendered
    expect(html).toContain("+ Add Delivery Instructions / Note");

    // Clean physical address textarea is present separately
    expect(html).toContain('id="shippingStreet"');
    expect(html).toContain("House no, road no, block, area, and nearest landmark");
  });

  it("validates that checkoutSchema accepts optional deliveryNote and enforces 250 character limit", () => {
    const validData = {
      customerName: "Tanvir Ahmed",
      customerEmail: "tanvir@example.com",
      customerPhone: "01711223344",
      shippingStreet: "House 12, Road 4, Dhanmondi",
      shippingCity: "Dhaka",
      shippingCountry: "Bangladesh",
      paymentMethod: "COD" as const,
      deliveryNote: "Please call upon arrival at the gate.",
    };

    const validResult = checkoutSchema.safeParse(validData);
    expect(validResult.success).toBe(true);

    const tooLongData = {
      ...validData,
      deliveryNote: "A".repeat(251),
    };
    const invalidResult = checkoutSchema.safeParse(tooLongData);
    expect(invalidResult.success).toBe(false);
  });
});
