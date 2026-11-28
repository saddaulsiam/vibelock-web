import {
  LIFESTYLE_SIZE_GROUPS,
  SIZE_OPTIONS,
  calculateProfitMargin,
  comboKey,
  generateSku,
} from "@/components/admin/products/product-variant-generator";
import { slugify } from "@/lib/admin/catalog/catalog-action-helpers";
import { describe, expect, it } from "vitest";

describe("Product Form Improvements & Lifestyle Presets", () => {
  it("provides comprehensive size presets for all lifestyle categories", () => {
    expect(LIFESTYLE_SIZE_GROUPS.apparel.sizes).toContain("XS");
    expect(LIFESTYLE_SIZE_GROUPS.apparel.sizes).toContain("XXXL");
    expect(LIFESTYLE_SIZE_GROUPS.bottoms.sizes).toEqual([
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
    ]);
    expect(LIFESTYLE_SIZE_GROUPS.footwear.sizes).toContain("42");
    expect(LIFESTYLE_SIZE_GROUPS.accessories.sizes).toEqual(["One Size", "Free Size"]);

    // SIZE_OPTIONS includes all group options
    for (const size of LIFESTYLE_SIZE_GROUPS.footwear.sizes) {
      expect(SIZE_OPTIONS).toContain(size);
    }
  });

  it("handles Bengali and Unicode product titles with clean URL slug fallbacks", () => {
    // English title
    expect(slugify("Heavyweight Boxy Tee")).toBe("heavyweight-boxy-tee");

    // Pure Bengali title produces a valid, URL-safe slug instead of empty string
    const banglaSlug = slugify("প্রিমিয়াম ব্ল্যাক হুডি");
    expect(banglaSlug).toMatch(/^item-[a-z0-9]+$/);
    expect(banglaSlug.length).toBeGreaterThan(4);

    // Mixed English + Bengali title
    const mixedSlug = slugify("VibeLock হুডি Black");
    expect(mixedSlug).toBe("vibelock-black");
  });

  it("calculates profit margin and loss warnings correctly", () => {
    // Normal profit
    const normal = calculateProfitMargin("500", "1200", "");
    expect(normal).not.toBeNull();
    expect(normal?.profit).toBe(700);
    expect(normal?.isLoss).toBe(false);

    // Selling below cost
    const loss = calculateProfitMargin("1500", "1200", "");
    expect(loss).not.toBeNull();
    expect(loss?.profit).toBe(-300);
    expect(loss?.isLoss).toBe(true);

    // Discount price takes precedence as effective selling price
    const withDiscount = calculateProfitMargin("500", "1200", "900");
    expect(withDiscount?.profit).toBe(400);
    expect(withDiscount?.effective).toBe(900);
  });

  it("generates clean, URL-safe SKUs for lifestyle products", () => {
    const sku = generateSku("Heavyweight Hoodie", "XL", "Black");
    expect(sku).toBe("HEAVYWEIGHT-HO-BLACK-XL");

    const accessorySku = generateSku("Leather Bifold Wallet", "One Size", "Tan");
    expect(accessorySku).toContain("LEATHER-BIFOLD");
    expect(accessorySku).toContain("TAN");
  });

  it("generates consistent comboKey for size and color", () => {
    expect(comboKey("L", "Black")).toBe("l::black");
    expect(comboKey("  XL  ", " Olive ")).toBe("xl::olive");
  });
});
