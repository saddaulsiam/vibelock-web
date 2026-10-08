import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, ShipmentStatus } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../src/lib/prisma/client";
import { ShippingService } from "../../src/lib/shipping/service";
import { MockCourierProvider } from "../../src/lib/shipping/providers/mock/client";
import { SteadfastCourierProvider } from "../../src/lib/shipping/providers/steadfast";
import type { CreateShipmentRequest, ShippingProvider } from "../../src/lib/shipping/types";
import { adminCreateShipmentAction } from "../../src/lib/shipping/actions";
import { getCustomerOrder } from "../../src/lib/orders/queries";
import { createOrderAction } from "../../src/lib/checkout/actions";
import { addToCart } from "../../src/lib/cart/mutations";
import { createTestProduct, createTestVariant, createTestInventory } from "../factories";
import { createTestUser } from "../factories/user";
import { InventoryService } from "../../src/lib/inventory/service";
import { POST as shippingWebhook } from "../../src/app/api/shipping/webhook/route";

const mockCookies = new Map<string, { value: string }>();
let mockSession: unknown = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string, value: string) => mockCookies.set(key, { value }),
    delete: (key: string) => mockCookies.delete(key),
  })),
}));
vi.mock("../../src/auth", () => ({ auth: vi.fn(() => Promise.resolve(mockSession)) }));
vi.mock("../../src/lib/config/env", () => ({
  env: {
    COURIER_WEBHOOK_SECRET: "batch-f-courier-secret",
    INVENTORY_RESERVATION_TTL_SECONDS: 600,
  },
}));

const userIds: string[] = [];
const orderIds: string[] = [];
const shipmentIds: string[] = [];
const paymentIds: string[] = [];
const productIds: string[] = [];
const variantIds: string[] = [];

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
type TestOrder = Awaited<ReturnType<typeof prisma.order.create>>;

async function makeUser(role: "CUSTOMER" | "STAFF" | "MANAGER" | "ADMIN" = "CUSTOMER") {
  const user = await createTestUser({
    email: `phase3k-${crypto.randomUUID()}@example.com`,
    role,
  });
  userIds.push(user.id);
  return user;
}

async function makeOrder(
  user: TestUser,
  options: {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    shippingCost?: string;
    total?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    method?: string;
  } = {}
): Promise<{ order: TestOrder; paymentId?: string }> {
  const paymentMethod = options.paymentMethod ?? "COD";
  const order = await prisma.order.create({
    data: {
      orderNumber: `VLF-${crypto.randomUUID()}`,
      userId: user.id,
      status: options.status ?? "PENDING",
      paymentMethod,
      paymentStatus: options.paymentStatus ?? "PENDING",
      customerEmail: user.email,
      taxRate: new Prisma.Decimal("0.00"),
      shippingCost: new Prisma.Decimal(options.shippingCost ?? "60.00"),
      subtotal: new Prisma.Decimal("999.99"),
      taxAmount: new Prisma.Decimal("0.00"),
      discount: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal(options.total ?? "1059.99"),
      shippingStreet: options.street ?? "10 Snapshot Street",
      shippingCity: options.city ?? "Dhaka",
      shippingState: options.state ?? "Dhaka",
      shippingZip: options.zip ?? "1200",
      shippingCountry: options.country ?? "BD",
      shippingMethodName: options.method ?? "Standard Delivery",
    },
  });
  orderIds.push(order.id);

  if (paymentMethod === "ONLINE") {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: new Prisma.Decimal(options.total ?? "1059.99"),
        status: options.paymentStatus ?? "INITIATED",
        gateway: "SSLCOMMERZ",
        merchantReferenceId: `PHASE3K-${crypto.randomUUID()}`,
        gatewayTransactionId:
          (options.paymentStatus ?? "INITIATED") === "SUCCESS"
            ? `BANK-${crypto.randomUUID()}`
            : null,
      },
    });
    paymentIds.push(payment.id);
    return { order, paymentId: payment.id };
  }
  return { order };
}

async function addShipment(
  orderId: string,
  options: { status?: ShipmentStatus; providerShipmentId?: string; provider?: string } = {}
) {
  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      provider: options.provider ?? "mock-courier",
      providerShipmentId: options.providerShipmentId ?? `PROVIDER-${crypto.randomUUID()}`,
      trackingNumber: `TRACK-${crypto.randomUUID()}`,
      status: options.status ?? "PENDING",
      shippingAmount: new Prisma.Decimal("60.00"),
    },
  });
  shipmentIds.push(shipment.id);
  return shipment;
}

function providerFor(
  createShipment: ShippingProvider["createShipment"] = async (request) => ({
    success: true,
    providerShipmentId: `COURIER-${request.referenceId}`,
    trackingNumber: `TRACK-${request.referenceId}`,
    status: "CREATED",
  }),
  getShipmentStatus: ShippingProvider["getShipmentStatus"] = async () => ({
    success: true,
    status: "DELIVERED",
  })
): ShippingProvider {
  return { createShipment, getShipmentStatus };
}

async function signedWebhook(body: string, signatureOverride?: string) {
  const signature =
    signatureOverride ??
    crypto.createHmac("sha256", "batch-f-courier-secret").update(body).digest("hex");
  return shippingWebhook(
    new NextRequest("http://localhost/api/shipping/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-courier-signature": signature },
      body,
    })
  );
}

describe("Phase 3K - Shipping & Delivery Integration", () => {
  beforeEach(() => {
    mockSession = null;
    mockCookies.clear();
  });

  afterEach(async () => {
    await prisma.$transaction(async (tx) => {
      if (shipmentIds.length) await tx.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
      if (orderIds.length) {
        await tx.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.inventoryReservation.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      if (paymentIds.length) await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
      if (variantIds.length) {
        await tx.inventoryTransaction.deleteMany({ where: { variantId: { in: variantIds } } });
        await tx.productVariant.deleteMany({ where: { id: { in: variantIds } } });
      }
      if (productIds.length) await tx.product.deleteMany({ where: { id: { in: productIds } } });
      if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    userIds.length = 0;
    orderIds.length = 0;
    shipmentIds.length = 0;
    paymentIds.length = 0;
    productIds.length = 0;
    variantIds.length = 0;
  });

  test("shipment creation uses immutable order shipping data and links one shipment", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user, { shippingCost: "149.50", total: "1149.49" });
    const requestCapture: CreateShipmentRequest[] = [];
    const provider = providerFor(async (request) => {
      requestCapture.push(request);
      return {
        success: true,
        providerShipmentId: `COURIER-${request.referenceId}`,
        trackingNumber: "TRACK-ORDER-1",
        status: "CREATED",
      };
    });
    const service = new ShippingService(provider);
    const created = await service.createShipmentForOrder(order.id);
    shipmentIds.push(created.id);

    expect(created.orderId).toBe(order.id);
    expect(created.status).toBe("CREATED");
    expect(created.shippingAmount.equals(new Prisma.Decimal("149.50"))).toBe(true);
    expect(created.providerShipmentId).toContain(created.id);
    expect(requestCapture).toHaveLength(1);
    expect(requestCapture[0]).toMatchObject({
      orderNumber: order.orderNumber,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      zip: order.shippingZip,
      country: order.shippingCountry,
      referenceId: created.id,
    });
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "SHIPPED"
    );
  });

  test("COD can ship, while unpaid online orders are rejected and successful online orders can ship", async () => {
    const user = await makeUser();
    const cod = await makeOrder(user, { paymentMethod: "COD" });
    const onlinePending = await makeOrder(user, {
      paymentMethod: "ONLINE",
      paymentStatus: "INITIATED",
    });
    const onlinePaid = await makeOrder(user, {
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    });
    const provider = providerFor();
    const service = new ShippingService(provider);

    const codShipment = await service.createShipmentForOrder(cod.order.id);
    shipmentIds.push(codShipment.id);
    expect(codShipment.status).toBe("CREATED");
    expect(await prisma.payment.count({ where: { orderId: cod.order.id } })).toBe(0);
    await expect(service.createShipmentForOrder(onlinePending.order.id)).rejects.toThrow(
      "Online orders must be fully paid before shipping"
    );
    const paidShipment = await service.createShipmentForOrder(onlinePaid.order.id);
    shipmentIds.push(paidShipment.id);
    expect(paidShipment.status).toBe("CREATED");
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: onlinePaid.paymentId! } })).status
    ).toBe("SUCCESS");
  });

  test("duplicate and concurrent shipment creation leave one shipment and call provider once", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    let providerCalls = 0;
    const provider = providerFor(async (request) => {
      providerCalls += 1;
      return {
        success: true,
        providerShipmentId: `COURIER-${request.referenceId}`,
        status: "CREATED",
      };
    });
    const service = new ShippingService(provider);
    const attempts = await Promise.allSettled([
      service.createShipmentForOrder(order.id),
      service.createShipmentForOrder(order.id),
    ]);
    const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    if (fulfilled[0].status === "fulfilled") shipmentIds.push(fulfilled[0].value.id);
    expect(providerCalls).toBe(1);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow(
      "Shipment already exists for this order"
    );
    expect(providerCalls).toBe(1);
  });

  test("provider timeout preserves pending uncertainty and prevents duplicate retry", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const providerErrorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let calls = 0;
    const provider = providerFor(async () => {
      calls += 1;
      throw new Error("provider secret DATABASE_URL socket timeout");
    });
    const service = new ShippingService(provider);
    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow(
      "Provider timeout or error creating shipment"
    );
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });
    shipmentIds.push(shipment.id);
    expect(shipment.status).toBe("PENDING");
    expect(shipment.failureReason).toBe("Network timeout or unknown result");
    expect(JSON.stringify(providerErrorLog.mock.calls)).not.toMatch(
      /DATABASE_URL|provider secret/i
    );
    providerErrorLog.mockRestore();
    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow(
      "Shipment already exists for this order"
    );
    expect(calls).toBe(1);
  });

  test("definite provider failure stays unsuccessful and stores a safe failure reason", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const service = new ShippingService(
      providerFor(async () => ({
        success: false,
        error: "provider credential leaked DATABASE_URL",
      }))
    );
    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow();
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });
    shipmentIds.push(shipment.id);
    expect(shipment.status).toBe("FAILED");
    expect(shipment.failureReason).not.toContain("credential");
    expect(shipment.failureReason).not.toContain("DATABASE_URL");
  });

  test("MockCourierProvider maps sandbox responses and production actions refuse the mock", async () => {
    const provider = new MockCourierProvider();
    const response = await provider.createShipment({
      orderId: "order-fixture",
      orderNumber: "VLF-MOCK-1",
      recipientName: "Test Recipient",
      recipientPhone: "01700000000",
      street: "1 Mock Street",
      city: "Dhaka",
      country: "BD",
      amount: 1059.99,
      referenceId: "shipment-fixture",
    });

    expect(response.success).toBe(true);
    expect(response.providerShipmentId).toMatch(/^MOCK-SHP-VLF-MOCK-1-/);
    expect(response.trackingNumber).toMatch(/^TRK-/);
    expect(response.status).toBe("CREATED");

    const admin = await makeUser("ADMIN");
    const { order } = await makeOrder(admin);
    mockSession = { user: { id: admin.id, role: "ADMIN" } };
    vi.stubEnv("NODE_ENV", "production");
    try {
      const result = await adminCreateShipmentAction(order.id);
      expect(result).toEqual({
        success: false,
        error: "Shipping provider unavailable / configuration error",
      });
      expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("Steadfast provider creates orders using the verified API contract", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 200,
        consignment: {
          consignment_id: 123456,
          tracking_code: "STEAD-TRACK-1",
          status: "pending",
        },
      }),
    } as Response);
    const provider = new SteadfastCourierProvider(
      "test-api-key",
      "test-secret-key",
      "https://steadfast.test/api/v1"
    );
    const result = await provider.createShipment({
      orderId: "order-1",
      orderNumber: "VLF-100",
      recipientName: "Test Recipient",
      recipientPhone: "01700000000",
      street: "1 Test Street",
      city: "Dhaka",
      state: "Dhaka",
      zip: "1200",
      country: "BD",
      amount: 1059.99,
      codAmount: 1059.99,
      referenceId: "shipment-1",
      note: "VibeLock order VLF-100",
    });

    expect(result).toEqual({
      success: true,
      providerShipmentId: "123456",
      trackingNumber: "STEAD-TRACK-1",
      status: "CREATED",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://steadfast.test/api/v1/create_order",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Api-Key": "test-api-key",
          "Secret-Key": "test-secret-key",
          "Content-Type": "application/json",
        }),
      })
    );
    const request = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      invoice: "VLF-100",
      recipient_name: "Test Recipient",
      recipient_phone: "01700000000",
      recipient_address: "1 Test Street, Dhaka, Dhaka, 1200, BD",
      cod_amount: 1059.99,
      note: "VibeLock order VLF-100",
    });
  });

  test("Steadfast provider handles malformed, rejected, network, and missing configuration safely", async () => {
    const malformedFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 200, consignment: { consignment_id: 1 } }),
    } as Response);
    const provider = new SteadfastCourierProvider(
      "test-api-key",
      "test-secret-key",
      "https://steadfast.test/api/v1"
    );
    await expect(
      provider.createShipment({
        orderId: "order-1",
        orderNumber: "VLF-100",
        recipientName: "Test Recipient",
        recipientPhone: "01700000000",
        street: "1 Test Street",
        city: "Dhaka",
        country: "BD",
        amount: 100,
        referenceId: "shipment-1",
      })
    ).resolves.toEqual({ success: false, error: "Steadfast returned an incomplete shipment." });
    malformedFetch.mockRestore();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ status: 401, message: "unauthorized" }),
    } as Response);
    await expect(
      provider.createShipment({
        orderId: "order-1",
        orderNumber: "VLF-100",
        recipientName: "Test Recipient",
        recipientPhone: "01700000000",
        street: "1 Test Street",
        city: "Dhaka",
        country: "BD",
        amount: 100,
        referenceId: "shipment-1",
      })
    ).resolves.toEqual({ success: false, error: "Steadfast rejected the shipment." });
    vi.restoreAllMocks();

    const missing = new SteadfastCourierProvider(undefined, undefined, "https://steadfast.test/api/v1");
    await expect(
      missing.createShipment({
        orderId: "order-1",
        orderNumber: "VLF-100",
        recipientName: "Test Recipient",
        recipientPhone: "01700000000",
        street: "1 Test Street",
        city: "Dhaka",
        country: "BD",
        amount: 100,
        referenceId: "shipment-1",
      })
    ).rejects.toThrow("Steadfast shipping provider is not configured.");

    const networkProvider = new SteadfastCourierProvider(
      "test-api-key",
      "test-secret-key",
      "https://steadfast.test/api/v1"
    );
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("socket timeout"));
    await expect(networkProvider.getShipmentStatus("123456")).rejects.toThrow(
      "Steadfast request failed."
    );
  });

  test("Steadfast provider looks up and normalizes statuses without exposing credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 200, delivery_status: "in_transit" }),
    } as Response);
    const provider = new SteadfastCourierProvider(
      "secret-api-key",
      "secret-key",
      "https://steadfast.test/api/v1"
    );
    await expect(provider.getShipmentStatus("123456")).resolves.toEqual({
      success: true,
      status: "IN_TRANSIT",
      providerStatus: "in_transit",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://steadfast.test/api/v1/status_by_cid/123456",
      expect.objectContaining({ method: "GET" })
    );
    const response = await provider.getShipmentStatus("123456");
    expect(JSON.stringify(response)).not.toContain("secret-api-key");
    expect(JSON.stringify(response)).not.toContain("secret-key");
  });

  test("shipment action requires an internal role and customer order detail exposes only safe shipment fields", async () => {
    const customer = await makeUser();
    const admin = await makeUser("ADMIN");
    const ownerOrder = await makeOrder(customer);
    const otherCustomer = await makeUser();
    const otherOrder = await makeOrder(otherCustomer);
    const ownerShipment = await addShipment(ownerOrder.order.id, {
      status: "IN_TRANSIT",
      providerShipmentId: `PROVIDER-${crypto.randomUUID()}`,
    });
    const otherShipment = await addShipment(otherOrder.order.id);
    await prisma.shipment.update({
      where: { id: ownerShipment.id },
      data: { failureReason: "INTERNAL-FAILURE-SECRET", shippedAt: new Date() },
    });

    mockSession = { user: { id: customer.id, role: "CUSTOMER" } };
    await expect(adminCreateShipmentAction(ownerOrder.order.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(await getCustomerOrder(ownerOrder.order.orderNumber)).toMatchObject({
      shipment: {
        status: "IN_TRANSIT",
        provider: "mock-courier",
        trackingNumber: ownerShipment.trackingNumber,
      },
    });
    expect(await getCustomerOrder(otherOrder.order.orderNumber)).toBeNull();
    const detail = await getCustomerOrder(ownerOrder.order.orderNumber);
    expect(JSON.stringify(detail)).not.toContain("INTERNAL-FAILURE-SECRET");
    expect(JSON.stringify(detail)).not.toContain("providerShipmentId");
    expect(JSON.stringify(detail)).not.toContain("gatewayPayload");

    mockSession = { user: { id: admin.id, role: "ADMIN" } };
    const authorized = await adminCreateShipmentAction((await makeOrder(admin)).order.id);
    expect(authorized.success).toBe(true);
    if (authorized.success && authorized.shipmentId) shipmentIds.push(authorized.shipmentId);
    shipmentIds.push(otherShipment.id);
  });

  test("shipment status moves forward, rejects regression, and protects terminal states", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const shipment = await addShipment(order.id, { status: "PENDING" });
    const service = new ShippingService(providerFor());

    expect((await service.updateShipmentStatus(shipment.id, "CREATED")).status).toBe("CREATED");
    expect((await service.updateShipmentStatus(shipment.id, "PICKED_UP")).status).toBe("PICKED_UP");
    expect((await service.updateShipmentStatus(shipment.id, "IN_TRANSIT")).status).toBe(
      "IN_TRANSIT"
    );
    expect((await service.updateShipmentStatus(shipment.id, "CREATED")).status).toBe("IN_TRANSIT");
    expect((await service.updateShipmentStatus(shipment.id, "OUT_FOR_DELIVERY")).status).toBe(
      "OUT_FOR_DELIVERY"
    );
    expect((await service.updateShipmentStatus(shipment.id, "DELIVERED")).status).toBe("DELIVERED");
    expect((await service.updateShipmentStatus(shipment.id, "IN_TRANSIT")).status).toBe(
      "DELIVERED"
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "DELIVERED"
    );
  });

  test("webhook authenticates HMAC signatures, processes event status, and ignores replay/stale events", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const shipment = await addShipment(order.id, {
      status: "PENDING",
      providerShipmentId: `WEBHOOK-${crypto.randomUUID()}`,
    });
    const event = { providerShipmentId: shipment.providerShipmentId, status: "CREATED" };
    const body = JSON.stringify(event);
    const valid = await signedWebhook(body);
    expect(valid.status).toBe(200);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe(
      "CREATED"
    );
    const duplicate = await signedWebhook(body);
    expect(duplicate.status).toBe(200);

    const deliveryEvent = JSON.stringify({ ...event, status: "DELIVERED" });
    expect((await signedWebhook(deliveryEvent)).status).toBe(200);
    const staleEvent = JSON.stringify({ ...event, status: "IN_TRANSIT" });
    expect((await signedWebhook(staleEvent)).status).toBe(200);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe(
      "DELIVERED"
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "DELIVERED"
    );
  });

  test("webhook rejects missing, invalid, modified, and malformed signatures/payloads", async () => {
    const body = JSON.stringify({ providerShipmentId: "NO-SHIPMENT", status: "CREATED" });
    const missing = await shippingWebhook(
      new NextRequest("http://localhost/api/shipping/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      })
    );
    expect(missing.status).toBe(401);
    expect((await signedWebhook(body, "not-the-hmac")).status).toBe(401);
    const originalPayload = JSON.stringify({
      providerShipmentId: "NO-SHIPMENT",
      status: "CREATED",
    });
    const payload = JSON.stringify({ providerShipmentId: "NO-SHIPMENT", status: "DELIVERED" });
    const originalSignature = crypto
      .createHmac("sha256", "batch-f-courier-secret")
      .update(originalPayload)
      .digest("hex");
    const modifiedPayload = await signedWebhook(payload, originalSignature);
    expect(modifiedPayload.status).toBe(401);
    const invalidStatus = JSON.stringify({ providerShipmentId: "NO-SHIPMENT", status: "BOGUS" });
    expect((await signedWebhook(invalidStatus)).status).toBe(400);
  });

  test("concurrent webhook events serialize forward progress and let delivery win", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const shipment = await addShipment(order.id, {
      status: "CREATED",
      providerShipmentId: `CONCURRENT-${crypto.randomUUID()}`,
    });
    const transit = JSON.stringify({
      providerShipmentId: shipment.providerShipmentId,
      status: "IN_TRANSIT",
    });
    const delivered = JSON.stringify({
      providerShipmentId: shipment.providerShipmentId,
      status: "DELIVERED",
    });

    const responses = await Promise.all([signedWebhook(transit), signedWebhook(delivered)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe(
      "DELIVERED"
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "DELIVERED"
    );

    const secondOrder = await makeOrder(user);
    const secondShipment = await addShipment(secondOrder.order.id, {
      status: "CREATED",
      providerShipmentId: `CONCURRENT-${crypto.randomUUID()}`,
    });
    const older = JSON.stringify({
      providerShipmentId: secondShipment.providerShipmentId,
      status: "PICKED_UP",
    });
    const newer = JSON.stringify({
      providerShipmentId: secondShipment.providerShipmentId,
      status: "IN_TRANSIT",
    });
    await Promise.all([signedWebhook(older), signedWebhook(newer)]);
    expect(
      (await prisma.shipment.findUniqueOrThrow({ where: { id: secondShipment.id } })).status
    ).toBe("IN_TRANSIT");
  });

  test("concurrent duplicate webhook delivery has one logical effect", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const shipment = await addShipment(order.id, {
      status: "CREATED",
      providerShipmentId: `REPLAY-${crypto.randomUUID()}`,
    });
    const body = JSON.stringify({
      providerShipmentId: shipment.providerShipmentId,
      status: "IN_TRANSIT",
    });
    const responses = await Promise.all([
      signedWebhook(body),
      signedWebhook(body),
      signedWebhook(body),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe(
      "IN_TRANSIT"
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "SHIPPED"
    );
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(0);
  });

  test.each([
    ["DELIVERED", "IN_TRANSIT", "PICKED_UP"],
    ["CANCELLED", "CREATED", "IN_TRANSIT"],
    ["RETURNED", "OUT_FOR_DELIVERY", "DELIVERED"],
  ] as const)("webhook cannot move terminal %s shipment", async (terminal, stale, forward) => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const shipment = await addShipment(order.id, {
      status: terminal,
      providerShipmentId: `TERMINAL-${crypto.randomUUID()}`,
    });
    for (const status of [stale, forward]) {
      const response = await signedWebhook(
        JSON.stringify({ providerShipmentId: shipment.providerShipmentId, status })
      );
      expect(response.status).toBe(200);
      expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe(
        terminal
      );
    }
  });

  test("shipping lifecycle leaves inventory quantities and reservations untouched", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const product = await createTestProduct();
    productIds.push(product.id);
    const variant = await createTestVariant({ productId: product.id });
    variantIds.push(variant.id);
    await createTestInventory(variant.id, 10);
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productName: product.name,
        sku: variant.sku,
        size: "M",
        unitPrice: new Prisma.Decimal("20.00"),
        costPrice: new Prisma.Decimal("10.00"),
        appliedDiscount: new Prisma.Decimal("0.00"),
        taxRate: new Prisma.Decimal("0.00"),
        taxIncluded: false,
        lineSubtotal: new Prisma.Decimal("40.00"),
        discountAmount: new Prisma.Decimal("0.00"),
        taxAmount: new Prisma.Decimal("0.00"),
        lineTotal: new Prisma.Decimal("40.00"),
        quantity: 2,
      },
    });
    await InventoryService.reserveInventoryForOrder(order.id);
    const snapshot = async () => ({
      physicalQuantity: await prisma.inventoryTransaction.aggregate({
        where: { variantId: variant.id },
        _sum: { quantity: true },
      }),
      transactions: await prisma.inventoryTransaction.findMany({
        where: { variantId: variant.id },
        orderBy: { id: "asc" },
        select: { type: true, quantity: true, referenceId: true },
      }),
      reservations: await prisma.inventoryReservation.findMany({
        where: { variantId: variant.id },
        orderBy: { id: "asc" },
        select: { status: true, quantity: true, orderId: true },
      }),
    });
    const before = await snapshot();
    expect(before.physicalQuantity._sum.quantity).toBe(10);
    expect(before.transactions.map((transaction) => transaction.type)).toEqual(["RESTOCK"]);
    expect(before.reservations).toMatchObject([{ status: "RESERVED", quantity: 2 }]);

    const service = new ShippingService(providerFor());
    const shipment = await service.createShipmentForOrder(order.id);
    shipmentIds.push(shipment.id);
    await service.updateShipmentStatus(shipment.id, "PICKED_UP");
    await service.updateShipmentStatus(shipment.id, "IN_TRANSIT");
    const deliveredEvent = JSON.stringify({
      providerShipmentId: shipment.providerShipmentId,
      status: "DELIVERED",
    });
    expect((await signedWebhook(deliveredEvent)).status).toBe(200);

    const cancelOrder = await makeOrder(user);
    const cancelledShipment = await addShipment(cancelOrder.order.id, { status: "CREATED" });
    await service.updateShipmentStatus(cancelledShipment.id, "CANCELLED");

    expect(await snapshot()).toEqual(before);
    expect(
      await prisma.inventoryReservation.count({
        where: { variantId: variant.id, status: "COMMITTED" },
      })
    ).toBe(0);
  });

  test("customer order boundary safely rejects malformed, empty, nonexistent, and foreign IDs", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const ownOrder = await makeOrder(owner);
    const otherOrder = await makeOrder(other);
    const ownShipment = await addShipment(ownOrder.order.id);
    const otherShipment = await addShipment(otherOrder.order.id);
    expect(ownShipment.orderId).toBe(ownOrder.order.id);
    expect(otherShipment.orderId).toBe(otherOrder.order.id);

    mockSession = { user: { id: owner.id, role: "CUSTOMER" } };
    expect(await getCustomerOrder(ownOrder.order.orderNumber)).toMatchObject({
      shipment: { status: "PENDING", trackingNumber: ownShipment.trackingNumber },
    });
    for (const id of ["", "not-a-shipment-id", crypto.randomUUID(), otherOrder.order.orderNumber]) {
      const serialized = JSON.stringify(await getCustomerOrder(id));
      expect(serialized).toBe("null");
      expect(serialized).not.toMatch(/Prisma|stack|providerShipmentId|DATABASE_URL/i);
    }
    mockSession = null;
    await expect(getCustomerOrder(ownOrder.order.orderNumber)).rejects.toThrow("Unauthorized");
  });

  test("unknown provider result retry reuses the one local idempotency reference", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    const references: string[] = [];
    let calls = 0;
    const service = new ShippingService(
      providerFor(async (request) => {
        calls += 1;
        references.push(request.referenceId);
        throw new Error("ambiguous timeout");
      })
    );
    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow(
      "Provider timeout or error creating shipment"
    );
    const local = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } });
    shipmentIds.push(local.id);
    expect(local.status).toBe("PENDING");
    expect(local.providerShipmentId).toBeNull();
    expect(local.failureReason).toBe("Network timeout or unknown result");
    expect(references).toEqual([local.id]);

    await expect(service.createShipmentForOrder(order.id)).rejects.toThrow(
      "Shipment already exists for this order"
    );
    expect(calls).toBe(1);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
  });

  test("concurrent shipment creation and order cancellation have one consistent winner", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    mockSession = { user: { id: user.id, role: "CUSTOMER" } };
    const service = new ShippingService(providerFor());
    const [creation, cancellation] = await Promise.allSettled([
      service.createShipmentForOrder(order.id),
      import("../../src/lib/orders/actions").then(({ cancelOrderAction }) =>
        cancelOrderAction(order.orderNumber)
      ),
    ]);
    const shipmentCount = await prisma.shipment.count({ where: { orderId: order.id } });
    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(shipmentCount).toBeLessThanOrEqual(1);
    if (creation.status === "fulfilled") {
      shipmentIds.push(creation.value.id);
      expect(cancellation.status).toBe("fulfilled");
      if (cancellation.status === "fulfilled") expect(cancellation.value.success).toBe(false);
      expect(shipmentCount).toBe(1);
      expect(finalOrder.status).toBe("SHIPPED");
    } else {
      expect(cancellation.status).toBe("fulfilled");
      if (cancellation.status === "fulfilled") expect(cancellation.value.success).toBe(true);
      expect(shipmentCount).toBe(0);
      expect(finalOrder.status).toBe("CANCELLED");
    }
  });

  test("checkout ignores client shipping prices and persists the server-calculated amount", async () => {
    const user = await makeUser();
    mockSession = { user: { id: user.id } };
    const product = await createTestProduct();
    productIds.push(product.id);
    const variant = await createTestVariant({
      productId: product.id,
      sellingPrice: new Prisma.Decimal("99.99"),
    });
    variantIds.push(variant.id);
    await createTestInventory(variant.id, 5);
    await addToCart(variant.id, 1);
    const result = await createOrderAction(
      {
        customerName: "Shipping QA",
        customerEmail: user.email,
        customerPhone: "01711111111",
        shippingStreet: "10 Authority Street",
        shippingCity: "Dhaka",
        shippingState: "Dhaka",
        shippingZip: "1200",
        shippingCountry: "BD",
        paymentMethod: "COD",
        shippingCost: -99999,
        shippingMethodName: "Free Express",
      } as Parameters<typeof createOrderAction>[0],
      crypto.randomUUID()
    );
    expect(result.success).toBe(true);
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber! },
    });
    orderIds.push(order.id);
    expect(order.subtotal.equals(new Prisma.Decimal("99.99"))).toBe(true);
    expect(order.shippingCost.equals(new Prisma.Decimal("60.00"))).toBe(true);
    expect(order.total.equals(new Prisma.Decimal("159.99"))).toBe(true);
    expect(order.shippingMethodName).toBe("Standard Delivery");
  });

  test("cancellation cannot win after shipment intent is persisted", async () => {
    const user = await makeUser();
    const { order } = await makeOrder(user);
    let markProviderStarted: (() => void) | undefined;
    let finishProvider: (() => void) | undefined;
    const providerStarted = new Promise<void>((resolve) => {
      markProviderStarted = resolve;
    });
    const waitForProvider = new Promise<void>((resolve) => {
      finishProvider = resolve;
    });
    const service = new ShippingService(
      providerFor(async (request) => {
        markProviderStarted?.();
        await waitForProvider;
        return {
          success: true,
          providerShipmentId: `COURIER-${request.referenceId}`,
          status: "CREATED",
        };
      })
    );
    const creation = service.createShipmentForOrder(order.id);
    await providerStarted;
    mockSession = { user: { id: user.id, role: "CUSTOMER" } };
    const cancellation = await import("../../src/lib/orders/actions").then(
      ({ cancelOrderAction }) => cancelOrderAction(order.orderNumber)
    );
    finishProvider?.();
    const created = await creation;
    shipmentIds.push(created.id);
    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(cancellation.success).toBe(false);
    expect(finalOrder.status).toBe("SHIPPED");
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(1);
  });
});
