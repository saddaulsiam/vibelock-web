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
      // 0. Resolve the user who owns this payment's order so we can acquire
      //    the User row lock BEFORE the Payment lock.
      //    This matches account deletion's lock hierarchy (User → Order → Payment)
      //    and prevents the race where:
      //    - Account deletion holds User+Order+Payment locks, sees 0 pending refunds, proceeds.
      //    - Concurrent refund initiation holds only the Payment lock and creates a Refund
      //      row after deletion's guard check but before deletion commits.
      //    With User locked first, refund initiation blocks until deletion either commits
      //    (user gone → payment's order.userId is NULL → userId null → no lock target found)
      //    or rolls back (safe to continue).
      const paymentWithUser = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, orderId: true, order: { select: { userId: true } } },
      });
      if (!paymentWithUser) throw new Error("Payment not found");

      const userId = paymentWithUser.order.userId;
      if (userId) {
        // Lock User first (consistent hierarchy: User → Order → Payment)
        const userLocks = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
        `;
        // If the order originally had a non-null userId, but the locked User query returns zero rows
        // (i.e. user account was deleted concurrently while waiting for the lock), abort immediately.
        if (!userLocks || userLocks.length === 0) {
          throw new Error("Payment not found or customer account deleted");
        }
        // Then lock the Order
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${paymentWithUser.orderId} FOR UPDATE`;
      } else {
        // Legitimate guest order (userId was already null before transaction):
        // Lock Order to serialize against concurrent order/payment updates
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${paymentWithUser.orderId} FOR UPDATE`;
      }

      // Finally lock the Payment row (original behaviour preserved)
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
    // Gateways without automated refund APIs (e.g. bKash, Nagad, COD) must NOT be marked FAILED.
    // They require manual processing and must remain PENDING so admins can record the manual refund.
    if (!isSSLCommerzGateway(refund.payment.gateway)) {
      await prisma.refund.updateMany({
        where: { id: refundId, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
      return {
        success: false,
        requiresManualProcessing: true,
        error: `Automated refund is unsupported for gateway '${refund.payment.gateway}'. Please issue the refund manually via the provider portal and record manual refund completion with the transaction reference.`,
      };
    }

    let providerRes: {
      success: boolean;
      gatewayRefundRef?: string;
      error?: string;
      unknownResult?: boolean;
    } = {
      success: false,
      error: "Unsupported gateway",
    };

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

  /**
   * Authoritatively records manual completion of a refund (e.g. bKash, Nagad, or offline).
   * Enforces authorized admin actor, validated transaction reference, strict amount checks,
   * terminal status preservation, and writes immutable AuditLog and OrderHistory records.
   */
  async recordManualRefundSuccess(params: {
    refundId: string;
    adminId: string;
    transactionReference: string;
    notes?: string;
    tx?: Prisma.TransactionClient;
  }): Promise<Refund> {
    const cleanAdminId = params.adminId ? params.adminId.trim() : "";
    if (!cleanAdminId) {
      throw new Error("Authorized admin access is required to record a manual refund.");
    }

    const cleanRef = params.transactionReference ? params.transactionReference.trim() : "";
    if (!cleanRef || cleanRef.length < 3) {
      throw new Error("A valid provider transaction reference is required (minimum 3 characters).");
    }

    const execute = async (db: Prisma.TransactionClient) => {
      const existingRefund = await db.refund.findUnique({
        where: { id: params.refundId },
        include: { payment: true },
      });
      if (!existingRefund) throw new Error("Refund not found.");

      // Row-lock Payment and Refund to serialize concurrent refunds
      await db.$queryRaw`SELECT id FROM "Payment" WHERE id = ${existingRefund.paymentId} FOR UPDATE`;
      await db.$queryRaw`SELECT id FROM "Refund" WHERE id = ${params.refundId} FOR UPDATE`;

      const refund = await db.refund.findUniqueOrThrow({
        where: { id: params.refundId },
        include: { payment: true },
      });

      if (refund.status === "SUCCESS") {
        return refund; // Idempotent
      }

      if (refund.status === "FAILED") {
        throw new Error(
          "Cannot mark a failed refund as successful. Please initiate a new refund request."
        );
      }

      if (refund.status !== "PENDING" && refund.status !== "PROCESSING") {
        throw new Error(`Refund cannot be completed from status '${refund.status}'.`);
      }

      if (refund.amount.lte(0)) {
        throw new Error("Refund amount must be greater than zero.");
      }

      // Re-validate against parent payment and existing successful refunds under row lock
      const payment = await db.payment.findUniqueOrThrow({
        where: { id: refund.paymentId },
        include: { refunds: true },
      });

      if (payment.status !== "SUCCESS" && payment.status !== "PARTIALLY_REFUNDED") {
        throw new Error(`Cannot refund payment in non-captured status '${payment.status}'.`);
      }

      const otherSuccessfulRefunds = payment.refunds
        .filter((r) => r.id !== refund.id && r.status === "SUCCESS")
        .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

      const totalAfterThis = otherSuccessfulRefunds.add(refund.amount);
      if (totalAfterThis.gt(payment.amount)) {
        throw new Error("Refund amount exceeds remaining refundable amount for this payment.");
      }

      // Update Refund to SUCCESS with verified transaction reference
      const updatedRefund = await db.refund.update({
        where: { id: refund.id },
        data: {
          status: "SUCCESS",
          gatewayRefId: cleanRef,
          reason: params.notes?.trim()
            ? `${refund.reason ?? ""}; Manual: ${params.notes.trim()}`.trim()
            : refund.reason,
        },
      });

      // Update parent Payment and Order statuses
      const isFullRefund = totalAfterThis.gte(payment.amount);
      const newPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

      await db.payment.update({
        where: { id: payment.id },
        data: { status: newPaymentStatus },
      });

      const updatedOrder = await db.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: newPaymentStatus },
      });

      // Write immutable AuditLog
      await db.auditLog.create({
        data: {
          actorId: cleanAdminId,
          action: "MANUAL_REFUND_COMPLETED",
          entityType: "Refund",
          entityId: refund.id,
          metadata: {
            paymentId: payment.id,
            orderId: payment.orderId,
            refundAmount: Number(refund.amount),
            transactionReference: cleanRef,
            gateway: payment.gateway,
            isFullRefund,
            notes: params.notes?.trim() || null,
          },
        },
      });

      // Write OrderHistory
      await db.orderHistory.create({
        data: {
          orderId: payment.orderId,
          status: updatedOrder.status,
          notes: `Manual refund of ৳${Number(refund.amount).toFixed(2)} recorded by admin (Gateway: ${payment.gateway}, Ref: ${cleanRef}).`,
        },
      });

      return updatedRefund;
    };

    if (params.tx) {
      return execute(params.tx);
    }
    return prisma.$transaction(execute);
  }
}
