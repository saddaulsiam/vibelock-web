import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminCustomersTable } from "@/components/admin/admin-customers-table";
import { CustomerRiskWidget } from "@/components/admin/customer-risk-widget";
import type { AdminCustomerListItem } from "@/lib/admin/customer-queries";
import type { CombinedCustomerRiskProfile } from "@/lib/admin/customer-risk";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/customers",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Customers Module Unit Tests", () => {
  const sampleCustomers: AdminCustomerListItem[] = [
    {
      id: "cust-1",
      name: "Saddaul Siam",
      email: "siam@example.com",
      phone: "01711111111",
      createdAt: new Date("2026-01-15T10:00:00Z"),
      orderCount: 4,
      paidOrderValue: 12500,
      latestOrderDate: new Date("2026-10-25T12:00:00Z"),
      latestOrderStatus: "DELIVERED",
      latestOrderNumber: "VL-20261025-0001",
      tier: "VIP",
    },
    {
      id: "cust-2",
      name: "Rahim Chowdhury",
      email: "rahim@example.com",
      phone: "01822222222",
      createdAt: new Date("2026-02-20T10:00:00Z"),
      orderCount: 2,
      paidOrderValue: 4200,
      latestOrderDate: new Date("2026-10-20T12:00:00Z"),
      latestOrderStatus: "CONFIRMED",
      latestOrderNumber: "VL-20261020-0002",
      tier: "REPEAT",
    },
    {
      id: "cust-3",
      name: "Karim Ahmed",
      email: "karim@example.com",
      phone: "01933333333",
      createdAt: new Date("2026-03-01T10:00:00Z"),
      orderCount: 1,
      paidOrderValue: 1500,
      latestOrderDate: new Date("2026-10-10T12:00:00Z"),
      latestOrderStatus: "PENDING",
      latestOrderNumber: "VL-20261010-0003",
      tier: "SINGLE",
    },
    {
      id: "cust-4",
      name: null,
      email: "lead@example.com",
      phone: null,
      createdAt: new Date("2026-04-01T10:00:00Z"),
      orderCount: 0,
      paidOrderValue: 0,
      latestOrderDate: null,
      latestOrderStatus: null,
      latestOrderNumber: null,
      tier: "LEAD",
    },
  ];

  const sampleCounts = {
    ALL: 4,
    REPEAT: 2,
    SINGLE: 1,
    LEADS: 1,
  };

  test("renders all customer segment tabs with exact counts", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("All Customers");
    expect(html).toContain("(4)");
    expect(html).toContain("Repeat / VIP");
    expect(html).toContain("(2)");
    expect(html).toContain("First-Time");
    expect(html).toContain("(1)");
    expect(html).toContain("Leads (0 Orders)");
  });

  test("renders customer rows with name, email, phone, and tier badges", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("Saddaul Siam");
    expect(html).toContain("siam@example.com");
    expect(html).toContain("01711111111");
    expect(html).toContain("VIP Buyer");

    expect(html).toContain("Rahim Chowdhury");
    expect(html).toContain("Repeat Buyer");

    expect(html).toContain("Karim Ahmed");
    expect(html).toContain("1 Order");

    expect(html).toContain("lead@example.com");
    expect(html).toContain("Lead");
  });

  test("renders empty state gracefully when no customers match filter", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={[]}
        total={0}
        totalPages={1}
        currentPage={1}
        currentSearch="unknown customer"
        segmentCounts={{ ALL: 0, REPEAT: 0, SINGLE: 0, LEADS: 0 }}
      />
    );

    expect(html).toContain("No customers found");
    expect(html).toContain("unknown customer");
    expect(html).toContain("Reset all filters");
  });

  test("renders mobile touch cards with call and WhatsApp quick links", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    // Call and WhatsApp links on mobile
    expect(html).toContain("tel:01711111111");
    expect(html).toContain("wa.me/8801711111111");
    expect(html).toContain("View Customer Profile");
  });

  test("renders AdminTableInfiniteScroll with all loaded state when loaded equals total", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("All");
    expect(html).toContain("4");
    expect(html).toContain("customers loaded");
  });

  test("renders AdminTableInfiniteScroll load more button when hasMore is true", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={10}
        totalPages={3}
        currentPage={1}
        segmentCounts={{ ALL: 10, REPEAT: 4, SINGLE: 3, LEADS: 3 }}
      />
    );

    expect(html).toContain("Load more customers");
    expect(html).toContain("Showing 4 of 10");
  });

  test("renders AdminTableColumnVisibility button for customizable columns", () => {
    const html = renderToStaticMarkup(
      <AdminCustomersTable
        customers={sampleCustomers}
        total={4}
        totalPages={1}
        currentPage={1}
        segmentCounts={sampleCounts}
      />
    );

    expect(html).toContain("Columns");
    expect(html).toContain("Customize visible columns");
  });

  test("CustomerRiskWidget renders Steadfast courier stats and COD recommendation", () => {
    const sampleProfile: CombinedCustomerRiskProfile = {
      phone: "01711111111",
      email: "siam@example.com",
      riskScore: "LOW_RISK",
      riskLabel: "Trusted / Verified Buyer",
      headline: "Repeat Loyal Buyer (4 delivered orders on VibeLock)",
      recommendation:
        "Reliable buyer with proven delivery track record. Safe for 1-click confirmation.",
      confidenceBadge: "VERIFIED",
      storeStats: {
        totalOrders: 4,
        deliveredOrders: 4,
        cancelledOrders: 0,
        pendingOrders: 0,
        totalSpent: 12500,
        isRepeatCustomer: true,
      },
      steadfastStats: {
        success: true,
        phone: "01711111111",
        totalParcels: 15,
        totalDelivered: 14,
        totalCancelled: 1,
        deliveryRatio: 93.3,
        cancellationRatio: 6.7,
        fraudReportsCount: 0,
        riskLevel: "LOW",
      },
      checkedAt: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      <CustomerRiskWidget initialProfile={sampleProfile} customerPhone="01711111111" />
    );

    expect(html).toContain("Courier &amp; COD Fraud Intelligence");
    expect(html).toContain("Trusted / Verified Buyer");
    expect(html).toContain("93.3% Delivered");
    expect(html).toContain("15"); // total parcels
    expect(html).toContain("14"); // delivered parcels
    expect(html).toContain("Reliable buyer with proven delivery track record");
  });
});
