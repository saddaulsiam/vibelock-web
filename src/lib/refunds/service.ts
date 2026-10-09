import prisma from "@/lib/prisma/client";
import { Prisma, Refund } from "@prisma/client";
import { isSSLCommerzGateway } from "@/lib/payment/constants";

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
    if (payment.status !== "SUCCESS" && payment.status !== "PARTIALLY_REFUNDED") {
      return new Prisma.Decimal(0);
    }

    const totalRefunded = payment.refunds
      .filter((r) => r.status === "SUCCESS" || r.status === "PENDING" || r.status === "PROCESSING")
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

    return payment.amount.sub(totalRefunded);
  }

  /**
   * Initiates a refund locally (PENDING state).
   */
  async initiateRefund(paymentId: string, amount: Prisma.Decimal, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const refundable = await this.getRefundableAmount(paymentId, tx);
      if (amount.lte(0)) {
        throw new Error("Refund amount must be greater than zero");
      }
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
  async markRefundSuccess(
    refundId: string,
    gatewayRefId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Refund> {
    if (!tx) {
      return prisma.$transaction((transaction) =>
        this.markRefundSuccess(refundId, gatewayRefId, transaction)
      );
    }
    const db = tx;

    const linkedRefund = await db.refund.findUnique({ where: { id: refundId } });
    if (!linkedRefund) throw new Error("Refund not found");
    await db.$queryRaw`SELECT id FROM "Payment" WHERE id = ${linkedRefund.paymentId} FOR UPDATE`;

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
    const paymentStatus = refundableRemaining.lte(0) ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const payment = await db.payment.update({
      where: { id: updatedRefund.paymentId },
      data: { status: paymentStatus },
      select: { orderId: true },
    });
    await db.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus },
    });

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
    const update = await prisma.refund.updateMany({
      where: { id: refundId, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (update.count === 0) {
      const current = await prisma.refund.findUnique({ where: { id: refundId } });
      if (current?.status === "SUCCESS")
        return { success: true, message: "Refund is already processed" };
      return { success: false, error: "Refund is already being processed" };
    }

    // 2. Determine provider and call external API
    let providerRes: {
      success: boolean;
      gatewayRefundRef?: string;
      error?: string;
      unknownResult?: boolean;
    } = {
      success: false,
      error: "Unsupported gateway",
    };

    if (isSSLCommerzGateway(refund.payment.gateway)) {
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
      if (providerRes.unknownResult) {
        return { success: false, error: "Refund result is unknown and requires reconciliation" };
      }
      await this.markRefundFailed(refund.id);
      return { success: false, error: "Refund provider rejected the request" };
    }
  }
}
