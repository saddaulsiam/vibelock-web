"use server";

import { OrderStatus, PaymentMethod, PaymentStatus, SalesChannel } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { getAdminOrders, type AdminOrdersResult, type AdminOrderDateRange } from "./order-queries";
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
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          inventoryReservations: true,
          shipment: true,
          payments: { select: { status: true } },
        },
      });
      if (!order) throw new Error("Order not found.");

      if (status === "CANCELLED") {
        if (order.status === "CANCELLED") {
          throw new Error("Cancelled orders cannot be changed.");
        }
        if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
          throw new Error("Only pending or confirmed orders prior to shipment can be cancelled.");
        }
        if (order.shipment) {
          throw new Error("Orders cannot be cancelled after shipment processing has started.");
        }
        if (
          order.paymentStatus === "SUCCESS" ||
          order.paymentStatus === "REFUNDED" ||
          order.paymentStatus === "PARTIALLY_REFUNDED" ||
          order.payments.some((payment) =>
            ["SUCCESS", "REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)
          )
        ) {
          throw new Error("Paid orders cannot be cancelled online at this time.");
        }
        if (
          order.paymentMethod !== "COD" &&
          order.inventoryReservations.some((reservation) => reservation.status === "COMMITTED")
        ) {
          throw new Error("Order has already committed stock and cannot be safely cancelled.");
        }

        await tx.order.update({
          where: { id },
          data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
        });
        const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
        await inventoryService.cancelOrderInventory(id, tx);
        await tx.orderHistory.create({
          data: {
            orderId: id,
            status: "CANCELLED",
            notes,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ORDER_CANCELLED",
            entityType: "Order",
            entityId: id,
            metadata: { from: order.status, to: "CANCELLED", notes: notes ?? null },
          },
        });
        return;
      }

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
        message === "Order not found." ||
        message.startsWith("Order cannot transition") ||
        message.endsWith("orders cannot be changed.")
          ? message
          : [
                "Only pending orders can be cancelled.",
                "Orders cannot be cancelled after shipment processing has started.",
                "Paid orders cannot be cancelled online at this time.",
                "Order has already committed stock and cannot be safely cancelled.",
              ].includes(message)
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

export async function loadMoreAdminOrdersAction(options: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  salesChannel?: SalesChannel;
  dateRange?: AdminOrderDateRange;
  search?: string;
  page: number;
  limit?: number;
}): Promise<AdminOrdersResult> {
  await requireRole("ADMIN");
  return getAdminOrders(options);
}

export async function quickUpdateOrderStatusAction(input: {
  orderId: string;
  status: OrderStatus;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("ADMIN", { throw: true });
  const { orderId, status, notes } = input;

  if (!orderId || !status) {
    return { success: false, error: "Order ID and status are required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          inventoryReservations: true,
          shipment: true,
          payments: { select: { status: true } },
        },
      });
      if (!order) throw new Error("Order not found.");

      if (status === "CANCELLED") {
        if (order.status === "CANCELLED") {
          throw new Error("Cancelled orders cannot be changed.");
        }
        if (order.status !== "PENDING") {
          throw new Error("Only pending orders can be cancelled.");
        }
        if (order.shipment) {
          throw new Error("Orders cannot be cancelled after shipment processing has started.");
        }
        if (
          order.paymentStatus === "SUCCESS" ||
          order.paymentStatus === "REFUNDED" ||
          order.paymentStatus === "PARTIALLY_REFUNDED" ||
          order.payments.some((payment) =>
            ["SUCCESS", "REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status)
          )
        ) {
          throw new Error("Paid orders cannot be cancelled online at this time.");
        }
        if (
          order.paymentMethod !== "COD" &&
          order.inventoryReservations.some((reservation) => reservation.status === "COMMITTED")
        ) {
          throw new Error("Order has already committed stock and cannot be safely cancelled.");
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
        });
        const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
        await inventoryService.cancelOrderInventory(orderId, tx);
        await tx.orderHistory.create({
          data: {
            orderId,
            status: "CANCELLED",
            notes,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "ORDER_CANCELLED",
            entityType: "Order",
            entityId: orderId,
            metadata: { from: order.status, to: "CANCELLED", notes: notes ?? null },
          },
        });
        return;
      }

      const transitionError = getOrderStatusTransitionError(order.status, status);
      if (transitionError) throw new Error(transitionError);
      if (order.status === status) return;

      await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      await tx.orderHistory.create({
        data: {
          orderId,
          status,
          notes,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ORDER_STATUS_CHANGED",
          entityType: "Order",
          entityId: orderId,
          metadata: { from: order.status, to: status, notes: notes ?? null },
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order status.";
    return { success: false, error: message };
  }

  refreshOrders();
  return { success: true };
}

export async function bulkUpdateOrderStatusAction(input: {
  orderIds: string[];
  status: OrderStatus;
  notes?: string;
}): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
  await requireRole("ADMIN", { throw: true });
  const { orderIds, status, notes } = input;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { success: false, updatedCount: 0, errors: ["No orders selected."] };
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const orderId of orderIds) {
    const res = await quickUpdateOrderStatusAction({ orderId, status, notes });
    if (res.success) {
      updatedCount++;
    } else if (res.error) {
      errors.push(res.error);
    }
  }

  return { success: updatedCount > 0, updatedCount, errors };
}

export async function checkCustomerRiskAction(input: {
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
  currentOrderId?: string | null;
}) {
  await requireRole("ADMIN", { throw: true });
  const { getCustomerRiskProfile } = await import("@/lib/admin/customers");
  try {
    const profile = await getCustomerRiskProfile(input);
    return { success: true, profile };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to query customer risk profile.";
    return { success: false, error: message };
  }
}

export async function addOrderNoteAction(input: {
  orderId: string;
  note: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const admin = await requireRole("ADMIN", { throw: true });
  const { orderId, note } = input;

  const trimmed = note?.trim();
  if (!trimmed) {
    return { success: false, error: "Note content cannot be empty." };
  }

  if (trimmed.length > 1000) {
    return { success: false, error: "Note cannot exceed 1000 characters." };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    const authorName = admin.name || admin.email || "Staff";
    const formattedNote = `[STAFF NOTE by ${authorName}] ${trimmed}`;

    await prisma.$transaction(async (tx) => {
      await tx.orderHistory.create({
        data: {
          orderId,
          status: order.status,
          notes: formattedNote,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ORDER_NOTE_ADDED",
          entityType: "Order",
          entityId: orderId,
          metadata: { note: trimmed, author: authorName },
        },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, message: "Internal note saved successfully." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save note.";
    return { success: false, error: message };
  }
}
