import prisma from "@/lib/prisma/client";
import { ShipmentStatus } from "@prisma/client";
import { ShippingProvider } from "./types";
import {
  checkOnlinePaymentFulfillmentEligibility,
  type PaymentFulfillmentCheckTarget,
} from "@/lib/payment/fulfillment";

let isPaymentCaptureTableAvailable: boolean | null = null;

async function checkPaymentCaptureTableAvailability(): Promise<boolean> {
  if (isPaymentCaptureTableAvailable !== null) {
    return isPaymentCaptureTableAvailable;
  }
  const paymentCapture = (
    prisma as unknown as { paymentCapture?: { findFirst?: () => Promise<unknown> } }
  ).paymentCapture;
  if (typeof paymentCapture?.findFirst !== "function") {
    isPaymentCaptureTableAvailable = false;
    return false;
  }
  try {
    await paymentCapture.findFirst();
    isPaymentCaptureTableAvailable = true;
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") || msg.includes("P2021")) {
      isPaymentCaptureTableAvailable = false;
      return false;
    }
    return true;
  }
}

export class ShippingService {
  constructor(private provider: ShippingProvider) {}

  async createShipmentForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });

    if (!order) throw new Error("Order not found");
    if (order.shipment) throw new Error("Shipment already exists for this order");

    const hasCaptureTable = await checkPaymentCaptureTableAvailability();

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
      if (currentOrder.paymentMethod === "ONLINE") {
        if (currentOrder.paymentStatus !== "SUCCESS") {
          throw new Error("Online orders must be fully paid before shipping");
        }
        const onlinePayments = (typeof tx.payment?.findMany === "function"
          ? await tx.payment.findMany({
              where: { orderId: currentOrder.id },
              ...(hasCaptureTable ? { include: { captures: true } } : {}),
            })
          : []) as PaymentFulfillmentCheckTarget[];
        const eligibility = checkOnlinePaymentFulfillmentEligibility({
          paymentMethod: currentOrder.paymentMethod,
          paymentStatus: currentOrder.paymentStatus,
          payments: onlinePayments,
        });
        if (!eligibility.eligible) {
          if (eligibility.error?.includes("provisional")) {
            throw new Error(
              "Online payment has an unresolved provisional capture hold pending verification."
            );
          }
          throw new Error(
            "Online orders with unreconciled payment captures or risk holds cannot be shipped"
          );
        }
      }

      return tx.shipment.create({
        data: {
          orderId: currentOrder.id,
          provider: this.provider.name ?? "unknown",
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
        codAmount: order.paymentMethod === "COD" ? Number(order.total) : 0,
        referenceId: localShipment.id,
        note: order.deliveryNote
          ? `VibeLock #${order.orderNumber} | Note: ${order.deliveryNote}`
          : `VibeLock order ${order.orderNumber}`,
      });
    } catch (err) {
      console.error("[ShippingService] Provider shipment creation request failed:", err);
      if (err instanceof Error && err.message.includes("not configured")) {
        await prisma.shipment.delete({ where: { id: localShipment.id } }).catch(() => {});
        throw err;
      }
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
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { shipment: true },
      });
      if (!currentOrder) throw new Error("Order not found");

      const wasCancelled = currentOrder.status === "CANCELLED";
      let eligibilityError: string | undefined;

      if (wasCancelled) {
        eligibilityError = "Order was cancelled while shipment creation was in progress";
      } else if (currentOrder.paymentMethod === "ONLINE") {
        if (currentOrder.paymentStatus !== "SUCCESS") {
          eligibilityError = "Online orders must be fully paid before shipping";
        } else {
          const onlinePayments = (typeof tx.payment?.findMany === "function"
            ? await tx.payment.findMany({
                where: { orderId: currentOrder.id },
                ...(hasCaptureTable ? { include: { captures: true } } : {}),
              })
            : []) as PaymentFulfillmentCheckTarget[];
          const eligibility = checkOnlinePaymentFulfillmentEligibility({
            paymentMethod: currentOrder.paymentMethod,
            paymentStatus: currentOrder.paymentStatus,
            payments: onlinePayments,
          });
          if (!eligibility.eligible) {
            eligibilityError = eligibility.error?.includes("provisional")
              ? "Online payment has an unresolved provisional capture hold pending verification."
              : "Online orders with unreconciled payment captures or risk holds cannot be shipped";
          }
        }
      }

      if (eligibilityError) {
        // We record the provider shipment reference and hold status atomically under lock.
        // We do NOT perform network calls (e.g. this.provider.cancelShipment) inside this transaction
        // to avoid holding the database connection and row lock during external API latency.
        const heldShipment = await tx.shipment.update({
          where: { id: localShipment.id },
          data: {
            status: providerRes.status || "CREATED",
            providerShipmentId: providerRes.providerShipmentId,
            trackingNumber: providerRes.trackingNumber,
            failureReason: `MANUAL_RECONCILIATION_REQUIRED: Provider accepted shipment (${providerRes.providerShipmentId}) but post-provider fulfillment eligibility failed (${eligibilityError}). Automated cancellation not supported or failed. Manual operator reconciliation required.`,
          },
        });
        // Do not mark the order SHIPPED or DELIVERED!
        return { shipment: heldShipment, error: eligibilityError, needsProviderCancel: true };
      }

      // Normal path: Order is eligible and active.
      const providerStatus = providerRes.status || "CREATED";
      const updated = await tx.shipment.update({
        where: { id: localShipment.id },
        data: {
          status: providerStatus,
          providerShipmentId: providerRes.providerShipmentId,
          trackingNumber: providerRes.trackingNumber,
          ...(providerStatus === "DELIVERED"
            ? { shippedAt: new Date(), deliveredAt: new Date() }
            : { shippedAt: new Date() }),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: providerStatus === "DELIVERED" ? "DELIVERED" : "SHIPPED" },
      });
      return { shipment: updated };
    });

    if (result.needsProviderCancel && result.error) {
      // Attempt provider cancellation OUTSIDE of database transaction / row lock
      let providerCancelled = false;
      if (
        typeof this.provider.cancelShipment === "function" &&
        providerRes.providerShipmentId
      ) {
        try {
          const cancelRes = await this.provider.cancelShipment({
            shipmentId: localShipment.id,
            providerShipmentId: providerRes.providerShipmentId,
          });
          providerCancelled = cancelRes?.success === true;
        } catch (err) {
          console.error("[ShippingService] Failed to cancel shipment with provider:", err);
        }
      }

      if (providerCancelled) {
        await prisma.shipment.update({
          where: { id: localShipment.id },
          data: {
            status: "CANCELLED",
            providerShipmentId: providerRes.providerShipmentId,
            trackingNumber: providerRes.trackingNumber,
            cancelledAt: new Date(),
            failureReason: `Fulfillment eligibility failed after provider acceptance (${result.error}). Provider shipment cancelled successfully.`,
          },
        });
      }

      throw new Error(result.error);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    return result.shipment;
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
    const hasCaptureTable = await checkPaymentCaptureTableAvailability();

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
        data: {
          status: newStatus,
          ...(newStatus === "PICKED_UP" ||
          newStatus === "IN_TRANSIT" ||
          newStatus === "OUT_FOR_DELIVERY"
            ? { shippedAt: shipment.shippedAt ?? new Date() }
            : {}),
          ...(newStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
          ...(newStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        },
      });
      if (updateResult.count === 0) {
        return (await tx.shipment.findUnique({ where: { id: shipmentId } })) ?? shipment;
      }

      const updated = await tx.shipment.findUnique({ where: { id: shipmentId } });
      if (!updated) return shipment;

      // Lock and re-read order to prevent concurrent races
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${shipment.orderId} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: shipment.orderId },
      });
      if (!currentOrder) return updated;

      // Cancelled order is NEVER resurrected
      if (currentOrder.status === "CANCELLED") {
        return updated;
      }

      const advancesToShipped = newStatus === "IN_TRANSIT" || newStatus === "OUT_FOR_DELIVERY";
      const advancesToDelivered = newStatus === "DELIVERED";

      if (advancesToShipped || advancesToDelivered) {
        if (currentOrder.paymentMethod === "ONLINE") {
          const onlinePayments = (typeof tx.payment?.findMany === "function"
            ? await tx.payment.findMany({
                where: { orderId: currentOrder.id },
                ...(hasCaptureTable ? { include: { captures: true } } : {}),
              })
            : []) as PaymentFulfillmentCheckTarget[];

          const eligibility = checkOnlinePaymentFulfillmentEligibility({
            paymentMethod: currentOrder.paymentMethod,
            paymentStatus: currentOrder.paymentStatus,
            payments: onlinePayments,
          });

          if (!eligibility.eligible) {
            const failureReason = `MANUAL_RECONCILIATION_REQUIRED: Courier reported status ${newStatus} but online payment fulfillment eligibility failed: ${eligibility.error ?? "Payment not eligible"}. Order status not advanced.`;
            const heldShipment = await tx.shipment.update({
              where: { id: shipmentId },
              data: {
                failureReason,
              },
            });
            return heldShipment;
          }
        }

        if (advancesToDelivered) {
          await tx.order.updateMany({
            where: { id: shipment.orderId, status: { not: "CANCELLED" } },
            data: { status: "DELIVERED" },
          });
        } else if (advancesToShipped) {
          await tx.order.updateMany({
            where: { id: shipment.orderId, status: { notIn: ["CANCELLED", "DELIVERED"] } },
            data: { status: "SHIPPED" },
          });
        }
      }

      return updated;
    });
  }
}
