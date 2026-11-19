"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";
import type { OrderSummary } from "./types";

export async function getCustomerOrdersAction(
  page: number,
  pageSize = 10
): Promise<{ orders: OrderSummary[]; total: number; hasMore: boolean }> {
  const { getCustomerOrders } = await import("./queries");
  const result = await getCustomerOrders(page, pageSize);
  return {
    orders: result.orders,
    total: result.total,
    hasMore: page * pageSize < result.total,
  };
}

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
        include: {
          inventoryReservations: true,
          shipment: true,
          payments: { select: { status: true, createdAt: true } },
        },
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
        order.paymentStatus === "PARTIALLY_REFUNDED" ||
        order.payments?.some((p) =>
          ["SUCCESS", "REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status)
        )
      ) {
        return {
          success: false as const,
          error: "Paid orders cannot be cancelled online at this time.",
        };
      }
      // FINANCIAL SAFEGUARD: Block customer cancellation while ANY online payment attempt is unresolved (INITIATED or PENDING)
      const hasUnresolvedOnlinePayment =
        order.paymentMethod === "ONLINE" &&
        Boolean(
          order.payments?.some(
            (p) => p.status === "INITIATED" || p.status === "PENDING"
          )
        );

      if (hasUnresolvedOnlinePayment) {
        return {
          success: false as const,
          error:
            "A payment attempt for this order is currently unresolved. To protect your account from duplicate charges, the order cannot be cancelled until payment status is confirmed by the gateway.",
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
      const { releaseOrderCoupon } = await import("@/lib/checkout/coupons");
      await releaseOrderCoupon(order.id, tx);
      return { success: true as const, message: "Order successfully cancelled." };
    });

    if (!result.success) return result;
    if (result.message === "Order is already cancelled.") return result;

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderNumber}`);
    revalidatePath(`/order-success/${orderNumber}`);

    return result;
  } catch (error) {
    console.error("[cancelOrderAction] Error:", error);
    return { success: false, error: "Failed to cancel the order. Please try again later." };
  }
}

export async function reorderItemsAction(orderNumber: string): Promise<{
  success: boolean;
  addedCount?: number;
  message?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber, userId: session.user.id },
      include: { items: true },
    });

    if (!order || order.items.length === 0) {
      return { success: false, error: "Order not found or has no items." };
    }

    const { addToCart } = await import("@/lib/cart/mutations");
    const skus = order.items.map((i) => i.sku).filter(Boolean);

    const variants = await prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      select: { id: true, sku: true },
    });

    const variantBySku = new Map(variants.map((v) => [v.sku, v.id]));
    let addedCount = 0;

    for (const item of order.items) {
      const variantId = variantBySku.get(item.sku);
      if (variantId) {
        try {
          await addToCart(variantId, item.quantity);
          addedCount += item.quantity;
        } catch (itemErr) {
          console.warn(`[reorderItemsAction] Could not add item SKU ${item.sku}:`, itemErr);
        }
      }
    }

    revalidatePath("/cart");
    return {
      success: true,
      addedCount,
      message: `Added ${addedCount} items to your cart.`,
    };
  } catch (error) {
    console.error("[reorderItemsAction] Error:", error);
    return { success: false, error: "Failed to reorder items. Please try again." };
  }
}

export async function retryOrderPaymentAction(
  orderNumber: string,
  requestedGateway?: string
): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  // Validate gateway if provided
  let gateway: string | undefined = requestedGateway;
  if (gateway) {
    const normalized = gateway.toUpperCase();
    if (!["SSLCOMMERZ", "BKASH", "NAGAD"].includes(normalized)) {
      return { success: false, error: "Unsupported payment gateway selected." };
    }
    gateway = normalized;
  }

  try {
    const { getIp } = await import("@/lib/security/rate-limit");
    const clientIp = (await getIp()) ?? undefined;

    // Check payment initiation rate limit upfront
    try {
      const { checkPaymentInitiationRateLimit } = await import("@/lib/security/rate-limit");
      await checkPaymentInitiationRateLimit(userId, clientIp);
    } catch (rateLimitErr: unknown) {
      if (rateLimitErr instanceof Error && rateLimitErr.message === "RATE_LIMIT_EXCEEDED") {
        return {
          success: false,
          error: "Payment initiation rate limit exceeded. Please wait a few minutes before retrying.",
        };
      }
      throw rateLimitErr;
    }

    // Step 1: Verify order eligibility and reservation inside a transaction with row lock
    const verification = await prisma.$transaction(async (tx) => {
      const orderIdentity = await tx.order.findUnique({
        where: { orderNumber, userId },
        select: { id: true },
      });
      if (!orderIdentity) {
        return { success: false as const, error: "Order not found or access denied." };
      }

      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderIdentity.id} FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: orderIdentity.id },
        include: {
          inventoryReservations: {
            where: {
              status: "RESERVED",
              expiresAt: { gt: new Date() },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!order) {
        return { success: false as const, error: "Order not found or access denied." };
      }

      if (order.status === "CANCELLED" || order.paymentStatus === "CANCELLED") {
        return { success: false as const, error: "This order has been cancelled and cannot be paid." };
      }

      if (
        order.paymentStatus === "SUCCESS" ||
        order.payments?.some((p) => p.status === "SUCCESS")
      ) {
        return { success: false as const, error: "Order is already paid." };
      }

      if (order.status !== "PENDING") {
        return { success: false as const, error: "Only pending orders can be retried." };
      }

      if (order.paymentMethod !== "ONLINE") {
        return { success: false as const, error: "Only online orders can be retried." };
      }

      // FINANCIAL SAFEGUARD: Block retry while ANY online payment attempt remains unresolved (INITIATED or PENDING)
      const hasUnresolvedPayment = order.payments?.some(
        (p) => p.status === "INITIATED" || p.status === "PENDING"
      );

      if (hasUnresolvedPayment) {
        return {
          success: false as const,
          error:
            "A previous payment attempt is currently unresolved. To prevent duplicate charges, a new payment attempt cannot be created until the previous attempt is confirmed by the gateway.",
        };
      }

      // Check active unexpired stock reservation
      if (!order.inventoryReservations || order.inventoryReservations.length === 0) {
        return {
          success: false as const,
          error:
            "Your reservation for this order has expired. Items have been released back to stock. Please create a new order.",
        };
      }

      // Determine target gateway: use requestedGateway or order's previous gateway or default to SSLCOMMERZ
      const targetGateway =
        gateway ||
        order.payments?.[0]?.gateway ||
        "SSLCOMMERZ";

      return {
        success: true as const,
        order,
        gateway: targetGateway,
      };
    });

    if (!verification.success) {
      return { success: false, error: verification.error };
    }

    // Step 2: Delegate initiation to PaymentService (which safely enforces initiation locks and calls provider outside tx)
    const { PaymentService } = await import("@/lib/payment/service");
    const paymentService = new PaymentService();

    const initiationResult = await paymentService.initiatePayment(
      verification.order,
      verification.gateway,
      { clientIp, skipRateLimit: true } // Rate limit was already evaluated above
    );

    if (!initiationResult.success || !initiationResult.redirectUrl) {
      return {
        success: false,
        error: initiationResult.error || "Failed to initialize payment gateway session. Please try again.",
      };
    }

    revalidatePath(`/order-success/${orderNumber}`);
    revalidatePath(`/account/orders/${orderNumber}`);

    return {
      success: true,
      redirectUrl: initiationResult.redirectUrl,
    };
  } catch (error) {
    console.error("[retryOrderPaymentAction] Failed to retry payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while initiating payment retry.",
    };
  }
}
