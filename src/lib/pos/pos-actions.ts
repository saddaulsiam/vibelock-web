"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { InventoryService } from "@/lib/inventory/service";
import { getActiveShiftRecord } from "./pos-shift-actions";
import { revalidatePath } from "next/cache";
import {
  generatePosOrderNumber,
  isOrderNumberCollision,
  MAX_ORDER_NUMBER_COLLISION_RETRIES,
} from "@/lib/orders/order-number";
import type {
  PosActionResult,
  PosCreateOrderInput,
  PosReceiptData,
  PosReceiptItem,
  PosPaymentSplitDetail,
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

    let attempt = 0;
    let receipt: PosReceiptData | null = null;
    let candidateOrderNumber = "";

    while (attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
      attempt++;
      try {
        receipt = await prisma.$transaction(async (tx) => {
      // 3a. Enforce active register shift on server when auditLog delegate is available
      if (typeof tx.auditLog?.findFirst === "function") {
        const activeShift = await getActiveShiftRecord(tx, cashier.id);
        if (!activeShift) {
          throw new Error("No active register shift open. Please open a shift before checkout.");
        }
      }

      // 3b. Collect unique variant IDs and lock them in alphabetical order to avoid deadlocks
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

      // 7. Calculate discounts and totals with role-based cap
      const rawDiscount = Number(input.discount) || 0;
      if (!Number.isFinite(rawDiscount) || rawDiscount < 0) {
        throw new Error("Invalid discount amount.");
      }

      if (cashier.role === "STAFF" && subtotal > 0) {
        const maxStaffDiscount = Math.round(subtotal * 0.1 * 100) / 100;
        if (rawDiscount > maxStaffDiscount + 0.01) {
          throw new Error(
            `Staff discount cannot exceed 10% (৳${maxStaffDiscount.toFixed(2)}). Manager or Admin approval required.`
          );
        }
      }

      const discount = Math.min(subtotal, rawDiscount);
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      // Pro-rate order-level discount across order items so snapshots & returns stay consistent
      if (discount > 0 && subtotal > 0 && orderItemsData.length > 0) {
        let allocatedDiscount = 0;
        for (let idx = 0; idx < orderItemsData.length; idx++) {
          const item = orderItemsData[idx];
          const isLast = idx === orderItemsData.length - 1;
          const itemDiscount = isLast
            ? Math.round((discount - allocatedDiscount) * 100) / 100
            : Math.round(((item.lineSubtotal / subtotal) * discount) * 100) / 100;
          allocatedDiscount += itemDiscount;
          item.appliedDiscount = itemDiscount;
          item.discountAmount = itemDiscount;
          item.lineTotal = Math.max(0, Math.round((item.lineSubtotal - itemDiscount) * 100) / 100);
        }
      }

      // Support Split Payments (Multiple Tenders)
      const isSplit =
        input.paymentMethod === "SPLIT" ||
        (Array.isArray(input.splitPayments) && input.splitPayments.length > 0);

      let effectiveAmountPaid = Number(input.amountPaid);
      if (!Number.isFinite(effectiveAmountPaid)) {
        effectiveAmountPaid = 0;
      }
      let changeDue = 0;
      let receiptSplits: PosPaymentSplitDetail[] | undefined = undefined;

      if (isSplit) {
        if (!input.splitPayments || input.splitPayments.length === 0) {
          throw new Error("Split payment selected but no payment tenders were provided.");
        }

        for (const split of input.splitPayments) {
          const amt = Number(split.amount);
          if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error(`Invalid split payment amount for ${split.method}.`);
          }
          if (split.tenderAmount !== undefined) {
            const tender = Number(split.tenderAmount);
            if (!Number.isFinite(tender) || tender < amt) {
              throw new Error(
                `Tender amount (৳${Number.isFinite(tender) ? tender.toFixed(2) : "0.00"}) cannot be less than allocated amount (৳${amt.toFixed(2)}) for ${split.method}.`
              );
            }
          }
        }

        const totalSplitAllocated = input.splitPayments.reduce(
          (sum, s) => sum + Number(s.amount),
          0
        );
        if (totalSplitAllocated < total - 0.01) {
          throw new Error(
            `Total allocated across split payment methods (৳${totalSplitAllocated.toFixed(2)}) is less than total amount (৳${total.toFixed(2)}).`
          );
        }
        if (totalSplitAllocated > total + 0.01) {
          throw new Error(
            `Total allocated across split payment methods (৳${totalSplitAllocated.toFixed(2)}) exceeds total amount (৳${total.toFixed(2)}).`
          );
        }

        const cashSplits = input.splitPayments.filter((s) => s.method === "CASH");
        if (cashSplits.length > 1) {
          throw new Error("Only one CASH tender entry is allowed per split payment.");
        }

        // Calculate cash change if customer handed more than the cash portion
        const cashSplit = cashSplits[0];
        if (cashSplit) {
          const cashTender = Number(cashSplit.tenderAmount ?? cashSplit.amount);
          const cashPortion = Number(cashSplit.amount);
          changeDue = Math.max(0, Math.round((cashTender - cashPortion) * 100) / 100);
        }

        effectiveAmountPaid = input.splitPayments.reduce(
          (sum, s) => sum + Number(s.tenderAmount ?? s.amount),
          0
        );

        receiptSplits = input.splitPayments.map((s) => {
          const sTender = Number(s.tenderAmount ?? s.amount);
          const sAmount = Number(s.amount);
          return {
            method: s.method,
            amount: sAmount,
            tenderAmount: sTender,
            changeDue:
              s.method === "CASH" ? Math.max(0, Math.round((sTender - sAmount) * 100) / 100) : 0,
            reference: s.reference || undefined,
          };
        });
      } else {
        if (effectiveAmountPaid < total - 0.01) {
          throw new Error(
            `Amount paid (৳${effectiveAmountPaid.toFixed(2)}) is less than total amount (৳${total.toFixed(2)}).`
          );
        }
        changeDue = Math.max(0, Math.round((effectiveAmountPaid - total) * 100) / 100);
      }

      // 8. Generate order identifiers (with client-provided idempotency key when available)
      const trimmedClientKey = input.clientRequestId?.trim();
      const idempotencyKey = trimmedClientKey
        ? `pos-${trimmedClientKey}`
        : `pos-${crypto.randomBytes(12).toString("hex")}`;

      if (trimmedClientKey && typeof tx.order?.findUnique === "function") {
        const existingOrder = await tx.order.findUnique({
          where: { checkoutIdempotencyKey: idempotencyKey },
          select: { id: true, orderNumber: true },
        });
        if (existingOrder) {
          throw new Error(
            `Duplicate checkout request detected. Order ${existingOrder.orderNumber} was already completed.`
          );
        }
      }

      candidateOrderNumber = generatePosOrderNumber();

      const customerName = input.customerName?.trim() || "Walk-in Customer";
      const customerPhone = input.customerPhone?.trim() || "N/A";
      const customerEmail = input.customerEmail?.trim() || "pos-walkin@vibelock.com";

      // Determine order-level payment method: COD if any cash involved, otherwise ONLINE
      const orderPaymentMethod = isSplit
        ? input.splitPayments!.some((s) => s.method === "CASH")
          ? "COD"
          : "ONLINE"
        : input.paymentMethod === "CASH"
          ? "COD"
          : "ONLINE";

      // 9. Create Order
      const newOrder = await tx.order.create({
        data: {
          checkoutIdempotencyKey: idempotencyKey,
          orderNumber: candidateOrderNumber,
          userId: cashier.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: orderPaymentMethod,
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

      // 10. Record Payment(s)
      if (isSplit && input.splitPayments) {
        for (let i = 0; i < input.splitPayments.length; i++) {
          const split = input.splitPayments[i];
          const splitAmt = Number(split.amount);
          const splitTender = Number(split.tenderAmount ?? split.amount);
          const splitChange = split.method === "CASH" ? Math.max(0, splitTender - splitAmt) : 0;

          await tx.payment.create({
            data: {
              orderId: newOrder.id,
              amount: splitAmt,
              status: "SUCCESS",
              gateway: split.method,
              merchantReferenceId: `POS-${newOrder.id}-${split.method}-${i + 1}`,
              gatewayTransactionId:
                split.reference?.trim() ||
                (split.method === "CASH"
                  ? `CASH-${Date.now()}-${i + 1}`
                  : `POS-${split.method}-${Date.now()}-${i + 1}`),
              gatewayPayload: {
                tenderAmount: splitTender,
                changeReturned: splitChange,
                cashierId: cashier.id,
                cashierName: cashier.name || cashier.email,
                paymentMethod: split.method,
                reference: split.reference || null,
              },
            },
          });
        }
      } else {
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
                : input.notes?.trim() || `POS-${input.paymentMethod}-${Date.now()}`,
            gatewayPayload: {
              tenderAmount: effectiveAmountPaid,
              changeReturned: changeDue,
              cashierId: cashier.id,
              cashierName: cashier.name || cashier.email,
              paymentMethod: input.paymentMethod,
            },
          },
        });
      }

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
            amountPaid: effectiveAmountPaid,
            changeDue,
            isSplit,
            splitsCount: receiptSplits ? receiptSplits.length : 1,
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
        amountPaid: effectiveAmountPaid,
        changeDue,
        notes: input.notes?.trim() || null,
        splits: receiptSplits,
      };

      return receiptData;
    });
        break; // POS transaction succeeded
      } catch (txError) {
        if (isOrderNumberCollision(txError) && attempt < MAX_ORDER_NUMBER_COLLISION_RETRIES) {
          console.warn(
            `[POS] Order number collision on candidate "${candidateOrderNumber}". Retrying with fresh candidate (attempt ${attempt}/${MAX_ORDER_NUMBER_COLLISION_RETRIES})...`
          );
          continue;
        }
        throw txError;
      }
    }

    if (!receipt) {
      throw new Error("POS order creation failed after retries.");
    }

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
