import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminOrdersTable } from "@/components/admin/orders/admin-orders-table";
import type { AdminOrdersResult } from "@/lib/admin/order-queries";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/orders",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminOrdersTable Component Unit Tests", () => {
  const sampleData: AdminOrdersResult = {
    orders: [
      {
        id: "ord-1",
        orderNumber: "VL-20261026-0001",
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        salesChannel: "WEBSITE",
        total: 1850,
        subtotal: 1750,
        shippingCost: 100,
        discount: 0,
        customerEmail: "siam@example.com",
        customerName: "Saddaul Siam",
        customerPhone: "01700000000",
        shippingCity: "Dhaka",
        itemCount: 2,
        createdAt: "2026-10-26T10:00:00.000Z",
      },
      {
        id: "ord-2",
        orderNumber: "VL-20261026-0002",
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        salesChannel: "WEBSITE",
        total: 3200.5,
        subtotal: 3100.5,
        shippingCost: 100,
        discount: 0,
        customerEmail: "rahim@example.com",
        customerName: "Rahim Chowdhury",
        customerPhone: "01800000000",
        shippingCity: "Chittagong",
        itemCount: 3,
        createdAt: "2026-10-25T14:30:00.000Z",
      },
    ],
    total: 2,
    totalPages: 1,
    page: 1,
    limit: 20,
    statusCounts: {
      ALL: 2,
      PENDING: 1,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 1,
      CANCELLED: 0,
    },
  };

  test("renders order table with BDT currency symbol and order details", () => {
    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={sampleData}
        currentFilters={{}}
      />
    );

    // Verify order numbers
    expect(html).toContain("VL-20261026-0001");
    expect(html).toContain("VL-20261026-0002");

    // Verify BDT currency formatting (৳) - NOT $
    expect(html).toContain("৳1,850.00");
    expect(html).toContain("৳3,200.50");
    expect(html).not.toContain("$1850");

    // Verify customer info
    expect(html).toContain("Saddaul Siam");
    expect(html).toContain("siam@example.com");
    expect(html).toContain("01700000000");
    expect(html).toContain("Dhaka");
  });

  test("renders status filter tabs with correct count badges", () => {
    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={sampleData}
        currentFilters={{}}
      />
    );

    expect(html).toContain("All Orders");
    expect(html).toContain("Pending");
    expect(html).toContain("Delivered");

    // Pending count is 1
    expect(html).toContain("(1)");
    // All count is 2
    expect(html).toContain("(2)");
  });

  test("renders payment method pills and status badges", () => {
    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={sampleData}
        currentFilters={{}}
      />
    );

    expect(html).toContain("COD");
    expect(html).toContain("ONLINE");
    expect(html).toContain("Paid");
    expect(html).toContain("Unpaid");
  });

  test("renders empty state when no orders match", () => {
    const emptyData: AdminOrdersResult = {
      orders: [],
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 20,
      statusCounts: {
        ALL: 0,
        PENDING: 0,
        CONFIRMED: 0,
        PROCESSING: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      },
    };

    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={emptyData}
        currentFilters={{}}
      />
    );

    expect(html).toContain("No orders found");
  });

  test("does not render pagination buttons and renders infinite scroll sentinel", () => {
    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={sampleData}
        currentFilters={{}}
      />
    );

    // Verify pagination nav is removed
    expect(html).not.toContain("Orders pagination");
    expect(html).not.toContain("Page 1 of");

    // Verify sentinel element exists for IntersectionObserver
    expect(html).toContain('aria-hidden="true"');
  });

  test("renders sales channel badges, phone, whatsapp direct link, and quick confirm button", () => {
    const dataWithShipment: AdminOrdersResult = {
      ...sampleData,
      orders: [
        {
          ...sampleData.orders[0],
          salesChannel: "POS",
          shipment: {
            provider: "STEADFAST",
            trackingNumber: "ST-889900",
            status: "IN_TRANSIT",
          },
        },
      ],
      total: 1,
    };

    const html = renderToStaticMarkup(
      <AdminOrdersTable initialData={dataWithShipment} currentFilters={{}} />
    );

    // Sales channel badge
    expect(html).toContain("POS");

    // Tel and WhatsApp links
    expect(html).toContain('href="tel:01700000000"');
    expect(html).toContain('href="https://wa.me/8801700000000?text=');

    // Courier tracking info
    expect(html).toContain("STEADFAST");
    expect(html).toContain("ST-889900");

    // Quick Confirm button for PENDING order
    expect(html).toContain("Confirm");

    // Column visibility customizer
    expect(html).toContain("Columns");
    expect(html).toContain('title="Customize visible columns"');
  });

  test("renders date range filter and sales channel dropdown filter options", () => {
    const html = renderToStaticMarkup(
      <AdminOrdersTable initialData={sampleData} currentFilters={{}} />
    );

    // Date range filter options
    expect(html).toContain("All Time");
    expect(html).toContain("Today (Live)");
    expect(html).toContain("Yesterday");
    expect(html).toContain("Last 7 Days");
    expect(html).toContain("Last 30 Days");

    // Sales channel filter options
    expect(html).toContain("All Channels");
    expect(html).toContain("Online Store (WEB)");
    expect(html).toContain("POS Counter");
  });

  test("renders items summary, mobile card view, and reset filters button when filtered", () => {
    const dataWithSummary: AdminOrdersResult = {
      ...sampleData,
      orders: [
        {
          ...sampleData.orders[0],
          itemsSummary: "Oversized Tee (L) × 2",
        },
      ],
      total: 1,
    };

    const html = renderToStaticMarkup(
      <AdminOrdersTable
        initialData={dataWithSummary}
        currentFilters={{ q: "01700000000", status: "PENDING" }}
      />
    );

    // Items summary preview
    expect(html).toContain("Oversized Tee (L) × 2");

    // Active filter reset button
    expect(html).toContain("Reset filters");

    // Mobile cards layout container
    expect(html).toContain("md:hidden");
    expect(html).toContain("View Details");
  });
});

