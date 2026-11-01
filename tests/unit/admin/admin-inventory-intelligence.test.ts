import { describe, expect, it } from "vitest";
import {
  calculateSummary,
  filterAndSortItems,
  processIntelligenceRow,
  type RawIntelligenceRow,
  type InventoryIntelligenceItem,
} from "@/lib/admin/inventory";

describe("Inventory Intelligence Queries & Logic Unit Tests", () => {
  const asOf = new Date("2026-10-26T12:00:00Z");
  const windowDays = 30; // 30-day window

  it("classifies items with <=14 days of supply as STOCKOUT_RISK and calculates 30-day suggested restock", () => {
    // 5 units available, sold 30 units in 30 days => velocity = 1 unit/day
    // Days of supply = 5 / 1 = 5 days <= 14 days => STOCKOUT_RISK
    const row: RawIntelligenceRow = {
      id: "var-1",
      sku: "TSHIRT-BLK-M",
      size: "M",
      color: "Black",
      productName: "Signature Heavyweight Tee",
      costPrice: 400,
      sellingPrice: 950,
      physicalStock: 7,
      reservedStock: 2,
      availableStock: 5,
      soldUnits: 30,
      returnedUnits: 0,
      lastSaleAt: new Date("2026-10-25T10:00:00Z"),
      lastInflowAt: new Date("2026-10-01T10:00:00Z"),
    };

    const item = processIntelligenceRow(row, asOf, windowDays);

    expect(item.status).toBe("STOCKOUT_RISK");
    expect(item.dailyVelocity).toBe(1.0);
    expect(item.daysOfSupply).toBe(5);
    // Target 30 days = 30 units. Available = 5. Suggested restock = 25 units.
    expect(item.suggestedRestockQty).toBe(25);
    expect(item.availableCostValue).toBe(2000); // 5 * 400
  });

  it("classifies OUT_OF_STOCK items and calculates full 30-day restock when velocity > 0", () => {
    const row: RawIntelligenceRow = {
      id: "var-2",
      sku: "HOODIE-GRY-L",
      size: "L",
      color: "Grey",
      productName: "Oversized Fleece Hoodie",
      costPrice: 850,
      sellingPrice: 2200,
      physicalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      soldUnits: 60,
      returnedUnits: 0,
      lastSaleAt: new Date("2026-10-20T10:00:00Z"),
      lastInflowAt: new Date("2026-09-15T10:00:00Z"),
    };

    const item = processIntelligenceRow(row, asOf, windowDays);

    expect(item.status).toBe("OUT_OF_STOCK");
    expect(item.dailyVelocity).toBe(2.0); // 60 / 30
    expect(item.daysOfSupply).toBeNull();
    // 30 days * 2 units/day - 0 available = 60 units
    expect(item.suggestedRestockQty).toBe(60);
  });

  it("classifies DEAD stock when 0 net sales and last inflow > 14 days ago", () => {
    const row: RawIntelligenceRow = {
      id: "var-3",
      sku: "CAP-RED-OS",
      size: "OS",
      color: "Red",
      productName: "Vintage Dad Cap",
      costPrice: 250,
      sellingPrice: 650,
      physicalStock: 20,
      reservedStock: 0,
      availableStock: 20,
      soldUnits: 0,
      returnedUnits: 0,
      lastSaleAt: null,
      lastInflowAt: new Date("2026-09-01T10:00:00Z"), // 55 days ago
    };

    const item = processIntelligenceRow(row, asOf, windowDays);

    expect(item.status).toBe("DEAD");
    expect(item.dailyVelocity).toBe(0);
    expect(item.daysOfSupply).toBeNull();
    expect(item.suggestedRestockQty).toBeNull();
  });

  it("classifies SLOW moving stock when days of supply > 180 days", () => {
    // 100 units available, sold 3 units in 30 days => velocity = 0.1/day
    // Days of supply = 100 / 0.1 = 1000 days > 180 => SLOW
    const row: RawIntelligenceRow = {
      id: "var-4",
      sku: "SOCK-WHT-OS",
      size: "OS",
      color: "White",
      productName: "Crew Athletic Socks",
      costPrice: 80,
      sellingPrice: 200,
      physicalStock: 100,
      reservedStock: 0,
      availableStock: 100,
      soldUnits: 3,
      returnedUnits: 0,
      lastSaleAt: new Date("2026-10-24T10:00:00Z"),
      lastInflowAt: new Date("2026-10-10T10:00:00Z"),
    };

    const item = processIntelligenceRow(row, asOf, windowDays);

    expect(item.status).toBe("SLOW");
    expect(item.daysOfSupply).toBe(1000);
    expect(item.suggestedRestockQty).toBeNull();
  });

  it("classifies HEALTHY stock when days of supply is balanced (e.g. 45 days)", () => {
    // 45 units available, sold 30 units in 30 days => velocity = 1.0/day
    // Days of supply = 45 / 1.0 = 45 days => HEALTHY
    const row: RawIntelligenceRow = {
      id: "var-5",
      sku: "POLO-NVY-XL",
      size: "XL",
      color: "Navy",
      productName: "Pique Cotton Polo",
      costPrice: 550,
      sellingPrice: 1400,
      physicalStock: 50,
      reservedStock: 5,
      availableStock: 45,
      soldUnits: 30,
      returnedUnits: 0,
      lastSaleAt: new Date("2026-10-25T10:00:00Z"),
      lastInflowAt: new Date("2026-10-05T10:00:00Z"),
    };

    const item = processIntelligenceRow(row, asOf, windowDays);

    expect(item.status).toBe("HEALTHY");
    expect(item.daysOfSupply).toBe(45);
    expect(item.suggestedRestockQty).toBeNull();
  });

  it("aggregates catalog summary accurately including stockoutRiskCount", () => {
    const items: InventoryIntelligenceItem[] = [
      {
        id: "1",
        sku: "SKU-1",
        size: "M",
        color: null,
        productName: "Item 1",
        physicalStock: 10,
        reservedStock: 2,
        availableStock: 8,
        costPrice: 100,
        sellingPrice: 200,
        costUnavailable: false,
        physicalCostValue: 1000,
        availableCostValue: 800,
        soldUnits: 30,
        returnedUnits: 0,
        netRetainedUnits: 30,
        dailyVelocity: 1,
        lastSaleAt: null,
        lastInflowAt: null,
        daysSinceLastInflow: 5,
        daysOfSupply: 8,
        suggestedRestockQty: 22,
        status: "STOCKOUT_RISK",
      },
      {
        id: "2",
        sku: "SKU-2",
        size: "L",
        color: null,
        productName: "Item 2",
        physicalStock: 50,
        reservedStock: 0,
        availableStock: 50,
        costPrice: 200,
        sellingPrice: 400,
        costUnavailable: false,
        physicalCostValue: 10000,
        availableCostValue: 10000,
        soldUnits: 0,
        returnedUnits: 0,
        netRetainedUnits: 0,
        dailyVelocity: 0,
        lastSaleAt: null,
        lastInflowAt: null,
        daysSinceLastInflow: 30,
        daysOfSupply: null,
        suggestedRestockQty: null,
        status: "DEAD",
      },
    ];

    const summary = calculateSummary(items);

    expect(summary.totalVariants).toBe(2);
    expect(summary.totalPhysicalStock).toBe(60);
    expect(summary.totalAvailableStock).toBe(58);
    expect(summary.totalPhysicalCostValue).toBe(11000);
    expect(summary.totalAvailableCostValue).toBe(10800);
    expect(summary.stockoutRiskCount).toBe(1);
    expect(summary.deadStockCount).toBe(1);
    expect(summary.healthyCount).toBe(0);
  });

  it("filters and sorts items properly by stockout-risk and runout", () => {
    const items: InventoryIntelligenceItem[] = [
      {
        id: "1",
        sku: "SKU-SLOW",
        size: null,
        color: null,
        productName: "Slow Product",
        physicalStock: 100,
        reservedStock: 0,
        availableStock: 100,
        costPrice: 10,
        sellingPrice: 20,
        costUnavailable: false,
        physicalCostValue: 1000,
        availableCostValue: 1000,
        soldUnits: 2,
        returnedUnits: 0,
        netRetainedUnits: 2,
        dailyVelocity: 0.06,
        lastSaleAt: null,
        lastInflowAt: null,
        daysSinceLastInflow: 10,
        daysOfSupply: 1666,
        suggestedRestockQty: null,
        status: "SLOW",
      },
      {
        id: "2",
        sku: "SKU-RISK",
        size: null,
        color: null,
        productName: "Urgent Tee",
        physicalStock: 4,
        reservedStock: 0,
        availableStock: 4,
        costPrice: 200,
        sellingPrice: 500,
        costUnavailable: false,
        physicalCostValue: 800,
        availableCostValue: 800,
        soldUnits: 30,
        returnedUnits: 0,
        netRetainedUnits: 30,
        dailyVelocity: 1.0,
        lastSaleAt: null,
        lastInflowAt: null,
        daysSinceLastInflow: 5,
        daysOfSupply: 4,
        suggestedRestockQty: 26,
        status: "STOCKOUT_RISK",
      },
    ];

    const filtered = filterAndSortItems(items, {
      statusFilter: "stockout-risk",
      sort: "runout",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].sku).toBe("SKU-RISK");
    expect(filtered[0].status).toBe("STOCKOUT_RISK");
  });
});
