import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VariantSelector } from "@/components/storefront/product/variant-selector";
import { mapVariant } from "@/lib/catalog/mappers";
import { Prisma } from "@prisma/client";

// Mock dependent components
vi.mock("@/components/storefront/product/add-to-cart-button", () => ({
  AddToCartButton: ({ quantity, isAvailable }: { quantity: number; isAvailable: boolean }) => (
    <button data-testid="add-to-cart" disabled={!isAvailable}>
      Add {quantity} to Cart
    </button>
  ),
}));

vi.mock("@/components/storefront/product/buy-now-button", () => ({
  BuyNowButton: ({ quantity, isAvailable }: { quantity: number; isAvailable: boolean }) => (
    <button data-testid="buy-now" disabled={!isAvailable}>
      Buy {quantity} Now
    </button>
  ),
}));

vi.mock("@/components/storefront/product/product-wishlist-button", () => ({
  ProductWishlistButton: () => <button>Wishlist</button>,
}));

vi.mock("@/components/storefront/product/product-share-button", () => ({
  ProductShareButton: () => <button>Share</button>,
}));

vi.mock("@/components/storefront/product/size-guide-modal", () => ({
  SizeGuideModal: () => <div>Size Guide Modal</div>,
}));

vi.mock("@/components/storefront/product/product-trust-badges", () => ({
  ProductTrustBadges: () => <div>Trust Badges</div>,
}));

vi.mock("@/components/storefront/product/product-info-accordion", () => ({
  ProductInfoAccordion: () => <div>Accordion</div>,
}));

describe("Storefront PDP VariantSelector Enhancements", () => {
  const sampleVariants = [
    {
      id: "var-1",
      sku: "VL-TEE-BLK-M",
      size: "M",
      color: "Black",
      sellingPrice: 1200,
      discountPrice: 999,
      effectivePrice: 999,
      available: true,
      stock: 2, // Low stock triggers scarcity FOMO
    },
    {
      id: "var-2",
      sku: "VL-TEE-WHT-L",
      size: "L",
      color: "White",
      sellingPrice: 1200,
      discountPrice: null,
      effectivePrice: 1200,
      available: true,
      stock: 15, // Plenty of stock
    },
  ];

  it("renders interactive quantity selector with initial quantity 1", () => {
    const html = renderToStaticMarkup(
      <VariantSelector
        variants={sampleVariants}
        productAvailable={true}
        productSlug="vibe-heavy-tee"
        productName="Vibe Heavyweight Tee"
        description="Premium tee"
      />
    );

    // Quantity section
    expect(html).toContain("Quantity");
    expect(html).toContain('aria-label="Decrease quantity"');
    expect(html).toContain('aria-label="Increase quantity"');
    expect(html).toContain("Add 1 to Cart");
    expect(html).toContain("Buy 1 Now");
  });

  it("renders active variant SKU with 1-click copy trigger", () => {
    const html = renderToStaticMarkup(
      <VariantSelector
        variants={sampleVariants}
        productAvailable={true}
        productSlug="vibe-heavy-tee"
        productName="Vibe Heavyweight Tee"
        description="Premium tee"
      />
    );

    // SKU display & copy button
    expect(html).toContain("SKU:");
    expect(html).toContain("VL-TEE-BLK-M");
    expect(html).toContain('aria-label="Copy SKU"');
  });

  it("renders WhatsApp Direct Order button", () => {
    const html = renderToStaticMarkup(
      <VariantSelector
        variants={sampleVariants}
        productAvailable={true}
        productSlug="vibe-heavy-tee"
        productName="Vibe Heavyweight Tee"
        description="Premium tee"
      />
    );

    expect(html).toContain("Order via WhatsApp");
  });

  it("displays scarcity / FOMO stock warning when stock is low (<=3)", () => {
    const html = renderToStaticMarkup(
      <VariantSelector
        variants={sampleVariants}
        productAvailable={true}
        productSlug="vibe-heavy-tee"
        productName="Vibe Heavyweight Tee"
        description="Premium tee"
      />
    );

    expect(html).toContain("Only 2 left in M — Selling Fast!");
  });

  it("displays standard in-stock status when stock is plentiful (>3)", () => {
    const plentifulVariant = [
      {
        id: "var-2",
        sku: "VL-TEE-WHT-L",
        size: "L",
        color: "White",
        sellingPrice: 1200,
        discountPrice: null,
        effectivePrice: 1200,
        available: true,
        stock: 20,
      },
    ];

    const html = renderToStaticMarkup(
      <VariantSelector
        variants={plentifulVariant}
        productAvailable={true}
        productSlug="vibe-heavy-tee"
        productName="Vibe Heavyweight Tee"
        description="Premium tee"
      />
    );

    expect(html).toContain("In Stock (Ready for Dispatch)");
    expect(html).not.toContain("Selling Fast");
  });
});

describe("Catalog Mapper stock computation", () => {
  it("calculates available stock and available flag accurately from transactions and reservations", () => {
    const mockPrismaVariant = {
      id: "var-1",
      productId: "prod-1",
      sku: "VL-HD-BLK-XL",
      size: "XL",
      color: "Black",
      weight: new Prisma.Decimal(0.75),
      costPrice: new Prisma.Decimal(600),
      sellingPrice: new Prisma.Decimal(1500),
      discountPrice: new Prisma.Decimal(1350),
      createdAt: new Date(),
      updatedAt: new Date(),
      inventoryTransactions: [
        { id: "tx-1", quantity: 10 },
        { id: "tx-2", quantity: -2 },
      ],
      inventoryReservations: [
        { id: "res-1", quantity: 3, expiresAt: new Date(Date.now() + 60000) }, // Active reservation
        { id: "res-2", quantity: 5, expiresAt: new Date(Date.now() - 60000) }, // Expired reservation
      ],
    };

    // totalStock = 10 - 2 = 8
    // active reservations = 3
    // available stock = 8 - 3 = 5
    const mapped = mapVariant(mockPrismaVariant as never);

    expect(mapped.stock).toBe(5);
    expect(mapped.available).toBe(true);
    expect(mapped.effectivePrice).toBe(1350);
  });
});
