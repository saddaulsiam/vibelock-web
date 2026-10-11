import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../src/lib/prisma/client";
import { classifyOrder, getAdminReconciliation } from "../../src/lib/admin/reconciliation-queries";

let mockSession: unknown = null;
vi.mock("../../src/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

const userIds: string[] = [];
const orderIds: string[] = [];
const paymentIds: string[] = [];
const shipmentIds: string[] = [];
const returnIds: string[] = [];

describe("admin reconciliation", () => {
  beforeEach(() => {
    mockSession = null;
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (returnIds.length)
        await tx.returnItem.deleteMany({ where: { returnRequestId: { in: returnIds } } });
      if (returnIds.length) await tx.returnRequest.deleteMany({ where: { id: { in: returnIds } } });
      if (shipmentIds.length) await tx.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      if (paymentIds.length) {
        await tx.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      if (orderIds.length) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    userIds.length = 0;
    orderIds.length = 0;
    paymentIds.length = 0;
    shipmentIds.length = 0;
    returnIds.length = 0;
  });

  test("rejects unauthenticated requests", async () => {
    mockSession = null;
    await expect(getAdminReconciliation({ range: "30d" })).rejects.toThrow();
  });

  test("rejects non-admin role", async () => {
    mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
    await expect(getAdminReconciliation({ range: "30d" })).rejects.toThrow();
  });

  test("classifies pure unit function states accurately and mutually exclusively", () => {
    // 1. Online Paid
    const c1 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "PROCESSING",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 1000,
      successfulRefundTotal: 0,
      shipmentStatus: null,
      shipmentId: null,
    });
    expect(c1.classification).toBe("ONLINE_SETTLED");
    expect(c1.anomalyReason).toBeNull();

    // 2. Online Fully Refunded
    const c2 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "DELIVERED",
      paymentStatus: "REFUNDED",
      successfulPaymentTotal: 1000,
      successfulRefundTotal: 1000,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-1",
    });
    expect(c2.classification).toBe("ONLINE_REFUNDED");

    // 3. Online Delivered Unpaid (Anomaly)
    const c3 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "DELIVERED",
      paymentStatus: "PENDING",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-2",
    });
    expect(c3.classification).toBe("ANOMALY");
    expect(c3.anomalyReason).toContain("no successful online payment record exists");

    // 4. COD Delivered (Remittance Unverified)
    const c4 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "DELIVERED",
      paymentStatus: "PENDING",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-3",
    });
    expect(c4.classification).toBe("COD_DELIVERED");
    expect(c4.label).toContain("Remittance Unverified");

    // 5. COD In-Flight
    const c5 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "SHIPPED",
      paymentStatus: "PENDING",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "IN_TRANSIT",
      shipmentId: "ship-4",
    });
    expect(c5.classification).toBe("COD_IN_FLIGHT");

    // 6. COD Refused / Returned by Courier
    const c6 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "SHIPPED",
      paymentStatus: "PENDING",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "RETURNED",
      shipmentId: "ship-5",
    });
    expect(c6.classification).toBe("COD_FAILED_RETURNED");

    // 7. COD Cancelled Pre-Shipment
    const c7 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "CANCELLED",
      paymentStatus: "CANCELLED",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: null,
      shipmentId: null,
    });
    expect(c7.classification).toBe("COD_CANCELLED");

    // 8. COD Anomaly (marked SUCCESS without payment transaction)
    const c8 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "DELIVERED",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-6",
    });
    expect(c8.classification).toBe("ANOMALY");
    expect(c8.anomalyReason).toContain("marked SUCCESS in status without recorded payment");

    // 9. Online Anomaly (marked SUCCESS in status without recorded payment)
    const c9 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "PROCESSING",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: null,
      shipmentId: null,
    });
    expect(c9.classification).toBe("ANOMALY");
    expect(c9.anomalyReason).toContain(
      "Online order is marked SUCCESS in status without recorded payment transaction"
    );

    // 10. Online Anomaly (Delivered and marked SUCCESS in status, but no payment record)
    const c10 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "DELIVERED",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 0,
      successfulRefundTotal: 0,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-7",
    });
    expect(c10.classification).toBe("ANOMALY");

    // 11. COD Anomaly (COD order with recorded online payment)
    const c11 = classifyOrder({
      paymentMethod: "COD",
      orderStatus: "DELIVERED",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 1000,
      successfulRefundTotal: 0,
      shipmentStatus: "DELIVERED",
      shipmentId: "ship-8",
    });
    expect(c11.classification).toBe("ANOMALY");
    expect(c11.anomalyReason).toContain(
      "Order paymentMethod is COD but has recorded successful online payment"
    );

    // 12. Online Overpayment Anomaly (successful payment exceeds billed total by > ৳0.01)
    const c12 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "PROCESSING",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 1050,
      successfulRefundTotal: 0,
      shipmentStatus: null,
      shipmentId: null,
      billedTotal: 1000,
    });
    expect(c12.classification).toBe("ANOMALY");
    expect(c12.label).toBe("Gateway Overpayment Captured");
    expect(c12.anomalyReason).toContain("Captured payments");

    // 13. Online Payment within ৳0.01 tolerance (not an anomaly)
    const c13 = classifyOrder({
      paymentMethod: "ONLINE",
      orderStatus: "PROCESSING",
      paymentStatus: "SUCCESS",
      successfulPaymentTotal: 1000.01,
      successfulRefundTotal: 0,
      shipmentStatus: null,
      shipmentId: null,
      billedTotal: 1000,
    });
    expect(c13.classification).toBe("ONLINE_SETTLED");
  });

  test("aggregates mutually exclusive buckets and preserves order conservation without Cartesian multiplication", async () => {
    const adminUser = await prisma.user.create({
      data: { email: `admin-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(adminUser.id);
    mockSession = { user: { id: adminUser.id, role: "ADMIN" } };

    const futureDate = new Date("2099-02-15T10:00:00.000Z");

    // 1. Online Paid Order (৳1,200) with TWO successful payment attempts (৳800 + ৳400)
    // To ensure join aggregation does NOT double-count orders!
    const o1 = await prisma.order.create({
      data: {
        orderNumber: `REC-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: "online-paid@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(1100),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1200),
        shippingStreet: "Street 1",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(o1.id);

    const p1a = await prisma.payment.create({
      data: {
        orderId: o1.id,
        amount: new Prisma.Decimal(800),
        status: "SUCCESS",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(p1a.id);

    const p1b = await prisma.payment.create({
      data: {
        orderId: o1.id,
        amount: new Prisma.Decimal(400),
        status: "SUCCESS",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(p1b.id);

    // 2. Online Order with Refund (৳1,000 paid, ৳300 refunded)
    const o2 = await prisma.order.create({
      data: {
        orderNumber: `REC-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "PARTIALLY_REFUNDED",
        paymentMethod: "ONLINE",
        customerEmail: "online-refund@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(900),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1000),
        shippingStreet: "Street 2",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(o2.id);

    const p2 = await prisma.payment.create({
      data: {
        orderId: o2.id,
        amount: new Prisma.Decimal(1000),
        status: "PARTIALLY_REFUNDED",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(p2.id);

    await prisma.refund.create({
      data: {
        paymentId: p2.id,
        amount: new Prisma.Decimal(300),
        status: "SUCCESS",
      },
    });

    // 3. Delivered COD Order (৳1,500)
    const o3 = await prisma.order.create({
      data: {
        orderNumber: `REC-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: "cod-del@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(1400),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1500),
        shippingStreet: "Street 3",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(o3.id);

    const s3 = await prisma.shipment.create({
      data: {
        orderId: o3.id,
        provider: "steadfast",
        status: "DELIVERED",
        shippingAmount: new Prisma.Decimal(100),
        deliveredAt: futureDate,
      },
    });
    shipmentIds.push(s3.id);

    // 4. In-Flight COD Order (৳2,000)
    const o4 = await prisma.order.create({
      data: {
        orderNumber: `REC-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "SHIPPED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: "cod-transit@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(1900),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(2000),
        shippingStreet: "Street 4",
        shippingCity: "Chittagong",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(o4.id);

    const s4 = await prisma.shipment.create({
      data: {
        orderId: o4.id,
        provider: "steadfast",
        status: "IN_TRANSIT",
        shippingAmount: new Prisma.Decimal(100),
        shippedAt: futureDate,
      },
    });
    shipmentIds.push(s4.id);

    // 5. Returned COD Order (৳800)
    const o5 = await prisma.order.create({
      data: {
        orderNumber: `REC-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "SHIPPED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: "cod-ret@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(700),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(800),
        shippingStreet: "Street 5",
        shippingCity: "Sylhet",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(o5.id);

    const s5 = await prisma.shipment.create({
      data: {
        orderId: o5.id,
        provider: "steadfast",
        status: "RETURNED",
        shippingAmount: new Prisma.Decimal(100),
      },
    });
    shipmentIds.push(s5.id);

    // Query reconciliation for the custom future date
    const fromStr = "2099-02-15";
    const toStr = "2099-02-15";
    const result = await getAdminReconciliation({
      range: "custom",
      from: fromStr,
      to: toStr,
    });

    expect(result.summary.totalOrders).toBe(5);
    // Total Billed: 1200 + 1000 + 1500 + 2000 + 800 = 6500
    expect(result.summary.totalBilledAmount).toBe(6500);

    // Check Mutually Exclusive Conservation: sum of bucket counts must equal totalOrders
    const sumBucketOrders = result.summary.classificationBuckets.reduce(
      (sum, b) => sum + b.orderCount,
      0
    );
    expect(sumBucketOrders).toBe(result.summary.totalOrders);

    const sumBucketBilled = result.summary.classificationBuckets.reduce(
      (sum, b) => sum + b.billedTotal,
      0
    );
    expect(sumBucketBilled).toBe(result.summary.totalBilledAmount);

    // Verify Gateway Ledger: Gross captured: 800 + 400 + 1000 = 2200; Refund: 300; Net: 1900
    expect(result.summary.gateway.grossCapturedOnline).toBe(2200);
    expect(result.summary.gateway.processedRefundsTotal).toBe(300);
    expect(result.summary.gateway.netGatewayCaptured).toBe(1900);
    expect(result.summary.gateway.capturedOnlineTransactionsCount).toBe(3);

    // Verify COD Breakdown
    expect(result.summary.cod.deliveredUnremittedBilledTotal).toBe(1500);
    expect(result.summary.cod.deliveredUnremittedOrderCount).toBe(1);
    expect(result.summary.cod.inFlightBilledTotal).toBe(2000);
    expect(result.summary.cod.inFlightOrderCount).toBe(1);
    expect(result.summary.cod.failedOrReturnedBilledTotal).toBe(800);
    expect(result.summary.cod.failedOrReturnedOrderCount).toBe(1);

    // Unrecorded expenses must strictly be null
    expect(result.summary.courierExpense).toBeNull();
    expect(result.summary.gatewayMdrFees).toBeNull();
    expect(result.summary.operatingExpense).toBeNull();
    expect(result.summary.netBankPayout).toBeNull();

    // Verify filter by classification works
    const codDeliveredFilter = await getAdminReconciliation({
      range: "custom",
      from: fromStr,
      to: toStr,
      classification: "COD_DELIVERED",
    });
    expect(codDeliveredFilter.orders.length).toBe(1);
    expect(codDeliveredFilter.orders[0].orderNumber).toBe(o3.orderNumber);
    expect(codDeliveredFilter.orders[0].classification).toBe("COD_DELIVERED");
    expect(codDeliveredFilter.orders[0].classificationLabel).toContain("Remittance Unverified");
  }, 30000);

  test("flags online order delivered without successful payment as an anomaly", async () => {
    const adminUser = await prisma.user.create({
      data: { email: `admin-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(adminUser.id);
    mockSession = { user: { id: adminUser.id, role: "ADMIN" } };

    const futureDate = new Date("2099-03-01T10:00:00.000Z");

    const anomalyOrder = await prisma.order.create({
      data: {
        orderNumber: `REC-ANOM-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "PENDING",
        paymentMethod: "ONLINE", // Online order delivered without payment!
        customerEmail: "anomaly@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(500),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(600),
        shippingStreet: "Street 6",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(anomalyOrder.id);

    const result = await getAdminReconciliation({
      range: "custom",
      from: "2099-03-01",
      to: "2099-03-01",
    });

    expect(result.summary.anomaliesCount).toBe(1);
    expect(result.summary.anomaliesBilledTotal).toBe(600);
    expect(result.orders[0].classification).toBe("ANOMALY");
    expect(result.orders[0].anomalyReason).toContain("no successful online payment record exists");
  }, 20000);

  test("handles search, pagination, and flags active post-delivery returns", async () => {
    const adminUser = await prisma.user.create({
      data: { email: `admin-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(adminUser.id);
    mockSession = { user: { id: adminUser.id, role: "ADMIN" } };

    const futureDate = new Date("2099-04-10T10:00:00.000Z");

    // Create 3 orders with distinctive names
    const orderAlpha = await prisma.order.create({
      data: {
        orderNumber: `ALPHA-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerName: "Alice Wonder",
        customerEmail: "alice@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(440),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(500),
        shippingStreet: "Alpha Way",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(orderAlpha.id);

    const orderBeta = await prisma.order.create({
      data: {
        orderNumber: `BETA-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerName: "Bob Builder",
        customerEmail: "bob@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(60),
        subtotal: new Prisma.Decimal(440),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(500),
        shippingStreet: "Beta Ave",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(orderBeta.id);

    // Attach active return to orderBeta
    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId: orderBeta.id,
        status: "PENDING",
        reason: "Wrong item",
      },
    });
    returnIds.push(returnReq.id);

    // Test Search by customerName
    const searchRes = await getAdminReconciliation({
      range: "custom",
      from: "2099-04-10",
      to: "2099-04-10",
      search: "Alice",
    });
    expect(searchRes.orders.length).toBe(1);
    expect(searchRes.orders[0].orderNumber).toBe(orderAlpha.orderNumber);
    expect(searchRes.orders[0].hasActiveReturn).toBe(false);

    // Test Search by order number with active return
    const searchBeta = await getAdminReconciliation({
      range: "custom",
      from: "2099-04-10",
      to: "2099-04-10",
      search: "BETA-",
    });
    expect(searchBeta.orders.length).toBe(1);
    expect(searchBeta.orders[0].orderNumber).toBe(orderBeta.orderNumber);
    expect(searchBeta.orders[0].hasActiveReturn).toBe(true);

    // Test Pagination: limit 1, page 1 and page 2
    const page1 = await getAdminReconciliation({
      range: "custom",
      from: "2099-04-10",
      to: "2099-04-10",
      limit: 1,
      page: 1,
    });
    expect(page1.orders.length).toBe(1);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalOrders).toBe(2);

    const page2 = await getAdminReconciliation({
      range: "custom",
      from: "2099-04-10",
      to: "2099-04-10",
      limit: 1,
      page: 2,
    });
    expect(page2.orders.length).toBe(1);
    expect(page2.orders[0].id).not.toBe(page1.orders[0].id);
  }, 25000);

  test("identifies anomalies for online marked SUCCESS without payments, COD with online payments, and overpayments", async () => {
    const adminUser = await prisma.user.create({
      data: { email: `admin-${crypto.randomUUID()}@example.com`, role: "ADMIN" },
    });
    userIds.push(adminUser.id);
    mockSession = { user: { id: adminUser.id, role: "ADMIN" } };

    const futureDate = new Date("2099-05-20T10:00:00.000Z");

    // 1. Online order marked SUCCESS without payment transaction (Anomaly)
    const oOnlineNoPay = await prisma.order.create({
      data: {
        orderNumber: `REC-NOPAY-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: "nopay@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(900),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1000),
        shippingStreet: "Street 7",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(oOnlineNoPay.id);

    // 2. COD order with online payment transaction (Anomaly - must not double count in gateway)
    const oCodWithPay = await prisma.order.create({
      data: {
        orderNumber: `REC-CODPAY-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerEmail: "codpay@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(1400),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1500),
        shippingStreet: "Street 8",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(oCodWithPay.id);

    const sCod = await prisma.shipment.create({
      data: {
        orderId: oCodWithPay.id,
        provider: "steadfast",
        status: "DELIVERED",
        shippingAmount: new Prisma.Decimal(100),
        deliveredAt: futureDate,
      },
    });
    shipmentIds.push(sCod.id);

    const pCod = await prisma.payment.create({
      data: {
        orderId: oCodWithPay.id,
        amount: new Prisma.Decimal(1500),
        status: "SUCCESS",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(pCod.id);

    // 3. Online order with overpayment capture (Anomaly)
    const oOverpaid = await prisma.order.create({
      data: {
        orderNumber: `REC-OVER-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: "overpaid@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(900),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(1000),
        shippingStreet: "Street 9",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(oOverpaid.id);

    const pOverpaid = await prisma.payment.create({
      data: {
        orderId: oOverpaid.id,
        amount: new Prisma.Decimal(1200), // Paid 1200 on 1000 billed order
        status: "SUCCESS",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(pOverpaid.id);

    // 4. Valid Online Paid order (Control)
    const oValidOnline = await prisma.order.create({
      data: {
        orderNumber: `REC-VALID-${crypto.randomUUID()}`,
        createdAt: futureDate,
        userId: adminUser.id,
        status: "PROCESSING",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerEmail: "valid@example.com",
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        shippingCost: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(700),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(800),
        shippingStreet: "Street 10",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
      },
    });
    orderIds.push(oValidOnline.id);

    const pValid = await prisma.payment.create({
      data: {
        orderId: oValidOnline.id,
        amount: new Prisma.Decimal(800),
        status: "SUCCESS",
        gateway: "SSLCOMMERZ",
        gatewayTransactionId: `GW-${crypto.randomUUID()}`,
      },
    });
    paymentIds.push(pValid.id);

    const result = await getAdminReconciliation({
      range: "custom",
      from: "2099-05-20",
      to: "2099-05-20",
    });

    expect(result.summary.totalOrders).toBe(4);
    // Orders 1, 2, and 3 must all be flagged as anomalies
    expect(result.summary.anomaliesCount).toBe(3);
    expect(result.summary.anomaliesBilledTotal).toBe(3500); // 1000 + 1500 + 1000

    // COD order's payment must NOT be included in grossCapturedOnline (only oOverpaid: 1200 + oValidOnline: 800 = 2000)
    expect(result.summary.gateway.grossCapturedOnline).toBe(2000);
    expect(result.summary.gateway.capturedOnlineTransactionsCount).toBe(2);

    // COD summary must NOT count the anomalous COD order as delivered unremitted
    expect(result.summary.cod.deliveredUnremittedOrderCount).toBe(0);
    expect(result.summary.cod.deliveredUnremittedBilledTotal).toBe(0);

    // Verify individual anomaly reasons
    const nopayItem = result.orders.find((o) => o.orderNumber === oOnlineNoPay.orderNumber);
    expect(nopayItem?.classification).toBe("ANOMALY");
    expect(nopayItem?.anomalyReason).toContain(
      "Online order is marked SUCCESS in status without recorded payment"
    );

    const codItem = result.orders.find((o) => o.orderNumber === oCodWithPay.orderNumber);
    expect(codItem?.classification).toBe("ANOMALY");
    expect(codItem?.anomalyReason).toContain(
      "Order paymentMethod is COD but has recorded successful online payment"
    );

    const overpaidItem = result.orders.find((o) => o.orderNumber === oOverpaid.orderNumber);
    expect(overpaidItem?.classification).toBe("ANOMALY");
    expect(overpaidItem?.anomalyReason).toContain("Captured payments");
  }, 30000);
});
