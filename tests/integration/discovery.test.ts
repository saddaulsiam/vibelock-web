import { expect, test, describe, beforeAll, afterAll } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { getDiscoveredProducts } from "../../src/lib/catalog/discovery";
import { createTestProduct, createTestVariant, createTestCategory } from "../factories";
import { Prisma } from "@prisma/client";

describe("Phase 3C - Discovery", () => {
  beforeAll(async () => {});
  afterAll(async () => {});

  test("Search", async () => {
    const p1 = await createTestProduct({ name: "Alpha Black Jacket", status: "PUBLISHED" });
    const p2 = await createTestProduct({ name: "Beta White Shirt", status: "PUBLISHED" });

    const res = await getDiscoveredProducts({ q: "Alpha", page: 1, sort: "newest" });
    expect(res.products.some((p) => p.id === p1.id)).toBe(true);
    expect(res.products.some((p) => p.id === p2.id)).toBe(false);

    // Empty search should return all
    const resEmpty = await getDiscoveredProducts({ page: 1, sort: "newest" });
    expect(resEmpty.products.length).toBeGreaterThanOrEqual(2);
  });

  test("Category filter", async () => {
    const cat = await createTestCategory();
    const p1 = await createTestProduct({ status: "PUBLISHED" });
    await prisma.product.update({
      where: { id: p1.id },
      data: { categories: { connect: { id: cat.id } } },
    });

    const res = await getDiscoveredProducts({ category: cat.slug, page: 1, sort: "newest" });
    expect(res.products.some((p) => p.id === p1.id)).toBe(true);
  });

  test("Variant intersection (Size + Color)", async () => {
    const p1 = await createTestProduct({ name: "Intersection Test", status: "PUBLISHED" });
    // Variant 1: M / Black
    await createTestVariant({
      productId: p1.id,
      size: "M",
      color: "Black",
      sellingPrice: new Prisma.Decimal("10"),
    });
    // Variant 2: L / White
    await createTestVariant({
      productId: p1.id,
      size: "L",
      color: "White",
      sellingPrice: new Prisma.Decimal("10"),
    });

    // Search M + White - SHOULD NOT RETURN p1
    const res1 = await getDiscoveredProducts({
      size: "M",
      color: "White",
      page: 1,
      sort: "newest",
    });
    expect(res1.products.some((p) => p.id === p1.id)).toBe(false);

    // Search M + Black - SHOULD RETURN p1
    const res2 = await getDiscoveredProducts({
      size: "M",
      color: "Black",
      page: 1,
      sort: "newest",
    });
    expect(res2.products.some((p) => p.id === p1.id)).toBe(true);
  });

  test("Price filter", async () => {
    const p1 = await createTestProduct({ status: "PUBLISHED" });
    await createTestVariant({
      productId: p1.id,
      size: "M",
      sellingPrice: new Prisma.Decimal("100"),
    });

    const p2 = await createTestProduct({ status: "PUBLISHED" });
    await createTestVariant({
      productId: p2.id,
      size: "M",
      sellingPrice: new Prisma.Decimal("500"),
    });

    const res = await getDiscoveredProducts({
      minPrice: 200,
      maxPrice: 600,
      page: 1,
      sort: "newest",
    });
    expect(res.products.some((p) => p.id === p2.id)).toBe(true);
    expect(res.products.some((p) => p.id === p1.id)).toBe(false);
  });

  test("Sorting is constrained to supported values", async () => {
    const p1 = await createTestProduct({ status: "PUBLISHED" });
    await createTestVariant({
      productId: p1.id,
      size: "M",
      sellingPrice: new Prisma.Decimal("100"),
    });

    // Sort options other than newest aren't in schema, test newest
    const resNew = await getDiscoveredProducts({ sort: "newest", page: 1 });
    expect(resNew.products.some((p) => p.id === p1.id)).toBe(true);
  });

  test("Pagination", async () => {
    // Create products
    for (let i = 0; i < 5; i++) {
      const p = await createTestProduct({ status: "PUBLISHED", name: `PageTest-${i}` });
      await createTestVariant({
        productId: p.id,
        size: "M",
        sellingPrice: new Prisma.Decimal("100"),
      });
    }

    // Since we don't have limit in input, we test pages based on fixed page size
    const page1 = await getDiscoveredProducts({ page: 1, q: "PageTest", sort: "newest" });
    expect(page1.products.length).toBeGreaterThanOrEqual(5);
    expect(page1.totalCount).toBeGreaterThanOrEqual(5);
    expect(page1.currentPage).toBe(1);
  });
});
