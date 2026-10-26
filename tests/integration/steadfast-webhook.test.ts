import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { POST as steadfastWebhook } from "@/app/api/shipping/webhook/steadfast/route";

const TEST_SECRET = "test-steadfast-secret-key-12345";

vi.mock("@/lib/config/env", () => ({
  env: {
    COURIER_WEBHOOK_SECRET: "test-steadfast-secret-key-12345",
    STEADFAST_SECRET_KEY: "test-steadfast-secret-key-12345",
    SHIPPING_PROVIDER: "steadfast",
  },
}));

function createRequest(
  body: Record<string, unknown> | string,
  headers: Record<string, string> = {}
) {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const defaultHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...headers,
  };
  return new NextRequest("http://localhost:3000/api/shipping/webhook/steadfast", {
    method: "POST",
    headers: defaultHeaders,
    body: rawBody,
  });
}

function createSignedRequest(body: Record<string, unknown>, secret = TEST_SECRET) {
  const rawBody = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return createRequest(rawBody, {
    "x-signature": signature,
  });
}

function createBearerRequest(body: Record<string, unknown>, token = TEST_SECRET) {
  return createRequest(body, {
    authorization: `Bearer ${token}`,
  });
}

describe("Steadfast Courier Webhook (/api/shipping/webhook/steadfast)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthorized webhook requests", async () => {
    const unauthenticated = createRequest({ consignment_id: 1234, status: "delivered" });
    const res = await steadfastWebhook(unauthenticated);
    expect(res.status).toBe(401);

    const badBearer = createBearerRequest(
      { consignment_id: 1234, status: "delivered" },
      "wrong-token"
    );
    const resBadBearer = await steadfastWebhook(badBearer);
    expect(resBadBearer.status).toBe(401);

    const badHmac = createRequest(JSON.stringify({ consignment_id: 1234, status: "delivered" }), {
      "x-signature": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });
    const resBadHmac = await steadfastWebhook(badHmac);
    expect(resBadHmac.status).toBe(401);
  });

  test("rejects malformed JSON payloads with HTTP 400", async () => {
    const raw = "{ invalid-json ";
    const signature = crypto.createHmac("sha256", TEST_SECRET).update(raw).digest("hex");
    const req = createRequest(raw, { "x-signature": signature });
    const res = await steadfastWebhook(req);
    expect(res.status).toBe(400);
  });

  test("acknowledges ping/test events gracefully", async () => {
    const pingReq = createBearerRequest({ notification_type: "ping" });
    const res = await steadfastWebhook(pingReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("ping acknowledged");
  });

  test("processes delivery status update by consignment_id and updates shipment and COD order", async () => {
    // 1. Create a test order and shipment
    const orderNumber = `TEST-STED-${Date.now()}`;
    const testCid = `CID-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "PROCESSING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: "webhook-test@example.com",
        customerPhone: "01712345678",
        shippingStreet: "Banani Rd 11",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingCost: 60,
        subtotal: 500,
        taxAmount: 0,
        taxRate: 0,
        discount: 0,
        total: 560,
        shippingMethodName: "Standard",
      },
    });

    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        provider: "steadfast",
        providerShipmentId: testCid,
        trackingNumber: `TRK-${testCid}`,
        status: "IN_TRANSIT",
        shippingAmount: 60,
      },
    });

    // 2. Deliver event via HMAC signature
    const event = {
      notification_type: "delivery_status",
      consignment_id: testCid,
      invoice: orderNumber,
      status: "delivered",
    };

    const req = createSignedRequest(event);
    const res = await steadfastWebhook(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newStatus).toBe("DELIVERED");

    // 3. Verify database state
    const updatedShipment = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(updatedShipment.status).toBe("DELIVERED");
    expect(updatedShipment.deliveredAt).not.toBeNull();

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe("DELIVERED");
    expect(updatedOrder.paymentStatus).toBe("SUCCESS"); // COD reconciled to SUCCESS on delivery

    // Cleanup
    await prisma.shipment.delete({ where: { id: shipment.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });

  test("handles unknown consignment gracefully without crashing or throwing", async () => {
    const unknownReq = createBearerRequest({
      notification_type: "delivery_status",
      consignment_id: "NON-EXISTENT-CID-99999",
      status: "in_transit",
    });
    const res = await steadfastWebhook(unknownReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.warning).toBe("Shipment not found locally");
  });
});
