import { describe, expect, it } from "vitest";
import {
  serializeJsonLd,
  toAbsoluteUrl,
  getOrganizationJsonLd,
  getLocalBusinessJsonLd,
  getCategoryBreadcrumbJsonLd,
  getProductBreadcrumbJsonLd,
  getProductJsonLd,
} from "@/lib/seo/json-ld";
import { ProductStatus } from "@prisma/client";
import type { ProductDetail } from "@/lib/catalog/types";

describe("Phase 3 SEO: JSON-LD Serialization Safety", () => {
  it("escapes '<' characters to prevent script tag injection", () => {
    const maliciousPayload = {
      name: "Tee </script><script>alert('xss')</script>",
      description: "Sample <style> body { display:none } </style>",
    };

    const serialized = serializeJsonLd(maliciousPayload);

    expect(serialized).not.toContain("<script>");
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<style>");
    expect(serialized).toContain("\\u003cscript>");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("converts relative image paths to absolute URLs", () => {
    expect(toAbsoluteUrl("/images/cat.jpg")).toBe("https://vibelock.bd/images/cat.jpg");
    expect(toAbsoluteUrl("images/cat.jpg")).toBe("https://vibelock.bd/images/cat.jpg");
    expect(toAbsoluteUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg")).toBe(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
  });
});

describe("Phase 3 SEO: Organization JSON-LD", () => {
  it("generates valid Organization schema with verified brand details", () => {
    const org = getOrganizationJsonLd();

    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("VibeLock");
    expect(org.url).toBe("https://vibelock.bd");
    expect(org.logo).toBe("https://vibelock.bd/logo/icon/vl_icon_square_dark.png");

    // Verified social links
    expect(org.sameAs).toContain("https://facebook.com/vibelock.bd");
    expect(org.sameAs).toContain("https://instagram.com/vibelock.bd");
    expect(org.sameAs).toContain("https://wa.me/+8801311333277");
    expect(org.sameAs).toContain("https://tiktok.com/@vibelock.bd");
    expect(org.sameAs).toContain("https://youtube.com/@vibelock.bd");

    // Verified contact point
    expect(org.contactPoint[0]["@type"]).toBe("ContactPoint");
    expect(org.contactPoint[0].telephone).toBe("+8801311333277");
    expect(org.contactPoint[0].email).toBe("support@vibelock.bd");
    expect(org.contactPoint[0].areaServed).toBe("BD");
  });
});

describe("Phase 3 SEO: LocalBusiness JSON-LD", () => {
  it("generates ClothingStore schema using verified Chatmohar outlet details without fabricated fields", () => {
    const business = getLocalBusinessJsonLd();

    expect(business["@context"]).toBe("https://schema.org");
    expect(business["@type"]).toBe("ClothingStore");
    expect(business.name).toBe("VibeLock Flagship Outlet");
    expect(business.telephone).toBe("+8801311333277");
    expect(business.hasMap).toBe("https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6");
    expect(business.address.streetAddress).toBe("Khondokar Market, Star More");
    expect(business.address.addressLocality).toBe("Chatmohar");
    expect(business.address.addressRegion).toBe("Pabna");
    expect(business.address.addressCountry).toBe("BD");

    // Verified opening hours: 10:00 to 22:00
    expect(business.openingHoursSpecification[0].opens).toBe("10:00");
    expect(business.openingHoursSpecification[0].closes).toBe("22:00");

    // Confirm no fabricated postal code or geo coordinates
    expect("postalCode" in business.address).toBe(false);
    expect("geo" in business).toBe(false);
    expect("aggregateRating" in business).toBe(false);
  });
});

describe("Phase 3 SEO: BreadcrumbList JSON-LD", () => {
  it("generates valid category breadcrumb hierarchy", () => {
    const breadcrumb = getCategoryBreadcrumbJsonLd({
      name: "Oversized T-Shirts",
      slug: "oversized-t-shirts",
    });

    expect(breadcrumb["@context"]).toBe("https://schema.org");
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toHaveLength(3);

    expect(breadcrumb.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://vibelock.bd",
    });
    expect(breadcrumb.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Shop",
      item: "https://vibelock.bd/shop",
    });
    expect(breadcrumb.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Oversized T-Shirts",
      item: "https://vibelock.bd/category/oversized-t-shirts",
    });
  });

  it("generates valid product breadcrumb hierarchy with category", () => {
    const breadcrumb = getProductBreadcrumbJsonLd({
      name: "Acid Wash Heavyweight Tee",
      slug: "acid-wash-heavyweight-tee",
      category: {
        name: "Oversized T-Shirts",
        slug: "oversized-t-shirts",
      },
    });

    expect(breadcrumb.itemListElement).toHaveLength(4);
    expect(breadcrumb.itemListElement[2].item).toBe(
      "https://vibelock.bd/category/oversized-t-shirts"
    );
    expect(breadcrumb.itemListElement[3].item).toBe(
      "https://vibelock.bd/product/acid-wash-heavyweight-tee"
    );
  });

  it("generates valid product breadcrumb hierarchy without category", () => {
    const breadcrumb = getProductBreadcrumbJsonLd({
      name: "Acid Wash Heavyweight Tee",
      slug: "acid-wash-heavyweight-tee",
      category: null,
    });

    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(breadcrumb.itemListElement[0].name).toBe("Home");
    expect(breadcrumb.itemListElement[1].name).toBe("Shop");
    expect(breadcrumb.itemListElement[2].name).toBe("Acid Wash Heavyweight Tee");
  });
});

describe("Phase 3 SEO: Product + Offer + AggregateRating JSON-LD", () => {
  const baseMockProduct: ProductDetail = {
    id: "prod-1",
    name: "Heavyweight Boxy Tee",
    slug: "heavyweight-boxy-tee",
    description: "260 GSM organic cotton heavyweight streetwear tee.",
    status: ProductStatus.PUBLISHED,
    primaryImage: { url: "/uploads/tee.jpg", alt: "Front view", isPrimary: true },
    images: [{ url: "/uploads/tee.jpg", alt: "Front view", isPrimary: true }],
    minPrice: 1650,
    maxPrice: 1650,
    hasDiscount: false,
    categories: [
      { id: "cat-1", name: "T-Shirts", slug: "t-shirts", description: null, imageUrl: null },
    ],
    available: true,
    variants: [
      {
        id: "var-1",
        sku: "VL-TEE-BLK-M",
        size: "M",
        color: "Black",
        sellingPrice: 1650,
        discountPrice: null,
        effectivePrice: 1650,
        available: true,
      },
    ],
  };

  it("generates single Offer when minPrice === maxPrice", () => {
    const jsonLd = getProductJsonLd(baseMockProduct);

    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe("Heavyweight Boxy Tee");
    expect(jsonLd.url).toBe("https://vibelock.bd/product/heavyweight-boxy-tee");
    expect(jsonLd.brand).toEqual({ "@type": "Brand", name: "VibeLock" });
    expect(jsonLd.sku).toBe("VL-TEE-BLK-M");
    expect(jsonLd.image).toEqual(["https://vibelock.bd/uploads/tee.jpg"]);

    interface TestOffer {
      "@type": string;
      price?: number;
      lowPrice?: number;
      highPrice?: number;
      priceCurrency?: string;
      offerCount?: number;
      availability?: string;
      url?: string;
      itemCondition?: string;
      seller?: { "@type": string; name: string };
    }

    const offers = jsonLd.offers as TestOffer;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe(1650);
    expect(offers.priceCurrency).toBe("BDT");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toBe("https://vibelock.bd/product/heavyweight-boxy-tee");
    expect(offers.itemCondition).toBe("https://schema.org/NewCondition");
    expect(offers.seller).toEqual({ "@type": "Organization", name: "VibeLock" });
  });

  it("generates AggregateOffer when minPrice !== maxPrice", () => {
    const multiPriceProduct: ProductDetail = {
      ...baseMockProduct,
      minPrice: 1650,
      maxPrice: 1950,
      variants: [
        {
          id: "var-1",
          sku: "VL-TEE-M",
          size: "M",
          color: "Black",
          sellingPrice: 1650,
          discountPrice: null,
          effectivePrice: 1650,
          available: true,
        },
        {
          id: "var-2",
          sku: "VL-TEE-L",
          size: "L",
          color: "Black",
          sellingPrice: 1950,
          discountPrice: null,
          effectivePrice: 1950,
          available: true,
        },
      ],
    };

    const jsonLd = getProductJsonLd(multiPriceProduct);
    const offers = jsonLd.offers as {
      "@type": string;
      lowPrice: number;
      highPrice: number;
      priceCurrency: string;
      offerCount: number;
      availability: string;
    };

    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.lowPrice).toBe(1650);
    expect(offers.highPrice).toBe(1950);
    expect(offers.priceCurrency).toBe("BDT");
    expect(offers.offerCount).toBe(2);
    expect(offers.availability).toBe("https://schema.org/InStock");
  });

  it("sets OutOfStock availability when product.available is false", () => {
    const outOfStockProduct: ProductDetail = {
      ...baseMockProduct,
      available: false,
    };

    const jsonLd = getProductJsonLd(outOfStockProduct);
    const offers = jsonLd.offers as { availability: string };

    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("omits offers when minPrice is zero or unavailable", () => {
    const unpricedProduct: ProductDetail = {
      ...baseMockProduct,
      minPrice: 0,
      maxPrice: 0,
    };

    const jsonLd = getProductJsonLd(unpricedProduct);
    expect(jsonLd.offers).toBeUndefined();
  });

  it("omits sku when no variant SKU exists", () => {
    const noSkuProduct: ProductDetail = {
      ...baseMockProduct,
      variants: [],
    };

    const jsonLd = getProductJsonLd(noSkuProduct);
    expect(jsonLd.sku).toBeUndefined();
  });

  it("includes AggregateRating only when genuine reviews exist", () => {
    const jsonLdWithReviews = getProductJsonLd(baseMockProduct, {
      totalReviews: 8,
      averageRating: 4.8,
    });

    expect(jsonLdWithReviews.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 8,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("strictly omits AggregateRating when totalReviews is 0 (no fabrication)", () => {
    const jsonLdZeroReviews = getProductJsonLd(baseMockProduct, {
      totalReviews: 0,
      averageRating: 0,
    });

    expect(jsonLdZeroReviews.aggregateRating).toBeUndefined();
  });

  it("strictly omits AggregateRating when reviewSummary is undefined", () => {
    const jsonLdNoSummary = getProductJsonLd(baseMockProduct);
    expect(jsonLdNoSummary.aggregateRating).toBeUndefined();
  });
});
