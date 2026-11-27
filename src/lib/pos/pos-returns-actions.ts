"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { ReturnService } from "@/lib/returns/service";
import { InventoryService } from "@/lib/inventory/service";
import { getActiveShiftRecord, getCurrentShiftAction } from "./pos-shift-actions";
import { revalidatePath } from "next/cache";
import type {
  PosOrderLookupResult,
  PosProcessReturnInput,
  PosReturnReceiptData,
  PosReturnableItem,
} from "./pos-returns-types";
import type { PosActionResult } from "./pos-types";

/**
 * Searches for an order by orderNumber to process in-store returns or exchanges.
 */
export async function lookupPosOrderForReturnAction(
  orderNumberInput: string
): Promise<PosActionResult<PosOrderLookupResult>> {
  try {
    await requireRole("STAFF", { throw: true });

    const cleaned = orderNumberInput.trim().toUpperCase();
    if (!cleaned) {
      return { success: false, error: "Please enter a valid invoice or order number." };
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: { equals: cleaned, mode: "insensitive" },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: `No order found with invoice number "${cleaned}".` };
    }

    if (order.status !== "DELIVERED") {
      return {
        success: false,
        error: `Order #${order.orderNumber} is marked as ${order.status}. Only DELIVERED orders can be returned or exchanged.`,
      };
    }

    // Get returnable quantities for each item
    const returnService = new ReturnService();
    const returnableMap = await returnService.getReturnableQuantities(order.id);

    const items: PosReturnableItem[] = order.items.map((item) => {
      const returnableQty = returnableMap[item.id] ?? 0;
      return {
        orderItemId: item.id,
        productName: item.productName,
        sku: item.sku,
        size: item.size,
        color: item.color,
        unitPrice: Number(item.unitPrice),
        originalQuantity: item.quantity,
        returnableQuantity: returnableQty,
      };
    });

    const totalReturnableUnits = items.reduce((sum, i) => sum + i.returnableQuantity, 0);
    if (totalReturnableUnits <= 0) {
      return {
        success: false,
        error: `All items in order #${order.orderNumber} have already been returned or exchanged.`,
      };
    }

    const daysElapsed = Math.floor(
      (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isReturnablePeriodValid = daysElapsed <= 7;

    const result: PosOrderLookupResult = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName || "Walk-in Customer",
      customerPhone: order.customerPhone || "N/A",
      salesChannel: order.salesChannel,
      total: Number(order.total),
      items,
      daysElapsed,
      isReturnablePeriodValid,
    };

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Error looking up order for POS return:", error);
    const msg = error instanceof Error ? error.message : "Failed to lookup order";
    return { success: false, error: msg };
  }
}

/**
 * Atomically processes an in-store return or product exchange:
 * - Restocks returned items (if resellable) via ReturnService
 * - Deducts inventory for replacement items (if exchange)
 * - Adjusts shift drawer if cash is refunded
 * - Returns structured thermal return receipt memo
 */
export async function processPosReturnAction(
  input: PosProcessReturnInput
): Promise<PosActionResult<PosReturnReceiptData>> {
  try {
    const cashier = await requireRole("STAFF", { throw: true });

    if (!input.returnedItems || input.returnedItems.length === 0) {
      return { success: false, error: "Please select at least one item to return." };
    }

    const receipt = await prisma.$transaction(async (tx) => {
      // 1. Lock and load Order
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.createdAt instanceof Date) {
        const daysElapsed = Math.floor(
          (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysElapsed > 7 && cashier.role === "STAFF") {
          throw new Error(
            `Return window (7 days) has expired (${daysElapsed} days ago). Manager or Admin approval is required.`
          );
        }
      }

      // Compute effective paid ratio so order-level discounts are pro-rated on refunds
      const orderSubtotal = Number(order.subtotal) || 0;
      const orderTotal = Number(order.total) || 0;
      const paidRatio =
        orderSubtotal > 0 && orderTotal >= 0 && orderTotal < orderSubtotal
          ? orderTotal / orderSubtotal
          : 1;

      // 2. Validate returnable quantities
      const returnService = new ReturnService();
      const returnableMap = await returnService.getReturnableQuantities(order.id, tx);
      const orderItemMap = new Map(order.items.map((i) => [i.id, i]));

      let totalReturnValue = 0;
      const returnedItemsReceipt = [];

      for (const retItem of input.returnedItems) {
        const itemSnapshot = orderItemMap.get(retItem.orderItemId);
        if (!itemSnapshot) {
          throw new Error(`Order item ${retItem.orderItemId} does not belong to this order.`);
        }

        const maxReturnable = returnableMap[retItem.orderItemId] ?? 0;
        if (retItem.quantity <= 0 || !Number.isInteger(retItem.quantity) || retItem.quantity > maxReturnable) {
          throw new Error(
            `Invalid return quantity (${retItem.quantity}) for ${itemSnapshot.sku}. Max allowed: ${maxReturnable}.`
          );
        }

        const rawUnitPrice = Number(itemSnapshot.unitPrice);
        const snapshotLineTotal =
          itemSnapshot.lineTotal !== undefined && itemSnapshot.lineTotal !== null
            ? Number(itemSnapshot.lineTotal)
            : rawUnitPrice * itemSnapshot.quantity;
        const hasItemLevelDiscount =
          snapshotLineTotal < rawUnitPrice * itemSnapshot.quantity - 0.01;
        const effectiveUnitPrice = hasItemLevelDiscount
          ? Math.round((snapshotLineTotal / itemSnapshot.quantity) * 100) / 100
          : Math.round(rawUnitPrice * paidRatio * 100) / 100;
        const lineTotal = Math.round(effectiveUnitPrice * retItem.quantity * 100) / 100;
        totalReturnValue = Math.round((totalReturnValue + lineTotal) * 100) / 100;

        returnedItemsReceipt.push({
          name: itemSnapshot.productName,
          sku: itemSnapshot.sku,
          size: itemSnapshot.size,
          color: itemSnapshot.color,
          unitPrice: effectiveUnitPrice,
          quantity: retItem.quantity,
          condition: retItem.condition,
          lineTotal,
        });
      }

      // 3. Process exchange replacements (if any) using DB-authoritative pricing
      let totalExchangeValue = 0;
      const exchangeItemsReceipt = [];

      if (
        input.resolution === "EXCHANGE" &&
        input.exchangeItems &&
        input.exchangeItems.length > 0
      ) {
        const variantIds = Array.from(new Set(input.exchangeItems.map((i) => i.variantId))).sort();
        if (variantIds.length > 0) {
          await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;
        }

        const dbVariants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: { select: { name: true, status: true } },
          },
        });
        const dbVariantMap = new Map(dbVariants.map((v) => [v.id, v]));

        for (const rep of input.exchangeItems) {
          if (!rep.quantity || rep.quantity <= 0 || !Number.isInteger(rep.quantity)) {
            throw new Error(`Invalid replacement quantity for ${rep.sku}.`);
          }

          const dbVar = dbVariantMap.get(rep.variantId);
          if (!dbVar) {
            throw new Error(`Replacement product variant ${rep.variantId} not found.`);
          }
          if (dbVar.product.status !== "PUBLISHED") {
            throw new Error(`Replacement product "${dbVar.product.name}" is not active for sale.`);
          }

          const available = await InventoryService.calculateAvailableQuantity(tx, rep.variantId);
          if (available < rep.quantity) {
            throw new Error(
              `Insufficient stock for replacement "${dbVar.product.name}" (${dbVar.sku}). Available: ${available}, needed: ${rep.quantity}.`
            );
          }

          const sellingPrice = Number(dbVar.sellingPrice);
          const discountPrice = dbVar.discountPrice ? Number(dbVar.discountPrice) : null;
          const authoritativeUnitPrice =
            discountPrice !== null && discountPrice < sellingPrice ? discountPrice : sellingPrice;
          const lineTotal = Math.round(authoritativeUnitPrice * rep.quantity * 100) / 100;
          totalExchangeValue = Math.round((totalExchangeValue + lineTotal) * 100) / 100;

          exchangeItemsReceipt.push({
            name: dbVar.product.name,
            sku: dbVar.sku,
            size: dbVar.size,
            color: dbVar.color,
            unitPrice: authoritativeUnitPrice,
            quantity: rep.quantity,
            lineTotal,
          });
        }
      }

      // 4. Calculate Net Balance
      const netDifference = totalExchangeValue - totalReturnValue;
      let netAction: "REFUND_TO_CUSTOMER" | "CHARGE_CUSTOMER" | "EVEN_EXCHANGE" = "EVEN_EXCHANGE";
      if (netDifference > 0) {
        netAction = "CHARGE_CUSTOMER";
      } else if (netDifference < 0) {
        netAction = "REFUND_TO_CUSTOMER";
      }

      // 5. Create ReturnRequest record
      const returnRequest = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: "COMPLETED",
          reason: input.notes?.trim() || "In-store POS counter return/exchange",
          items: {
            create: input.returnedItems.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // 6. Map grading and execute inventory restock
      const gradingMap: Record<string, "RESELLABLE" | "DAMAGED"> = {};
      for (const createdItem of returnRequest.items) {
        const match = input.returnedItems.find((i) => i.orderItemId === createdItem.orderItemId);
        gradingMap[createdItem.id] = match?.condition === "DAMAGED" ? "DAMAGED" : "RESELLABLE";
      }

      await returnService.processReturnRestock(returnRequest.id, tx, gradingMap);

      // 7. Deduct inventory for exchange replacements
      if (input.resolution === "EXCHANGE" && input.exchangeItems) {
        for (const rep of input.exchangeItems) {
          await tx.inventoryTransaction.create({
            data: {
              variantId: rep.variantId,
              type: "SALE",
              quantity: -rep.quantity,
              salesChannel: "POS",
              referenceId: returnRequest.id,
              notes: `POS Exchange replacement - Return Memo #${returnRequest.id.slice(0, 8)}`,
            },
          });
        }
      }

      const returnMemoNumber = `VL-RET-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

      // 8. Log Audit History
      await tx.auditLog.create({
        data: {
          actorId: cashier.id,
          action: "POS_RETURN_COMPLETED",
          entityType: "ReturnRequest",
          entityId: returnRequest.id,
          metadata: {
            returnMemoNumber,
            originalOrderNumber: order.orderNumber,
            totalReturnValue,
            totalExchangeValue,
            netDifference,
            netAction,
            resolution: input.resolution,
            cashierName: cashier.name || cashier.email,
          },
        },
      });

      // 9. Record Payment for Exchange Charge OR Cash Drop for Refund
      const chargeAmount = netAction === "CHARGE_CUSTOMER" ? Math.round(netDifference * 100) / 100 : 0;
      if (chargeAmount > 0 && typeof tx.payment?.create === "function") {
        const exchangeMethod = input.exchangePaymentMethod || "CASH";
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: chargeAmount,
            status: "SUCCESS",
            gateway: exchangeMethod,
            merchantReferenceId: `POS-EXCH-${returnRequest.id}`,
            gatewayTransactionId: `${exchangeMethod}-EXCH-${Date.now()}`,
            gatewayPayload: {
              returnMemoNumber,
              cashierId: cashier.id,
              cashierName: cashier.name || cashier.email,
              paymentMethod: exchangeMethod,
              exchangeCharge: true,
            },
          },
        });
      }

      const refundAmount = netAction === "REFUND_TO_CUSTOMER" ? Math.abs(netDifference) : 0;
      if (refundAmount > 0) {
        let activeShiftId: string | null = null;
        if (typeof tx.auditLog?.findFirst === "function") {
          const activeShift = await getActiveShiftRecord(tx, cashier.id);
          activeShiftId = activeShift?.entityId ?? null;
        } else {
          const shiftRes = await getCurrentShiftAction();
          activeShiftId = shiftRes.success && shiftRes.data?.isOpen ? shiftRes.data.shiftId : null;
        }

        if (activeShiftId) {
          await tx.auditLog.create({
            data: {
              actorId: cashier.id,
              action: "CASH_DROP",
              entityType: "PosRegisterShift",
              entityId: activeShiftId,
              metadata: {
                amount: refundAmount,
                reason: `POS Return Cash Refund - Memo ${returnMemoNumber} (Order ${order.orderNumber})`,
                recordedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      const receiptData: PosReturnReceiptData = {
        returnMemoNumber,
        originalOrderNumber: order.orderNumber,
        createdAt: new Date().toISOString(),
        cashierName: cashier.name || cashier.email || "Cashier",
        customerName: order.customerName || "Walk-in Customer",
        customerPhone: order.customerPhone || "N/A",
        returnedItems: returnedItemsReceipt,
        exchangeItems: exchangeItemsReceipt,
        totalReturnValue,
        totalExchangeValue,
        netDifference,
        netAction,
        notes: input.notes?.trim() || null,
      };

      return receiptData;
    });

    revalidatePath("/pos");
    revalidatePath("/admin/returns");
    revalidatePath("/admin/inventory");

    return { success: true, data: receipt };
  } catch (error: unknown) {
    console.error("Error processing POS return:", error);
    const msg = error instanceof Error ? error.message : "Failed to process return";
    return { success: false, error: msg };
  }
}
