"use server";

import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

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
  await requireRole("ADMIN");

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
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error("Order not found.");

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
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to update order status." };
  }

  refreshOrders();
  return ok;
}

export async function updateOrderPaymentStatusAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");

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
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error("Order not found.");

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
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to update payment status." };
  }

  refreshOrders();
  return ok;
}
