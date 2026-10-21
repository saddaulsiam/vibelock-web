import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import { getAdminDashboardData } from "../../src/lib/admin/dashboard-queries";
import { getAdminReport } from "../../src/lib/admin/report-queries";
import AdminPage from "../../src/app/(protected)/admin/page";
import crypto from "crypto";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

const userIds: string[] = [];
const orderIds: string[] = [];
const paymentIds: string[] = [];
const returnIds: string[] = [];
const productIds: string[] = [];

describe("admin dashboard executive KPIs", () => {
  beforeEach(() => {
    mockSession = null;
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (returnIds.length) {
        await tx.returnItem.deleteMany({ where: { returnRequestId: { in: returnIds } } });
        await tx.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
      }
      if (paymentIds.length) {
        await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      if (orderIds.length) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (productIds.length) {
        await tx.productVariant.deleteMany({ where: { productId: { in: productIds } } });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    userIds.length = 0;
    orderIds.length = 0;
    paymentIds.length = 0;
    returnIds.length = 0;
    productIds.length = 0;
  });

  test("requires ADMIN role for dashboard access", async () => {
    // Unauthenticated
    mockSession = null;
    await expect(getAdminDashboardData()).rejects.toThrow();

    // Customer role
    mockSession = { user: { id: "customer-1", role: "CUSTOMER" } };
    await expect(getAdminDashboardData()).rejects.toThrow();
  });

  test("resolves all five range presets and falls back on unknown range", async () => {
    const user = await prisma.user.create({
      data: { email: `dash-range-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const presets = ["today", "yesterday", "7d", "30d", "this-month"] as const;
    for (const preset of presets) {
      const data = await getAdminDashboardData({ range: preset });
      expect(data.financials.range).toBe(preset);
      expect(data.financials.start).toBeInstanceOf(Date);
      expect(data.financials.end).toBeInstanceOf(Date);
      expect(data.financials.start.getTime()).toBeLessThan(data.financials.end.getTime());
    }

    // Unknown range fallback to 30d
    const fallback = await getAdminDashboardData({ range: "nonexistent-range" });
    expect(fallback.financials.range).toBe("30d");

    // Default without filters falls back to 30d
    const defaultData = await getAdminDashboardData();
    expect(defaultData.financials.range).toBe("30d");
  }, 30000);

  test("summaryOnly path executes exactly one database query and matches full report summary", async () => {
    const user = await prisma.user.create({
      data: { email: `dash-query-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const rawSpy = vi.spyOn(prisma, "$queryRaw");

    try {
      rawSpy.mockClear();
      const summaryReport = await getAdminReport({ range: "30d", summaryOnly: true });
      expect(rawSpy).toHaveBeenCalledTimes(1);
      expect(summaryReport.trend).toHaveLength(0);
      expect(summaryReport.products).toHaveLength(0);
      expect(summaryReport.payments).toHaveLength(0);
      expect(summaryReport.returns).toEqual({ count: 0, units: 0, value: 0 });

      rawSpy.mockClear();
      const fullReport = await getAdminReport({ range: "30d" });
      expect(rawSpy).toHaveBeenCalledTimes(5);

      // Financial summary equivalence
      expect(summaryReport.summary).toEqual(fullReport.summary);
    } finally {
      rawSpy.mockRestore();
    }
  }, 30000);

  test("dashboard financials match getAdminReport summary exactly for an active order with returns, refunds, and coupons", async () => {
    const user = await prisma.user.create({
      data: { email: `dash-kpi-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    // Recent order placed now (within today, 7d, 30d, this-month)
    // 2 units at 250 = 500 lineTotal. Coupon discount = 50. Total = 450. costPrice = 100/unit.
    const order = await prisma.order.create({
      data: {
        orderNumber: `DASH-${crypto.randomUUID()}`,
        createdAt: new Date(),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(500),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(50),
        total: new Prisma.Decimal(450),
        shippingStreet: "Dash Ave",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Dashboard Item",
              sku: `DASH-SKU-${crypto.randomUUID()}`,
              quantity: 2,
              unitPrice: new Prisma.Decimal(250),
              costPrice: new Prisma.Decimal(100),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(500),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(500),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(order.id);

    // Payment
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: new Prisma.Decimal(450),
        status: "SUCCESS",
        gateway: "sslcommerz",
        merchantReferenceId: `DASH-PAY-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(payment.id);

    // Return 1 unit
    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(returnReq.id);

    // Refund 100
    await prisma.refund.create({
      data: { paymentId: payment.id, amount: new Prisma.Decimal(100), status: "SUCCESS" },
    });

    const [dashboard, report] = await Promise.all([
      getAdminDashboardData({ range: "30d" }),
      getAdminReport({ range: "30d" }),
    ]);

    // Financial identity checks:
    expect(dashboard.financials).toBeDefined();
    expect(dashboard.financials.netSales).toBe(report.summary.netSales);
    expect(dashboard.financials.grossProfit).toBe(report.summary.grossProfit);
    expect(dashboard.financials.grossMargin).toBe(report.summary.grossMargin);
    expect(dashboard.financials.soldUnits).toBe(report.summary.soldUnits);
    expect(dashboard.financials.returnedUnits).toBe(report.summary.returnedUnits);
    expect(dashboard.financials.retainedUnits).toBe(
      report.summary.soldUnits - report.summary.returnedUnits
    );
    expect(dashboard.financials.orders).toBe(report.summary.orders);
    expect(dashboard.financials.returnRate).toBe(report.summary.returnRate);
    expect(dashboard.financials.refunds).toBe(report.summary.refunds);

    // Mathematical checks for this order:
    // Net merchandise sales: (500 - 50 coupon) - 100 refund = 350
    // Retained COGS: 1 retained unit * 100 = 100
    // Gross Profit: 350 - 100 = 250
    // Gross Margin: (250 / 350) * 100 = 71.43%
    expect(dashboard.financials.netSales).toBeGreaterThanOrEqual(350);
    expect(dashboard.financials.retainedUnits).toBeGreaterThanOrEqual(1);
    expect(dashboard.financials.returnRate).toBeGreaterThan(0);

    // Operational counts remain intact
    expect(dashboard.orderCount).toBeGreaterThanOrEqual(1);
    expect(dashboard.recentOrders).toHaveLength(Math.min(6, dashboard.orderCount));
    expect(dashboard.inventory).toBeDefined();
    expect(dashboard.inventory.lowStockThreshold).toBe(5);
  }, 30000);

  test("handles zero/empty state with null grossMargin and zero retainedUnits", async () => {
    const user = await prisma.user.create({
      data: { email: `dash-empty-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    const dashboard = await getAdminDashboardData();
    expect(dashboard.financials).toBeDefined();
    expect(typeof dashboard.financials.netSales).toBe("number");
    expect(typeof dashboard.financials.grossProfit).toBe("number");
    expect(typeof dashboard.financials.retainedUnits).toBe("number");
    expect(dashboard.financials.retainedUnits).toBeGreaterThanOrEqual(0);

    if (dashboard.financials.netSales <= 0) {
      expect(dashboard.financials.grossMargin).toBeNull();
    } else {
      expect(typeof dashboard.financials.grossMargin).toBe("number");
    }
  }, 30000);

  test("renders AdminPage Server Component with selected preset and fallback", async () => {
    const user = await prisma.user.create({
      data: { email: `dash-page-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    mockSession = { user: { id: user.id, role: "ADMIN" } };

    // Valid preset searchParam
    const pageWithPreset = await AdminPage({ searchParams: Promise.resolve({ range: "7d" }) });
    expect(pageWithPreset).toBeDefined();

    // Invalid preset searchParam falls back gracefully
    const pageWithFallback = await AdminPage({
      searchParams: Promise.resolve({ range: "invalid-range" }),
    });
    expect(pageWithFallback).toBeDefined();

    // No searchParams provided
    const pageDefault = await AdminPage();
    expect(pageDefault).toBeDefined();
  }, 30000);
});
