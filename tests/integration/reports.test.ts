import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import { getAdminReport } from "../../src/lib/admin/report-queries";
import crypto from "crypto";
import { csv, csvCell } from "../../src/app/api/admin/reports/export/route";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

const userIds: string[] = [];
const orderIds: string[] = [];
const paymentIds: string[] = [];
const returnIds: string[] = [];

describe("admin reports", () => {
  beforeEach(() => {
    mockSession = null;
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (returnIds.length) await tx.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
      if (paymentIds.length) {
        await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      if (orderIds.length) await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    userIds.length = 0;
    orderIds.length = 0;
    paymentIds.length = 0;
    returnIds.length = 0;
  });

  test("excludes cancelled orders and does not double-count refunds for multi-item orders", async () => {
    const user = await prisma.user.create({
      data: { email: `reports-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `RPT-${crypto.randomUUID()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-01-01T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(100),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(10),
        total: new Prisma.Decimal(150),
        shippingStreet: "Test Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Report Tee",
              sku: `RPT-A-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(60),
              costPrice: new Prisma.Decimal(20),
              appliedDiscount: new Prisma.Decimal(5),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(60),
              discountAmount: new Prisma.Decimal(5),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(55),
            },
            {
              productName: "Report Tee",
              sku: `RPT-B-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(40),
              costPrice: new Prisma.Decimal(20),
              appliedDiscount: new Prisma.Decimal(5),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(40),
              discountAmount: new Prisma.Decimal(5),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(35),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(order.id);
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: new Prisma.Decimal(150),
        status: "SUCCESS",
        gateway: "test",
        merchantReferenceId: `RPT-P-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(payment.id);
    await prisma.refund.create({
      data: { paymentId: payment.id, amount: new Prisma.Decimal(20), status: "SUCCESS" },
    });
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(returnRequest.id);

    const cancelled = await prisma.order.create({
      data: {
        orderNumber: `RPT-C-${crypto.randomUUID()}`,
        createdAt: new Date("2099-01-01T13:00:00.000Z"),
        status: "CANCELLED",
        customerEmail: user.email,
        taxRate: 0,
        taxIncluded: false,
        shippingCost: 0,
        subtotal: 999,
        taxAmount: 0,
        discount: 0,
        total: 999,
        shippingStreet: "Test Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [{
            productName: "Cancelled",
            sku: `RPT-CI-${crypto.randomUUID()}`,
            quantity: 1,
            unitPrice: 999,
            costPrice: 1,
            appliedDiscount: 0,
            taxRate: 0,
            taxIncluded: false,
            lineSubtotal: 999,
            discountAmount: 0,
            taxAmount: 0,
            lineTotal: 999,
          }],
        },
      },
    });
    orderIds.push(cancelled.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-01-01", to: "2099-01-01" });

    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(100);
    expect(report.summary.discounts).toBe(10);
    expect(report.summary.refunds).toBe(20);
    expect(report.summary.netSales).toBe(70);
    expect(report.summary.returnCount).toBe(1);
    expect(report.summary.returnedUnits).toBe(1);
    expect(report.summary.cogs).toBe(20);
    expect(report.products.reduce((sum, product) => sum + product.units, 0)).toBe(1);
    expect(report.products.reduce((sum, product) => sum + product.returnedUnits, 0)).toBe(1);
    expect(report.products.reduce((sum, product) => sum + product.netSales, 0)).toBe(35);

  });

  test("rejects non-admin users", async () => {
    mockSession = { user: { id: "customer-id", role: "CUSTOMER" } };
    await expect(getAdminReport({ range: "30d" })).rejects.toThrow("NEXT_REDIRECT");
  });

  test("escapes CSV values and preserves UTF-8 text", () => {
    expect(csvCell("ঢাকা, \"Main\"\nStreet")).toBe('"ঢাকা, ""Main""\nStreet"');
    expect(csv([["Product", "Customer"], ["শার্ট", "A, B"]])).toContain('শার্ট,"A, B"');
    expect(csvCell("=HYPERLINK(\"https://attacker.example\")")).toBe("\"'=HYPERLINK(\"\"https://attacker.example\"\")\"");
  });
});
