import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ShipmentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import prisma from "@/lib/prisma/client";
import { ShippingService } from "@/lib/shipping/service";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";
import { logSecurityAlert, maskIpAddress } from "@/lib/monitoring/security-logger";

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

const steadfastWebhookPayloadSchema = z
  .object({
    notification_type: z.string().max(50).optional(),
    event: z.string().max(50).optional(),
    consignment_id: z.union([z.string().max(100), z.number()]).optional(),
    cid: z.union([z.string().max(100), z.number()]).optional(),
    tracking_code: z.string().max(100).optional(),
    invoice: z.string().max(100).optional(),
    status: z.string().max(100).optional(),
    delivery_status: z.string().max(100).optional(),
  })
  .passthrough();

function verifyAuth(req: NextRequest, rawBody: string, secret?: string): boolean {
  if (!secret) {
    // If no secret configured in env, allow webhook in non-production
    return process.env.NODE_ENV !== "production";
  }

  // 1. Check Bearer Token in Authorization header (constant-time comparison)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(secret);
    if (
      tokenBuf.length === secretBuf.length &&
      crypto.timingSafeEqual(tokenBuf, secretBuf)
    ) {
      return true;
    }
  }

  // 2. Check X-Signature / x-signature HMAC-SHA256 (constant-time comparison)
  const signature = req.headers.get("x-signature") || req.headers.get("x-courier-signature");
  if (signature) {
    try {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const suppliedBuf = /^[a-f\d]{64}$/i.test(signature)
        ? Buffer.from(signature, "hex")
        : Buffer.alloc(0);
      const expectedBuf = Buffer.from(expected, "hex");
      if (
        suppliedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(suppliedBuf, expectedBuf)
      ) {
        return true;
      }
    } catch {
      // Signature parsing failed
    }
  }

  return false;
}

const MAX_STEADFAST_WEBHOOK_BYTES = MAX_REQUEST_PAYLOAD_BYTES; // 64 KB

export async function POST(req: NextRequest) {
  const bounded = await readBoundedBodyText(req, MAX_STEADFAST_WEBHOOK_BYTES);
  if (bounded.tooLarge) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = bounded.text;

  const secret = env.COURIER_WEBHOOK_SECRET || process.env.COURIER_WEBHOOK_SECRET;

  if (!verifyAuth(req, rawBody, secret)) {
    logSecurityAlert("COURIER_WEBHOOK_REJECTED", {
      endpoint: "shipping/webhook/steadfast",
      gateway: "steadfast",
      reason: "unauthorized_signature",
      ipMasked: maskIpAddress(req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")),
    });
    return NextResponse.json({ error: "Unauthorized Steadfast webhook request" }, { status: 401 });
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = steadfastWebhookPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  }

  const payload = parseResult.data as Record<string, unknown>;

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

    // Reconcile COD payment semantics
    // Requirement 5 / PAY-5B-05: The documented Steadfast webhook contract communicates parcel transit
    // and delivery status. It does not establish authoritative courier cash collection or bank remittance.
    // As documented in docs/AppFlow.md and error_handling.md, DELIVERED status alone must NOT mark COD
    // payment SUCCESS. Payment reconciliation remains pending courier remittance confirmation.
    if (mappedStatus === "DELIVERED" && shipment.order?.paymentMethod === "COD") {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${shipment.orderId} FOR UPDATE`;
        const currentOrder = await tx.order.findUnique({
          where: { id: shipment.orderId },
        });

        if (!currentOrder) return;

        // If order was cancelled or returned, NEVER mark payment status SUCCESS
        if (currentOrder.status === "CANCELLED" || currentOrder.status === "RETURNED") {
          console.warn(
            `[Steadfast Webhook] Parcel delivered for terminal ${currentOrder.status} order ${currentOrder.id}. ` +
              `Payment status will NOT be transitioned to SUCCESS.`
          );
          await tx.orderHistory.create({
            data: {
              orderId: currentOrder.id,
              status: currentOrder.status,
              notes: `[ANOMALY] Steadfast delivery webhook received for ${currentOrder.status} order. Payment was not marked SUCCESS.`,
            },
          });
          return;
        }

        // Keep COD payment reconciliation pending for financial remittance verification.
        console.info(
          `[Steadfast Webhook] Parcel delivered for COD order ${currentOrder.id}. ` +
            `Steadfast delivery webhook does not establish authoritative cash remittance. Leaving payment reconciliation pending.`
        );
        await tx.orderHistory.create({
          data: {
            orderId: currentOrder.id,
            status: currentOrder.status,
            notes: `Parcel delivered via Steadfast (CID: ${consignmentId || shipment.providerShipmentId || "N/A"}). COD cash collection remains pending courier remittance confirmation.`,
          },
        });
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${shipment.orderId}`);
    revalidatePath("/admin/shipping");

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
