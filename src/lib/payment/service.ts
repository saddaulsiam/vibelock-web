import prisma from "@/lib/prisma/client";
import { PaymentInitiationResponse, PaymentProvider } from "./types";
import { SSLCommerzProvider } from "./providers/sslcommerz/client";
import { BkashProvider } from "./providers/bkash/client";
import { Order, PaymentStatus, Prisma } from "@prisma/client";
import { isSSLCommerzGateway, isBkashGateway, normalizePaymentGateway } from "./constants";

export class PaymentService {
  private getProvider(gateway: string): PaymentProvider {
    if (isSSLCommerzGateway(gateway)) {
      return new SSLCommerzProvider();
    }
    if (isBkashGateway(gateway)) {
      return new BkashProvider();
    }
    throw new Error(`Unsupported payment gateway: ${gateway}`);
  }

  async initiatePayment(order: Order, gateway: string): Promise<PaymentInitiationResponse> {
    const provider = this.getProvider(gateway);

    const request = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      customerName: order.customerName || "Customer",
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone || "00000000000",
      shippingStreet: order.shippingStreet,
      shippingCity: order.shippingCity,
      shippingZip: order.shippingZip || "1000",
      shippingCountry: order.shippingCountry,
    };

    const response = await provider.initiatePayment(request);

    if (response.success && response.merchantReferenceId) {
      // Create Payment record in INITIATED state
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: request.amount,
          status: "INITIATED",
          gateway: normalizePaymentGateway(gateway),
          merchantReferenceId: response.merchantReferenceId,
        },
      });

      // We don't update Order.paymentStatus yet, it stays PENDING until actual payment is successful
    }

    return response;
  }

  async verifyCallback(
    gateway: string,
    payload: Record<string, unknown>
  ): Promise<{ orderNumber: string; verification: Awaited<ReturnType<PaymentProvider["verifyPayment"]>> }> {
    const provider = this.getProvider(gateway);

    // Extract merchant reference ID:
    // SSLCommerz uses 'tran_id', bKash uses 'paymentID'
    const merchantReferenceId =
      (typeof payload.tran_id === "string" && payload.tran_id.trim() ? payload.tran_id.trim() : undefined) ??
      (typeof payload.paymentID === "string" && payload.paymentID.trim() ? payload.paymentID.trim() : undefined) ??
      (typeof payload.paymentId === "string" && payload.paymentId.trim() ? payload.paymentId.trim() : undefined);

    if (!merchantReferenceId) {
      console.error("[PaymentService] Missing transaction reference in callback");
      throw new Error("Missing transaction reference");
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { merchantReferenceId },
    });

    if (!payment) {
      console.error(`[PaymentService] Payment not found for tran_id: ${merchantReferenceId}`);
      throw new Error("Payment record not found");
    }

    // A successful payment is terminal. Do not make a duplicate provider request.
    if (payment.status === "SUCCESS") {
      console.log(
        `[PaymentService] Payment ${merchantReferenceId} already verified successful. Ignoring callback.`
      );
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { orderNumber: true },
      });
      if (!order) throw new Error("Order not found");
      return {
        orderNumber: order.orderNumber,
        verification: { success: true, status: "SUCCESS" },
      };
    }

    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      const incomingStatus = typeof payload.status === "string" ? payload.status.toUpperCase() : "";
      const isIncomingNonSuccess =
        (!payload.val_id && !payload.paymentID && !payload.paymentId) ||
        incomingStatus === "FAILED" ||
        incomingStatus === "FAIL" ||
        incomingStatus === "CANCELLED" ||
        incomingStatus === "CANCEL" ||
        incomingStatus === "UNATTEMPTED";

      if (isIncomingNonSuccess) {
        console.log(
          `[PaymentService] Payment ${merchantReferenceId} is already terminal (${payment.status}). Ignoring duplicate non-success callback.`
        );
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { orderNumber: true },
        });
        if (!order) throw new Error("Order not found");
        return {
          orderNumber: order.orderNumber,
          verification: {
            success: true,
            status: payment.status,
            verifiedMerchantReferenceId: merchantReferenceId,
            rawPayload: payload,
          },
        };
      }
    }

    // Verify
    const verification = await provider.verifyPayment(payload);

    // Safeguard 1: Never mark payment FAILED/CANCELLED or release inventory based on an unverified browser callback!
    // Keep payment INITIATED and reservations unchanged until trusted reconciliation.
    if (verification.isUnverified) {
      console.warn(
        `[PaymentService] Unverified ${verification.status} callback received for ${merchantReferenceId}. ` +
        `Preserving INITIATED status and keeping reservations unchanged until trusted reconciliation.`
      );
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { orderNumber: true },
      });
      if (!order) throw new Error("Order not found");
      return {
        orderNumber: order.orderNumber,
        verification: {
          success: false,
          status: verification.status,
          isUnverified: true,
          verifiedMerchantReferenceId: merchantReferenceId,
          rawPayload: payload,
        },
      };
    }

    // Ensure any verified merchant reference matches our record
    if (
      verification.verifiedMerchantReferenceId &&
      verification.verifiedMerchantReferenceId !== merchantReferenceId
    ) {
      throw new Error("Payment verification failed: Transaction or Currency Mismatch");
    }

    // If verification was successful but the verified amount does not match, log error and fail securely.
    if (verification.success && verification.status === "SUCCESS") {
      if (
        verification.verifiedMerchantReferenceId !== merchantReferenceId ||
        verification.verifiedCurrency !== "BDT"
      ) {
        throw new Error("Payment verification failed: Transaction or Currency Mismatch");
      }

      // Ensure any verified order reference matches our order record
      if (verification.verifiedOrderNumber) {
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { orderNumber: true },
        });
        if (order && verification.verifiedOrderNumber !== order.orderNumber) {
          console.error(
            `[PaymentService] Order reference mismatch for ${merchantReferenceId}. ` +
            `Expected ${order.orderNumber}, got ${verification.verifiedOrderNumber}`
          );
          throw new Error("Payment verification failed: Order reference mismatch");
        }
      }

      if (
        verification.verifiedAmount === undefined ||
        Math.abs(verification.verifiedAmount - Number(payment.amount)) > 0.01
      ) {
        console.error(
          `[PaymentService] Amount mismatch for ${merchantReferenceId}. Expected ${payment.amount}, got ${verification.verifiedAmount}`
        );

        const safePayload = { ...(verification.rawPayload as object) } as Record<string, unknown>;
        delete safePayload.store_passwd;
        delete safePayload.store_id;
        delete safePayload.password;
        delete safePayload.app_secret;
        delete safePayload.app_key;
        delete safePayload.id_token;
        delete safePayload.refreshToken;
        delete safePayload.token;

        await prisma.payment.updateMany({
          where: { id: payment.id, status: { not: "SUCCESS" } },
          data: {
            status: "FAILED",
            gatewayPayload: safePayload as Prisma.InputJsonValue,
            gatewayTransactionId: verification.providerTransactionId,
          },
        });
        throw new Error("Payment verification failed: Amount Mismatch");
      }
    }

    if (!verification.success) {
      throw new Error("Payment verification failed");
    }

    // Wrap the final update in a transaction
    await prisma.$transaction(async (tx) => {
      // Clean payload
      const safePayload = { ...(verification.rawPayload as object) } as Record<string, unknown>;
      delete safePayload.store_passwd;
      delete safePayload.store_id;
      delete safePayload.password;
      delete safePayload.app_secret;
      delete safePayload.app_key;
      delete safePayload.id_token;
      delete safePayload.refreshToken;
      delete safePayload.token;

      // 1. Atomic update of Payment:
      // For SUCCESS: allow transitioning from INITIATED, FAILED, or CANCELLED (Late SUCCESS recovery path).
      // For FAILED/CANCELLED (server verified): only transition from INITIATED.
      const whereCondition: Prisma.PaymentWhereInput =
        verification.status === "SUCCESS"
          ? { id: payment.id, status: { in: [PaymentStatus.INITIATED, PaymentStatus.FAILED, PaymentStatus.CANCELLED] } }
          : { id: payment.id, status: PaymentStatus.INITIATED };

      const updateResult = await tx.payment.updateMany({
        where: whereCondition,
        data: {
          status: verification.status as PaymentStatus,
          gatewayPayload: safePayload as Prisma.InputJsonValue,
          gatewayTransactionId: verification.providerTransactionId,
        },
      });

      // If no records updated, payment was already transitioned to terminal status by another process
      if (updateResult.count === 0) {
        console.log(
          `[PaymentService] Payment ${merchantReferenceId} was already updated by another concurrent process.`
        );
        return;
      }

      // 2. Update Order status
      if (verification.status === "SUCCESS") {
        await tx.order.updateMany({
          where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
          data: { paymentStatus: "SUCCESS" },
        });

        // Load order and items for inventory processing
        const orderWithItems = await tx.order.findUnique({
          where: { id: payment.orderId },
          include: { items: true },
        });

        if (orderWithItems && orderWithItems.items.length > 0) {
          const skus = orderWithItems.items.map((i) => i.sku);
          const variants = await tx.productVariant.findMany({
            where: { sku: { in: skus } },
            select: { id: true, sku: true },
          });
          const skuToVariant = new Map(variants.map((v) => [v.sku, v.id]));
          const variantIds = Array.from(skuToVariant.values()).sort();

          // Concurrency lock: row-lock variants to serialize against concurrent checkout or stock mutations
          if (variantIds.length > 0) {
            await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;
          }

          // Safe, transactionally consistent inventory reconciliation without duplicate consumption:
          // Check if SALE transactions already exist for this order
          const existingSales = await tx.inventoryTransaction.findMany({
            where: { referenceId: payment.orderId, type: "SALE" },
          });

          if (existingSales.length === 0) {
            // Check for active unexpired reservations (status RESERVED and expiresAt in future)
            const activeUnexpiredReservations = await tx.inventoryReservation.findMany({
              where: {
                orderId: payment.orderId,
                status: "RESERVED",
                expiresAt: { gt: new Date() },
              },
            });

            if (activeUnexpiredReservations.length > 0) {
              // Unexpired reservation still safely held: consume it
              const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
              await inventoryService.consumeReservation(payment.orderId, tx);
            } else {
              // Reservation either released or expired (late recovery path).
              // Under row lock, verify real-time available stock
              const inventoryService = (await import("@/lib/inventory/service")).InventoryService;

              let hasOversell = false;
              for (const item of orderWithItems.items) {
                const variantId = skuToVariant.get(item.sku);
                if (variantId) {
                  const available = await inventoryService.calculateAvailableQuantity(tx, variantId);
                  if (available < item.quantity) {
                    hasOversell = true;
                    console.error(
                      `[PaymentService] Late payment oversell risk for order ${payment.orderId}, variant ${variantId}. ` +
                      `Available: ${available}, needed: ${item.quantity}`
                    );
                    break;
                  }
                }
              }

              if (hasOversell) {
                // Do NOT silently oversell. Record inconsistency and flag order for manual review.
                await tx.order.update({
                  where: { id: payment.orderId },
                  data: {
                    status: "PENDING",
                  },
                });
                await tx.orderHistory.create({
                  data: {
                    orderId: payment.orderId,
                    status: "PENDING",
                    notes: `[OVERSELL RISK] Payment succeeded after prior cancellation or reservation expiry, but stock was insufficient. Flagged for manual review.`,
                  },
                });
              } else {
                // Stock is safely available under row lock: commit reservations and record SALE ledger entries
                const quantityByVariant = new Map<string, number>();
                for (const item of orderWithItems.items) {
                  const variantId = skuToVariant.get(item.sku);
                  if (variantId) {
                    quantityByVariant.set(
                      variantId,
                      (quantityByVariant.get(variantId) ?? 0) + item.quantity
                    );
                  }
                }

                await tx.inventoryReservation.updateMany({
                  where: { orderId: payment.orderId, status: { in: ["RESERVED", "RELEASED"] } },
                  data: { status: "COMMITTED", committedAt: new Date() },
                });

                await tx.inventoryTransaction.createMany({
                  data: Array.from(quantityByVariant.entries()).map(([variantId, qty]) => ({
                    variantId,
                    type: "SALE",
                    quantity: -qty,
                    referenceId: payment.orderId,
                    notes: `Order ${payment.orderId} fulfillment (late payment recovery)`,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          }
        }
      } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
        await tx.order.updateMany({
          where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
          data: { paymentStatus: verification.status === "FAILED" ? "FAILED" : "CANCELLED" },
        });

        // Release reservation
        const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
        await inventoryService.releaseReservation(payment.orderId, tx);
      }
    });

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { orderNumber: true },
    });
    if (!order) throw new Error("Order not found");
    return { orderNumber: order.orderNumber, verification };
  }
}
