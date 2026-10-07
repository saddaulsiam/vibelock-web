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
    // 1. Transactional validation and local intent creation
    const localShipment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
      if (!currentOrder) throw new Error("Order not found");
      if (currentOrder.status === "CANCELLED") throw new Error("Cannot ship a cancelled order");
      if (currentOrder.shipment) throw new Error("Shipment already exists for this order");
      if (currentOrder.paymentMethod === "ONLINE" && currentOrder.paymentStatus !== "SUCCESS") {
        throw new Error("Online orders must be fully paid before shipping");
      }

      return tx.shipment.create({
        data: {
          orderId: currentOrder.id,
          provider: "mock-courier",
          status: "PENDING",
          shippingAmount: currentOrder.shippingCost,
        },
      });
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
        referenceId: localShipment.id,
      });
    } catch {
      console.error("[ShippingService] Provider shipment creation request failed");
      // DO NOT update to FAILED on unknown result. Keep it as PENDING to avoid duplicate creation.
      // If we mark it failed and retry, we might create a duplicate shipment on the provider.
      await prisma.shipment.update({
        where: { id: localShipment.id },
        data: { failureReason: "Network timeout or unknown result" },
      });
      throw new Error("Provider timeout or error creating shipment");
    }

    if (!providerRes.success) {
      await prisma.shipment.update({
        where: { id: localShipment.id },
        data: {
          status: "FAILED",
          failureReason: "Provider rejected shipment",
        },
      });
      throw new Error("Provider rejected shipment");
    }

    // 3. Update shipment and order atomically after provider acceptance.
    const updatedShipment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
      if (!currentOrder || currentOrder.status === "CANCELLED") {
        throw new Error("Order was cancelled while shipment creation was in progress");
      }
      const updated = await tx.shipment.update({
        where: { id: localShipment.id },
        data: {
          status: providerRes.status || "CREATED",
          providerShipmentId: providerRes.providerShipmentId,
          trackingNumber: providerRes.trackingNumber,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED" },
      });
      return updated;
    });

    return updatedShipment;
  }

  async syncShipmentStatus(providerShipmentId: string, eventStatus?: ShipmentStatus) {
    const shipment = await prisma.shipment.findFirst({
      where: { providerShipmentId },
      include: { order: true },
    });

    if (!shipment) throw new Error("Shipment not found locally");
    if (shipment.status === "DELIVERED") return shipment; // Terminal state

    let result: { success: boolean; status?: ShipmentStatus };
    if (eventStatus) {
      result = { success: true, status: eventStatus };
    } else {
      try {
        result = await this.provider.getShipmentStatus(providerShipmentId);
      } catch {
        console.error("[ShippingService] Provider shipment status request failed");
        throw new Error("Failed to check shipment status");
      }
    }

    if (!result.success || !result.status) {
      return shipment; // No change
    }

    return this.updateShipmentStatus(shipment.id, result.status);
  }

  async updateShipmentStatus(shipmentId: string, newStatus: ShipmentStatus) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId } });
      if (!shipment) throw new Error("Shipment not found");

      const terminalStatuses: ShipmentStatus[] = ["DELIVERED", "CANCELLED", "RETURNED"];
      if (shipment.status === newStatus || terminalStatuses.includes(shipment.status)) {
        return shipment;
      }

      const progressOrder: ShipmentStatus[] = [
        "PENDING",
        "CREATED",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ];
      const currentProgress = progressOrder.indexOf(shipment.status);
      const nextProgress = progressOrder.indexOf(newStatus);
      const isForwardProgress = currentProgress >= 0 && nextProgress > currentProgress;
      const canFailOrCancel = currentProgress >= 0 || shipment.status === "FAILED";
      if (
        !isForwardProgress &&
        !((newStatus === "FAILED" || newStatus === "CANCELLED") && canFailOrCancel)
      ) {
        return shipment;
      }

      const updateResult = await tx.shipment.updateMany({
        where: { id: shipmentId, status: shipment.status },
        data: { status: newStatus },
      });
      if (updateResult.count === 0) {
        return (await tx.shipment.findUnique({ where: { id: shipmentId } })) ?? shipment;
      }

      const updated = await tx.shipment.findUnique({ where: { id: shipmentId } });
      if (!updated) return shipment;

      if (newStatus === "DELIVERED") {
        await tx.order.updateMany({
          where: { id: shipment.orderId, status: { not: "CANCELLED" } },
          data: { status: "DELIVERED" },
        });
      } else if (newStatus === "IN_TRANSIT" || newStatus === "OUT_FOR_DELIVERY") {
        await tx.order.updateMany({
          where: { id: shipment.orderId, status: { not: "CANCELLED" } },
          data: { status: "SHIPPED" },
        });
      }

      return updated;
    });
  }
}
