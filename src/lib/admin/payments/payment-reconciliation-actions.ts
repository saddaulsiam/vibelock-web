"use server";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { CaptureReconciliationStatus } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export interface PaymentReconciliationActionState {
  error: string | null;
  message?: string | null;
}

const reconcileSchema = z.object({
  captureId: z.string().uuid(),
  reconciliationStatus: z.nativeEnum(CaptureReconciliationStatus),
  notes: z.string().trim().max(1000).optional(),
});

export async function reconcilePaymentCaptureAction(
  _prevState: PaymentReconciliationActionState,
  formData: FormData
): Promise<PaymentReconciliationActionState> {
  const admin = await requireRole("MANAGER", { throw: true });

  const parsed = reconcileSchema.safeParse({
    captureId: formData.get("captureId"),
    reconciliationStatus: formData.get("reconciliationStatus"),
    notes: formData.get("notes")?.toString() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { captureId, reconciliationStatus, notes } = parsed.data;

  try {
    const existingCapture = await prisma.paymentCapture.findUnique({
      where: { id: captureId },
      include: { payment: true },
    });

    if (!existingCapture) {
      return { error: "Payment capture not found." };
    }

    await prisma.$transaction(async (tx) => {
      const capture = await tx.paymentCapture.update({
        where: { id: captureId },
        data: {
          reconciliationStatus,
          reconciliationNotes: notes ?? existingCapture.reconciliationNotes,
        },
      });

      await recordAuditLog({
        actorId: admin?.id,
        action: "PAYMENT_CAPTURE_RECONCILED",
        entityType: "PaymentCapture",
        entityId: capture.id,
        metadata: {
          paymentId: capture.paymentId,
          orderId: existingCapture.payment?.orderId ?? null,
          gateway: capture.gateway,
          bankTranId: capture.bankTranId,
          amount: Number(capture.amount),
          previousStatus: existingCapture.reconciliationStatus,
          newStatus: reconciliationStatus,
          notes: notes ?? null,
        },
        tx,
      });

      return capture;
    });

    revalidatePath("/admin/payments");
    if (existingCapture.payment?.orderId) {
      revalidatePath(`/admin/orders/${existingCapture.payment.orderId}`);
    }

    return {
      error: null,
      message: `Payment capture marked as ${reconciliationStatus}.`,
    };
  } catch (error) {
    console.error("[reconcilePaymentCaptureAction] Error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to reconcile payment capture.",
    };
  }
}
