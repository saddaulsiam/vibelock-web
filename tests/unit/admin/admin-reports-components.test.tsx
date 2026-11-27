import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProductProfitabilityResult } from "@/lib/admin/reports/report-queries";
import {
  ReportCharts,
  ReportExportMenu,
  ReportFinancialHero,
  ReportLedgerWorkspace,
  ReportRangeFilter,
} from "@/components/admin/reports";

describe("ReportFinancialHero component", () => {
  const summary = {
    orders: 154,
    grossSales: 135000.5,
    discounts: 5000,
    netSales: 116948.21,
    refunds: 1500,
    cogs: 64983,
    grossProfit: 51965.21,
    grossMargin: 44.4,
    soldUnits: 314,
    returnedUnits: 53,
    returnedValue: 8500,
    returnRate: 16.9,
    averageOrderValue: 759.4,
    shippingCharged: 12500,
    priorNetSales: 102400,
    priorGrossProfit: 43900,
    priorOrders: 135,
    netSalesDelta: 14.2,
    grossProfitDelta: 18.4,
    ordersDelta: 14.1,
  };

  test("renders executive P&L financial hero matrix with formatted currency and Shopify Plus delta badges", () => {
    const html = renderToStaticMarkup(
      <ReportFinancialHero summary={summary} rangeLabel="Last 30 days" />
    );

    expect(html).toContain("Net Merchandise Revenue");
    expect(html).toContain("৳116,948.21");
    expect(html).toContain("Gross Profit");
    expect(html).toContain("৳51,965.21");
    expect(html).toContain("44.4%");
    expect(html).toContain("Total COGS");
    expect(html).toContain("৳64,983.00");
    expect(html).toContain("Gross GMV");
    expect(html).toContain("Discounts");
    expect(html).toContain("Avg Order Value");

    // Shopify Plus / Stripe Delta badges
    expect(html).toContain("+14.2% vs prior");
    expect(html).toContain("+18.4%");
    expect(html).toContain("+14.1% vol");

    // Contribution Margin Bridge
    expect(html).toContain("Operational Contribution Bridge");
    expect(html).toContain("Est. Processing Fees (~2%):");
    expect(html).toContain("Net Contribution Margin:");
  });
});

describe("ReportRangeFilter component", () => {
  test("renders animated date range presets and resolved window", () => {
    const startDate = new Date("2026-11-01T00:00:00.000Z");
    const endDate = new Date("2026-12-01T00:00:00.000Z");

    const html = renderToStaticMarkup(
      <ReportRangeFilter
        currentRange="30d"
        startDate={startDate}
        endDate={endDate}
        searchParamsRecord={{ range: "30d" }}
      />
    );

    expect(html).toContain("Today");
    expect(html).toContain("Last 7 days");
    expect(html).toContain("Last 30 days");
    expect(html).toContain("This month");
    expect(html).toContain("Custom");
  });
});

describe("ReportCharts component", () => {
  test("renders revenue wave SVG canvas and top products", () => {
    const trend = [
      {
        date: new Date("2026-11-20"),
        netSales: 15000,
        orders: 12,
        cogs: 8000,
        grossProfit: 7000,
      },
    ];

    const products = [
      {
        productName: "Vintage Leather Jacket",
        sku: "VL-JKT-01",
        netSales: 25000,
        profit: 12000,
        units: 10,
      },
    ];

    const payments = [{ method: "COD", orders: 10, sales: 15000 }];

    const html = renderToStaticMarkup(
      <ReportCharts
        trend={trend}
        products={products}
        payments={payments}
        soldUnits={50}
        returnedUnits={5}
        returnRate={10}
        returnedValue={2500}
      />
    );

    expect(html).toContain("Revenue Trajectory Wave");
    expect(html).toContain("<svg");
    expect(html).toContain("cursor-crosshair");
    expect(html).toContain("Wave");
    expect(html).toContain("Columns");
    expect(html).toContain("Cumulative");
    expect(html).toContain("Vintage Leather Jacket");
    expect(html).toContain("VL-JKT-01");
    expect(html).toContain("Settlement Channel Mix");
    expect(html).toContain("Settled");
    expect(html).toContain("Cash on Delivery (COD)");
    expect(html).toContain("Retained");
  });
});

describe("ReportExportMenu component", () => {
  test("renders CSV export datasets and 1-click Print/PDF option", () => {
    const html = renderToStaticMarkup(<ReportExportMenu query="range=30d" />);
    expect(html).toContain("Export CSV");
    expect(html).toContain("Sales Summary CSV");
    expect(html).toContain("Product &amp; SKU Report CSV");
    expect(html).toContain("Print / Save PDF Report");
  });
});

describe("ReportLedgerWorkspace component", () => {
  test("renders workspace segmented navigation tabs", () => {
    const productProfitability: ProductProfitabilityResult = {
      products: [],
      total: 42,
      page: 1,
      totalPages: 1,
      limit: 20,
      range: "30d" as const,
      start: new Date("2026-11-01T00:00:00.000Z"),
      end: new Date("2026-12-01T00:00:00.000Z"),
    };

    const orders = {
      orders: [],
      total: 154,
      page: 1,
      totalPages: 1,
    };

    const html = renderToStaticMarkup(
      <ReportLedgerWorkspace
        currentView="products"
        productProfitability={productProfitability}
        orders={orders}
        trend={[]}
        payments={[]}
        reportFilters={{ range: "30d" }}
        searchParamsRecord={{ range: "30d" }}
      />
    );

    expect(html).toContain("Detailed Ledger Workspaces");
    expect(html).toContain("Product &amp; SKU Profitability");
    expect(html).toContain("Order Unit Economics");
    expect(html).toContain("Daily Sales Velocity");
    expect(html).toContain("Payment Settlements");
  });

  test("ProductProfitabilityDrilldown cleans fixture UUIDs and supports compactHeader", () => {
    const productProfitability: ProductProfitabilityResult = {
      products: [
        {
          productId: "prod-1",
          productName: "Return Fixture (8c37c44e-00de-4418-af3e-3b02ed1284d6)",
          productSlug: "return-fixture",
          variantCount: 1,
          soldUnits: 5,
          returnedUnits: 0,
          retainedUnits: 5,
          returnRate: 0,
          grossSales: 5000,
          totalDiscounts: 0,
          orderDiscounts: 0,
          netSales: 5000,
          cogs: 2500,
          profit: 2500,
          margin: 50,
          isAnomaly: false,
          variants: [],
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      limit: 20,
      range: "30d" as const,
      start: new Date("2026-11-01T00:00:00.000Z"),
      end: new Date("2026-12-01T00:00:00.000Z"),
    };

    const orders = {
      orders: [],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    const html = renderToStaticMarkup(
      <ReportLedgerWorkspace
        currentView="products"
        productProfitability={productProfitability}
        orders={orders}
        trend={[]}
        payments={[]}
        reportFilters={{ range: "30d" }}
        searchParamsRecord={{ range: "30d" }}
      />
    );

    // Cleans the UUID from the visible display name
    expect(html).toContain(">Return Fixture</span>");
    expect(html).not.toContain(">Return Fixture (8c37c44e-00de-4418-af3e-3b02ed1284d6)</span>");
    // compactHeader renders sr-only h2 rather than duplicate visible h2
    expect(html).toContain('class="sr-only">Product &amp; SKU profitability</h2>');
  });
});
