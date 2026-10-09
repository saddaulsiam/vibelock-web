"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";

export async function cancelOrderAction(orderNumber: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const orderIdentity = await tx.order.findUnique({
        where: { orderNumber, userId },
        select: { id: true },
      });
      if (!orderIdentity)
        return { success: false as const, error: "Order not found or access denied." };

      // Serialize cancellation with shipment intent creation, which takes the same row lock.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderIdentity.id} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderIdentity.id },
        include: { inventoryReservations: true, shipment: true },
      });
      if (!order) return { success: false as const, error: "Order not found or access denied." };
      if (order.status === "CANCELLED") {
        return { success: true as const, message: "Order is already cancelled." };
      }
      if (order.shipment) {
        return {
          success: false as const,
          error: "Orders cannot be cancelled after shipment processing has started.",
        };
      }
      if (order.status !== "PENDING") {
        return { success: false as const, error: "Only pending orders can be cancelled." };
      }
      if (
        order.paymentStatus === "SUCCESS" ||
        order.paymentStatus === "REFUNDED" ||
        order.paymentStatus === "PARTIALLY_REFUNDED"
      ) {
        return {
          success: false as const,
          error: "Paid orders cannot be cancelled online at this time.",
        };
      }
      if (
        order.paymentMethod !== "COD" &&
        order.inventoryReservations.some((reservation) => reservation.status === "COMMITTED")
      ) {
        return {
          success: false as const,
          error: "Order has already committed stock and cannot be safely cancelled.",
        };
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          notes: "Order cancelled by customer.",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "ORDER_CANCELLED",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            from: order.status,
            to: "CANCELLED",
            paymentMethod: order.paymentMethod,
            source: "customer_self_service",
          },
        },
      });

      const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
      await inventoryService.cancelOrderInventory(order.id, tx);
      return { success: true as const, message: "Order successfully cancelled." };
    });

    if (!result.success) return result;
    if (result.message === "Order is already cancelled.") return result;

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderNumber}`);

    return result;
  } catch (error) {
    console.error("[cancelOrderAction] Error:", error);
    return { success: false, error: "Failed to cancel the order. Please try again later." };
  }
}
