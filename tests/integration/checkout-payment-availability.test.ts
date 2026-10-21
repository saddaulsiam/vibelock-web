import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type { CartDTO } from "@/lib/cart/types";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/checkout",
}));

// Mock Next image to simple img tag for renderToString
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

// Mock server actions used inside checkout form
vi.mock("@/lib/checkout/actions", () => ({
  createOrderAction: vi.fn(),
  getShippingMethodsAction: vi.fn(async () => ({ success: true, methods: [] })),
  validateCouponAction: vi.fn(),
}));

const mockCart: CartDTO = {
  id: "cart-mock-uuid",
  items: [
    {
      id: "item-1",
      variantId: "var-1",
      quantity: 1,
      availableQuantity: 5,
      productSlug: "vibelock-essential-tee",
      productName: "VibeLock Essential Tee",
      productImage: null,
      lineTotal: 990,
      variant: {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        sellingPrice: 990,
        discountPrice: null,
        effectivePrice: 990,
        available: true,
      },
    },
  ],
  totalQuantity: 1,
  subtotal: 990,
};

describe("VibeLock Stage 5 — Checkout Payment Availability Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Storefront CheckoutForm UI Component Rendering", () => {
    test("renders both COD and Online radios when both are active", () => {
      const availableMethods = [
        {
          value: "COD" as const,
          title: "Cash on delivery",
          detail: "Pay when your order arrives.",
        },
        {
          value: "ONLINE" as const,
          title: "Online payment",
          detail: "Pay securely via cards and banking.",
        },
      ];

      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: availableMethods,
        })
      );

      expect(html).toContain('value="COD"');
      expect(html).toContain("Cash on delivery");
      expect(html).toContain('value="ONLINE"');
      expect(html).toContain("Online payment");
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });

    test("renders COD only when Online is disabled", () => {
      const availableMethods = [
        {
          value: "COD" as const,
          title: "Cash on delivery",
          detail: "Pay when your order arrives.",
        },
      ];

      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: availableMethods,
        })
      );

      expect(html).toContain('value="COD"');
      expect(html).toContain("Cash on delivery");
      expect(html).not.toContain('value="ONLINE"');
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });

    test("renders Online only when COD is disabled", () => {
      const availableMethods = [
        {
          value: "ONLINE" as const,
          title: "Online payment",
          detail: "Pay securely via cards and banking.",
        },
      ];

      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: availableMethods,
        })
      );

      expect(html).toContain('value="ONLINE"');
      expect(html).toContain("Online payment");
      expect(html).not.toContain('value="COD"');
      expect(html).not.toContain("Cash on delivery");
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });

    test("renders COD, Online, and bKash radios when all are active", () => {
      const availableMethods = [
        {
          value: "COD" as const,
          title: "Cash on delivery",
          detail: "Pay when your order arrives.",
        },
        {
          value: "ONLINE" as const,
          title: "Online payment",
          detail: "Pay securely via cards and banking.",
        },
        { value: "BKASH" as const, title: "bKash", detail: "Pay directly with your bKash wallet." },
      ];

      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: availableMethods,
        })
      );

      expect(html).toContain('value="COD"');
      expect(html).toContain("Cash on delivery");
      expect(html).toContain('value="ONLINE"');
      expect(html).toContain("Online payment");
      expect(html).toContain('value="BKASH"');
      expect(html).toContain("bKash");
      expect(html).toContain("Pay directly with your bKash wallet.");
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });

    test("renders bKash only when COD and Online are disabled", () => {
      const availableMethods = [
        { value: "BKASH" as const, title: "bKash", detail: "Pay directly with your bKash wallet." },
      ];

      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: availableMethods,
        })
      );

      expect(html).toContain('value="BKASH"');
      expect(html).toContain("bKash");
      expect(html).not.toContain('value="COD"');
      expect(html).not.toContain('value="ONLINE"');
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });

    test("explicit empty array: shows unavailable message, hides all radios, and disables submission", () => {
      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: [], // Explicitly empty array
        })
      );

      // Warning alert is displayed
      expect(html).toContain(
        "Checkout is currently unavailable as no payment methods are active. Please contact support."
      );

      // Zero payment radio inputs rendered
      expect(html).not.toContain('value="COD"');
      expect(html).not.toContain('value="ONLINE"');
      expect(html).not.toContain('name="paymentMethod"');

      // Submit button has disabled attribute and indicates payment unavailable
      expect(html).toContain("disabled");
      expect(html).toContain("Payment unavailable");

      // Clear helper warning beneath button
      expect(html).toContain(
        "Orders cannot be placed right now because no payment methods are currently active."
      );
    });

    test("omitted prop (undefined): preserves intended fallback behavior for legacy callers", () => {
      const html = renderToString(
        React.createElement(CheckoutForm, {
          cart: mockCart,
          defaultEmail: "customer@vibelock.com",
          defaultName: "Dhaka Customer",
          availablePaymentMethods: undefined, // Omitted
        })
      );

      // Falls back to standard COD and Online options
      expect(html).toContain('value="COD"');
      expect(html).toContain('value="ONLINE"');
      expect(html).not.toContain(
        "Checkout is currently unavailable as no payment methods are active"
      );
    });
  });
});
