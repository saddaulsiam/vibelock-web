import * as React from "react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vibelock_test",
    AUTH_SECRET: "12345678901234567890123456789012",
    COURIER_WEBHOOK_SECRET: "test-steadfast-secret-key-12345",
    STEADFAST_API_KEY: "test-key",
    STEADFAST_SECRET_KEY: "test-secret",
    STEADFAST_BASE_URL: "https://portal.packzy.com/api/v1",
    SHIPPING_PROVIDER: "steadfast",
  },
}));

import { renderToStaticMarkup } from "react-dom/server";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";
import { OrderCustomerRiskCard } from "@/components/admin/orders";
import type { CombinedCustomerRiskProfile } from "@/lib/admin/customers";

describe("Steadfast Courier Fraud Check & Risk Intelligence", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("calculates LOW risk level when customer has high delivery ratio", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 200,
        Total_parcels: 20,
        total_delivered: 18,
        total_cancelled: 2,
        total_fraud_reports: [],
      }),
    } as unknown as Response);

    const provider = new SteadfastCourierProvider(
      "test-key",
      "test-secret",
      "https://portal.packzy.com/api/v1"
    );

    const result = await provider.checkCustomerRisk("01712345678");

    expect(result.success).toBe(true);
    expect(result.totalParcels).toBe(20);
    expect(result.totalDelivered).toBe(18);
    expect(result.totalCancelled).toBe(2);
    expect(result.deliveryRatio).toBe(90);
    expect(result.cancellationRatio).toBe(10);
    expect(result.riskLevel).toBe("LOW");
    expect(result.fraudReportsCount).toBe(0);
  });

  test("calculates HIGH risk level when customer has fraud reports or high cancellation ratio", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 200,
        total_parcels: 10,
        total_delivered: 3,
        total_cancelled: 7,
        total_fraud_reports: [{ report: "Fake order" }],
      }),
    } as unknown as Response);

    const provider = new SteadfastCourierProvider(
      "test-key",
      "test-secret",
      "https://portal.packzy.com/api/v1"
    );

    const result = await provider.checkCustomerRisk("8801812345678");

    expect(result.success).toBe(true);
    expect(result.phone).toBe("01812345678"); // Normalizes BD phone prefix
    expect(result.deliveryRatio).toBe(30);
    expect(result.cancellationRatio).toBe(70);
    expect(result.fraudReportsCount).toBe(1);
    expect(result.riskLevel).toBe("HIGH");
  });

  test("handles missing/invalid phone number gracefully without throwing", async () => {
    const provider = new SteadfastCourierProvider(
      "test-key",
      "test-secret",
      "https://portal.packzy.com/api/v1"
    );

    const result = await provider.checkCustomerRisk("123");
    expect(result.success).toBe(false);
    expect(result.riskLevel).toBe("UNKNOWN");
  });

  test("renders OrderCustomerRiskCard markup correctly", () => {
    const mockProfile: CombinedCustomerRiskProfile = {
      phone: "01712345678",
      email: "buyer@example.com",
      riskScore: "LOW_RISK",
      riskLabel: "Trusted / Verified Buyer",
      headline: "High Courier Reliability (90% delivery rate across 20 parcels in BD)",
      recommendation: "Reliable buyer with proven delivery track record. Safe for 1-click confirmation.",
      confidenceBadge: "VERIFIED",
      storeStats: {
        totalOrders: 3,
        deliveredOrders: 3,
        cancelledOrders: 0,
        pendingOrders: 0,
        totalSpent: 6500,
        isRepeatCustomer: true,
      },
      steadfastStats: {
        success: true,
        phone: "01712345678",
        totalParcels: 20,
        totalDelivered: 18,
        totalCancelled: 2,
        deliveryRatio: 90,
        cancellationRatio: 10,
        fraudReportsCount: 0,
        riskLevel: "LOW",
      },
      checkedAt: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      React.createElement(OrderCustomerRiskCard, {
        initialProfile: mockProfile,
        orderNumber: "ORD-TEST-100",
        customerName: "Tanvir Ahmed",
        customerPhone: "01712345678",
        customerEmail: "buyer@example.com",
        userId: "user-123",
        orderId: "ord-123",
      })
    );

    expect(html).toContain("Customer Trust &amp; Fraud Intelligence");
    expect(html).toContain("Trusted / Verified Buyer");
    expect(html).toContain("Steadfast Network History");
    expect(html).toContain("90% Delivered");
    expect(html).toContain("VibeLock Store History");
    expect(html).toContain("Repeat Customer");
    expect(html).toContain("৳6,500.00");
  });
});
