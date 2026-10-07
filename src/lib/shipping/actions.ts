"use server";

import { auth } from "@/auth";
import { ShippingService } from "./service";
import { MockCourierProvider } from "./providers/mock/client";

export async function adminCreateShipmentAction(orderId: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // Assuming STAFF/ADMIN check here in a real app
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "MANAGER" &&
    session.user.role !== "STAFF"
  ) {
    // If testing as a regular user, maybe bypass this check for sandbox?
    // Let's enforce it strictly, or we can allow the user to trigger it on their own order if they own it (for testing only).
    // Given the prompt: "Customer must never be able to: mark shipment shipped"
    return { success: false, error: "Forbidden: Admin only" };
  }

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
    return {
      success: false,
      error: error instanceof Error ? error.message : "Shipment creation failed",
    };
  }
}
