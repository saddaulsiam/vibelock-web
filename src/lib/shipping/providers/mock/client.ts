import {
  CancelShipmentRequest,
  CancelShipmentResponse,
  CreateShipmentRequest,
  CreateShipmentResponse,
  ShipmentStatusResult,
  ShippingProvider,
} from "../../types";

/**
 * Mock Courier Provider
 * Used for standardizing the abstraction layer before live integration.
 */
export class MockCourierProvider implements ShippingProvider {
  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Sandbox validation failure demo
    if (request.street.toLowerCase().includes("fail_me")) {
      return { success: false, error: "Invalid sandbox address" };
    }

    const providerShipmentId = `MOCK-SHP-${request.orderNumber}-${Date.now()}`;
    const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    return {
      success: true,
      providerShipmentId,
      trackingNumber,
      status: "CREATED",
    };
  }

  async getShipmentStatus(_providerShipmentId: string): Promise<ShipmentStatusResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // For demo purposes, we will return DELIVERED if it has been checked.
    // In reality, this queries the courier's API.
    return {
      success: true,
      status: "DELIVERED",
      providerStatus: "Delivered to consignee",
      deliveredAt: new Date(),
    };
  }

  async cancelShipment(_request: CancelShipmentRequest): Promise<CancelShipmentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { success: true };
  }
}
