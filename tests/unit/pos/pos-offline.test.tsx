import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PosHeader } from "@/components/pos/pos-header";
import { PosCartPanel } from "@/components/pos/pos-cart-panel";
import { findLocalVariant } from "@/components/pos/pos-product-scanner";
import type { PosProductSummary } from "@/lib/pos/pos-types";

describe("POS Phase 8: Offline Network Guard & Connectivity Resilience", () => {
  const sampleCatalogProducts: PosProductSummary[] = [
    {
      id: "prod-1",
      name: "Heavyweight Graphic Tee",
      slug: "heavyweight-graphic-tee",
      categoryIds: ["cat-1"],
      categoryNames: ["T-Shirts"],
      imageUrl: "/tee.jpg",
      minPrice: 1250,
      maxPrice: 1250,
      totalAvailableStock: 8,
      variants: [
        {
          id: "var-1",
          sku: "VL-TEE-BLK-M",
          barcode: "8901234567890",
          size: "M",
          color: "Black",
          sellingPrice: 1250,
          effectivePrice: 1250,
          costPrice: 550,
          availableStock: 8,
        },
        {
          id: "var-2",
          sku: "VL-TEE-BLK-L",
          barcode: "8901234567891",
          size: "L",
          color: "Black",
          sellingPrice: 1250,
          effectivePrice: 1250,
          costPrice: 550,
          availableStock: 0,
        },
      ],
    },
  ];

  describe("Local Catalog In-Memory Variant Matcher (Offline Fallback)", () => {
    test("finds variant by exact SKU (case-insensitive)", () => {
      const match = findLocalVariant("vl-tee-blk-m", sampleCatalogProducts);
      expect(match).not.toBeNull();
      expect(match?.matchedVariant.sku).toBe("VL-TEE-BLK-M");
      expect(match?.matchedVariant.effectivePrice).toBe(1250);
      expect(match?.product.name).toBe("Heavyweight Graphic Tee");
    });

    test("finds variant by barcode", () => {
      const match = findLocalVariant("8901234567891", sampleCatalogProducts);
      expect(match).not.toBeNull();
      expect(match?.matchedVariant.sku).toBe("VL-TEE-BLK-L");
      expect(match?.matchedVariant.size).toBe("L");
    });

    test("returns null if product is not found in catalog", () => {
      const match = findLocalVariant("UNKNOWN-SKU", sampleCatalogProducts);
      expect(match).toBeNull();
    });

    test("returns null if catalog is empty or undefined", () => {
      const match = findLocalVariant("VL-TEE-BLK-M", []);
      expect(match).toBeNull();
    });
  });

  describe("PosHeader Network Indicator", () => {
    test("renders online status pill when connected", () => {
      const html = renderToStaticMarkup(
        <PosHeader cashierName="Siam Ahmed" cashierRole="STAFF" isOnline={true} />
      );

      expect(html).toContain("Online");
      expect(html).not.toContain("Offline");
    });

    test("renders offline warning indicator when disconnected", () => {
      const html = renderToStaticMarkup(
        <PosHeader cashierName="Siam Ahmed" cashierRole="STAFF" isOnline={false} />
      );

      expect(html).toContain("Offline");
      expect(html).toContain("Counter is operating offline");
    });
  });

  describe("PosCartPanel Offline Charge Guard", () => {
    test("renders OFFLINE (LOCKED) button when disconnected", () => {
      const html = renderToStaticMarkup(
        <PosCartPanel
          cartItems={[
            {
              variantId: "var-1",
              productId: "prod-1",
              productName: "Heavyweight Graphic Tee",
              sku: "VL-TEE-BLK-M",
              size: "M",
              color: "Black",
              price: 1250,
              costPrice: 550,
              quantity: 1,
              maxStock: 8,
            },
          ]}
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
          isOnline={false}
        />
      );

      expect(html).toContain("OFFLINE (LOCKED)");
      expect(html).toContain("1250");
    });

    test("renders normal CHARGE button when online", () => {
      const html = renderToStaticMarkup(
        <PosCartPanel
          cartItems={[
            {
              variantId: "var-1",
              productId: "prod-1",
              productName: "Heavyweight Graphic Tee",
              sku: "VL-TEE-BLK-M",
              size: "M",
              color: "Black",
              price: 1250,
              costPrice: 550,
              quantity: 1,
              maxStock: 8,
            },
          ]}
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
          isOnline={true}
        />
      );

      expect(html).toContain("CHARGE ৳1250");
      expect(html).not.toContain("OFFLINE (LOCKED)");
    });
  });
});
