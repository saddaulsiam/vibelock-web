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
  static async calculateAvailableQuantity(
    tx: Prisma.TransactionClient,
    variantId: string
  ): Promise<number> {
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
  static async reserveInventoryForOrder(
    orderId: string,
    customTx?: Prisma.TransactionClient
  ): Promise<void> {
    const ttlSeconds = env.INVENTORY_RESERVATION_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const run = async (tx: Prisma.TransactionClient) => {
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

      const skuToVariantId = new Map(
        variants.map((v: { sku: string; id: string }) => [v.sku, v.id])
      );

      // 3. Lock variant rows atomically to prevent concurrent oversell
      const variantIds = Array.from(skuToVariantId.values()).sort();
      if (variantIds.length > 0) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;
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

      // 5. Pre-load real-time stock under row lock for all required variants in a single batched query
      const lockedVariants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
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

      const variantStockMap = new Map<string, number>(
        lockedVariants.map((v) => {
          const totalStock = v.inventoryTransactions.reduce((sum, t) => sum + t.quantity, 0);
          const reservedStock = v.inventoryReservations.reduce((sum, r) => sum + r.quantity, 0);
          return [v.id, totalStock - reservedStock];
        })
      );

      // 6. Validate and reserve each item
      for (const item of order.items) {
        const variantId = skuToVariantId.get(item.sku);
        if (!variantId) {
          throw new Error(`Variant with SKU ${item.sku} not found`);
        }

        const available = variantStockMap.get(variantId) ?? 0;

        if (available < item.quantity) {
          throw new InsufficientInventoryError(`Variant ${item.sku} has insufficient stock.`);
        }

        // Deduct from in-memory pool for any subsequent items sharing this variant
        variantStockMap.set(variantId, available - item.quantity);

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
    };

    if (customTx) {
      await run(customTx);
    } else {
      await prisma.$transaction(run);
    }
  }

  /**
   * Finalize the inventory when the order is paid (or confirmed for COD).
   * This consumes the reservation and creates a permanent inventory transaction.
   */
  static async consumeReservation(
    orderId: string,
    customTx?: Prisma.TransactionClient
  ): Promise<void> {
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

      // 2. Mark reservations as COMMITTED in one batch
      await tx.inventoryReservation.updateMany({
        where: { id: { in: reservations.map((r) => r.id) } },
        data: {
          status: "COMMITTED",
          committedAt: now,
        },
      });

      // 3. Aggregate quantities per variant to respect @@unique([type, referenceId, variantId])
      const quantityByVariant = new Map<string, number>();
      for (const res of reservations) {
        quantityByVariant.set(
          res.variantId,
          (quantityByVariant.get(res.variantId) ?? 0) + res.quantity
        );
      }

      // 4. Create negative InventoryTransactions in one batch
      await tx.inventoryTransaction.createMany({
        data: Array.from(quantityByVariant.entries()).map(([variantId, qty]) => ({
          variantId,
          type: "SALE",
          quantity: -qty,
          referenceId: orderId,
          notes: `Order ${orderId} fulfillment`,
        })),
        skipDuplicates: true,
      });
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
  static async releaseReservation(
    orderId: string,
    customTx?: Prisma.TransactionClient
  ): Promise<void> {
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

  /**
   * Release reservations and restock committed inventory for a cancelled order.
   * Handles both unpaid reservations and already-committed SALE ledger entries.
   * Safe and idempotent.
   */
  static async cancelOrderInventory(
    orderId: string,
    customTx?: Prisma.TransactionClient
  ): Promise<void> {
    const run = async (tx: Prisma.TransactionClient) => {
      // 1. Release all active or committed reservations for this order
      await tx.inventoryReservation.updateMany({
        where: {
          orderId,
          status: { in: ["RESERVED", "COMMITTED"] },
        },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      // 2. Find any SALE transactions committed for this order
      const sales = await tx.inventoryTransaction.findMany({
        where: {
          referenceId: orderId,
          type: "SALE",
        },
      });

      if (sales.length === 0) {
        return;
      }

      // 3. Find any existing RESTOCK transactions for idempotency
      const existingRestocks = await tx.inventoryTransaction.findMany({
        where: {
          referenceId: orderId,
          type: "RESTOCK",
        },
      });

      const restockedVariantIds = new Set(existingRestocks.map((r) => r.variantId));

      // 4. Create compensating positive RESTOCK transaction for each variant not yet restocked
      for (const sale of sales) {
        if (restockedVariantIds.has(sale.variantId)) {
          continue;
        }

        await tx.inventoryTransaction.create({
          data: {
            variantId: sale.variantId,
            type: "RESTOCK",
            quantity: Math.abs(sale.quantity),
            salesChannel: sale.salesChannel,
            referenceId: orderId,
            notes: `Restock from cancelled order ${orderId}`,
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
}
