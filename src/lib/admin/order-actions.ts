"use server";

import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import {
  getAuthoritativePaymentStatus,
  getOrderStatusTransitionError,
  getPaymentStatusTransitionError,
} from "@/lib/orders/transitions";

export type AdminActionState = { error: string | null; message?: string };
const ok: AdminActionState = { error: null, message: "Order updated successfully." };

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  notes: z.string().trim().max(1000).optional(),
});

const paymentStatusSchema = z.object({
  id: z.string().uuid(),
  paymentStatus: z.nativeEnum(PaymentStatus),
  notes: z.string().trim().max(1000).optional(),
});

function refreshOrders() {
  updateTag("admin-orders");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/[id]", "page");
}

export async function updateOrderStatusAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const parsed = statusSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, status, notes } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error("Order not found.");
      const transitionError = getOrderStatusTransitionError(order.status, status);
      if (transitionError) throw new Error(transitionError);
      if (order.status === status) return;

      await tx.order.update({
        where: { id },
        data: { status },
      });

      await tx.orderHistory.create({
        data: {
          orderId: id,
          status,
          notes,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: id,
          metadata: { from: order.status, to: status, notes: notes ?? null },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      error:
        message === "Order not found." || message.startsWith("Order cannot transition") || message.endsWith("orders cannot be changed.")
          ? message
          : "Failed to update order status.",
    };
  }

  refreshOrders();
  return ok;
}

export async function updateOrderPaymentStatusAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const parsed = paymentStatusSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    paymentStatus: String(formData.get("paymentStatus") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, paymentStatus, notes } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id },
        include: { payments: { select: { status: true } } },
      });
      if (!order) throw new Error("Order not found.");
      const transitionError = getPaymentStatusTransitionError(order.paymentStatus, paymentStatus);
      if (transitionError) throw new Error(transitionError);
      const authoritativeStatus = getAuthoritativePaymentStatus(order.payments);
      if (paymentStatus !== authoritativeStatus) {
        throw new Error("Payment status must match the recorded payment state.");
      }
      if (order.paymentStatus === paymentStatus) return;

      await tx.order.update({
        where: { id },
        data: { paymentStatus },
      });

      // We use the OrderHistory table to track both order and payment status changes
      // as there isn't a separate PaymentHistory table.
      await tx.orderHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.PENDING, // Placeholder since OrderHistory requires an OrderStatus
          notes: `[PAYMENT UPDATE] Payment status updated to ${paymentStatus}. ${notes}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PAYMENT_STATUS_CHANGED",
          entityType: "Order",
          entityId: id,
          metadata: { from: order.paymentStatus, to: paymentStatus, notes: notes ?? null },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      error:
        message === "Order not found." ||
        message.startsWith("Payment cannot transition") ||
        message === "Payment status must match the recorded payment state."
          ? message
          : "Failed to update payment status.",
    };
  }

  refreshOrders();
  return ok;
}
