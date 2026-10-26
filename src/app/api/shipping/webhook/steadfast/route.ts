import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { ShipmentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import prisma from "@/lib/prisma/client";
import { ShippingService } from "@/lib/shipping/service";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";

const statusMap: Record<string, ShipmentStatus> = {
  pending: "CREATED",
  in_review: "CREATED",
  hold: "CREATED",
  picked_up: "IN_TRANSIT",
  picked: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  delivered_approval_pending: "OUT_FOR_DELIVERY",
  partial_delivered: "IN_TRANSIT",
  partial_delivered_approval_pending: "IN_TRANSIT",
  cancelled: "CANCELLED",
  cancelled_approval_pending: "IN_TRANSIT",
  exceptional: "FAILED",
  unknown: "CREATED",
  unknown_approval_pending: "CREATED",
  returned: "RETURNED",
};

function verifyAuth(req: NextRequest, rawBody: string, secret?: string): boolean {
  if (!secret) {
    // If no secret configured in env, allow webhook in non-production
    return process.env.NODE_ENV !== "production";
  }

  // 1. Check Bearer Token in Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === secret) return true;
  }

  // 2. Check X-Signature / x-signature HMAC-SHA256
  const signature = req.headers.get("x-signature") || req.headers.get("x-courier-signature");
  if (signature) {
    try {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      if (
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
      ) {
        return true;
      }
    } catch {
      // Signature parsing failed
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = env.COURIER_WEBHOOK_SECRET || process.env.COURIER_WEBHOOK_SECRET;

  if (!verifyAuth(req, rawBody, secret)) {
    return NextResponse.json({ error: "Unauthorized Steadfast webhook request" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Handle test ping from Steadfast dashboard
  const notificationType = String(payload.notification_type || payload.event || "").toLowerCase();
  if (notificationType === "ping" || notificationType === "test") {
    return NextResponse.json({ success: true, message: "Steadfast webhook ping acknowledged" });
  }

  const rawConsignmentId = payload.consignment_id ?? payload.cid;
  const consignmentId = rawConsignmentId ? String(rawConsignmentId).trim() : null;
  const trackingCode = payload.tracking_code ? String(payload.tracking_code).trim() : null;
  const invoice = payload.invoice ? String(payload.invoice).trim() : null;
  const rawStatus = String(payload.status || payload.delivery_status || "")
    .toLowerCase()
    .trim();

  if (!rawStatus) {
    return NextResponse.json({ error: "Missing status field in payload" }, { status: 400 });
  }

  const mappedStatus: ShipmentStatus | undefined =
    statusMap[rawStatus] ||
    (Object.values(ShipmentStatus).includes(rawStatus.toUpperCase() as ShipmentStatus)
      ? (rawStatus.toUpperCase() as ShipmentStatus)
      : undefined);

  if (!mappedStatus) {
    console.warn(`[Steadfast Webhook] Unmapped status received: "${rawStatus}"`);
    return NextResponse.json({
      success: true,
      received: true,
      unmapped: true,
      rawStatus,
    });
  }

  // Find corresponding shipment in VibeLock database
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        ...(consignmentId ? [{ providerShipmentId: consignmentId }] : []),
        ...(trackingCode ? [{ trackingNumber: trackingCode }] : []),
        ...(invoice ? [{ order: { orderNumber: invoice } }] : []),
      ],
    },
    include: { order: true },
  });

  if (!shipment) {
    console.warn(
      `[Steadfast Webhook] Shipment not found for CID: "${consignmentId}", Invoice: "${invoice}", Tracking: "${trackingCode}"`
    );
    // Return 200 to acknowledge receipt and prevent endless webhook retries
    return NextResponse.json({
      success: true,
      warning: "Shipment not found locally",
      consignmentId,
      invoice,
    });
  }

  try {
    const service = new ShippingService(new SteadfastCourierProvider());
    const updated = await service.updateShipmentStatus(shipment.id, mappedStatus);

    // If parcel is confirmed DELIVERED and was COD, reconcile payment status to SUCCESS
    if (mappedStatus === "DELIVERED" && shipment.order?.paymentMethod === "COD") {
      await prisma.order.updateMany({
        where: { id: shipment.orderId, paymentStatus: { not: "SUCCESS" } },
        data: { paymentStatus: "SUCCESS" },
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${shipment.orderId}`);
    revalidatePath(`/admin/shipping/shipments/${shipment.id}`);

    return NextResponse.json({
      success: true,
      shipmentId: updated.id,
      previousStatus: shipment.status,
      newStatus: updated.status,
    });
  } catch (error) {
    console.error("[Steadfast Webhook Processing Error]", error);
    return NextResponse.json(
      { error: "Internal error processing Steadfast shipment update" },
      { status: 500 }
    );
  }
}
