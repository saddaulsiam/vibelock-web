"use server";

import { Prisma, ReturnRequestStatus } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { RefundService } from "@/lib/refunds/service";
import { ReturnService } from "@/lib/returns/service";

export type AdminReturnActionState = { error: string | null; message?: string };

const transitionSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(ReturnRequestStatus),
  notes: z.string().trim().max(1000).optional(),
});

const refundSchema = z.object({
  returnId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid refund amount."),
  reason: z.string().trim().max(500).optional(),
});

const processRefundSchema = z.object({
  returnId: z.string().uuid(),
  refundId: z.string().uuid(),
});

const transitions: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  REJECTED: [],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
};

function refreshReturns() {
  updateTag("admin-returns");
  revalidatePath("/admin/returns");
  revalidatePath("/admin/returns/[id]", "page");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/[id]", "page");
  revalidatePath("/account/orders");
}

function knownError(error: unknown) {
  if (error instanceof Error) {
    if (
      [
        "Return request not found.",
        "That return status transition is not allowed.",
        "Return item quantities are invalid.",
        "No successful payment is available for this order.",
        "The refund amount exceeds the requested return value.",
        "The refund amount exceeds the remaining refundable amount.",
        "Refund amount must be greater than zero.",
        "That refund does not belong to this return.",
        "A refund has already been initiated for this return.",
      ].includes(error.message)
    ) {
      return error.message;
    }
  }
  return null;
}

export async function updateReturnStatusAction(
  _previous: AdminReturnActionState,
  formData: FormData
): Promise<AdminReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const parsed = transitionSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, status, notes } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReturnRequest" WHERE id = ${id} FOR UPDATE`;
      const request = await tx.returnRequest.findUnique({
        where: { id },
        include: { order: true, items: { include: { orderItem: true } } },
      });
      if (!request) throw new Error("Return request not found.");
      if (request.status === status) return;
      if (!transitions[request.status].includes(status)) {
        throw new Error("That return status transition is not allowed.");
      }

      await tx.returnRequest.update({ where: { id }, data: { status } });

      if (status === "COMPLETED") {
        await new ReturnService().processReturnRestock(id, tx);
      }

      await tx.orderHistory.create({
        data: {
          orderId: request.orderId,
          status: request.order.status,
          notes: `[RETURN UPDATE] Return ${id} changed from ${request.status} to ${status}.${notes ? ` ${notes}` : ""}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "RETURN_STATUS_CHANGED",
          entityType: "ReturnRequest",
          entityId: id,
          metadata: { from: request.status, to: status, notes: notes ?? null },
        },
      });
    });
  } catch (error) {
    return {
      error: knownError(error) ?? "The return status could not be updated. Please try again.",
    };
  }

  refreshReturns();
  return { error: null, message: "Return status updated." };
}

export async function initiateReturnRefundAction(
  _previous: AdminReturnActionState,
  formData: FormData
): Promise<AdminReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });
  const parsed = refundSchema.safeParse({
    returnId: String(formData.get("returnId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const request = await prisma.returnRequest.findUnique({
      where: { id: parsed.data.returnId },
      include: {
        order: { include: { payments: { include: { refunds: true } } } },
        items: { include: { orderItem: true } },
      },
    });
    if (!request) throw new Error("Return request not found.");
    if (request.status !== "RECEIVED" && request.status !== "COMPLETED") {
      throw new Error("A refund can only be initiated after the return is received.");
    }

    const payment = request.order.payments.find(
      (candidate) => candidate.status === "SUCCESS" || candidate.status === "PARTIALLY_REFUNDED"
    );
    if (!payment) throw new Error("No successful payment is available for this order.");

    const requestedAmount = request.items.reduce(
      (sum, item) => sum.add(item.orderItem.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0)
    );
    const amount = new Prisma.Decimal(parsed.data.amount);
    if (amount.gt(requestedAmount))
      throw new Error("The refund amount exceeds the requested return value.");

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
      const existingRefundAudit = await tx.auditLog.findFirst({
        where: {
          action: "REFUND_INITIATED",
          entityType: "Refund",
          metadata: { path: ["returnId"], equals: request.id },
        },
        select: { id: true },
      });
      if (existingRefundAudit)
        throw new Error("A refund has already been initiated for this return.");

      const refundable = await new RefundService().getRefundableAmount(payment.id, tx);
      if (amount.lte(0)) throw new Error("Refund amount must be greater than zero.");
      if (amount.gt(refundable))
        throw new Error("The refund amount exceeds the remaining refundable amount.");

      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount,
          status: "PENDING",
          reason: parsed.data.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "REFUND_INITIATED",
          entityType: "Refund",
          entityId: refund.id,
          metadata: { returnId: request.id, amount: amount.toFixed(2) },
        },
      });
    });
  } catch (error) {
    return { error: knownError(error) ?? "The refund could not be initiated. Please try again." };
  }

  refreshReturns();
  return {
    error: null,
    message: "Refund created in pending state. Process it only when the provider is ready.",
  };
}

export async function processReturnRefundAction(
  _previous: AdminReturnActionState,
  formData: FormData
): Promise<AdminReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });
  const parsed = processRefundSchema.safeParse({
    returnId: String(formData.get("returnId") ?? ""),
    refundId: String(formData.get("refundId") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const refund = await prisma.refund.findUnique({
      where: { id: parsed.data.refundId },
      include: { payment: { select: { orderId: true } } },
    });
    const request = await prisma.returnRequest.findUnique({
      where: { id: parsed.data.returnId },
      select: { id: true, orderId: true },
    });
    if (!refund || !request) throw new Error("Return request not found.");
    if (refund.payment.orderId !== request.orderId)
      throw new Error("That refund does not belong to this return.");

    const result = await new RefundService().processRefundWithProvider(refund.id);
    if (!result.success)
      return { error: result.error ?? "The payment provider did not complete the refund." };

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "REFUND_PROCESSED",
        entityType: "Refund",
        entityId: refund.id,
        metadata: { returnId: request.id },
      },
    });
  } catch (error) {
    return { error: knownError(error) ?? "The refund could not be processed. Please try again." };
  }

  refreshReturns();
  return { error: null, message: "Refund provider processing completed." };
}
