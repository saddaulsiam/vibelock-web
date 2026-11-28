"use server";

import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth/authorization";
import { hashSecurityIdentifier, logSecurityAlert } from "@/lib/monitoring/security-logger";
import { getShippingProvider } from "./provider";
import { ShippingService } from "./service";

export async function adminCreateShipmentAction(orderId: string) {
  const admin = await requireRole("STAFF");

  let provider;
  try {
    provider = getShippingProvider();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Shipping provider configuration error.",
    };
  }
  if (process.env.NODE_ENV === "production" && provider.name === "mock-courier") {
    return { success: false, error: "Shipping provider unavailable / configuration error" };
  }
  const service = new ShippingService(provider);

  try {
    const shipment = await service.createShipmentForOrder(orderId);
    await recordAuditLog({
      actorId: admin?.id,
      action: "SHIPMENT_CREATED",
      entityType: "Shipment",
      entityId: shipment.id,
      metadata: {
        orderId,
        provider: shipment.provider,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
      },
    });
    return { success: true, shipmentId: shipment.id };
  } catch (error) {
    console.error("[adminCreateShipmentAction] Shipment creation failed", error);
    logSecurityAlert("COURIER_DISPATCH_FAILED", {
      endpoint: "adminCreateShipmentAction",
      gateway: provider?.name || "courier",
      orderHash: hashSecurityIdentifier(orderId),
      reason: error instanceof Error ? error.message : "shipment_creation_failed",
    });
    const safeMessages = new Set([
      "Order not found",
      "Cannot ship a cancelled order",
      "Shipment already exists for this order",
      "Online orders must be fully paid before shipping",
      "Provider timeout or error creating shipment",
      "Provider rejected shipment",
      "Steadfast shipping provider is not configured.",
      "Steadfast request failed.",
      "Steadfast returned an invalid response.",
      "Steadfast returned an incomplete shipment.",
      "Order was cancelled while shipment creation was in progress",
    ]);
    return {
      success: false,
      error:
        error instanceof Error && safeMessages.has(error.message)
          ? error.message
          : "Shipment creation failed. Please try again later.",
    };
  }
}
