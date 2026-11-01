import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminInventoryIntelligenceTable } from "@/components/admin/inventory/admin-inventory-intelligence-table";
import type { InventoryIntelligenceResult } from "@/lib/admin/inventory";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/inventory-intelligence",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminInventoryIntelligenceTable Component Unit Tests", () => {
  const sampleData: InventoryIntelligenceResult = {
    items: [
      {
        id: "var-1",
        sku: "TSHIRT-BLK-M",
        size: "M",
        color: "Black",
        productName: "Signature Heavyweight Tee",
        costPrice: 400,
        sellingPrice: 950,
        costUnavailable: false,
        physicalStock: 7,
        reservedStock: 2,
        availableStock: 5,
        physicalCostValue: 2800,
        availableCostValue: 2000,
        soldUnits: 30,
        returnedUnits: 0,
        netRetainedUnits: 30,
        dailyVelocity: 1.0,
        lastSaleAt: new Date("2026-10-25T10:00:00Z"),
        lastInflowAt: new Date("2026-10-01T10:00:00Z"),
        daysSinceLastInflow: 25,
        daysOfSupply: 5,
        suggestedRestockQty: 25,
        status: "STOCKOUT_RISK",
      },
      {
        id: "var-2",
        sku: "HOODIE-GRY-L",
        size: "L",
        color: "Grey",
        productName: "Oversized Fleece Hoodie",
        costPrice: 850,
        sellingPrice: 2200,
        costUnavailable: false,
        physicalStock: 50,
        reservedStock: 0,
        availableStock: 50,
        physicalCostValue: 42500,
        availableCostValue: 42500,
        soldUnits: 25,
        returnedUnits: 0,
        netRetainedUnits: 25,
        dailyVelocity: 0.83,
        lastSaleAt: new Date("2026-10-24T10:00:00Z"),
        lastInflowAt: new Date("2026-10-10T10:00:00Z"),
        daysSinceLastInflow: 16,
        daysOfSupply: 60,
        suggestedRestockQty: null,
        status: "HEALTHY",
      },
    ],
    summary: {
      totalPhysicalStock: 57,
      totalAvailableStock: 55,
      totalPhysicalCostValue: 45300,
      totalAvailableCostValue: 44500,
      negativeStockCount: 0,
      outOfStockCount: 0,
      stockoutRiskCount: 1,
      deadStockCount: 0,
      slowMovingCount: 0,
      healthyCount: 1,
      totalVariants: 2,
      missingCostCount: 0,
    },
    total: 2,
    totalPages: 1,
    page: 1,
    pageSize: 20,
    window: "30d",
  };

  test("renders items with BDT valuation, velocity, and stock health status", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryIntelligenceTable
        initialData={sampleData}
        currentFilters={{
          window: "30d",
          status: "all",
          sort: "valuation",
          page: 1,
        }}
      />
    );

    // Verify product names and SKUs
    expect(html).toContain("Signature Heavyweight Tee");
    expect(html).toContain("TSHIRT-BLK-M");
    expect(html).toContain("Oversized Fleece Hoodie");
    expect(html).toContain("HOODIE-GRY-L");

    // Verify BDT formatting
    expect(html).toContain("৳2,000.00");
    expect(html).toContain("৳42,500.00");

    // Verify Stockout Risk badge and Flame icon
    expect(html).toContain("Stockout Risk");
    expect(html).toContain("Healthy");

    // Verify velocity
    expect(html).toContain("1.00/d");
    expect(html).toContain("0.83/d");

    // Verify suggested restock
    expect(html).toContain("+25 units");
  });

  test("renders modern infinite scroll sentinel and no old pagination buttons", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryIntelligenceTable
        initialData={sampleData}
        currentFilters={{
          window: "30d",
          status: "all",
          sort: "valuation",
          page: 1,
        }}
      />
    );

    // Old pagination should be absent
    expect(html).not.toContain("Inventory intelligence pages");
    expect(html).not.toContain("Page 1 of");

    // Sentinel exists for infinite scroll
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(
      'All <strong class="text-[#101114]">2</strong> inventory variants loaded'
    );
  });

  test("renders customize visible columns option button", () => {
    const html = renderToStaticMarkup(
      <AdminInventoryIntelligenceTable
        initialData={sampleData}
        currentFilters={{
          window: "30d",
          status: "all",
          sort: "valuation",
          page: 1,
        }}
      />
    );

    expect(html).toContain("Columns");
    expect(html).toContain('title="Customize visible columns"');
  });
});
