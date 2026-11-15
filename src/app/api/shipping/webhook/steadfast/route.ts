import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma, ShipmentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import prisma from "@/lib/prisma/client";
import { ShippingService } from "@/lib/shipping/service";
import { SteadfastCourierProvider } from "@/lib/shipping/providers/steadfast";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";

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

const MAX_STEADFAST_WEBHOOK_BYTES = MAX_REQUEST_PAYLOAD_BYTES; // 64 KB

function hasTrustworthyCodCollectionConfirmation(
  payload: Record<string, unknown>,
  expectedAmount?: number
): boolean {
  // 1. Explicit COD collection status indicators from provider
  const codStatus =
    typeof payload.cod_status === "string" ? payload.cod_status.toLowerCase().trim() : "";
  const paymentStatus =
    typeof payload.payment_status === "string" ? payload.payment_status.toLowerCase().trim() : "";
  const notificationType =
    typeof payload.notification_type === "string"
      ? payload.notification_type.toLowerCase().trim()
      : "";

  const isExplicitCollected =
    codStatus === "collected" ||
    codStatus === "remitted" ||
    paymentStatus === "paid" ||
    paymentStatus === "collected" ||
    notificationType === "payment_collected" ||
    notificationType === "cod_collected" ||
    notificationType === "cod_remitted";

  if (isExplicitCollected) return true;

  // 2. Explicit numeric collection verification: collected_amount matching expected amount
  const rawCollected = payload.collected_amount ?? payload.cod_amount_collected;
  const collectedAmount =
    typeof rawCollected === "number" ? rawCollected : parseFloat(String(rawCollected || "0"));

  if (Number.isFinite(collectedAmount) && collectedAmount > 0) {
    if (expectedAmount && expectedAmount > 0) {
      // Must match expected order total within 1.00 BDT tolerance
      return Math.abs(collectedAmount - expectedAmount) <= 1.0;
    }
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  const bounded = await readBoundedBodyText(req, MAX_STEADFAST_WEBHOOK_BYTES);
  if (bounded.tooLarge) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = bounded.text;

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

    // Reconcile COD payment semantics
    // Requirement 5: DELIVERED status alone must NOT mark COD payment SUCCESS.
    // Require explicit, trustworthy COD collection confirmation from the provider.
    // Otherwise leave payment reconciliation pending.
    if (mappedStatus === "DELIVERED" && shipment.order?.paymentMethod === "COD") {
      const orderTotal = Number(shipment.order.total);
      const isCodCollectionConfirmed = hasTrustworthyCodCollectionConfirmation(
        payload,
        orderTotal
      );

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

        if (isCodCollectionConfirmed) {
          if (currentOrder.paymentStatus !== "SUCCESS") {
            await tx.order.update({
              where: { id: currentOrder.id },
              data: { paymentStatus: "SUCCESS" },
            });

            await tx.orderHistory.create({
              data: {
                orderId: currentOrder.id,
                status: currentOrder.status,
                notes: `Cash on Delivery payment collected and verified via Steadfast (Consignment: ${consignmentId || shipment.providerShipmentId || "N/A"}).`,
              },
            });

            await tx.auditLog.create({
              data: {
                actorId: currentOrder.userId || null,
                action: "COD_PAYMENT_RECONCILED",
                entityType: "Order",
                entityId: currentOrder.id,
                metadata: {
                  courier: "steadfast",
                  consignmentId,
                  trackingCode,
                  payload: payload as Prisma.InputJsonValue,
                },
              },
            });
          }
        } else {
          // Requirement 5: DELIVERED status alone must NOT mark COD payment SUCCESS.
          // Leave payment reconciliation pending and record note in order history.
          console.info(
            `[Steadfast Webhook] Parcel delivered for COD order ${currentOrder.id}. ` +
              `Explicit COD collection confirmation was not provided in webhook. Payment remains ${currentOrder.paymentStatus}.`
          );
          await tx.orderHistory.create({
            data: {
              orderId: currentOrder.id,
              status: currentOrder.status,
              notes: `Parcel delivered via Steadfast (CID: ${consignmentId || shipment.providerShipmentId || "N/A"}). COD cash collection remains pending courier remittance confirmation.`,
            },
          });
        }
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
