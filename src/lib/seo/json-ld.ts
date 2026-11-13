import { SITE_URL } from "./site";
import type { ProductDetail, CategorySummary } from "@/lib/catalog/types";

/**
 * Safely serializes JSON-LD object to string, escaping '<' to prevent script injection.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Helper to ensure image URLs are absolute URLs for Schema.org consumption.
 */
export function toAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Organization structured data (Schema.org Organization).
 * Uses strictly verified brand, social profile, and contact information.
 */
export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VibeLock",
    url: SITE_URL,
    logo: `${SITE_URL}/logo/icon/vl_icon_square_dark.png`,
    description:
      "Bangladesh men's streetwear brand for modern Dhaka youth. Minimal, confident, and premium.",
    sameAs: [
      "https://facebook.com/vibelock.bd",
      "https://instagram.com/vibelock.bd",
      "https://wa.me/+8801311333277",
      "https://tiktok.com/@vibelock.bd",
      "https://youtube.com/@vibelock.bd",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+8801311333277",
        contactType: "customer service",
        email: "support@vibelock.bd",
        areaServed: "BD",
        availableLanguage: ["en", "bn"],
      },
    ],
  };
}

/**
 * LocalBusiness (ClothingStore) structured data for VibeLock Flagship Outlet.
 * Note on missing data:
 * - Exact postal code is omitted (not specified in codebase).
 * - Exact latitude / longitude coordinates are omitted (not specified in codebase).
 * - Store reviews are omitted (no offline store review system in place).
 */
export function getLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "VibeLock Flagship Outlet",
    description: "Official physical retail flagship outlet of VibeLock in Pabna, Bangladesh.",
    url: `${SITE_URL}/contact`,
    telephone: "+8801311333277",
    hasMap: "https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Khondokar Market, Star More",
      addressLocality: "Chatmohar",
      addressRegion: "Pabna",
      addressCountry: "BD",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "22:00",
      },
    ],
  };
}

/**
 * Category BreadcrumbList JSON-LD
 */
export function getCategoryBreadcrumbJsonLd(category: { name: string; slug: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_URL}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${SITE_URL}/category/${category.slug}`,
      },
    ],
  };
}

/**
 * Product BreadcrumbList JSON-LD
 */
export function getProductBreadcrumbJsonLd(product: {
  name: string;
  slug: string;
  category?: { name: string; slug: string } | null;
}) {
  const items: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Shop",
      item: `${SITE_URL}/shop`,
    },
  ];

  if (product.category) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: product.category.name,
      item: `${SITE_URL}/category/${product.category.slug}`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.name,
    item: `${SITE_URL}/product/${product.slug}`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Product and Offer JSON-LD structured data.
 * - Adds SKU only when available from variants.
 * - Adds Offer only when actual prices and stock are available.
 * - Currency is strictly BDT.
 * - Adds AggregateRating ONLY when actual verified reviews exist (totalReviews > 0).
 */
export function getProductJsonLd(
  product: ProductDetail,
  reviewSummary?: { totalReviews: number; averageRating: number }
) {
  const canonicalUrl = `${SITE_URL}/product/${product.slug}`;
  const images = (product.images || [])
    .map((img) => toAbsoluteUrl(img.url))
    .filter(Boolean);

  // Fallback to primaryImage if images array is empty
  if (images.length === 0 && product.primaryImage?.url) {
    images.push(toAbsoluteUrl(product.primaryImage.url));
  }

  const primarySku = product.variants?.[0]?.sku || undefined;

  let offers: Record<string, unknown> | undefined = undefined;

  if (product.minPrice && product.minPrice > 0) {
    const isSinglePrice = product.minPrice === product.maxPrice;
    const availability = product.available
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

    if (isSinglePrice) {
      offers = {
        "@type": "Offer",
        price: product.minPrice,
        priceCurrency: "BDT",
        availability,
        url: canonicalUrl,
        itemCondition: "https://schema.org/NewCondition",
        seller: {
          "@type": "Organization",
          name: "VibeLock",
        },
      };
    } else {
      offers = {
        "@type": "AggregateOffer",
        lowPrice: product.minPrice,
        highPrice: product.maxPrice,
        priceCurrency: "BDT",
        offerCount: product.variants?.length || 1,
        availability,
        url: canonicalUrl,
      };
    }
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    url: canonicalUrl,
    image: images.length > 0 ? images : undefined,
    brand: {
      "@type": "Brand",
      name: "VibeLock",
    },
  };

  if (primarySku) {
    jsonLd.sku = primarySku;
  }

  if (offers) {
    jsonLd.offers = offers;
  }

  // Only add AggregateRating if genuine review data exists
  if (reviewSummary && reviewSummary.totalReviews > 0 && reviewSummary.averageRating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.averageRating,
      reviewCount: reviewSummary.totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}
