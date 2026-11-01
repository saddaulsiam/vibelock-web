"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { InventoryService } from "@/lib/inventory/service";
import { revalidatePath } from "next/cache";
import type {
  PosActionResult,
  PosCreateOrderInput,
  PosReceiptData,
  PosReceiptItem,
} from "./pos-types";

/**
 * Creates an in-store POS Order atomically:
 * - Checks stock under row lock via InventoryService.calculateAvailableQuantity
 * - Deducts physical inventory via SALE InventoryTransaction records
 * - Creates DELIVERED order + SUCCESS payment snapshot
 * - Returns structured receipt data for instant thermal print
 */
export async function createPosOrderAction(
  input: PosCreateOrderInput
): Promise<PosActionResult<PosReceiptData>> {
  try {
    // 1. Authorize cashier (Staff, Manager, or Admin)
    const cashier = await requireRole("STAFF", { throw: true });

    // 2. Validate input items
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "The cart is empty. Add products before checkout." };
    }

    for (const item of input.items) {
      if (!item.variantId || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return { success: false, error: "Invalid item quantity in cart." };
      }
    }

    const receipt = await prisma.$transaction(async (tx) => {
      // 3. Collect unique variant IDs and lock them in alphabetical order to avoid deadlocks
      const variantIds = Array.from(new Set(input.items.map((i) => i.variantId))).sort();
      if (variantIds.length > 0) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;
      }

      // 4. Fetch variant details
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            select: { id: true, name: true, status: true },
          },
        },
      });

      const variantMap = new Map(variants.map((v) => [v.id, v]));

      // 5. Verify availability and active product status
      for (const item of input.items) {
        const v = variantMap.get(item.variantId);
        if (!v) {
          throw new Error(`Product variant ${item.variantId} not found.`);
        }
        if (v.product.status !== "PUBLISHED") {
          throw new Error(`Product "${v.product.name}" is not active for sale.`);
        }

        const available = await InventoryService.calculateAvailableQuantity(tx, item.variantId);
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for "${v.product.name}" (${v.sku}). Available: ${available}, requested: ${item.quantity}.`
          );
        }
      }

      // 6. Build item financial snapshots
      let subtotal = 0;
      const orderItemsData = [];
      const receiptItems: PosReceiptItem[] = [];

      for (const item of input.items) {
        const v = variantMap.get(item.variantId)!;
        const sellingPrice = Number(v.sellingPrice);
        let discountPrice = v.discountPrice ? Number(v.discountPrice) : null;
        if (discountPrice !== null && discountPrice >= sellingPrice) {
          discountPrice = null;
        }
        const unitPrice = discountPrice !== null ? discountPrice : sellingPrice;
        const costPrice = Number(v.costPrice);
        const lineSubtotal = unitPrice * item.quantity;
        const lineTotal = lineSubtotal;

        subtotal += lineSubtotal;

        orderItemsData.push({
          productName: v.product.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          quantity: item.quantity,
          unitPrice,
          costPrice,
          appliedDiscount: 0,
          taxRate: 0,
          taxIncluded: false,
          lineSubtotal,
          discountAmount: 0,
          taxAmount: 0,
          lineTotal,
        });

        receiptItems.push({
          name: v.product.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }

      // 7. Calculate discounts and totals
      const discount = Math.min(subtotal, Math.max(0, Number(input.discount) || 0));
      const total = Math.max(0, subtotal - discount);
      const amountPaid = Number(input.amountPaid) || 0;

      if (amountPaid < total) {
        throw new Error(
          `Amount paid (৳${amountPaid.toFixed(2)}) is less than total amount (৳${total.toFixed(2)}).`
        );
      }

      const changeDue = Math.max(0, amountPaid - total);

      // 8. Generate order identifiers
      const orderNumber = `VL-POS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const idempotencyKey = `pos-${crypto.randomBytes(12).toString("hex")}`;

      const customerName = input.customerName?.trim() || "Walk-in Customer";
      const customerPhone = input.customerPhone?.trim() || "N/A";
      const customerEmail = input.customerEmail?.trim() || "pos-walkin@vibelock.com";

      // 9. Create Order
      const newOrder = await tx.order.create({
        data: {
          checkoutIdempotencyKey: idempotencyKey,
          orderNumber,
          userId: cashier.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: input.paymentMethod === "CASH" ? "COD" : "ONLINE",
          salesChannel: "POS",
          customerName,
          customerPhone,
          customerEmail,
          shippingStreet: "Physical Store Counter",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "In-Store Counter Pickup",
          shippingCost: 0,
          taxRate: 0,
          taxIncluded: false,
          taxAmount: 0,
          subtotal,
          discount,
          total,
          items: {
            create: orderItemsData,
          },
        },
      });

      // 10. Record Payment
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: total,
          status: "SUCCESS",
          gateway: input.paymentMethod,
          merchantReferenceId: `POS-${newOrder.id}`,
          gatewayTransactionId:
            input.paymentMethod === "CASH"
              ? `CASH-${Date.now()}`
              : (input.notes?.trim() || `POS-${input.paymentMethod}-${Date.now()}`),
          gatewayPayload: {
            tenderAmount: amountPaid,
            changeReturned: changeDue,
            cashierId: cashier.id,
            cashierName: cashier.name || cashier.email,
            paymentMethod: input.paymentMethod,
          },
        },
      });

      // 11. Deduct Inventory in real-time via InventoryTransaction records
      for (const item of input.items) {
        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            type: "SALE",
            quantity: -item.quantity,
            salesChannel: "POS",
            referenceId: newOrder.id,
            notes: `POS Counter Sale - ${newOrder.orderNumber}`,
          },
        });
      }

      // 12. Create Order History snapshot
      await tx.orderHistory.create({
        data: {
          orderId: newOrder.id,
          status: "DELIVERED",
          notes: `POS Counter checkout completed by ${cashier.name || cashier.email}. Method: ${input.paymentMethod}.`,
        },
      });

      // 13. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: cashier.id,
          action: "POS_ORDER_CREATED",
          entityType: "Order",
          entityId: newOrder.id,
          metadata: {
            orderNumber: newOrder.orderNumber,
            total,
            discount,
            paymentMethod: input.paymentMethod,
            amountPaid,
            changeDue,
          },
        },
      });

      const receiptData: PosReceiptData = {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        createdAt: newOrder.createdAt.toISOString(),
        cashierName: cashier.name || cashier.email || "Cashier",
        cashierEmail: cashier.email || "",
        customerName,
        customerPhone,
        items: receiptItems,
        subtotal,
        discount,
        total,
        paymentMethod: input.paymentMethod,
        amountPaid,
        changeDue,
        notes: input.notes?.trim() || null,
      };

      return receiptData;
    });

    // 14. Invalidate related caches
    revalidatePath("/pos");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/reports");

    return { success: true, data: receipt };
  } catch (error: unknown) {
    console.error("POS Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during POS checkout.";
    return {
      success: false,
      error: message,
    };
  }
}
