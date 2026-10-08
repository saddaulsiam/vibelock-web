import prisma from "@/lib/prisma/client";
import { PaymentInitiationResponse, PaymentProvider } from "./types";
import { SSLCommerzProvider } from "./providers/sslcommerz/client";
import { Order, Prisma } from "@prisma/client";

export class PaymentService {
  private getProvider(gateway: string): PaymentProvider {
    if (gateway === "SSLCOMMERZ") {
      return new SSLCommerzProvider();
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
          gateway,
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

    // Most providers pass the reference ID back
    // SSLCommerz uses 'tran_id'
    const merchantReferenceId = payload.tran_id as string | undefined;
    if (!merchantReferenceId) {
      console.error("[PaymentService] Missing tran_id in callback");
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
      console.log(`[PaymentService] Payment ${merchantReferenceId} is already ${payment.status}.`);
      // We only proceed if a provider's late callback brings a SUCCESS state, overriding an early CANCELLED?
      // Usually, we shouldn't downgrade a PAID to FAILED, but if it's currently FAILED, could it become PAID? Yes.
    }

    // Verify
    const verification = await provider.verifyPayment(payload);

    // If verification was successful but the verified amount does not match, log error and fail securely.
    if (verification.success && verification.status === "SUCCESS") {
      if (
        verification.verifiedMerchantReferenceId !== merchantReferenceId ||
        verification.verifiedCurrency !== "BDT"
      ) {
        throw new Error("Payment verification failed: Transaction or Currency Mismatch");
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

      // 1. Atomic update of Payment to prevent race conditions
      const updateResult = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: "SUCCESS" },
        },
        data: {
          status: verification.status,
          gatewayPayload: safePayload as Prisma.InputJsonValue,
          gatewayTransactionId: verification.providerTransactionId,
        },
      });

      // If no records updated, it means it was already SUCCESS
      if (updateResult.count === 0 && verification.status === "SUCCESS") {
        return;
      }

      // 2. Update Order status
      if (verification.status === "SUCCESS") {
        await tx.order.updateMany({
          where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
          data: { paymentStatus: "SUCCESS" },
        });

        // Phase 3H: Consume reservation
        const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
        await inventoryService.consumeReservation(payment.orderId, tx);
      } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
        await tx.order.updateMany({
          where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
          data: { paymentStatus: verification.status === "FAILED" ? "FAILED" : "PENDING" },
        });

        // Phase 3H: Release reservation
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
