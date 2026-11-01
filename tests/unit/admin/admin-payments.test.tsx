import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminPaymentsTable } from "@/components/admin/payments";
import { AdminPaymentListItem } from "@/lib/admin/payments";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/payments",
}));

describe("Admin Payments Ledger UI", () => {
  const mockPayments: AdminPaymentListItem[] = [
    {
      id: "pay-1",
      orderId: "ord-1",
      orderNumber: "VL-20261031-A1B2",
      customerName: "Rahim Uddin",
      customerEmail: "rahim@example.com",
      customerPhone: "01712345678",
      amount: 1250,
      gateway: "BKASH",
      status: "SUCCESS",
      merchantReferenceId: "TRX-BKS-01",
      gatewayTransactionId: "BKS998877",
      createdAt: new Date("2026-10-31T10:00:00.000Z"),
      refundsCount: 0,
      refundedAmount: 0,
    },
    {
      id: "pay-2",
      orderId: "ord-2",
      orderNumber: "VL-20261031-C3D4",
      customerName: "Karim Khan",
      customerEmail: "karim@example.com",
      customerPhone: "01887654321",
      amount: 2500,
      gateway: "COD",
      status: "PENDING",
      merchantReferenceId: "COD-VL-20261031-C3D4",
      gatewayTransactionId: null,
      createdAt: new Date("2026-10-31T11:30:00.000Z"),
      refundsCount: 0,
      refundedAmount: 0,
    },
    {
      id: "pay-3",
      orderId: "ord-3",
      orderNumber: "VL-20261031-E5F6",
      customerName: "Fatema Begum",
      customerEmail: "fatema@example.com",
      customerPhone: null,
      amount: 3200,
      gateway: "SSLCOMMERZ",
      status: "REFUNDED",
      merchantReferenceId: "TRX-SSL-03",
      gatewayTransactionId: "SSL112233",
      createdAt: new Date("2026-10-31T12:00:00.000Z"),
      refundsCount: 1,
      refundedAmount: 3200,
    },
  ];

  test("renders transaction ledger table with order numbers and customer info", () => {
    const html = renderToStaticMarkup(
      <AdminPaymentsTable initialPayments={mockPayments} />
    );

    expect(html).toContain("VL-20261031-A1B2");
    expect(html).toContain("Rahim Uddin");
    expect(html).toContain("rahim@example.com");
    expect(html).toContain("01712345678");
    expect(html).toContain("৳1,250.00");

    expect(html).toContain("VL-20261031-C3D4");
    expect(html).toContain("Karim Khan");
    expect(html).toContain("Cash on Delivery");
    expect(html).toContain("৳2,500.00");
  });

  test("renders gateway badges and transaction IDs correctly", () => {
    const html = renderToStaticMarkup(
      <AdminPaymentsTable initialPayments={mockPayments} />
    );

    expect(html).toContain("bKash");
    expect(html).toContain("BKS998877");

    expect(html).toContain("SSLCommerz");
    expect(html).toContain("SSL112233");
    expect(html).toContain("REFUNDED");
  });

  test("renders gateway and status filter tabs", () => {
    const html = renderToStaticMarkup(
      <AdminPaymentsTable initialPayments={mockPayments} />
    );

    expect(html).toContain("All Gateways");
    expect(html).toContain("bKash");
    expect(html).toContain("Nagad");
    expect(html).toContain("COD");

    expect(html).toContain("All");
    expect(html).toContain("Success");
    expect(html).toContain("Pending");
    expect(html).toContain("Refunded");
  });

  test("renders meta counter showing loaded vs total transactions count", () => {
    const html = renderToStaticMarkup(
      <AdminPaymentsTable initialPayments={mockPayments} />
    );

    expect(html).toContain("Showing");
    expect(html).toContain("transactions");
    expect(html).toContain("of");
  });

  test("renders column visibility dropdown and export CSV button", () => {
    const html = renderToStaticMarkup(
      <AdminPaymentsTable initialPayments={mockPayments} />
    );

    expect(html).toContain("Columns");
    expect(html).toContain("Export CSV");
  });
});

