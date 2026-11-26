import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DashboardActionRadar,
  DashboardFulfillmentRibbon,
  DashboardHeader,
  DashboardHeroCockpit,
  DashboardRecentOrders,
  formatOrderDisplayNumber,
} from "@/components/admin/dashboard";

describe("DashboardHeader component", () => {
  test("renders manager command center with range presets and quick action buttons", () => {
    const html = renderToStaticMarkup(
      <DashboardHeader isManagerOrAdmin={true} currentRange="30d" />
    );

    expect(html).toContain("Admin Command Center");
    expect(html).toContain("Live Operations Active");
    expect(html).toContain("New Product");
    expect(html).toContain("Fulfill Queue");
    expect(html).toContain("Today");
    expect(html).toContain("Last 30 days");
  });

  test("renders staff operations center title when role is not manager", () => {
    const html = renderToStaticMarkup(
      <DashboardHeader isManagerOrAdmin={false} currentRange="30d" />
    );

    expect(html).toContain("Staff Operations Center");
    expect(html).not.toContain("Executive KPI range presets");
  });
});

describe("DashboardHeroCockpit component", () => {
  const financials = {
    netSales: 117748.21,
    grossProfit: 52265.21,
    grossMargin: 44.4,
    orders: 155,
    retainedUnits: 262,
    soldUnits: 315,
    returnedUnits: 53,
    returnRate: 16.8,
  };

  const trend = [
    { date: new Date("2026-11-20"), netSales: 15000, orders: 12 },
    { date: new Date("2026-11-21"), netSales: 22000, orders: 18 },
  ];

  test("renders hero net sales with integrated KPIs and velocity wave chart", () => {
    const html = renderToStaticMarkup(
      <DashboardHeroCockpit
        financials={financials}
        trend={trend}
        currentRange="30d"
        activePresetLabel="Last 30 days"
        reportHref="/admin/reports"
      />
    );

    expect(html).toContain("Net Merchandise Revenue");
    expect(html).toContain("৳117,748.21");
    expect(html).toContain("Gross Profit");
    expect(html).toContain("৳52,265.21");
    expect(html).toContain("44.4%");
    expect(html).toContain("155");
    expect(html).toContain("262");
    expect(html).toContain("16.8%");
    expect(html).toContain("<svg");
  });
});

describe("DashboardFulfillmentRibbon component", () => {
  test("renders visual continuous pipeline with stage percentages and status counts", () => {
    const orderStatuses = [
      { status: "PENDING", count: 121 },
      { status: "PROCESSING", count: 2 },
      { status: "SHIPPED", count: 1 },
      { status: "DELIVERED", count: 40 },
      { status: "CANCELLED", count: 12 },
    ];

    const html = renderToStaticMarkup(<DashboardFulfillmentRibbon orderStatuses={orderStatuses} />);

    expect(html).toContain("Order Fulfillment Pipeline");
    expect(html).toContain("176 Total Orders");
    expect(html).toContain("Pending Intake");
    expect(html).toContain("Packing Queue");
    expect(html).toContain("Delivered");
    expect(html).toContain("/admin/orders?status=PENDING");
  });
});

describe("DashboardActionRadar component", () => {
  test("renders operational attention radar with urgent counts and payment channels", () => {
    const html = renderToStaticMarkup(
      <DashboardActionRadar
        pendingOrdersCount={121}
        outOfStockVariantCount={81}
        productsOutOfStockCount={65}
        lowStockVariantCount={82}
        productsWithLowStockCount={62}
        publishedProductCount={250}
        categoryCount={41}
        customerCount={169}
        orderCount={177}
        returnedUnitsCount={53}
        returnRate={16.8}
        paymentsBreakdown={[{ method: "COD", orders: 120, sales: 85000 }]}
        paymentStatuses={[{ status: "PENDING", count: 109 }]}
        isManagerOrAdmin={true}
      />
    );

    expect(html).toContain("Operational Attention Radar");
    expect(html).toContain("121");
    expect(html).toContain("/admin/orders?status=PENDING");
    expect(html).toContain("81");
    expect(html).toContain("/admin/inventory?stockStatus=out_of_stock");
    expect(html).toContain("Payment Channel Mix");
    expect(html).toContain("Cash on Delivery");
    expect(html).toContain("Store Catalog Footprint");
    expect(html).toContain("Lifetime Orders");
    expect(html).toContain("Logistics &amp; Courier Sync");
    expect(html).toContain("53 returned units · 16.8% rate");
  });
});

describe("DashboardRecentOrders component", () => {
  test("formats raw UUID order numbers gracefully and renders technical order row", () => {
    const formatted = formatOrderDisplayNumber("BOTH-1cd10491-bea0-4ae6-83e0-8973f93c3185");
    expect(formatted).toBe("BOTH · #1cd10491");

    const normal = formatOrderDisplayNumber("VL-20261125-30E110");
    expect(normal).toBe("VL-20261125-30E110");

    const mockOrders = [
      {
        id: "order-uuid-1",
        orderNumber: "VL-20261125-30E110",
        createdAt: new Date("2026-11-25T10:52:00Z"),
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        total: 950,
        customerName: "Tanvir Ahmed",
        shippingCity: "Dhaka",
        _count: { items: 2 },
      },
    ];

    const html = renderToStaticMarkup(
      <DashboardRecentOrders recentOrders={mockOrders} totalOrderCount={177} />
    );

    expect(html).toContain("Live Order Stream");
    expect(html).toContain("VL-20261125-30E110");
    expect(html).toContain("Tanvir Ahmed");
    expect(html).toContain("Dhaka");
    expect(html).toContain("Cash on Delivery");
    expect(html).toContain("৳950.00");
    expect(html).toContain("/admin/orders/order-uuid-1");
  });
});
