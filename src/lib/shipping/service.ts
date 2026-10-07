import prisma from "@/lib/prisma/client";
import { ShipmentStatus } from "@prisma/client";
import { ShippingProvider } from "./types";

export class ShippingService {
  constructor(private provider: ShippingProvider) {}

  async createShipmentForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) throw new Error("Order not found");
    if (order.status === "CANCELLED") throw new Error("Cannot ship a cancelled order");
    if (order.shipment) throw new Error("Shipment already exists for this order");

    // Enforce Payment Rules
    if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "SUCCESS") {
      throw new Error("Online orders must be fully paid before shipping");
    }

    // 1. Create local shipment intent
    const localShipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        provider: "mock-courier",
        status: "PENDING",
        shippingAmount: order.shippingCost,
      },
    });

    // 2. Call external provider
    let providerRes;
    try {
      providerRes = await this.provider.createShipment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipientName: order.customerName || "Customer",
        recipientPhone: order.customerPhone || "",
        street: order.shippingStreet,
        city: order.shippingCity,
        state: order.shippingState || undefined,
        zip: order.shippingZip || undefined,
        country: order.shippingCountry,
        amount: Number(order.total),
      });
    } catch (error) {
      console.error("[ShippingService] Provider error during shipment creation", error);
      // Fallback update to FAILED, but keep the record
      await prisma.shipment.update({
        where: { id: localShipment.id },
        data: { status: "FAILED", failureReason: "Network timeout or unknown result" },
      });
      throw new Error("Provider timeout or error creating shipment");
    }

    if (!providerRes.success) {
      await prisma.shipment.update({
        where: { id: localShipment.id },
        data: {
          status: "FAILED",
          failureReason: providerRes.error || "Provider rejected shipment",
        },
      });
      throw new Error(providerRes.error || "Failed to create provider shipment");
    }

    // 3. Update local state
    const updatedShipment = await prisma.shipment.update({
      where: { id: localShipment.id },
      data: {
        status: providerRes.status || "CREATED",
        providerShipmentId: providerRes.providerShipmentId,
        trackingNumber: providerRes.trackingNumber,
      },
    });

    // Sync order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "SHIPPED" },
    });

    return updatedShipment;
  }

  async syncShipmentStatus(providerShipmentId: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { providerShipmentId },
      include: { order: true },
    });

    if (!shipment) throw new Error("Shipment not found locally");
    if (shipment.status === "DELIVERED") return shipment; // Terminal state

    let result;
    try {
      result = await this.provider.getShipmentStatus(providerShipmentId);
    } catch (error) {
      console.error("[ShippingService] Error checking status", error);
      throw new Error("Failed to check shipment status");
    }

    if (!result.success || !result.status) {
      return shipment; // No change
    }

    return this.updateShipmentStatus(shipment.id, result.status);
  }

  async updateShipmentStatus(shipmentId: string, newStatus: ShipmentStatus) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) throw new Error("Shipment not found");

    // Prevent invalid regression
    if (shipment.status === "DELIVERED") {
      // Delivered is terminal from a shipping perspective.
      return shipment;
    }

    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: newStatus },
    });

    // Synchronize parent Order status
    if (newStatus === "DELIVERED") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });
    } else if (newStatus === "IN_TRANSIT" || newStatus === "OUT_FOR_DELIVERY") {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "SHIPPED" },
      });
    }

    return updated;
  }
}
