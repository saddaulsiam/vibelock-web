import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import * as inventoryQueries from "../../src/lib/admin/inventory";
import {
  getAdminInventorySummary,
  getAdminInventoryForExport,
} from "../../src/lib/admin/inventory";
import { GET, csvCell, csv } from "../../src/app/api/admin/inventory/export/route";
import { NextRequest } from "next/server";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

const userIds: string[] = [];
const productIds: string[] = [];
const variantIds: string[] = [];

/**
 * Small RFC-4180-compliant CSV parser helper for integration testing.
 * Correctly handles quoted fields containing commas, escaped double quotes (""),
 * and embedded CRLF/LF line breaks without external dependencies.
 */
function parseCsv(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i += 2;
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

describe("Inventory Analytics & CSV Export", () => {
  beforeEach(() => {
    mockSession = { user: { id: "test-admin", role: "ADMIN" } };
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (variantIds.length) {
        await tx.inventoryReservation.deleteMany({ where: { variantId: { in: variantIds } } });
        await tx.inventoryTransaction.deleteMany({ where: { variantId: { in: variantIds } } });
      }
      if (productIds.length) {
        await tx.productVariant.deleteMany({ where: { productId: { in: productIds } } });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      if (userIds.length) {
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }
    });
    variantIds.length = 0;
    productIds.length = 0;
    userIds.length = 0;
  });

  describe("CSV Sanitization & Formula Injection Protection", () => {
    test("preserves finite numeric primitives as numeric CSV text without quote-prefixing", () => {
      // Legitimate negative numeric stock and values must NOT be altered to text
      expect(csvCell(-2)).toBe("-2");
      expect(csvCell(-10.5)).toBe("-10.5");
      expect(csvCell(0)).toBe("0");
      expect(csvCell(42)).toBe("42");
      expect(csvCell(1234.56)).toBe("1234.56");
    });

    test("neutralizes formula injection in untrusted text starting with =, +, -, @ including leading whitespace", () => {
      expect(csvCell("=1+1")).toBe("'=1+1");
      expect(csvCell("+100")).toBe("'+100");
      expect(csvCell("-50")).toBe("'-50");
      expect(csvCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
      expect(csvCell("   =HYPERLINK()")).toBe("'   =HYPERLINK()");
      expect(csvCell("  +cmd|' /C calc'!A0")).toBe("'  +cmd|' /C calc'!A0");
      expect(csvCell(" \t -cmd|' /C calc'!A0")).toBe("' \t -cmd|' /C calc'!A0");
      expect(csvCell("   @alert")).toBe("'   @alert");
      expect(csvCell("-cmd|' /C calc'!A0")).toContain("'-cmd|");
    });

    test("escapes double quotes, commas, and newlines correctly", () => {
      expect(csvCell('Hello, "World"')).toBe('"Hello, ""World"""');
      expect(csvCell("Item 1, Item 2")).toBe('"Item 1, Item 2"');
      expect(csvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(csvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
      expect(csvCell("Safe Text")).toBe("Safe Text");
      expect(csvCell(null)).toBe("");
      expect(csvCell(undefined)).toBe("");
    });

    test("prepends UTF-8 BOM to CSV output for Excel compatibility and supports Unicode", () => {
      const output = csv([
        ["Name", "Stock"],
        ["বাংলা টি-শার্ট (T-Shirt)", 10],
      ]);
      expect(output.charCodeAt(0)).toBe(0xfeff);
      expect(output).toContain("Name,Stock");
      expect(output).toContain("বাংলা টি-শার্ট (T-Shirt),10");
    });

    test("parseCsv helper correctly parses RFC-4180 complex CSV records", () => {
      const sample = csv([
        ["Product Name", "SKU"],
        ['Shirt, "Deluxe"\nSpecial', "SKU-TEST"],
      ]);
      const parsed = parseCsv(sample);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(["Product Name", "SKU"]);
      expect(parsed[1]).toEqual(['Shirt, "Deluxe"\nSpecial', "SKU-TEST"]);
    });
  });

  describe("Inventory Summary Aggregation (getAdminInventorySummary)", () => {
    test("enforces ADMIN role authorization", async () => {
      mockSession = null;
      await expect(getAdminInventorySummary()).rejects.toThrow();

      mockSession = { user: { id: "customer-1", role: "CUSTOMER" } };
      await expect(getAdminInventorySummary()).rejects.toThrow();
    });

    test("accurately computes physical stock, reserved stock, available stock, and estimated cost value", async () => {
      const ts = Date.now().toString();
      const baseline = await getAdminInventorySummary();

      // Variant A: Physical 10, Reserved 3 -> Available 7 (In stock)
      // Cost price: 15.50
      const prodA = await prisma.product.create({
        data: {
          name: `Analytics Prod A ${ts}`,
          slug: `analytics-a-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-A-${ts}`,
              size: "M",
              costPrice: new Prisma.Decimal("15.50"),
              sellingPrice: new Prisma.Decimal("30.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prodA.id);
      const varA = prodA.variants[0];
      variantIds.push(varA.id);

      await prisma.inventoryTransaction.create({
        data: { variantId: varA.id, quantity: 10, type: "RESTOCK", referenceId: `REF-A-${ts}` },
      });
      await prisma.inventoryReservation.create({
        data: {
          variantId: varA.id,
          quantity: 3,
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000), // unexpired
        },
      });

      // Variant B: Physical 4, Reserved 1 -> Available 3 (Low stock: 1..5)
      // Cost price: 20.00
      const prodB = await prisma.product.create({
        data: {
          name: `Analytics Prod B ${ts}`,
          slug: `analytics-b-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-B-${ts}`,
              size: "L",
              costPrice: new Prisma.Decimal("20.00"),
              sellingPrice: new Prisma.Decimal("45.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prodB.id);
      const varB = prodB.variants[0];
      variantIds.push(varB.id);

      await prisma.inventoryTransaction.create({
        data: { variantId: varB.id, quantity: 4, type: "RESTOCK", referenceId: `REF-B-${ts}` },
      });
      await prisma.inventoryReservation.create({
        data: {
          variantId: varB.id,
          quantity: 1,
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      const updated = await getAdminInventorySummary();

      expect(updated.totalPhysicalStock - baseline.totalPhysicalStock).toBe(14); // 10 + 4
      expect(updated.totalReservedStock - baseline.totalReservedStock).toBe(4); // 3 + 1
      expect(updated.totalAvailableStock - baseline.totalAvailableStock).toBe(10); // 7 + 3
      // Est cost value: (10 * 15.50) + (4 * 20.00) = 155 + 80 = 235
      expect(updated.estimatedCostValue - baseline.estimatedCostValue).toBeCloseTo(235.0, 2);
      expect(updated.lowStockCount - baseline.lowStockCount).toBe(1); // Var B available is 3
      expect(updated.totalVariants - baseline.totalVariants).toBe(2);
    });

    test("detects negative-stock anomalies without hiding them from totals or inflating estimated cost", async () => {
      const ts = Date.now().toString();
      const baseline = await getAdminInventorySummary();

      // Negative stock variant: physical -2 (e.g. over-deducted anomaly)
      const prodNeg = await prisma.product.create({
        data: {
          name: `Anomaly Prod ${ts}`,
          slug: `anomaly-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-NEG-${ts}`,
              size: "S",
              costPrice: new Prisma.Decimal("50.00"),
              sellingPrice: new Prisma.Decimal("100.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prodNeg.id);
      const varNeg = prodNeg.variants[0];
      variantIds.push(varNeg.id);

      await prisma.inventoryTransaction.create({
        data: {
          variantId: varNeg.id,
          quantity: -2,
          type: "ADJUSTMENT",
          referenceId: `REF-NEG-${ts}`,
        },
      });

      const updated = await getAdminInventorySummary();

      // 1. Negative physical stock is NOT hidden or clamped from physical / available sums
      expect(updated.totalPhysicalStock - baseline.totalPhysicalStock).toBe(-2);
      expect(updated.totalAvailableStock - baseline.totalAvailableStock).toBe(-2);

      // 2. Estimated cost value ignores negative physical stock (clamps to 0 to prevent negative valuation)
      expect(updated.estimatedCostValue - baseline.estimatedCostValue).toBeCloseTo(0, 2);

      // 3. Negative stock anomaly counter increments
      expect(updated.negativeStockCount - baseline.negativeStockCount).toBe(1);
    });

    test("ignores expired reservations in available and reserved stock totals", async () => {
      const ts = Date.now().toString();
      const baseline = await getAdminInventorySummary();

      const prod = await prisma.product.create({
        data: {
          name: `Expired Reservation Prod ${ts}`,
          slug: `expired-res-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-EXP-RES-${ts}`,
              costPrice: new Prisma.Decimal("10.00"),
              sellingPrice: new Prisma.Decimal("20.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      await prisma.inventoryTransaction.create({
        data: { variantId: variant.id, quantity: 5, type: "RESTOCK", referenceId: `REF-${ts}` },
      });
      // Expired reservation (expired 1 hour ago)
      await prisma.inventoryReservation.create({
        data: {
          variantId: variant.id,
          quantity: 2,
          status: "RESERVED",
          expiresAt: new Date(Date.now() - 3600000),
        },
      });

      const updated = await getAdminInventorySummary();

      // Reserved stock should NOT count expired reservation
      expect(updated.totalReservedStock - baseline.totalReservedStock).toBe(0);
      // Available stock should equal full 5 units
      expect(updated.totalAvailableStock - baseline.totalAvailableStock).toBe(5);
    });
  });

  describe("Inventory Export Query Layer (getAdminInventoryForExport)", () => {
    test("enforces ADMIN role authorization", async () => {
      mockSession = null;
      await expect(getAdminInventoryForExport()).rejects.toThrow();

      mockSession = { user: { id: "customer-1", role: "CUSTOMER" } };
      await expect(getAdminInventoryForExport()).rejects.toThrow();
    });

    test("filters accurately by search term and status", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Filter Test Hoodie ${ts}`,
          slug: `filter-test-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `FILTER-SKU-${ts}`,
              size: "XL",
              color: "Black",
              costPrice: new Prisma.Decimal("25.00"),
              sellingPrice: new Prisma.Decimal("50.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      await prisma.inventoryTransaction.create({
        data: { variantId: variant.id, quantity: 3, type: "RESTOCK", referenceId: `REF-${ts}` },
      });

      // Search by SKU
      const searchResult = await getAdminInventoryForExport({ search: `FILTER-SKU-${ts}` });
      expect(searchResult.items).toHaveLength(1);
      expect(searchResult.items[0].sku).toBe(`FILTER-SKU-${ts}`);
      expect(searchResult.items[0].availableStock).toBe(3);
      expect(searchResult.items[0].status).toBe("Low stock");
      expect(searchResult.isTruncated).toBe(false);

      // Filter by low-stock
      const lowStockResult = await getAdminInventoryForExport({
        search: `FILTER-SKU-${ts}`,
        filter: "low-stock",
      });
      expect(lowStockResult.items).toHaveLength(1);

      // Filter by out-of-stock (should be empty for this variant)
      const oosResult = await getAdminInventoryForExport({
        search: `FILTER-SKU-${ts}`,
        filter: "out-of-stock",
      });
      expect(oosResult.items).toHaveLength(0);
    });
  });

  describe("Inventory Export Route Handler (GET /api/admin/inventory/export)", () => {
    test("enforces ADMIN authorization and rejects unauthorized callers", async () => {
      mockSession = null;
      const unauthReq = new NextRequest("http://localhost:3000/api/admin/inventory/export");
      const unauthRes = await GET(unauthReq);
      expect(unauthRes.status).toBe(401);

      mockSession = { user: { id: "customer-1", role: "CUSTOMER" } };
      const forbiddenReq = new NextRequest("http://localhost:3000/api/admin/inventory/export");
      const forbiddenRes = await GET(forbiddenReq);
      expect(forbiddenRes.status).toBe(403);
    });

    test("returns CSV file with proper headers, preserves negative stock numbers, and formats data for admin", async () => {
      const ts = Date.now().toString();
      mockSession = { user: { id: "admin-1", role: "ADMIN" } };

      // Create product with a normal variant and an anomaly negative variant
      const prod = await prisma.product.create({
        data: {
          name: `Export Target ${ts}`,
          slug: `export-target-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: [
              {
                sku: `EXP-TARGET-A-${ts}`,
                size: "M",
                color: "Navy",
                costPrice: new Prisma.Decimal("12.00"),
                sellingPrice: new Prisma.Decimal("28.00"),
              },
              {
                sku: `EXP-TARGET-NEG-${ts}`,
                size: "S",
                color: "Red",
                costPrice: new Prisma.Decimal("15.00"),
                sellingPrice: new Prisma.Decimal("35.00"),
              },
            ],
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const [varA, varNeg] = prod.variants;
      variantIds.push(varA.id, varNeg.id);

      // Positive restock for varA
      await prisma.inventoryTransaction.create({
        data: { variantId: varA.id, quantity: 8, type: "RESTOCK", referenceId: `REF-${ts}` },
      });

      // Negative adjustment for varNeg
      await prisma.inventoryTransaction.create({
        data: {
          variantId: varNeg.id,
          quantity: -2,
          type: "ADJUSTMENT",
          referenceId: `REF-NEG-${ts}`,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/admin/inventory/export?q=Export Target ${ts}`
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(res.headers.get("Content-Disposition")).toContain(
        'attachment; filename="vibelock-inventory-'
      );
      expect(res.headers.get("X-Inventory-Total-Count")).toBe("2");
      expect(res.headers.get("X-Inventory-Export-Limit")).toBe("5000");
      expect(res.headers.get("X-Inventory-Truncated")).toBe("false");

      const csvText = await res.text();
      const parsedRows = parseCsv(csvText);

      // First row must be the 12-column header
      const expectedHeaders = [
        "Product Name",
        "SKU",
        "Size",
        "Color",
        "Physical Stock",
        "Reserved Stock",
        "Available Stock",
        "Cost Price",
        "Selling Price",
        "Estimated Cost Value (Current Cost)",
        "Estimated Retail Value",
        "Status",
      ];
      expect(parsedRows[0]).toEqual(expectedHeaders);

      // Verify normal positive item
      expect(parsedRows[1]).toEqual([
        `Export Target ${ts}`,
        `EXP-TARGET-A-${ts}`,
        "M",
        "Navy",
        "8",
        "0",
        "8",
        "12.00",
        "28.00",
        "96.00",
        "224.00",
        "In stock",
      ]);

      // Verify negative stock item: physicalStock is -2 as numeric text, NOT quote-prefixed as '-2
      expect(parsedRows[2]).toEqual([
        `Export Target ${ts}`,
        `EXP-TARGET-NEG-${ts}`,
        "S",
        "Red",
        "-2",
        "0",
        "-2",
        "15.00",
        "35.00",
        "0.00",
        "0.00",
        "Out of stock",
      ]);
    });

    test("proves truncated export begins with the header row, has uniform column count with RFC-4180 complex fields, and sets metadata", async () => {
      mockSession = { user: { id: "admin-1", role: "ADMIN" } };

      const spy = vi.spyOn(inventoryQueries, "getAdminInventoryForExport").mockResolvedValueOnce({
        items: [
          {
            id: "mock-v1",
            sku: "MOCK-1",
            size: "M",
            color: "Red",
            productName: "Mock Item, With Commas",
            physicalStock: 10,
            reservedStock: 2,
            availableStock: 8,
            costPrice: 50,
            sellingPrice: 100,
            estimatedCostValue: 500,
            estimatedRetailValue: 1000,
            status: "In stock",
          },
          {
            id: "mock-v2",
            sku: "MOCK-2",
            size: "L",
            color: "Blue",
            productName: 'Mock Item with "Quotes"',
            physicalStock: -3,
            reservedStock: 0,
            availableStock: -3,
            costPrice: 20,
            sellingPrice: 40,
            estimatedCostValue: 0,
            estimatedRetailValue: 0,
            status: "Out of stock",
          },
          {
            id: "mock-v3",
            sku: "MOCK-3",
            size: "XL",
            color: "Green",
            productName: "Mock Item\nWith Embedded\nNewlines",
            physicalStock: 15,
            reservedStock: 1,
            availableStock: 14,
            costPrice: 25,
            sellingPrice: 60,
            estimatedCostValue: 375,
            estimatedRetailValue: 900,
            status: "In stock",
          },
          {
            id: "mock-v4",
            sku: "MOCK-4",
            size: "S",
            color: "Black",
            productName: 'Complex "Combo", Name\nWith Everything',
            physicalStock: 2,
            reservedStock: 0,
            availableStock: 2,
            costPrice: 10,
            sellingPrice: 25,
            estimatedCostValue: 20,
            estimatedRetailValue: 50,
            status: "Low stock",
          },
        ],
        totalCount: 7500,
        isTruncated: true,
        limit: 5000,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/inventory/export?filter=in-stock"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Inventory-Truncated")).toBe("true");
      expect(res.headers.get("X-Inventory-Total-Count")).toBe("7500");
      expect(res.headers.get("X-Inventory-Export-Limit")).toBe("5000");
      expect(res.headers.get("Content-Disposition")).toContain("truncated-5000-of-7500.csv");

      const csvText = await res.text();
      const parsedRows = parseCsv(csvText);

      // 1. Total parsed rows: 1 header row + 4 data rows = 5 rows
      expect(parsedRows).toHaveLength(5);

      // 2. The first CSV row must strictly be the normal 12 column header
      const expectedHeaders = [
        "Product Name",
        "SKU",
        "Size",
        "Color",
        "Physical Stock",
        "Reserved Stock",
        "Available Stock",
        "Cost Price",
        "Selling Price",
        "Estimated Cost Value (Current Cost)",
        "Estimated Retail Value",
        "Status",
      ];
      expect(parsedRows[0]).toEqual(expectedHeaders);

      // 3. Every single row (header + all data rows) must have exactly 12 fields
      const expectedColumnCount = 12;
      for (let r = 0; r < parsedRows.length; r++) {
        expect(
          parsedRows[r].length,
          `Row ${r} should have ${expectedColumnCount} columns, got ${parsedRows[r].length}: ${JSON.stringify(parsedRows[r])}`
        ).toBe(expectedColumnCount);
      }

      // 4. Verify unescaped values for fields with commas, quotes, and newlines
      expect(parsedRows[1][0]).toBe("Mock Item, With Commas");
      expect(parsedRows[2][0]).toBe('Mock Item with "Quotes"');
      expect(parsedRows[3][0]).toBe("Mock Item\nWith Embedded\nNewlines");
      expect(parsedRows[4][0]).toBe('Complex "Combo", Name\nWith Everything');

      // 5. Negative stock number is preserved as numeric text
      expect(parsedRows[2][4]).toBe("-3");

      spy.mockRestore();
    });
  });
});
