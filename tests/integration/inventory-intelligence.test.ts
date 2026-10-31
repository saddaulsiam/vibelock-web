import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import {
  getAdminInventoryIntelligence,
  getAdminInventoryIntelligenceForExport,
} from "../../src/lib/admin/inventory";
import { GET, csvCell, csv } from "../../src/app/api/admin/inventory-intelligence/export/route";
import { NextRequest } from "next/server";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

const userIds: string[] = [];
const orderIds: string[] = [];
const productIds: string[] = [];
const variantIds: string[] = [];

/**
 * Small RFC-4180-compliant CSV parser helper for integration testing.
 */
function parseCsv(csvText: string): string[][] {
  const text = csvText.replace(/^﻿/, "");
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

describe("Inventory Intelligence Analytics & Export (Phase 3D)", () => {
  beforeEach(() => {
    mockSession = { user: { id: "test-admin", role: "ADMIN" } };
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (variantIds.length) {
        await tx.inventoryReservation.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.inventoryTransaction.deleteMany({
          where: { variantId: { in: variantIds } },
        });
      }
      if (orderIds.length) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (productIds.length) {
        await tx.productVariant.deleteMany({
          where: { productId: { in: productIds } },
        });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      if (userIds.length) {
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }
    });

    variantIds.length = 0;
    orderIds.length = 0;
    productIds.length = 0;
    userIds.length = 0;
  });

  describe("CSV Sanitization & Export Security", () => {
    test("preserves finite numeric values as unaltered numeric strings", () => {
      expect(csvCell(0)).toBe("0");
      expect(csvCell(100)).toBe("100");
      expect(csvCell(-25)).toBe("-25");
      expect(csvCell(199.99)).toBe("199.99");
    });

    test("neutralizes formula injection characters (=, +, -, @) in strings", () => {
      expect(csvCell("=1+1")).toBe("'=1+1");
      expect(csvCell("+100")).toBe("'+100");
      expect(csvCell("-50")).toBe("'-50");
      expect(csvCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
      expect(csvCell("  =cmd|' /C calc'!A0")).toBe("'  =cmd|' /C calc'!A0");
    });

    test("escapes commas, quotes, and newlines in text fields", () => {
      expect(csvCell('T-Shirt "Black", Large')).toBe('"T-Shirt ""Black"", Large"');
      expect(csvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(csvCell(null)).toBe("");
      expect(csvCell(undefined)).toBe("");
    });

    test("prepends UTF-8 BOM to CSV text for accurate spreadsheet loading", () => {
      const output = csv([
        ["SKU", "Status"],
        ["SKU-TEST-1", "Healthy"],
      ]);
      expect(output.charCodeAt(0)).toBe(0xfeff);
      expect(output).toContain("SKU,Status");
      expect(output).toContain("SKU-TEST-1,Healthy");
    });
  });

  describe("Authorization Enforcement", () => {
    test("getAdminInventoryIntelligence rejects unauthenticated and non-admin users", async () => {
      mockSession = null;
      await expect(getAdminInventoryIntelligence()).rejects.toThrow();

      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(getAdminInventoryIntelligence()).rejects.toThrow();

      mockSession = { user: { id: "mgr-1", role: "MANAGER" } };
      await expect(getAdminInventoryIntelligence()).rejects.toThrow();
    });

    test("getAdminInventoryIntelligenceForExport rejects unauthenticated and non-admin users", async () => {
      mockSession = null;
      await expect(getAdminInventoryIntelligenceForExport()).rejects.toThrow();

      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(getAdminInventoryIntelligenceForExport()).rejects.toThrow();
    });

    test("GET /api/admin/inventory-intelligence/export returns 401/403 for unauthorized requests", async () => {
      mockSession = null;
      const unauthReq = new NextRequest(
        "http://localhost:3000/api/admin/inventory-intelligence/export"
      );
      const unauthRes = await GET(unauthReq);
      expect(unauthRes.status).toBe(401);

      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const forbiddenReq = new NextRequest(
        "http://localhost:3000/api/admin/inventory-intelligence/export"
      );
      const forbiddenRes = await GET(forbiddenReq);
      expect(forbiddenRes.status).toBe(403);
    });
  });

  describe("Stock & Valuation Computations", () => {
    test("separates physical vs available stock and valuations accurately", async () => {
      const ts = Date.now().toString();

      // Product with 10 physical stock, 3 reserved -> 7 available
      // Cost price: 50.00, Selling price: 100.00
      const prod = await prisma.product.create({
        data: {
          name: `Valuation Test ${ts}`,
          slug: `valuation-test-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-VAL-${ts}`,
              size: "M",
              costPrice: new Prisma.Decimal("50.00"),
              sellingPrice: new Prisma.Decimal("100.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 10,
          type: "RESTOCK",
          referenceId: `REF-${ts}`,
        },
      });

      // Active reservation of 3 units
      await prisma.inventoryReservation.create({
        data: {
          variantId: variant.id,
          quantity: 3,
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000), // unexpired
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-VAL-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.physicalStock).toBe(10);
      expect(item.reservedStock).toBe(3);
      expect(item.availableStock).toBe(7);
      // Physical cost value = 10 * 50 = 500
      expect(item.physicalCostValue).toBeCloseTo(500.0, 2);
      // Available cost value = 7 * 50 = 350
      expect(item.availableCostValue).toBeCloseTo(350.0, 2);
    });

    test("ignores expired reservations in available and reserved stock totals", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Expired Res ${ts}`,
          slug: `expired-res-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-EXPRES-${ts}`,
              costPrice: new Prisma.Decimal("40.00"),
              sellingPrice: new Prisma.Decimal("80.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 6,
          type: "RESTOCK",
          referenceId: `REF-${ts}`,
        },
      });

      // Expired reservation (1 hour ago)
      await prisma.inventoryReservation.create({
        data: {
          variantId: variant.id,
          quantity: 2,
          status: "RESERVED",
          expiresAt: new Date(Date.now() - 3600000),
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-EXPRES-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.physicalStock).toBe(6);
      expect(item.reservedStock).toBe(0);
      expect(item.availableStock).toBe(6);
    });
  });

  describe("Status Classification Priority & Anomaly Handling", () => {
    test("prioritizes Negative physical stock over other classifications and clamps valuation at 0", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Negative Anomaly ${ts}`,
          slug: `neg-anomaly-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-NEG-${ts}`,
              costPrice: new Prisma.Decimal("30.00"),
              sellingPrice: new Prisma.Decimal("60.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      // Negative adjustment transaction
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: -3,
          type: "ADJUSTMENT",
          referenceId: `REF-${ts}`,
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-NEG-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.physicalStock).toBe(-3);
      expect(item.availableStock).toBe(-3);
      expect(item.status).toBe("NEGATIVE");
      // Clamps valuation at 0
      expect(item.physicalCostValue).toBe(0);
      expect(item.availableCostValue).toBe(0);
    });

    test("classifies over-reservation (physical > 0, available <= 0) as OUT_OF_STOCK, not NEGATIVE", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Over Reserved ${ts}`,
          slug: `over-reserved-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-OVERRES-${ts}`,
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

      // Physical stock 2, but unexpired reservation of 4 -> available -2
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 2,
          type: "RESTOCK",
          referenceId: `REF-${ts}`,
        },
      });
      await prisma.inventoryReservation.create({
        data: {
          variantId: variant.id,
          quantity: 4,
          status: "RESERVED",
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-OVERRES-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.physicalStock).toBe(2);
      expect(item.reservedStock).toBe(4);
      expect(item.availableStock).toBe(-2);
      // Priority 1 is physical < 0; since physical is 2, Priority 2 (available <= 0) applies:
      expect(item.status).toBe("OUT_OF_STOCK");
      expect(item.availableCostValue).toBe(0); // clamped at 0
      expect(item.physicalCostValue).toBeCloseTo(50.0, 2); // 2 * 25
    });

    test("classifies zero available stock as OUT_OF_STOCK", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Zero Stock ${ts}`,
          slug: `zero-stock-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-ZERO-${ts}`,
              costPrice: new Prisma.Decimal("15.00"),
              sellingPrice: new Prisma.Decimal("30.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      // No transactions -> physical 0, available 0
      const res = await getAdminInventoryIntelligence({ search: `SKU-ZERO-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.physicalStock).toBe(0);
      expect(item.availableStock).toBe(0);
      expect(item.status).toBe("OUT_OF_STOCK");
    });
  });

  describe("Sales Velocity, Returns, and Runout Calculations", () => {
    test("computes net retained units as SALE minus RETURN in window, and excludes cancelled orders", async () => {
      const ts = Date.now().toString();

      // Create test user and cancelled order for exclusion testing
      const user = await prisma.user.create({
        data: {
          email: `velocity-test-${ts}@example.com`,
          name: "Velocity Tester",
          role: "CUSTOMER",
        },
      });
      userIds.push(user.id);

      const cancelledOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-CANCEL-${ts}`,
          userId: user.id,
          status: "CANCELLED",
          paymentStatus: "FAILED",
          paymentMethod: "COD",
          subtotal: 100,
          total: 100,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          shippingCost: 0,
          shippingStreet: "123 Street",
          shippingCity: "City",
          shippingZip: "12345",
          shippingCountry: "Country",
          shippingMethodName: "Standard",
          customerName: "Tester",
          customerEmail: user.email,
        },
      });
      orderIds.push(cancelledOrder.id);

      const normalOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-NORMAL-${ts}`,
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          subtotal: 100,
          total: 100,
          taxRate: 0,
          taxAmount: 0,
          discount: 0,
          shippingCost: 0,
          shippingStreet: "123 Street",
          shippingCity: "City",
          shippingZip: "12345",
          shippingCountry: "Country",
          shippingMethodName: "Standard",
          customerName: "Tester",
          customerEmail: user.email,
        },
      });
      orderIds.push(normalOrder.id);

      const prod = await prisma.product.create({
        data: {
          name: `Velocity Prod ${ts}`,
          slug: `velocity-prod-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-VEL-${ts}`,
              costPrice: new Prisma.Decimal("20.00"),
              sellingPrice: new Prisma.Decimal("40.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      // Initial restock
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 20,
          type: "RESTOCK",
          referenceId: `RESTOCK-${ts}`,
        },
      });

      // Valid SALE: 5 units
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: -5,
          type: "SALE",
          referenceId: normalOrder.id,
        },
      });

      // CANCELLED SALE: 3 units (must be EXCLUDED from soldUnits)
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: -3,
          type: "SALE",
          referenceId: cancelledOrder.id,
        },
      });

      // RETURN: 2 units
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 2,
          type: "RETURN",
          referenceId: `RET-${ts}`,
        },
      });

      const res = await getAdminInventoryIntelligence({
        window: "90d",
        search: `SKU-VEL-${ts}`,
      });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      // soldUnits = 5 (the cancelled order's 3 units are excluded)
      expect(item.soldUnits).toBe(5);
      // returnedUnits = 2
      expect(item.returnedUnits).toBe(2);
      // netRetainedUnits = max(5 - 2, 0) = 3
      expect(item.netRetainedUnits).toBe(3);
      // dailyVelocity = 3 / 90
      expect(item.dailyVelocity).toBeCloseTo(3 / 90, 4);

      // availableStock = 20 - 5 - 3 + 2 = 14
      expect(item.availableStock).toBe(14);
      // daysOfSupply = availableStock / dailyVelocity = 14 / (3 / 90) = 420 days
      expect(item.daysOfSupply).toBeCloseTo(420, 1);
      // Since daysOfSupply > 180, classified as SLOW
      expect(item.status).toBe("SLOW");
    });

    test("clamps net retained units at 0 when returns exceed sales in the window", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Excess Return ${ts}`,
          slug: `excess-return-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-EXCRET-${ts}`,
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

      // Return of 4 units, but no sales in window
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 4,
          type: "RETURN",
          referenceId: `RET-${ts}`,
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-EXCRET-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.soldUnits).toBe(0);
      expect(item.returnedUnits).toBe(4);
      expect(item.netRetainedUnits).toBe(0);
      expect(item.dailyVelocity).toBe(0);
      // daysOfSupply is null when velocity is 0
      expect(item.daysOfSupply).toBeNull();
    });
  });

  describe("Inflow Age Precision, Grace Period, and Dead Stock Rule", () => {
    test("does not use ProductVariant.createdAt fallback when no inflow transaction exists", async () => {
      const ts = Date.now().toString();

      // Product created 30 days ago, but NO inventory inflow transaction
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const prod = await prisma.product.create({
        data: {
          name: `No Inflow Prod ${ts}`,
          slug: `no-inflow-${ts}`,
          status: "PUBLISHED",
          createdAt: pastDate,
          variants: {
            create: {
              sku: `SKU-NOINFLOW-${ts}`,
              costPrice: new Prisma.Decimal("15.00"),
              sellingPrice: new Prisma.Decimal("30.00"),
              createdAt: pastDate,
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      const res = await getAdminInventoryIntelligence({ search: `SKU-NOINFLOW-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      // lastInflowAt and daysSinceLastInflow must be null (no createdAt fallback!)
      expect(item.lastInflowAt).toBeNull();
      expect(item.daysSinceLastInflow).toBeNull();
    });

    test("protects recent inflow from dead-stock classification within 14-day grace period", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Grace Period Prod ${ts}`,
          slug: `grace-period-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-GRACE-${ts}`,
              costPrice: new Prisma.Decimal("20.00"),
              sellingPrice: new Prisma.Decimal("40.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      // Inflow occurred 5 days ago (within 14-day grace period)
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 10,
          type: "RESTOCK",
          referenceId: `RESTOCK-${ts}`,
          createdAt: fiveDaysAgo,
        },
      });

      // 0 sales in 90d window, but inflow is only 5 days old
      const res = await getAdminInventoryIntelligence({ search: `SKU-GRACE-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.availableStock).toBe(10);
      expect(item.netRetainedUnits).toBe(0);
      expect(item.daysSinceLastInflow).toBe(5);
      // NOT classified as DEAD because daysSinceLastInflow <= 14!
      expect(item.status).toBe("HEALTHY");
    });

    test("classifies as DEAD stock when available > 0, 0 sales, and inflow > 14 days ago", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Dead Stock Prod ${ts}`,
          slug: `dead-stock-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-DEAD-${ts}`,
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

      // Inflow occurred 45 days ago (past 14-day grace period)
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 8,
          type: "RESTOCK",
          referenceId: `RESTOCK-${ts}`,
          createdAt: fortyFiveDaysAgo,
        },
      });

      const res = await getAdminInventoryIntelligence({ search: `SKU-DEAD-${ts}` });
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      expect(item.availableStock).toBe(8);
      expect(item.netRetainedUnits).toBe(0);
      expect(item.daysSinceLastInflow).toBe(45);
      expect(item.status).toBe("DEAD");
      // Available cost value = 8 * 25 = 200
      expect(item.availableCostValue).toBeCloseTo(200.0, 2);
    });
  });

  describe("Filters, Sorting, Pagination, and CSV Export", () => {
    test("filters accurately by status (dead, slow, healthy, out-of-stock, negative)", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Filter Suite ${ts}`,
          slug: `filter-suite-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: [
              {
                sku: `SKU-FLT-DEAD-${ts}`,
                costPrice: new Prisma.Decimal("10.00"),
                sellingPrice: new Prisma.Decimal("20.00"),
              },
              {
                sku: `SKU-FLT-OOS-${ts}`,
                costPrice: new Prisma.Decimal("10.00"),
                sellingPrice: new Prisma.Decimal("20.00"),
              },
            ],
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const [varDead, varOos] = prod.variants;
      variantIds.push(varDead.id, varOos.id);

      // varDead: restocked 60 days ago, 0 sales
      await prisma.inventoryTransaction.create({
        data: {
          variantId: varDead.id,
          quantity: 5,
          type: "RESTOCK",
          referenceId: `REF-${ts}`,
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 1000 * 3600),
        },
      });

      // Filter by "dead"
      const deadRes = await getAdminInventoryIntelligence({
        search: `SKU-FLT-`,
        status: "dead",
      });
      expect(deadRes.items.some((i) => i.sku === `SKU-FLT-DEAD-${ts}`)).toBe(true);
      expect(deadRes.items.some((i) => i.sku === `SKU-FLT-OOS-${ts}`)).toBe(false);

      // Filter by "out-of-stock"
      const oosRes = await getAdminInventoryIntelligence({
        search: `SKU-FLT-`,
        status: "out-of-stock",
      });
      expect(oosRes.items.some((i) => i.sku === `SKU-FLT-OOS-${ts}`)).toBe(true);
      expect(oosRes.items.some((i) => i.sku === `SKU-FLT-DEAD-${ts}`)).toBe(false);
    });

    test("CSV export route returns accurate 18-column structure with metadata headers", async () => {
      const ts = Date.now().toString();

      const prod = await prisma.product.create({
        data: {
          name: `Export Intelligence ${ts}`,
          slug: `exp-intel-${ts}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `SKU-EXPINTEL-${ts}`,
              size: "L",
              color: "Midnight Blue",
              costPrice: new Prisma.Decimal("35.00"),
              sellingPrice: new Prisma.Decimal("70.00"),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(prod.id);
      const variant = prod.variants[0];
      variantIds.push(variant.id);

      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: 12,
          type: "RESTOCK",
          referenceId: `RESTOCK-${ts}`,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/admin/inventory-intelligence/export?q=SKU-EXPINTEL-${ts}&window=90d`
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(res.headers.get("Content-Disposition")).toContain(
        "vibelock-inventory-intelligence-90d-"
      );
      expect(res.headers.get("X-Inventory-Total-Count")).toBe("1");
      expect(res.headers.get("X-Inventory-Export-Limit")).toBe("5000");
      expect(res.headers.get("X-Inventory-Truncated")).toBe("false");

      const csvText = await res.text();
      const parsedRows = parseCsv(csvText);

      // 18 columns expected
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
        "Available Cost Value",
        "Physical Cost Value",
        "Sold Units",
        "Returned Units",
        "Net Retained Units",
        "Daily Velocity",
        "Days Since Last Inflow",
        "Days of Supply",
        "Status",
      ];

      expect(parsedRows[0]).toEqual(expectedHeaders);
      expect(parsedRows[1][1]).toBe(`SKU-EXPINTEL-${ts}`);
      expect(parsedRows[1][4]).toBe("12"); // Physical stock
      expect(parsedRows[1][6]).toBe("12"); // Available stock
      expect(parsedRows[1][7]).toBe("35.00"); // Cost price
      expect(parsedRows[1][9]).toBe("420.00"); // Available cost value: 12 * 35 = 420
    });
  });
});
