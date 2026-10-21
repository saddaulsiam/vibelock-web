import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma/client";
import {
  getAdminReport,
  getAdminOrderProfitability,
  getAdminProductProfitability,
} from "../../src/lib/admin/report-queries";
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
const productIds: string[] = [];

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

    const item55 = order.items.find((item) => Number(item.lineTotal) === 55)!;
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: item55.id, quantity: 1 }] },
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
          create: [
            {
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
            },
          ],
        },
      },
    });
    orderIds.push(cancelled.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-01-01", to: "2099-01-01" });

    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(100);
    expect(report.summary.discounts).toBe(20);
    expect(report.summary.refunds).toBe(20);
    expect(report.summary.netSales).toBe(60);
    expect(report.summary.returnCount).toBe(1);
    expect(report.summary.returnedUnits).toBe(1);
    expect(report.summary.cogs).toBe(20);
    expect(report.summary.grossProfit).toBe(40);
    expect(report.products.reduce((sum, product) => sum + product.units, 0)).toBe(1);
    expect(report.products.reduce((sum, product) => sum + product.returnedUnits, 0)).toBe(1);
    expect(report.products.reduce((sum, product) => sum + product.netSales, 0)).toBe(35);
  });

  test("deducts Order.discount coupon exactly once from merchandise sales and gross profit", async () => {
    const user = await prisma.user.create({
      data: { email: `coupon-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `CPN-${crypto.randomUUID()}`;

    // Order with 2 items: 500 each, total subtotal = 1000, costPrice: 200 each (COGS: 400)
    // Order-level coupon discount: 150. Shipping: 60.
    // Total charged: (1000 - 150) + 60 = 910.
    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-02-01T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(1000),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(150),
        total: new Prisma.Decimal(910),
        shippingStreet: "123 Elm St",
        shippingCity: "Chittagong",
        shippingCountry: "BD",
        shippingMethodName: "Express",
        items: {
          create: [
            {
              productName: "Hoodie A",
              sku: `CPN-A-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(500),
              costPrice: new Prisma.Decimal(200),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(500),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(500),
            },
            {
              productName: "Hoodie B",
              sku: `CPN-B-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(500),
              costPrice: new Prisma.Decimal(200),
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
    });
    orderIds.push(order.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-02-01", to: "2099-02-01" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-02-01",
      to: "2099-02-01",
    });

    // Summary assertions
    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(1000);
    expect(report.summary.discounts).toBe(150);
    expect(report.summary.netSales).toBe(850); // 1000 - 150 = 850
    expect(report.summary.cogs).toBe(400); // 200 + 200 = 400
    expect(report.summary.grossProfit).toBe(450); // 850 - 400 = 450 (coupon deducted exactly once)
    expect(report.summary.shippingCharged).toBe(60);

    // Payments section: total order revenue for payment method
    const onlinePayment = report.payments.find((p) => p.method === "ONLINE");
    expect(onlinePayment).toBeDefined();
    expect(onlinePayment?.sales).toBe(910); // 850 merchandise + 60 shipping

    // Order profitability assertions
    expect(orderProf.orders).toHaveLength(1);
    const orderRow = orderProf.orders[0];
    expect(orderRow.grossSales).toBe(1000);
    expect(orderRow.discount).toBe(150);
    expect(orderRow.cogs).toBe(400);
    expect(orderRow.profit).toBe(450); // (1000 - 400) - 150 = 450
  });

  test("calculates sales, discounts, and profit correctly for orders without a coupon", async () => {
    const user = await prisma.user.create({
      data: { email: `nocoupon-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `NCPN-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-03-01T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(50),
        subtotal: new Prisma.Decimal(500),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(550),
        shippingStreet: "456 Oak St",
        shippingCity: "Sylhet",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Cap",
              sku: `NCPN-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(500),
              costPrice: new Prisma.Decimal(250),
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
    });
    orderIds.push(order.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-03-01", to: "2099-03-01" });

    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(500);
    expect(report.summary.discounts).toBe(0);
    expect(report.summary.netSales).toBe(500);
    expect(report.summary.cogs).toBe(250);
    expect(report.summary.grossProfit).toBe(250);
    expect(report.summary.shippingCharged).toBe(50);
  });

  test("completely excludes cancelled orders from reporting and profitability", async () => {
    const user = await prisma.user.create({
      data: { email: `cancelled-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);

    const cancelledOrder = await prisma.order.create({
      data: {
        orderNumber: `CAN-${crypto.randomUUID()}`,
        createdAt: new Date("2099-04-01T12:00:00.000Z"),
        userId: user.id,
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(2000),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(200),
        total: new Prisma.Decimal(1900),
        shippingStreet: "Cancelled Lane",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Cancelled Item",
              sku: `CAN-SKU-${crypto.randomUUID()}`,
              quantity: 2,
              unitPrice: new Prisma.Decimal(1000),
              costPrice: new Prisma.Decimal(400),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(2000),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(2000),
            },
          ],
        },
      },
    });
    orderIds.push(cancelledOrder.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-04-01", to: "2099-04-01" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-04-01",
      to: "2099-04-01",
    });

    expect(report.summary.orders).toBe(0);
    expect(report.summary.grossSales).toBe(0);
    expect(report.summary.netSales).toBe(0);
    expect(report.summary.cogs).toBe(0);
    expect(report.summary.grossProfit).toBe(0);
    expect(orderProf.orders).toHaveLength(0);
  });

  test("documents pending and failed online payment behavior without misrepresenting them as collected cash", async () => {
    const user = await prisma.user.create({
      data: { email: `payment-status-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);

    // Online order 1: PENDING payment (abandoned checkout / awaiting payment)
    const pendingOrder = await prisma.order.create({
      data: {
        orderNumber: `PEND-${crypto.randomUUID()}`,
        createdAt: new Date("2099-05-01T10:00:00.000Z"),
        userId: user.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(300),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(360),
        shippingStreet: "Pending Ave",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Pending Item",
              sku: `PEND-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(300),
              costPrice: new Prisma.Decimal(100),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(300),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(300),
            },
          ],
        },
      },
    });
    orderIds.push(pendingOrder.id);

    // Online order 2: FAILED payment (gateway declined / user cancelled at gateway)
    const failedOrder = await prisma.order.create({
      data: {
        orderNumber: `FAIL-${crypto.randomUUID()}`,
        createdAt: new Date("2099-05-01T11:00:00.000Z"),
        userId: user.id,
        status: "PENDING",
        paymentStatus: "FAILED",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(400),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(460),
        shippingStreet: "Failed Ave",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Failed Item",
              sku: `FAIL-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(400),
              costPrice: new Prisma.Decimal(150),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(400),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(400),
            },
          ],
        },
      },
    });
    orderIds.push(failedOrder.id);

    // Failed payment record in Payment table
    const failedPayment = await prisma.payment.create({
      data: {
        orderId: failedOrder.id,
        amount: new Prisma.Decimal(460),
        status: "FAILED",
        gateway: "sslcommerz",
        merchantReferenceId: `FAIL-REF-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(failedPayment.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-05-01", to: "2099-05-01" });

    // Verify: Neither order has a successful payment in the Payment table
    const successfulPayments = await prisma.payment.findMany({
      where: { orderId: { in: [pendingOrder.id, failedOrder.id] }, status: "SUCCESS" },
    });
    expect(successfulPayments).toHaveLength(0);

    // Verify: The report provides no cash-collection metric, and netProfit remains null
    expect(report.summary.netProfit).toBeNull();
    expect(report.summary.refunds).toBe(0);
    // Preserves distinction between order totals and collected cash: refunds only count successful payments
    expect(report.summary.orders).toBe(2);
  });

  test("uses historical OrderItem.costPrice snapshot rather than updated product variant cost", async () => {
    const user = await prisma.user.create({
      data: { email: `cogs-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);

    // Create a product and variant with initial costPrice 100
    const product = await prisma.product.create({
      data: {
        name: "Historical Cost Product",
        slug: `hist-cost-${crypto.randomUUID()}`,
        status: "PUBLISHED",
        variants: {
          create: {
            sku: `HIST-SKU-${crypto.randomUUID()}`,
            costPrice: new Prisma.Decimal(100),
            sellingPrice: new Prisma.Decimal(300),
          },
        },
      },
      include: { variants: true },
    });
    productIds.push(product.id);
    const variant = product.variants[0];

    // Order created using historical cost price 100
    const order = await prisma.order.create({
      data: {
        orderNumber: `HIST-${crypto.randomUUID()}`,
        createdAt: new Date("2099-06-01T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(300),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(300),
        shippingStreet: "Snapshot Way",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: product.name,
              sku: variant.sku,
              quantity: 1,
              unitPrice: new Prisma.Decimal(300),
              costPrice: new Prisma.Decimal(100), // Snapshot when order was placed
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(300),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(300),
            },
          ],
        },
      },
    });
    orderIds.push(order.id);

    // Later: supplier increased cost price to 180
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { costPrice: new Prisma.Decimal(180) },
    });

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-06-01", to: "2099-06-01" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-06-01",
      to: "2099-06-01",
    });

    // COGS must use historical OrderItem snapshot 100, NOT the updated variant cost 180
    expect(report.summary.cogs).toBe(100);
    expect(report.summary.grossProfit).toBe(200); // 300 - 100 = 200
    expect(report.products[0].cogs).toBe(100);
    expect(report.products[0].profit).toBe(200);
    expect(orderProf.orders[0].cogs).toBe(100);
    expect(orderProf.orders[0].profit).toBe(200);
  });

  test("handles decimal precision and strict date range boundaries", async () => {
    const user = await prisma.user.create({
      data: { email: `precision-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);

    // In-range order on 2099-07-05 with fractional cents: 19.99 * 3 = 59.97, discount = 4.50, shipping = 10.25 -> total = 65.72
    const inRangeOrder = await prisma.order.create({
      data: {
        orderNumber: `IN-${crypto.randomUUID()}`,
        createdAt: new Date("2099-07-05T14:30:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(10.25),
        subtotal: new Prisma.Decimal(59.97),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(4.5),
        total: new Prisma.Decimal(65.72),
        shippingStreet: "Precision St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Precision Item",
              sku: `PREC-${crypto.randomUUID()}`,
              quantity: 3,
              unitPrice: new Prisma.Decimal(19.99),
              costPrice: new Prisma.Decimal(10.05),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(59.97),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(59.97),
            },
          ],
        },
      },
    });
    orderIds.push(inRangeOrder.id);

    // Out-of-range order on 2099-07-06
    const outOfRangeOrder = await prisma.order.create({
      data: {
        orderNumber: `OUT-${crypto.randomUUID()}`,
        createdAt: new Date("2099-07-06T00:00:01.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(10),
        subtotal: new Prisma.Decimal(100),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(110),
        shippingStreet: "Out St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Out Item",
              sku: `OUT-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(100),
              costPrice: new Prisma.Decimal(50),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(100),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(100),
            },
          ],
        },
      },
    });
    orderIds.push(outOfRangeOrder.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    // Query only 2099-07-05
    const report = await getAdminReport({ range: "custom", from: "2099-07-05", to: "2099-07-05" });

    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(59.97);
    expect(report.summary.discounts).toBe(4.5);
    expect(report.summary.netSales).toBe(55.47); // 59.97 - 4.50 = 55.47
    expect(report.summary.cogs).toBe(30.15); // 10.05 * 3 = 30.15
    expect(report.summary.grossProfit).toBe(25.32); // 55.47 - 30.15 = 25.32
    expect(report.summary.shippingCharged).toBe(10.25);
  });

  test("handles an order with two units where one unit is returned and no refund is recorded", async () => {
    const user = await prisma.user.create({
      data: { email: `ret-noref-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `RET-NR-${crypto.randomUUID()}`;

    // 2 units at 200 each = 400 total. costPrice: 100 each.
    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-08-01T10:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(400),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(400),
        shippingStreet: "Return Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Dual Item",
              sku: `DUAL-${crypto.randomUUID()}`,
              quantity: 2,
              unitPrice: new Prisma.Decimal(200),
              costPrice: new Prisma.Decimal(100),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(400),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(400),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(order.id);

    // Return 1 unit; NO payment refund recorded
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(returnRequest.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-08-01", to: "2099-08-01" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-08-01",
      to: "2099-08-01",
    });

    // Summary checks: COGS charges only 1 retained unit (100), netSales remains 400 (no refund was issued)
    expect(report.summary.orders).toBe(1);
    expect(report.summary.soldUnits).toBe(2);
    expect(report.summary.returnedUnits).toBe(1);
    expect(report.summary.refunds).toBe(0);
    expect(report.summary.netSales).toBe(400);
    expect(report.summary.cogs).toBe(100);
    expect(report.summary.grossProfit).toBe(300); // 400 - 100 = 300

    // Order profitability checks: COGS must reflect retained unit (100, not 200)
    expect(orderProf.orders).toHaveLength(1);
    const row = orderProf.orders[0];
    expect(row.cogs).toBe(100);
    expect(row.refunds).toBe(0);
    expect(row.profit).toBe(300); // (400 net sales - 100 retained COGS)
    expect(row.margin).toBe(75); // (300 / 400) * 100
  });

  test("handles an order with a successful payment refund but no recorded item return", async () => {
    const user = await prisma.user.create({
      data: { email: `ref-noret-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `REF-NR-${crypto.randomUUID()}`;

    // 1 unit at 300. costPrice: 120.
    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-08-02T10:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(300),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(300),
        shippingStreet: "Refund Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Refunded Item",
              sku: `REF-NR-${crypto.randomUUID()}`,
              quantity: 1,
              unitPrice: new Prisma.Decimal(300),
              costPrice: new Prisma.Decimal(120),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(300),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(300),
            },
          ],
        },
      },
    });
    orderIds.push(order.id);

    // Payment and refund of 50 created (e.g. price adjustment / goodwill); NO return recorded
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: new Prisma.Decimal(300),
        status: "SUCCESS",
        gateway: "sslcommerz",
        merchantReferenceId: `REF-NR-PAY-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(payment.id);

    await prisma.refund.create({
      data: { paymentId: payment.id, amount: new Prisma.Decimal(50), status: "SUCCESS" },
    });

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-08-02", to: "2099-08-02" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-08-02",
      to: "2099-08-02",
    });

    // Summary checks: item retained so COGS is charged in full (120), refund reduces net sales to 250
    expect(report.summary.orders).toBe(1);
    expect(report.summary.refunds).toBe(50);
    expect(report.summary.netSales).toBe(250); // 300 - 50 = 250
    expect(report.summary.cogs).toBe(120);
    expect(report.summary.grossProfit).toBe(130); // 250 - 120 = 130

    // Order profitability checks: profit equals netSales (250) - COGS (120) = 130
    expect(orderProf.orders).toHaveLength(1);
    const row = orderProf.orders[0];
    expect(row.refunds).toBe(50);
    expect(row.cogs).toBe(120);
    expect(row.profit).toBe(130);
    expect(row.margin).toBe(52); // (130 / 250) * 100
  });

  test("handles an order with both a partial return and a successful payment refund", async () => {
    const user = await prisma.user.create({
      data: { email: `both-ret-ref-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `BOTH-${crypto.randomUUID()}`;

    // 2 units at 250 each = 500. costPrice: 100 each (200 total). Coupon discount: 50. Total: 450.
    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-08-03T10:00:00.000Z"),
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
        shippingStreet: "Both Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "Combined Item",
              sku: `BOTH-${crypto.randomUUID()}`,
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

    // Payment of 450
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: new Prisma.Decimal(450),
        status: "SUCCESS",
        gateway: "sslcommerz",
        merchantReferenceId: `BOTH-PAY-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(payment.id);

    // 1 unit returned
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(returnRequest.id);

    // Refund of 200 recorded
    await prisma.refund.create({
      data: { paymentId: payment.id, amount: new Prisma.Decimal(200), status: "SUCCESS" },
    });

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-08-03", to: "2099-08-03" });
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-08-03",
      to: "2099-08-03",
    });

    // Summary checks:
    // netSales = (500 - 50 coupon) - 200 refund = 250
    // cogs = 1 retained unit * 100 = 100
    // grossProfit = 250 netSales - 100 cogs = 150
    expect(report.summary.orders).toBe(1);
    expect(report.summary.grossSales).toBe(500);
    expect(report.summary.discounts).toBe(50);
    expect(report.summary.refunds).toBe(200);
    expect(report.summary.netSales).toBe(250);
    expect(report.summary.cogs).toBe(100);
    expect(report.summary.grossProfit).toBe(150);

    // Order profitability checks:
    expect(orderProf.orders).toHaveLength(1);
    const row = orderProf.orders[0];
    expect(row.grossSales).toBe(500);
    expect(row.discount).toBe(50);
    expect(row.refunds).toBe(200);
    expect(row.cogs).toBe(100);
    expect(row.profit).toBe(150); // netSales (250) - cogs (100) = 150
    expect(row.margin).toBe(60); // (150 / 250) * 100
  });

  test("produces consistent CSV output formulas and column labels matching documented definitions", async () => {
    const user = await prisma.user.create({
      data: { email: `csv-test-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const orderNumber = `CSV-ORD-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        createdAt: new Date("2099-08-04T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(50),
        subtotal: new Prisma.Decimal(600),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(60),
        total: new Prisma.Decimal(590),
        shippingStreet: "CSV Way",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        items: {
          create: [
            {
              productName: "CSV Item",
              sku: `CSV-SKU-${crypto.randomUUID()}`,
              quantity: 2,
              unitPrice: new Prisma.Decimal(300),
              costPrice: new Prisma.Decimal(100),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(600),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(600),
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
        amount: new Prisma.Decimal(590),
        status: "SUCCESS",
        gateway: "sslcommerz",
        merchantReferenceId: `CSV-PAY-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(payment.id);

    // 1 unit returned
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(returnRequest.id);

    // Refund 150
    await prisma.refund.create({
      data: { paymentId: payment.id, amount: new Prisma.Decimal(150), status: "SUCCESS" },
    });

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const orderProf = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-08-04",
      to: "2099-08-04",
    });
    const row = orderProf.orders[0];

    // CSV columns: Gross Sales, Discount, Net Sales, Refund, COGS, Gross Profit, Margin
    const netSales = row.grossSales - row.discount - row.refunds; // 600 - 60 - 150 = 390
    const grossProfit = row.profit; // netSales (390) - cogs (100) = 290

    expect(row.grossSales).toBe(600);
    expect(row.discount).toBe(60);
    expect(row.refunds).toBe(150);
    expect(netSales).toBe(390);
    expect(row.cogs).toBe(100); // 1 retained unit * 100
    expect(grossProfit).toBe(290);
    expect(netSales - row.cogs).toBe(grossProfit); // CSV consistency identity: Net Sales - COGS === Gross Profit

    const csvOutput = csv([
      [
        "Order Number",
        "Date",
        "Customer",
        "Status",
        "Payment Method",
        "Gross Sales",
        "Discount",
        "Net Sales",
        "Refund",
        "COGS",
        "Gross Profit",
        "Margin",
      ],
      [
        row.orderNumber,
        "2099-08-04",
        row.customerName ?? "Guest",
        row.status,
        row.paymentMethod,
        row.grossSales,
        row.discount,
        netSales,
        row.refunds,
        row.cogs,
        grossProfit,
        `${row.margin?.toFixed(2)}%`,
      ],
    ]);

    expect(csvOutput).toContain("Gross Sales,Discount,Net Sales,Refund,COGS,Gross Profit,Margin");
    expect(csvOutput).toContain(
      `${row.orderNumber},2099-08-04,Guest,DELIVERED,ONLINE,600,60,390,150,100,290,74.36%`
    );
  });

  test("rejects non-admin users", async () => {
    mockSession = { user: { id: "customer-id", role: "CUSTOMER" } };
    await expect(getAdminReport({ range: "30d" })).rejects.toThrow("NEXT_REDIRECT");
  });

  test("escapes CSV values and preserves UTF-8 text", () => {
    expect(csvCell('ঢাকা, "Main"\nStreet')).toBe('"ঢাকা, ""Main""\nStreet"');
    expect(
      csv([
        ["Product", "Customer"],
        ["শার্ট", "A, B"],
      ])
    ).toContain('শার্ট,"A, B"');
    expect(csvCell('=HYPERLINK("https://attacker.example")')).toBe(
      '"\'=HYPERLINK(""https://attacker.example"")"'
    );
  });

  test("handles multiple return requests on the same product SKU and calculates separate sold, returned, net units, and return rate", async () => {
    const user = await prisma.user.create({
      data: { email: `multi-return-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const sku = `SKU-MULTI-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-MULTI-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-01T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(500),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(500),
        items: {
          create: [
            {
              productName: "Multi Return Item",
              sku,
              quantity: 5,
              unitPrice: new Prisma.Decimal(100),
              costPrice: new Prisma.Decimal(40),
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

    const ret1 = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(ret1.id);

    const ret2 = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "APPROVED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 2 }] },
      },
    });
    returnIds.push(ret2.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-09-01", to: "2099-09-01" });
    const product = report.products.find((p) => p.sku === sku);

    expect(product).toBeDefined();
    expect(product?.soldUnits).toBe(5);
    expect(product?.returnedUnits).toBe(3);
    expect(product?.netUnits).toBe(2);
    expect(product?.units).toBe(2);
    expect(product?.returnRate).toBe(60);
    expect(product?.isAnomaly).toBe(false);
    expect(product?.grossSales).toBe(500);
    expect(product?.netSales).toBe(200);
    expect(product?.cogs).toBe(80);
    expect(product?.profit).toBe(120);
    expect(product?.margin).toBe(60);
  });

  test("detects and flags over-return anomalies without hiding them or producing negative net units", async () => {
    const user = await prisma.user.create({
      data: { email: `anomaly-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const sku = `SKU-ANOMALY-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-ANOMALY-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-02T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(300),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(300),
        items: {
          create: [
            {
              productName: "Anomaly Item",
              sku,
              quantity: 2,
              unitPrice: new Prisma.Decimal(150),
              costPrice: new Prisma.Decimal(50),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(300),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(300),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(order.id);

    const ret = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 3 }] },
      },
    });
    returnIds.push(ret.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({ range: "custom", from: "2099-09-02", to: "2099-09-02" });
    const product = report.products.find((p) => p.sku === sku);

    expect(product).toBeDefined();
    expect(product?.soldUnits).toBe(2);
    expect(product?.returnedUnits).toBe(3);
    expect(product?.netUnits).toBe(0);
    expect(product?.units).toBe(0);
    expect(product?.isAnomaly).toBe(true);
    expect(product?.returnRate).toBe(150);
    expect(product?.cogs).toBe(0);
  });

  test("filters both product and order tables when searching by product name or SKU without modifying report summary", async () => {
    const user = await prisma.user.create({
      data: { email: `search-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const skuA = `SKU-SEARCH-A-${crypto.randomUUID()}`;
    const skuB = `SKU-SEARCH-B-${crypto.randomUUID()}`;

    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-SEARCH-1-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-03T10:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(100),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(100),
        items: {
          create: [
            {
              productName: "Alpha Search Gadget",
              sku: skuA,
              quantity: 1,
              unitPrice: new Prisma.Decimal(100),
              costPrice: new Prisma.Decimal(40),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(100),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(100),
            },
          ],
        },
      },
    });
    orderIds.push(order1.id);

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-SEARCH-2-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-03T11:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(200),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(200),
        items: {
          create: [
            {
              productName: "Beta Search Widget",
              sku: skuB,
              quantity: 1,
              unitPrice: new Prisma.Decimal(200),
              costPrice: new Prisma.Decimal(80),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(200),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(200),
            },
          ],
        },
      },
    });
    orderIds.push(order2.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };

    // Search by Alpha SKU
    const reportA = await getAdminReport({
      range: "custom",
      from: "2099-09-03",
      to: "2099-09-03",
      search: skuA,
    });
    const orderProfA = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-09-03",
      to: "2099-09-03",
      search: skuA,
    });

    expect(reportA.products).toHaveLength(1);
    expect(reportA.products[0].sku).toBe(skuA);
    expect(orderProfA.orders).toHaveLength(1);
    expect(orderProfA.orders[0].orderNumber).toBe(order1.orderNumber);
    // Crucial check: Report summary remains unfiltered for the entire date range
    expect(reportA.summary.orders).toBe(2);
    expect(reportA.summary.grossSales).toBe(300);

    // Search by product name "Beta Search"
    const reportB = await getAdminReport({
      range: "custom",
      from: "2099-09-03",
      to: "2099-09-03",
      search: "Beta Search",
    });
    const orderProfB = await getAdminOrderProfitability({
      range: "custom",
      from: "2099-09-03",
      to: "2099-09-03",
      search: "Beta Search",
    });

    expect(reportB.products).toHaveLength(1);
    expect(reportB.products[0].sku).toBe(skuB);
    expect(orderProfB.orders).toHaveLength(1);
    expect(orderProfB.orders[0].orderNumber).toBe(order2.orderNumber);
    expect(reportB.summary.orders).toBe(2);
  });

  test("sorts products by revenue, profit, units, margin, and returns", async () => {
    const user = await prisma.user.create({
      data: { email: `sort-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const skuX = `SKU-SORT-X-${crypto.randomUUID()}`;
    const skuY = `SKU-SORT-Y-${crypto.randomUUID()}`;

    // Item X: 10 units @ 100 = 1000 gross/net, cost 90 = 900 cogs -> profit 100, margin 10%, 0 returns
    const orderX = await prisma.order.create({
      data: {
        orderNumber: `ORD-SORT-X-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-04T10:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(1000),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1000),
        items: {
          create: [
            {
              productName: "Sort Product X",
              sku: skuX,
              quantity: 10,
              unitPrice: new Prisma.Decimal(100),
              costPrice: new Prisma.Decimal(90),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(1000),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(1000),
            },
          ],
        },
      },
    });
    orderIds.push(orderX.id);

    // Item Y: 2 units @ 300 = 600 gross. 1 returned -> netSales 300, cogs 50 -> profit 250, margin 83.33%, 1 return
    const orderY = await prisma.order.create({
      data: {
        orderNumber: `ORD-SORT-Y-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-04T11:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(600),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(600),
        items: {
          create: [
            {
              productName: "Sort Product Y",
              sku: skuY,
              quantity: 2,
              unitPrice: new Prisma.Decimal(300),
              costPrice: new Prisma.Decimal(50),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(600),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(600),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(orderY.id);

    const retY = await prisma.returnRequest.create({
      data: {
        orderId: orderY.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: orderY.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(retY.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };

    // Sort by revenue: X (1000) > Y (300)
    const reportRev = await getAdminReport({
      range: "custom",
      from: "2099-09-04",
      to: "2099-09-04",
      sort: "revenue",
    });
    const skusRev = reportRev.products.map((p) => p.sku);
    expect(skusRev.indexOf(skuX)).toBeLessThan(skusRev.indexOf(skuY));

    // Sort by profit: Y (250) > X (100)
    const reportProf = await getAdminReport({
      range: "custom",
      from: "2099-09-04",
      to: "2099-09-04",
      sort: "profit",
    });
    const skusProf = reportProf.products.map((p) => p.sku);
    expect(skusProf.indexOf(skuY)).toBeLessThan(skusProf.indexOf(skuX));

    // Sort by units: X (10) > Y (2)
    const reportUnits = await getAdminReport({
      range: "custom",
      from: "2099-09-04",
      to: "2099-09-04",
      sort: "units",
    });
    const skusUnits = reportUnits.products.map((p) => p.sku);
    expect(skusUnits.indexOf(skuX)).toBeLessThan(skusUnits.indexOf(skuY));

    // Sort by margin: Y (83.33%) > X (10%)
    const reportMargin = await getAdminReport({
      range: "custom",
      from: "2099-09-04",
      to: "2099-09-04",
      sort: "margin",
    });
    const skusMargin = reportMargin.products.map((p) => p.sku);
    expect(skusMargin.indexOf(skuY)).toBeLessThan(skusMargin.indexOf(skuX));

    // Sort by returns: Y (1) > X (0)
    const reportReturns = await getAdminReport({
      range: "custom",
      from: "2099-09-04",
      to: "2099-09-04",
      sort: "returns",
    });
    const skusReturns = reportReturns.products.map((p) => p.sku);
    expect(skusReturns.indexOf(skuY)).toBeLessThan(skusReturns.indexOf(skuX));
  });

  test("maintains CSV export headers and data parity with product report definitions", async () => {
    const user = await prisma.user.create({
      data: { email: `csv-prod-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(user.id);
    const sku = `SKU-CSV-${crypto.randomUUID()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-CSV-PROD-${crypto.randomUUID()}`,
        createdAt: new Date("2099-09-05T12:00:00.000Z"),
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: user.email,
        taxRate: new Prisma.Decimal(0),
        taxIncluded: false,
        shippingCost: new Prisma.Decimal(0),
        shippingStreet: "123 Street",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        subtotal: new Prisma.Decimal(400),
        taxAmount: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(400),
        items: {
          create: [
            {
              productName: "CSV Parity Product",
              sku,
              quantity: 4,
              unitPrice: new Prisma.Decimal(100),
              costPrice: new Prisma.Decimal(30),
              appliedDiscount: new Prisma.Decimal(0),
              taxRate: new Prisma.Decimal(0),
              taxIncluded: false,
              lineSubtotal: new Prisma.Decimal(400),
              discountAmount: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              lineTotal: new Prisma.Decimal(400),
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIds.push(order.id);

    const ret = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
      },
    });
    returnIds.push(ret.id);

    mockSession = { user: { id: user.id, role: "ADMIN" } };
    const report = await getAdminReport({
      range: "custom",
      from: "2099-09-05",
      to: "2099-09-05",
      search: sku,
    });
    const product = report.products[0];

    const expectedHeaders = [
      "Product",
      "SKU",
      "Sold Units",
      "Returned Units",
      "Net Units",
      "Return Rate",
      "Gross Sales",
      "Discounts",
      "Net Sales",
      "COGS",
      "Gross Profit",
      "Margin",
    ];
    const productRows = [
      expectedHeaders,
      [
        product.productName,
        product.sku,
        product.soldUnits,
        product.returnedUnits,
        product.netUnits,
        product.returnRate === null ? "—" : `${product.returnRate.toFixed(2)}%`,
        product.grossSales,
        product.discounts,
        product.netSales,
        product.cogs,
        product.profit,
        product.margin === null ? "Unavailable" : `${product.margin.toFixed(2)}%`,
      ],
    ];

    const csvContent = csv(productRows);
    expect(csvContent).toContain(
      "Product,SKU,Sold Units,Returned Units,Net Units,Return Rate,Gross Sales,Discounts,Net Sales,COGS,Gross Profit,Margin"
    );
    expect(csvContent).toContain(`CSV Parity Product,${sku},4,1,3,25.00%,400,0,300,90,210,70.00%`);
  });

  describe("getAdminProductProfitability", () => {
    test("reconciles product totals to variant totals with proportional Order.discount allocation", async () => {
      const user = await prisma.user.create({
        data: { email: `prof-rec-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
      });
      userIds.push(user.id);

      const product = await prisma.product.create({
        data: {
          name: "Vibe Classic Hoodie",
          slug: `vibe-classic-hoodie-${crypto.randomUUID()}`,
          status: "PUBLISHED",
          variants: {
            create: [
              {
                sku: `VCH-BLK-M-${crypto.randomUUID()}`,
                size: "M",
                color: "Black",
                costPrice: new Prisma.Decimal(200),
                sellingPrice: new Prisma.Decimal(600),
              },
              {
                sku: `VCH-BLK-L-${crypto.randomUUID()}`,
                size: "L",
                color: "Black",
                costPrice: new Prisma.Decimal(100),
                sellingPrice: new Prisma.Decimal(400),
              },
            ],
          },
        },
        include: { variants: true },
      });
      productIds.push(product.id);
      const [varM, varL] = product.variants;

      // Order with 2 units of varM (1200) and 1 unit of varL (400) = subtotal 1600.
      // Order.discount = 320 (20%). Total charged = 1280.
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-REC-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-10T12:00:00.000Z"),
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(1600),
          taxAmount: 0,
          discount: new Prisma.Decimal(320),
          total: new Prisma.Decimal(1280),
          shippingStreet: "Gulshan 2",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: product.name,
                sku: varM.sku,
                size: varM.size,
                color: varM.color,
                quantity: 2,
                unitPrice: new Prisma.Decimal(600),
                costPrice: new Prisma.Decimal(200),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(1200),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(1200),
              },
              {
                productName: product.name,
                sku: varL.sku,
                size: varL.size,
                color: varL.color,
                quantity: 1,
                unitPrice: new Prisma.Decimal(400),
                costPrice: new Prisma.Decimal(100),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(400),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(400),
              },
            ],
          },
        },
      });
      orderIds.push(order.id);

      mockSession = { user: { id: user.id, role: "ADMIN" } };
      const result = await getAdminProductProfitability({
        range: "custom",
        from: "2099-10-10",
        to: "2099-10-10",
      });

      expect(result.total).toBe(1);
      const prod = result.products[0];
      expect(prod.productId).toBe(product.id);
      expect(prod.productName).toBe(product.name);
      expect(prod.variantCount).toBe(2);
      expect(prod.variants).toHaveLength(2);

      // Verify variant M:
      // Allocated discount: 320 * (1200 / 1600) = 240.
      // Net sales: 1200 - 240 = 960.
      // COGS: 2 * 200 = 400.
      // Profit: 960 - 400 = 560.
      // Margin: (560 / 960) * 100 = 58.33%
      const rowM = prod.variants.find((v) => v.sku === varM.sku)!;
      expect(rowM).toBeDefined();
      expect(rowM.soldUnits).toBe(2);
      expect(rowM.retainedUnits).toBe(2);
      expect(rowM.grossSales).toBe(1200);
      expect(rowM.orderDiscounts).toBe(240);
      expect(rowM.netSales).toBe(960);
      expect(rowM.cogs).toBe(400);
      expect(rowM.profit).toBe(560);
      expect(rowM.margin).toBe(58.33);

      // Verify variant L:
      // Allocated discount: 320 * (400 / 1600) = 80.
      // Net sales: 400 - 80 = 320.
      // COGS: 1 * 100 = 100.
      // Profit: 320 - 100 = 220.
      // Margin: (220 / 320) * 100 = 68.75%
      const rowL = prod.variants.find((v) => v.sku === varL.sku)!;
      expect(rowL).toBeDefined();
      expect(rowL.soldUnits).toBe(1);
      expect(rowL.retainedUnits).toBe(1);
      expect(rowL.grossSales).toBe(400);
      expect(rowL.orderDiscounts).toBe(80);
      expect(rowL.netSales).toBe(320);
      expect(rowL.cogs).toBe(100);
      expect(rowL.profit).toBe(220);
      expect(rowL.margin).toBe(68.75);

      // Verify product rollup reconciles exactly with variant totals
      const variantGrossSum = prod.variants.reduce((sum, v) => sum + v.grossSales, 0);
      const variantDiscountSum = prod.variants.reduce((sum, v) => sum + v.orderDiscounts, 0);
      const variantNetSum = prod.variants.reduce((sum, v) => sum + v.netSales, 0);
      const variantCogsSum = prod.variants.reduce((sum, v) => sum + v.cogs, 0);
      const variantProfitSum = prod.variants.reduce((sum, v) => sum + v.profit, 0);
      const variantUnitsSum = prod.variants.reduce((sum, v) => sum + v.soldUnits, 0);

      expect(prod.grossSales).toBe(variantGrossSum);
      expect(prod.orderDiscounts).toBe(variantDiscountSum);
      expect(prod.netSales).toBe(variantNetSum);
      expect(prod.cogs).toBe(variantCogsSum);
      expect(prod.profit).toBe(variantProfitSum);
      expect(prod.soldUnits).toBe(variantUnitsSum);

      // Product margin: 780 / 1280 * 100 = 60.94%
      expect(prod.profit).toBe(780);
      expect(prod.netSales).toBe(1280);
      expect(prod.margin).toBe(60.94);
    });

    test("handles returns with status <> 'REJECTED' and retains merchandise net sales without double-deducting payment refunds", async () => {
      const user = await prisma.user.create({
        data: { email: `prof-ret-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
      });
      userIds.push(user.id);

      const product = await prisma.product.create({
        data: {
          name: "Vibe Tech Parka",
          slug: `vibe-tech-parka-${crypto.randomUUID()}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `VTP-OLV-XL-${crypto.randomUUID()}`,
              size: "XL",
              color: "Olive",
              costPrice: new Prisma.Decimal(200),
              sellingPrice: new Prisma.Decimal(500),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(product.id);
      const variant = product.variants[0];

      // 3 units at 500 = subtotal 1500, costPrice = 200.
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-RET-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-11T10:00:00.000Z"),
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(1500),
          taxAmount: 0,
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(1500),
          shippingStreet: "Banani 11",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: product.name,
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                quantity: 3,
                unitPrice: new Prisma.Decimal(500),
                costPrice: new Prisma.Decimal(200),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(1500),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(1500),
              },
            ],
          },
        },
        include: { items: true },
      });
      orderIds.push(order.id);

      // Return 1: 1 unit COMPLETED
      const completedReturn = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          status: "COMPLETED",
          items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
        },
      });
      returnIds.push(completedReturn.id);

      // Return 2: 1 unit REJECTED (must be ignored per rule status <> 'REJECTED')
      const rejectedReturn = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          status: "REJECTED",
          items: { create: [{ orderItemId: order.items[0].id, quantity: 1 }] },
        },
      });
      returnIds.push(rejectedReturn.id);

      // Online payment refund of 500
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: new Prisma.Decimal(1500),
          status: "SUCCESS",
          gateway: "sslcommerz",
          merchantReferenceId: `PAY-RET-${crypto.randomUUID()}`,
        },
      });
      paymentIds.push(payment.id);

      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: new Prisma.Decimal(500),
          status: "SUCCESS",
        },
      });

      mockSession = { user: { id: user.id, role: "ADMIN" } };
      const result = await getAdminProductProfitability({
        range: "custom",
        from: "2099-10-11",
        to: "2099-10-11",
      });

      expect(result.total).toBe(1);
      const prod = result.products[0];
      expect(prod.soldUnits).toBe(3);
      expect(prod.returnedUnits).toBe(1); // rejected return ignored
      expect(prod.retainedUnits).toBe(2);
      expect(prod.returnRate).toBe(33.33);

      // Retained merchandise net sales: 1500 * (2/3) = 1000.
      // Payment refund of 500 is NOT double-deducted from retained merchandise sales.
      expect(prod.netSales).toBe(1000);
      expect(prod.cogs).toBe(400); // 2 * 200 = 400
      expect(prod.profit).toBe(600); // 1000 - 400 = 600
      expect(prod.margin).toBe(60); // 600 / 1000 * 100 = 60%
    });

    test("includes legacy SKUs gracefully even when no Product or ProductVariant record exists", async () => {
      const user = await prisma.user.create({
        data: { email: `prof-leg-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
      });
      userIds.push(user.id);

      const legacySku = `LEGACY-TEE-${crypto.randomUUID()}`;
      const legacyProductName = "Legacy Vintage Graphic Tee";

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-LEG-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-12T10:00:00.000Z"),
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(500),
          taxAmount: 0,
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(500),
          shippingStreet: "Dhanmondi 27",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: legacyProductName,
                sku: legacySku,
                quantity: 2,
                unitPrice: new Prisma.Decimal(250),
                costPrice: new Prisma.Decimal(80),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(500),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(500),
              },
            ],
          },
        },
      });
      orderIds.push(order.id);

      mockSession = { user: { id: user.id, role: "ADMIN" } };
      const result = await getAdminProductProfitability({
        range: "custom",
        from: "2099-10-12",
        to: "2099-10-12",
      });

      expect(result.total).toBe(1);
      const prod = result.products[0];
      expect(prod.productName).toBe(legacyProductName);
      expect(prod.productId).toBe(legacyProductName);
      expect(prod.soldUnits).toBe(2);
      expect(prod.retainedUnits).toBe(2);
      expect(prod.netSales).toBe(500);
      expect(prod.cogs).toBe(160);
      expect(prod.profit).toBe(340);
      expect(prod.margin).toBe(68);

      expect(prod.variants).toHaveLength(1);
      expect(prod.variants[0].sku).toBe(legacySku);
      expect(prod.variants[0].netSales).toBe(500);
      expect(prod.variants[0].profit).toBe(340);
    });

    test("supports search, sorting by revenue/profit/units/margin/returns, and pagination", async () => {
      const user = await prisma.user.create({
        data: { email: `prof-sort-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
      });
      userIds.push(user.id);

      // Create 3 distinct products:
      // Product 1: High Units (10 units), Moderate Profit (200), Margin 20%
      // Product 2: High Profit (500), High Margin (50%), Low Units (2 units)
      // Product 3: High Returns (4 returned), Low Revenue
      const p1 = await prisma.product.create({
        data: {
          name: "Searchable Cargo Pants",
          slug: `cargo-${crypto.randomUUID()}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `CRG-01-${crypto.randomUUID()}`,
              costPrice: new Prisma.Decimal(80),
              sellingPrice: new Prisma.Decimal(100),
            },
          },
        },
        include: { variants: true },
      });
      const p2 = await prisma.product.create({
        data: {
          name: "Luxury Silk Bomber",
          slug: `bomber-${crypto.randomUUID()}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `BMB-99-${crypto.randomUUID()}`,
              costPrice: new Prisma.Decimal(250),
              sellingPrice: new Prisma.Decimal(500),
            },
          },
        },
        include: { variants: true },
      });
      const p3 = await prisma.product.create({
        data: {
          name: "Oversized Flannel Shirt",
          slug: `flannel-${crypto.randomUUID()}`,
          status: "PUBLISHED",
          variants: {
            create: {
              sku: `FLN-77-${crypto.randomUUID()}`,
              costPrice: new Prisma.Decimal(50),
              sellingPrice: new Prisma.Decimal(100),
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(p1.id, p2.id, p3.id);

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-SORT-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-13T12:00:00.000Z"),
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(2500), // 1000 (p1) + 1000 (p2) + 500 (p3)
          taxAmount: 0,
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(2500),
          shippingStreet: "Uttara Sector 3",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: p1.name,
                sku: p1.variants[0].sku,
                quantity: 10,
                unitPrice: new Prisma.Decimal(100),
                costPrice: new Prisma.Decimal(80),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(1000),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(1000),
              },
              {
                productName: p2.name,
                sku: p2.variants[0].sku,
                quantity: 2,
                unitPrice: new Prisma.Decimal(500),
                costPrice: new Prisma.Decimal(250),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(1000),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(1000),
              },
              {
                productName: p3.name,
                sku: p3.variants[0].sku,
                quantity: 5,
                unitPrice: new Prisma.Decimal(100),
                costPrice: new Prisma.Decimal(50),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(500),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(500),
              },
            ],
          },
        },
        include: { items: true },
      });
      orderIds.push(order.id);

      // Return 4 units of p3
      const flannelItem = order.items.find((i) => i.sku === p3.variants[0].sku)!;
      const flannelReturn = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          status: "COMPLETED",
          items: { create: [{ orderItemId: flannelItem.id, quantity: 4 }] },
        },
      });
      returnIds.push(flannelReturn.id);

      mockSession = { user: { id: user.id, role: "ADMIN" } };
      const baseFilters = { range: "custom", from: "2099-10-13", to: "2099-10-13" };

      // 1. Sort by profit: Luxury Silk Bomber (500) > Searchable Cargo Pants (200) > Oversized Flannel Shirt (50)
      const sortByProfit = await getAdminProductProfitability({ ...baseFilters, sort: "profit" });
      expect(sortByProfit.products.map((p) => p.productName)).toEqual([p2.name, p1.name, p3.name]);

      // 2. Sort by units: Searchable Cargo Pants (10) > Oversized Flannel Shirt (5) > Luxury Silk Bomber (2)
      const sortByUnits = await getAdminProductProfitability({ ...baseFilters, sort: "units" });
      expect(sortByUnits.products.map((p) => p.productName)).toEqual([p1.name, p3.name, p2.name]);

      // 3. Sort by returns: Oversized Flannel Shirt (4) > others (0)
      const sortByReturns = await getAdminProductProfitability({ ...baseFilters, sort: "returns" });
      expect(sortByReturns.products[0].productName).toBe(p3.name);
      expect(sortByReturns.products[0].returnedUnits).toBe(4);

      // 4. Sort by margin: Luxury Silk Bomber (50%) > Oversized Flannel Shirt (50 retained / 100 net sales = 50%) or Cargo Pants (20%)
      const sortByMargin = await getAdminProductProfitability({ ...baseFilters, sort: "margin" });
      expect(sortByMargin.products[2].productName).toBe(p1.name); // Cargo pants is lowest margin (20%)

      // 5. Search by product name
      const searchByName = await getAdminProductProfitability({ ...baseFilters, search: "Cargo" });
      expect(searchByName.total).toBe(1);
      expect(searchByName.products[0].productName).toBe(p1.name);

      // 6. Search by SKU
      const searchBySku = await getAdminProductProfitability({
        ...baseFilters,
        search: p2.variants[0].sku,
      });
      expect(searchBySku.total).toBe(1);
      expect(searchBySku.products[0].productName).toBe(p2.name);

      // 7. Pagination: limit 1, page 2
      const page1 = await getAdminProductProfitability({
        ...baseFilters,
        limit: 1,
        page: 1,
        sort: "profit",
      });
      const page2 = await getAdminProductProfitability({
        ...baseFilters,
        limit: 1,
        page: 2,
        sort: "profit",
      });
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(3);
      expect(page1.products).toHaveLength(1);
      expect(page1.products[0].productName).toBe(p2.name);
      expect(page2.products).toHaveLength(1);
      expect(page2.products[0].productName).toBe(p1.name);
    });

    test("handles zero-subtotal orders and cancelled orders safely without errors", async () => {
      const user = await prisma.user.create({
        data: { email: `prof-zero-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
      });
      userIds.push(user.id);

      // 1. Cancelled order on 2099-10-14
      const cancelledOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-CAN-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-14T09:00:00.000Z"),
          userId: user.id,
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          paymentMethod: "ONLINE",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(1000),
          taxAmount: 0,
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(1000),
          shippingStreet: "Test Street",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: "Cancelled Free Promo Tee",
                sku: `CAN-PROMO-${crypto.randomUUID()}`,
                quantity: 1,
                unitPrice: new Prisma.Decimal(1000),
                costPrice: new Prisma.Decimal(100),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(1000),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(1000),
              },
            ],
          },
        },
      });
      orderIds.push(cancelledOrder.id);

      // 2. Zero-subtotal order (100% discount / free gift)
      const freeOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-FREE-${crypto.randomUUID()}`,
          createdAt: new Date("2099-10-14T11:00:00.000Z"),
          userId: user.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          customerEmail: user.email,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: new Prisma.Decimal(0),
          taxAmount: 0,
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
          shippingStreet: "Test Street",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          items: {
            create: [
              {
                productName: "Complimentary Sticker Pack",
                sku: `FREE-STK-${crypto.randomUUID()}`,
                quantity: 1,
                unitPrice: new Prisma.Decimal(0),
                costPrice: new Prisma.Decimal(5),
                appliedDiscount: 0,
                taxRate: 0,
                taxIncluded: false,
                lineSubtotal: new Prisma.Decimal(0),
                discountAmount: 0,
                taxAmount: 0,
                lineTotal: new Prisma.Decimal(0),
              },
            ],
          },
        },
      });
      orderIds.push(freeOrder.id);

      mockSession = { user: { id: user.id, role: "ADMIN" } };
      const result = await getAdminProductProfitability({
        range: "custom",
        from: "2099-10-14",
        to: "2099-10-14",
      });

      // Cancelled order should be excluded; only the free order should appear
      expect(result.total).toBe(1);
      const freeItem = result.products[0];
      expect(freeItem.productName).toBe("Complimentary Sticker Pack");
      expect(freeItem.soldUnits).toBe(1);
      expect(freeItem.netSales).toBe(0);
      expect(freeItem.cogs).toBe(5);
      expect(freeItem.profit).toBe(-5);
      expect(freeItem.margin).toBeNull(); // margin is null when netSales <= 0
    });
  });
});
