"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";

export async function cancelOrderAction(orderNumber: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Determine if cancellation is allowed
    // We only allow cancellation if:
    // 1. Order belongs to user
    // 2. status is PENDING
    // 3. payment is NOT successful
    // 4. inventory is NOT already COMMITTED (since restocking is out of scope)
    const order = await prisma.order.findUnique({
      where: { orderNumber, userId },
      include: { inventoryReservations: true },
    });

    if (!order) {
      return { success: false, error: "Order not found or access denied." };
    }

    if (order.status === "CANCELLED") {
      return { success: true, message: "Order is already cancelled." };
    }

    if (order.status !== "PENDING") {
      return { success: false, error: "Only pending orders can be cancelled." };
    }

    if (
      order.paymentStatus === "SUCCESS" ||
      order.paymentStatus === "REFUNDED" ||
      order.paymentStatus === "PARTIALLY_REFUNDED"
    ) {
      return { success: false, error: "Paid orders cannot be cancelled online at this time." };
    }

    const hasCommittedInventory = order.inventoryReservations.some((r) => r.status === "COMMITTED");
    if (hasCommittedInventory) {
      return {
        success: false,
        error: "Order has already committed stock and cannot be safely cancelled.",
      };
    }

    // Atomic update
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
        },
      });

      // Release reserved inventory
      const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
      await inventoryService.releaseReservation(order.id, tx);
    });

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderNumber}`);

    return { success: true, message: "Order successfully cancelled." };
  } catch (error) {
    console.error("[cancelOrderAction] Error:", error);
    return { success: false, error: "Failed to cancel the order. Please try again later." };
  }
}
