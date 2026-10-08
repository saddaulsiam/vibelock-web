import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ShipmentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import { ShippingService } from "@/lib/shipping/service";
import { MockCourierProvider } from "@/lib/shipping/providers/mock/client";

const shipmentStatuses = new Set<string>(Object.values(ShipmentStatus));

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = env.COURIER_WEBHOOK_SECRET;
  const signature = req.headers.get("x-courier-signature");

  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 401 });
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const supplied = /^[a-f\d]{64}$/i.test(signature)
    ? Buffer.from(signature, "hex")
    : Buffer.alloc(0);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("providerShipmentId" in payload) ||
    typeof payload.providerShipmentId !== "string" ||
    !payload.providerShipmentId.trim() ||
    !("status" in payload) ||
    typeof payload.status !== "string" ||
    !shipmentStatuses.has(payload.status)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (env.SHIPPING_PROVIDER === "steadfast") {
    return NextResponse.json(
      { error: "Steadfast status synchronization uses the authenticated admin refresh action." },
      { status: 501 }
    );
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Shipping provider unavailable / configuration error" },
      { status: 501 }
    );
  }

  try {
    const service = new ShippingService(new MockCourierProvider());
    await service.syncShipmentStatus(payload.providerShipmentId, payload.status as ShipmentStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Shipment not found locally") {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }
    console.error("[Shipping Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
