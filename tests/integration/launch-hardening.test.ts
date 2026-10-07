import { afterEach, describe, expect, test, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import nextConfig from "../../next.config";
import prisma from "../../src/lib/prisma/client";
import { createTestProduct, createTestVariant } from "../factories";
import robots from "../../src/app/robots";
import sitemap from "../../src/app/sitemap";
import { NextRequest } from "next/server";
import { metadata as rootMetadata } from "../../src/app/layout";
import { metadata as productsMetadata } from "../../src/app/(storefront)/products/page";
import { generateMetadata as generateCategoryMetadata } from "../../src/app/(storefront)/category/[slug]/page";
import { proxy } from "../../src/proxy";
import {
  default as ProductDetailPage,
  generateMetadata as generateProductMetadata,
} from "../../src/app/(storefront)/products/[slug]/page";

vi.mock("../../src/auth", () => ({ auth: vi.fn() }));
vi.mock("next/font/google", () => ({ Inter: () => ({ variable: "test-font" }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const productIds: string[] = [];
const categoryIds: string[] = [];

async function makeSeoProduct(status: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  const product = await createTestProduct({
    status,
    name: `Launch QA ${crypto.randomUUID()}`,
    description: "SEO fixture description",
  });
  productIds.push(product.id);
  await createTestVariant({
    productId: product.id,
    sellingPrice: new Prisma.Decimal("99.99"),
    discountPrice: new Prisma.Decimal("0.29"),
    costPrice: new Prisma.Decimal("51.25"),
  });
  return product;
}

function findJsonLd(node: ReactNode): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findJsonLd(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;

  const props = node.props as {
    type?: string;
    dangerouslySetInnerHTML?: { __html?: string };
    children?: ReactNode;
  };
  if (node.type === "script" && props.type === "application/ld+json") {
    return props.dangerouslySetInnerHTML?.__html ?? null;
  }
  return findJsonLd(props.children);
}

describe("Phase 3L - Launch Hardening", () => {
  afterEach(async () => {
    if (productIds.length) {
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      productIds.length = 0;
    }
    if (categoryIds.length) {
      await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
      categoryIds.length = 0;
    }
  });

  test("configured security headers match the existing launch policy", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const rule = rules.find((entry) => entry.source === "/(.*)");
    expect(rule).toBeDefined();
    const headers = new Map(rule?.headers.map(({ key, value }) => [key.toLowerCase(), value]));

    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains; preload"
    );
    expect(headers.has("content-security-policy")).toBe(false);
  });

  test("production proxy returns a nonce-based CSP without unsafe-eval", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const request = () => new NextRequest("https://vibelock.com.bd/products");
      const response = proxy(request());
      const repeatedResponse = proxy(request());
      const policy = response.headers.get("content-security-policy") ?? "";
      const repeatedPolicy = repeatedResponse.headers.get("content-security-policy") ?? "";
      const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
      const repeatedNonce = repeatedPolicy.match(/'nonce-([^']+)'/)?.[1];

      expect(nonce).toBeTruthy();
      expect(repeatedNonce).toBeTruthy();
      expect(repeatedNonce).not.toBe(nonce);
      expect(policy).toContain("'strict-dynamic'");
      expect(policy).toContain("style-src-attr 'unsafe-inline'");
      expect(policy).toContain("https://res.cloudinary.com");
      expect(policy).toContain("https://sandbox.sslcommerz.com");
      expect(policy).not.toContain("'unsafe-eval'");
      expect(policy).not.toContain("default-src *");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("production canonical metadata uses the public host for storefront routes", async () => {
    expect(rootMetadata.metadataBase?.toString()).toBe("https://vibelock.com.bd/");
    expect(rootMetadata.alternates?.canonical).toBe("https://vibelock.com.bd");
    expect(productsMetadata.alternates?.canonical).toBe("https://vibelock.com.bd/products");

    const category = await prisma.category.create({
      data: { name: "Launch QA Category", slug: `launch-qa-${crypto.randomUUID()}` },
    });
    categoryIds.push(category.id);
    const metadata = await generateCategoryMetadata({
      params: Promise.resolve({ slug: category.slug }),
    });
    expect(metadata.alternates?.canonical).toBe(
      `https://vibelock.com.bd/category/${category.slug}`
    );
  });

  test("server environment validation rejects missing secrets and malformed configuration safely", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DATABASE_URL", "https://database.invalid");
      vi.stubEnv("AUTH_SECRET", "");
      vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
      vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
      vi.resetModules();
      await expect(import("../../src/lib/config/env")).rejects.toThrow(
        "Invalid server environment variables"
      );

      vi.stubEnv("AUTH_SECRET", "test-secret-that-must-not-be-logged");
      vi.stubEnv("DATABASE_URL", "not-a-database-url");
      vi.resetModules();
      await expect(import("../../src/lib/config/env")).rejects.toThrow(
        "Invalid server environment variables"
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
        "test-secret-that-must-not-be-logged"
      );
    } finally {
      errorLog.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  test("production auth rate limiting fails closed when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "https://database.invalid");
    vi.stubEnv("AUTH_SECRET", "production-test-secret");
    vi.stubEnv("AUTH_GOOGLE_ID", "test-google-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    vi.resetModules();
    try {
      const { checkRateLimit } = await import("../../src/lib/security/rate-limit");
      await expect(checkRateLimit("login")).rejects.toThrow("RATE_LIMIT_ERROR");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  test("published product metadata and JSON-LD expose effective public price only", async () => {
    const product = await makeSeoProduct();
    const metadata = await generateProductMetadata({
      params: Promise.resolve({ slug: product.slug }),
    });
    expect(metadata.title).toBe(product.name);
    expect(metadata.description).toBe("SEO fixture description");
    expect(metadata.openGraph).toMatchObject({ title: `${product.name} | VibeLock` });
    expect(metadata.alternates?.canonical).toBe(`https://vibelock.com.bd/products/${product.slug}`);

    const page = await ProductDetailPage({ params: Promise.resolve({ slug: product.slug }) });
    const jsonLdText = findJsonLd(page);
    expect(jsonLdText).toBeTruthy();
    const jsonLd = JSON.parse(jsonLdText!) as Record<string, unknown>;
    expect(jsonLd).toMatchObject({
      "@type": "Product",
      name: product.name,
      offers: { "@type": "Offer", priceCurrency: "BDT", price: 0.29 },
    });
    expect(JSON.stringify(jsonLd)).not.toMatch(
      /costPrice|gatewayPayload|reservation|inventoryTransaction|providerSecret/i
    );

    await prisma.product.update({ where: { id: product.id }, data: { status: "DRAFT" } });
    expect(
      await generateProductMetadata({ params: Promise.resolve({ slug: product.slug }) })
    ).toEqual({});
  });

  test("sitemap excludes unpublished products and robots keeps private routes disallowed", async () => {
    const published = await makeSeoProduct("PUBLISHED");
    const unpublished = await makeSeoProduct("DRAFT");
    const entries = await sitemap();
    expect(entries.some((entry) => entry.url.endsWith(`/products/${published.slug}`))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith(`/products/${unpublished.slug}`))).toBe(
      false
    );

    const robotsPolicy = robots();
    const policy = Array.isArray(robotsPolicy.rules) ? robotsPolicy.rules[0] : robotsPolicy.rules;
    expect(policy.disallow).toEqual(
      expect.arrayContaining(["/account/", "/checkout/", "/cart/", "/api/"])
    );
    expect(robotsPolicy.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
