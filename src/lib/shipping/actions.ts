"use server";

import { requireRole } from "@/lib/auth/authorization";
import { ShippingService } from "./service";
import { MockCourierProvider } from "./providers/mock/client";

export async function adminCreateShipmentAction(orderId: string) {
  await requireRole("ADMIN");

  if (process.env.NODE_ENV === "production") {
    // In production, we MUST have a real courier. Since one isn't integrated yet:
    return { success: false, error: "Shipping provider unavailable / configuration error" };
  }

  const provider = new MockCourierProvider();
  const service = new ShippingService(provider);

  try {
    const shipment = await service.createShipmentForOrder(orderId);
    return { success: true, shipmentId: shipment.id };
  } catch (error) {
    console.error("[adminCreateShipmentAction] Shipment creation failed", error);
    const safeMessages = new Set([
      "Order not found",
      "Cannot ship a cancelled order",
      "Shipment already exists for this order",
      "Online orders must be fully paid before shipping",
      "Provider timeout or error creating shipment",
      "Provider rejected shipment",
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
