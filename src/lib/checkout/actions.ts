"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { checkoutSchema } from "./validation";
import { getCart } from "@/lib/cart/queries";
import crypto from "crypto";

export async function createOrderAction(
  data: z.infer<typeof checkoutSchema>,
  idempotencyKey: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return { success: false, error: "Invalid checkout request." };
  }

  // Idempotency: Quick optimistic check before transaction
  const existingOrder = await prisma.order.findUnique({
    where: { checkoutIdempotencyKey: idempotencyKey },
  });
  if (existingOrder) {
    if (existingOrder.userId !== session.user.id) return { success: false, error: "Unauthorized." };
    return { success: true, orderNumber: existingOrder.orderNumber };
  }

  // Validate input server-side
  const parsed = checkoutSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid checkout information" };
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    paymentMethod,
  } = parsed.data;

  // Verify Cart
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty" };
  }

  // Validate cart inventory and pricing
  for (const item of cart.items) {
    if (!item.variant.available || item.quantity > item.availableQuantity) {
      return {
        success: false,
        error: "Some items no longer have enough stock. Please adjust your cart.",
      };
    }
  }

  // Idempotency check: see if an order with this idempotencyKey (or similar mechanism) exists.
  // Wait, Prisma doesn't have idempotencyKey natively on Order unless we add it.
  // Let's generate order number and use a transaction to verify stock precisely and create order.

  const orderNumber = `VL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    const orderResult = await prisma.$transaction(async (tx) => {
      // Re-fetch cart internally inside the tx for strict isolation
      const dbCart = await tx.cart.findUnique({
        where: { userId: session.user.id },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  inventoryTransactions: true,
                  inventoryReservations: {
                    where: {
                      expiresAt: { gt: new Date() },
                      status: "RESERVED",
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!dbCart || dbCart.items.length === 0) {
        throw new Error("Empty cart");
      }

      let orderSubtotal = 0;

      const orderItemsToCreate = dbCart.items.map((item) => {
        const variant = item.variant;
        if (variant.product.status !== "PUBLISHED") {
          throw new Error("Item unavailable");
        }

        // Re-calculate inventory strictly
        const totalTx = variant.inventoryTransactions.reduce((acc, tx) => acc + tx.quantity, 0);
        const totalRes = variant.inventoryReservations.reduce((acc, res) => acc + res.quantity, 0);
        const available = totalTx - totalRes;

        if (available < item.quantity) {
          throw new Error("Insufficient stock");
        }

        // Re-calculate prices strictly
        const sellingPrice = Number(variant.sellingPrice);
        const discountPrice = variant.discountPrice ? Number(variant.discountPrice) : null;
        const effectivePrice =
          discountPrice && discountPrice < sellingPrice ? discountPrice : sellingPrice;

        const lineTotal = effectivePrice * item.quantity;
        orderSubtotal += lineTotal;

        return {
          productName: variant.product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          quantity: item.quantity,
          unitPrice: effectivePrice,
          costPrice: variant.costPrice, // Historical reporting
          appliedDiscount: sellingPrice - effectivePrice,
          taxRate: 0, // No tax in phase 3
          taxIncluded: false,
          lineSubtotal: lineTotal,
          discountAmount: (sellingPrice - effectivePrice) * item.quantity,
          taxAmount: 0,
          lineTotal: lineTotal,
          variantId: variant.id,
          productId: variant.productId,
        };
      });

      // Fixed shipping rules (assuming 0 for phase 3, or we can make it a fixed 100 Taka)
      // The prompt didn't specify strict shipping business rules, setting 0.
      const shippingCost = 0;
      const total = orderSubtotal + shippingCost;

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          checkoutIdempotencyKey: idempotencyKey,
          orderNumber,
          userId: session.user.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: paymentMethod,
          salesChannel: "WEBSITE",
          customerName,
          customerEmail,
          customerPhone,
          shippingStreet,
          shippingCity,
          shippingState,
          shippingZip,
          shippingCountry,
          shippingMethodName: "Standard Delivery",
          subtotal: orderSubtotal,
          taxRate: 0,
          taxIncluded: false,
          shippingCost: shippingCost,
          taxAmount: 0,
          discount: 0,
          total: total,
          items: {
            create: orderItemsToCreate.map((item) => ({
              productName: item.productName,
              sku: item.sku,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              appliedDiscount: item.appliedDiscount,
              taxRate: item.taxRate,
              taxIncluded: item.taxIncluded,
              lineSubtotal: item.lineSubtotal,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      // Clear the Cart
      await tx.cartItem.deleteMany({
        where: { cartId: dbCart.id },
      });
      // Assuming we keep the cart instance alive but empty for the user.

      return newOrder;
    });

    const finalOrderNumber = orderResult.orderNumber;
    const finalOrderId = orderResult.id;

    // Phase 3H: Reserve Inventory for the created Order
    try {
      const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
      await inventoryService.reserveInventoryForOrder(finalOrderId);
    } catch (invError: unknown) {
      console.error("[Checkout] Inventory reservation failed:", invError);

      // Attempt to recover by cancelling the order so it doesn't stay PENDING indefinitely
      await prisma.order.update({
        where: { id: finalOrderId },
        data: { status: "CANCELLED" },
      });

      return {
        success: false,
        error:
          invError instanceof Error
            ? invError.message
            : "Some items are no longer available in the requested quantity.",
      };
    }

    if (paymentMethod === "ONLINE") {
      const orderRecord = await prisma.order.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (orderRecord) {
        const paymentService = (await import("@/lib/payment/service")).PaymentService;
        const service = new paymentService();

        const initiation = await service.initiatePayment(orderRecord, "SSLCOMMERZ");
        if (initiation.success && initiation.redirectUrl) {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            redirectUrl: initiation.redirectUrl,
          };
        } else {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            error: "Payment initiation failed. You can retry from your orders page.",
          };
        }
      }
    } else if (paymentMethod === "COD") {
      // Phase 3H: COD checkout immediately commits stock
      try {
        const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
        await inventoryService.consumeReservation(finalOrderId);
      } catch (err) {
        console.error("[Checkout] Failed to consume inventory for COD order:", err);
      }
    }

    return { success: true, orderNumber: finalOrderNumber };
  } catch (error: unknown) {
    // Check for Prisma's unique constraint violation error (P2002)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002" &&
      "meta" in error &&
      typeof (error as { meta: Record<string, unknown> }).meta === "object" &&
      (error as { meta: { target?: string[] } }).meta?.target?.includes("checkoutIdempotencyKey")
    ) {
      // Hit unique constraint -> race condition won -> order already exists
      const existingOrder = await prisma.order.findUnique({
        where: { checkoutIdempotencyKey: idempotencyKey },
      });
      if (existingOrder) {
        return { success: true, orderNumber: existingOrder.orderNumber };
      }
    }

    // Return safe message
    if (error instanceof Error) {
      if (error.message === "Empty cart") return { success: false, error: "Your cart is empty." };
      if (error.message === "Insufficient stock")
        return { success: false, error: "Some items no longer have enough stock." };
      if (error.message === "Item unavailable")
        return { success: false, error: "One or more items are no longer available." };
    }
    return { success: false, error: "An unexpected error occurred during order creation." };
  }
}
