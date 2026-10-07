import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export class ReturnService {
  /**
   * Calculates the remaining returnable quantity for each item in an order.
   * Returns a map of orderItemId -> returnableQuantity.
   */
  async getReturnableQuantities(orderId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        returns: {
          where: {
            // Include returns that are not rejected
            status: { not: "REJECTED" },
          },
          include: { items: true },
        },
      },
    });

    if (!order) throw new Error("Order not found");

    const returnableMap: Record<string, number> = {};

    for (const item of order.items) {
      // Calculate how many of this item have already been requested for return
      let returnedQty = 0;
      for (const req of order.returns) {
        const reqItem = req.items.find((i) => i.orderItemId === item.id);
        if (reqItem) returnedQty += reqItem.quantity;
      }

      returnableMap[item.id] = Math.max(0, item.quantity - returnedQty);
    }

    return returnableMap;
  }

  /**
   * Safely process inventory restoration for a COMPLETED return.
   * Restocks items back into inventory if applicable.
   */
  async processReturnRestock(returnRequestId: string, tx: Prisma.TransactionClient) {
    const returnReq = await tx.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        order: { select: { salesChannel: true } },
        items: { include: { orderItem: { select: { sku: true } } } },
      },
    });

    if (!returnReq) throw new Error("Return request not found");
    if (returnReq.status !== "COMPLETED") throw new Error("Return must be completed to restock");

    // Fetch the product variants directly via sku to restore inventory
    const skus = returnReq.items.map((i) => i.orderItem.sku);

    const variants = await tx.productVariant.findMany({
      where: { sku: { in: skus } },
      select: { id: true, sku: true },
    });

    const skuToVariantId = new Map(variants.map((v) => [v.sku, v.id]));

    // Check if this return already has corresponding RESTOCK transactions
    const existingRestocks = await tx.inventoryTransaction.findMany({
      where: { referenceId: returnRequestId, type: "RETURN" },
    });

    if (existingRestocks.length > 0) {
      // Idempotency: Restock was already processed
      return;
    }

    for (const item of returnReq.items) {
      const variantId = skuToVariantId.get(item.orderItem.sku);
      if (!variantId) continue;

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          type: "RETURN",
          quantity: Math.abs(item.quantity), // Must be positive for restock
          salesChannel: returnReq.order.salesChannel,
          referenceId: returnRequestId,
          notes: `Restock from Return #${returnRequestId}`,
        },
      });
    }
  }
}
