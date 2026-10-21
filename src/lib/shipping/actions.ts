"use server";

import { requireRole } from "@/lib/auth/authorization";
import { ShippingService } from "./service";
import { getShippingProvider } from "./provider";

export async function adminCreateShipmentAction(orderId: string) {
  await requireRole("ADMIN");

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
