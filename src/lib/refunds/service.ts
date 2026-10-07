import prisma from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export class RefundService {
  /**
   * Calculates the remaining refundable amount for a successful payment.
   */
  async getRefundableAmount(
    paymentId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.Decimal> {
    const db = tx || prisma;
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });

    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "SUCCESS") return new Prisma.Decimal(0); // Only successful payments can be refunded

    const totalRefunded = payment.refunds
      .filter((r) => r.status === "SUCCESS")
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

    return payment.amount.sub(totalRefunded);
  }

  /**
   * Initiates a refund locally (PENDING state).
   */
  async initiateRefund(paymentId: string, amount: Prisma.Decimal, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const refundable = await this.getRefundableAmount(paymentId, tx);
      if (amount.gt(refundable)) {
        throw new Error("Refund amount exceeds remaining refundable amount");
      }

      const refund = await tx.refund.create({
        data: {
          paymentId,
          amount,
          status: "PENDING",
          reason,
        },
      });

      return refund;
    });
  }

  /**
   * Marks a refund as successful and updates the parent payment status.
   */
  async markRefundSuccess(refundId: string, gatewayRefId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;

    const refund = await db.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new Error("Refund not found");
    if (refund.status === "SUCCESS") return refund; // Idempotency
    if (refund.status === "FAILED") throw new Error("Cannot transition FAILED refund to SUCCESS");

    const updatedRefund = await db.refund.update({
      where: { id: refundId },
      data: { status: "SUCCESS", gatewayRefId },
    });

    // Update parent Payment status to PARTIALLY_REFUNDED or REFUNDED
    const refundableRemaining = await this.getRefundableAmount(updatedRefund.paymentId, db);
    if (refundableRemaining.lte(0)) {
      await db.payment.update({
        where: { id: updatedRefund.paymentId },
        data: { status: "REFUNDED" },
      });
    } else {
      await db.payment.update({
        where: { id: updatedRefund.paymentId },
        data: { status: "PARTIALLY_REFUNDED" },
      });
    }

    return updatedRefund;
  }

  /**
   * Marks a refund as failed. Recoverable.
   */
  async markRefundFailed(refundId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    const refund = await db.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new Error("Refund not found");
    if (refund.status === "SUCCESS") throw new Error("Cannot fail a successful refund");

    return await db.refund.update({
      where: { id: refundId },
      data: { status: "FAILED" },
    });
  }

  /**
   * Processes a pending refund with the payment provider.
   * This is executed OUTSIDE of the long-running transaction.
   */
  async processRefundWithProvider(refundId: string) {
    // 1. Fetch Refund and verify state
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });

    if (!refund) throw new Error("Refund not found");
    if (refund.status === "SUCCESS")
      return { success: true, message: "Refund is already processed" };
    if (refund.status === "FAILED") throw new Error("Refund has permanently failed");

    // Change status to PROCESSING (Idempotency lock)
    await prisma.refund.update({
      where: { id: refundId },
      data: { status: "PROCESSING" },
    });

    // 2. Determine provider and call external API
    let providerRes: { success: boolean; gatewayRefundRef?: string; error?: string } = {
      success: false,
      error: "Unsupported gateway",
    };

    if (refund.payment.gateway === "sslcommerz") {
      // Import dynamically or inject provider to avoid circular dependencies
      const { SSLCommerzProvider } = await import("@/lib/payment/providers/sslcommerz/client");
      const provider = new SSLCommerzProvider();

      if (!refund.payment.gatewayTransactionId) {
        throw new Error("Missing gatewayTransactionId to refund");
      }

      providerRes = await provider.refundPayment({
        refundId: refund.id,
        paymentId: refund.paymentId,
        gatewayTransactionId: refund.payment.gatewayTransactionId,
        amount: Number(refund.amount),
        reason: refund.reason || "Return/Refund",
      });
    }

    // 3. Atomically finalize SUCCESS/FAILED based on provider result
    if (providerRes.success) {
      await this.markRefundSuccess(refund.id, providerRes.gatewayRefundRef || refund.id);
      return { success: true };
    } else {
      await this.markRefundFailed(refund.id);
      return { success: false, error: providerRes.error || "Provider failed" };
    }
  }
}
