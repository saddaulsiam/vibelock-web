import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/config/env";

export class InsufficientInventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientInventoryError";
  }
}

export class InventoryService {
  /**
   * Calculates the currently available stock for a variant.
   * This logic matches the read-only catalog mappers but uses a locked transaction context if needed.
   */
  static async calculateAvailableQuantity(tx: Prisma.TransactionClient, variantId: string): Promise<number> {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventoryTransactions: { select: { quantity: true } },
        inventoryReservations: {
          where: {
            status: "RESERVED",
            expiresAt: { gt: new Date() },
          },
          select: { quantity: true },
        },
      },
    });

    if (!variant) return 0;

    const totalStock = variant.inventoryTransactions.reduce(
      (sum: number, t: { quantity: number }) => sum + t.quantity,
      0
    );
    const reservedStock = variant.inventoryReservations.reduce(
      (sum: number, r: { quantity: number }) => sum + r.quantity,
      0
    );

    return totalStock - reservedStock;
  }

  /**
   * Attempt to atomically reserve inventory for an order.
   */
  static async reserveInventoryForOrder(orderId: string): Promise<void> {
    const ttlSeconds = env.INVENTORY_RESERVATION_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.$transaction(async (tx) => {
      // 1. Load the order and items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // 2. Map SKUs to Variant IDs
      const skus = order.items.map((item) => item.sku);
      const variants = await tx.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { id: true, sku: true },
      });

      const skuToVariantId = new Map(variants.map((v: { sku: string; id: string }) => [v.sku, v.id]));

      // 3. Lock variant rows to prevent concurrent oversell
      const variantIds = Array.from(skuToVariantId.values()).sort();
      for (const vId of variantIds) {
        // Postgres row-level lock
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${vId} FOR UPDATE`;
      }

      // 4. Clear any existing active reservations for this order (idempotency)
      await tx.inventoryReservation.updateMany({
        where: {
          orderId,
          status: "RESERVED",
        },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      // 5. Validate and reserve each item
      for (const item of order.items) {
        const variantId = skuToVariantId.get(item.sku);
        if (!variantId) {
          throw new Error(`Variant with SKU ${item.sku} not found`);
        }

        const available = await this.calculateAvailableQuantity(tx, variantId);

        if (available < item.quantity) {
          throw new InsufficientInventoryError(`Variant ${item.sku} has insufficient stock.`);
        }

        // Create the reservation
        await tx.inventoryReservation.create({
          data: {
            orderId: order.id,
            variantId: variantId,
            quantity: item.quantity,
            status: "RESERVED",
            expiresAt,
          },
        });
      }
    });
  }

  /**
   * Finalize the inventory when the order is paid (or confirmed for COD).
   * This consumes the reservation and creates a permanent inventory transaction.
   */
  static async consumeReservation(orderId: string, customTx?: Prisma.TransactionClient): Promise<void> {
    const run = async (tx: Prisma.TransactionClient) => {
      // 1. Find all active reservations for this order
      const reservations = await tx.inventoryReservation.findMany({
        where: {
          orderId,
          status: "RESERVED",
        },
      });

      if (reservations.length === 0) {
        return; // Nothing to consume or already consumed
      }

      const now = new Date();

      for (const res of reservations) {
        // 2. Mark reservation as COMMITTED
        await tx.inventoryReservation.update({
          where: { id: res.id },
          data: {
            status: "COMMITTED",
            committedAt: now,
          },
        });

        // 3. Create negative InventoryTransaction
        await tx.inventoryTransaction.create({
          data: {
            variantId: res.variantId,
            type: "SALE",
            quantity: -res.quantity,
            referenceId: orderId,
            notes: `Order ${orderId} fulfillment`,
          },
        });
      }
    };

    if (customTx) {
      await run(customTx);
    } else {
      await prisma.$transaction(run);
    }
  }

  /**
   * Release an inventory reservation (e.g. failed payment, cancelled order).
   */
  static async releaseReservation(orderId: string, customTx?: Prisma.TransactionClient): Promise<void> {
    const tx = customTx || prisma;
    await tx.inventoryReservation.updateMany({
      where: {
        orderId,
        status: "RESERVED",
      },
      data: {
        status: "RELEASED",
        releasedAt: new Date(),
      },
    });
  }
}
