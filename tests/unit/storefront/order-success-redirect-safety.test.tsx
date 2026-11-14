/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mockAuth, mockGetCustomerOrderConfirmation, mockRedirect, mockNotFound, mockCancelOrderAction } = vi.hoisted(() => {
  const mockRedirect = vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT: ${url}`);
    (err as any).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  });

  return {
    mockAuth: vi.fn(),
    mockGetCustomerOrderConfirmation: vi.fn(),
    mockRedirect,
    mockNotFound: vi.fn(),
    mockCancelOrderAction: vi.fn(),
  };
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/orders/queries", () => ({
  getCustomerOrderConfirmation: mockGetCustomerOrderConfirmation,
}));

vi.mock("@/lib/orders/actions", () => ({
  cancelOrderAction: mockCancelOrderAction,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

// Mock Image and child components that may have client interactions
vi.mock("next/image", () => ({
  default: (props: any) => {
    const { fill, unoptimized, ...rest } = props;
    void fill;
    void unoptimized;
    return React.createElement("img", { ...rest, alt: rest.alt || "" });
  },
}));

vi.mock("@/components/storefront/orders/order-print-action", () => ({
  OrderPrintAction: () => React.createElement("div", { "data-testid": "print-action" }),
}));

vi.mock("@/components/storefront/orders/order-status-badge", () => ({
  OrderStatusBadge: ({ status }: any) =>
    React.createElement("span", { "data-testid": "order-status-badge" }, status),
}));

vi.mock("@/components/shared/payment-gateway-badge", () => ({
  PaymentGatewayBadge: ({ gateway, paymentMethod }: any) =>
    React.createElement("span", { "data-testid": "payment-gateway-badge" }, `${gateway || paymentMethod}`),
}));

import OrderSuccessPage from "@/app/(storefront)/order-success/[orderNumber]/page";

describe("Phase 5B-1 (PAY-5B-01) — Order Success Untrusted Browser Redirect Safety", () => {
  const samplePendingOrder = {
    id: "ord-101",
    orderNumber: "VL-20261115-ABC",
    userId: "cust-1",
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "ONLINE",
    paymentGateway: "SSLCOMMERZ",
    customerName: "Siam Saddan",
    customerEmail: "siam@vibelock.bd",
    customerPhone: "01711223344",
    shippingStreet: "Road 10, Sector 4",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1230",
    shippingCountry: "BD",
    subtotal: 3500,
    shippingCost: 80,
    discount: 0,
    total: 3580,
    createdAt: new Date("2026-11-15T10:00:00Z"),
    items: [
      {
        productName: "Signature Heavyweight Hoodie",
        size: "L",
        color: "Obsidian Black",
        quantity: 1,
        unitPrice: 3500,
        lineTotal: 3500,
        imageUrl: "https://res.cloudinary.com/vibelock/image/upload/sample.jpg",
        sku: "VL-HD-BLK-L",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "cust-1", email: "siam@vibelock.bd" } });
    mockGetCustomerOrderConfirmation.mockResolvedValue(samplePendingOrder);
  });

  test("does NOT invoke cancelOrderAction when browser redirects with ?payment=cancelled", async () => {
    const jsx = await OrderSuccessPage({
      params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
      searchParams: Promise.resolve({ payment: "cancelled" }),
    });

    // Authoritative check: cancelOrderAction must never be called on browser redirect
    expect(mockCancelOrderAction).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(jsx);
    expect(html).toContain("VL-20261115-ABC");
    expect(html).toContain("Payment Incomplete");
    expect(html).toContain("Payment Not Confirmed");
    expect(html).toContain("pending payment confirmation");
  });

  test("does NOT invoke cancelOrderAction when browser redirects with ?payment=failed", async () => {
    const jsx = await OrderSuccessPage({
      params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
      searchParams: Promise.resolve({ payment: "failed" }),
    });

    expect(mockCancelOrderAction).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(jsx);
    expect(html).toContain("VL-20261115-ABC");
    expect(html).toContain("Payment Incomplete");
    expect(html).toContain("Payment Not Confirmed");
  });

  test("forged URL: ?payment=cancelled on a paid order does NOT cancel the order and renders confirmation", async () => {
    const paidOrder = {
      ...samplePendingOrder,
      status: "CONFIRMED",
      paymentStatus: "SUCCESS",
    };
    mockGetCustomerOrderConfirmation.mockResolvedValueOnce(paidOrder);

    const jsx = await OrderSuccessPage({
      params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
      searchParams: Promise.resolve({ payment: "cancelled" }),
    });

    // Never cancel
    expect(mockCancelOrderAction).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(jsx);
    // Paid order displays authoritative confirmation despite forged query param
    expect(html).toContain("Thank you, Siam!");
    expect(html).toContain("Order #VL-20261115-ABC is confirmed");
    expect(html).not.toContain("Items Returned to Stock");
  });

  test("renders authoritative cancelled view when database status is CANCELLED without calling cancelOrderAction", async () => {
    const cancelledOrder = {
      ...samplePendingOrder,
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
    };
    mockGetCustomerOrderConfirmation.mockResolvedValueOnce(cancelledOrder);

    const jsx = await OrderSuccessPage({
      params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
      searchParams: Promise.resolve({ payment: "cancelled" }),
    });

    expect(mockCancelOrderAction).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(jsx);
    expect(html).toContain("Order Cancelled");
    expect(html).toContain("Items Returned to Stock");
  });

  test("renders standard confirmation when payment is success", async () => {
    const paidOrder = {
      ...samplePendingOrder,
      status: "CONFIRMED",
      paymentStatus: "SUCCESS",
    };
    mockGetCustomerOrderConfirmation.mockResolvedValueOnce(paidOrder);

    const jsx = await OrderSuccessPage({
      params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
      searchParams: Promise.resolve({ payment: "success" }),
    });

    expect(mockCancelOrderAction).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(jsx);
    expect(html).toContain("Thank you, Siam!");
    expect(html).toContain("Order #VL-20261115-ABC is confirmed");
  });

  test("redirects unauthenticated user to login", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(
      OrderSuccessPage({
        params: Promise.resolve({ orderNumber: "VL-20261115-ABC" }),
        searchParams: Promise.resolve({ payment: "cancelled" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT: /login");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
    expect(mockGetCustomerOrderConfirmation).not.toHaveBeenCalled();
    expect(mockCancelOrderAction).not.toHaveBeenCalled();
  });
});
