"use server";

import { Prisma, ReturnRequestStatus } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { RefundService } from "@/lib/refunds/service";
import { ReturnService } from "@/lib/returns/service";
import { getAdminReturns } from "@/lib/admin/return-queries";
import { getShippingProvider } from "@/lib/shipping/provider";
import {
  notifyReturnApproved,
  notifyReturnReceived,
  notifyStoreCreditIssued,
  notifyCashRefundProcessed,
} from "@/lib/email/return-emails";

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
        "A store credit voucher has already been issued for this return.",
        "A refund has already been initiated or processed for this return.",
        "Cannot issue store credit for a rejected return.",
        "Store credit amount must be greater than zero.",
        "Store credit amount cannot exceed requested return value.",
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

  // Quality Grading map for returned items (resellable vs damaged)
  const gradingMap: Record<string, "RESELLABLE" | "DAMAGED"> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("item_grade_") && (value === "RESELLABLE" || value === "DAMAGED")) {
      const itemId = key.replace("item_grade_", "");
      gradingMap[itemId] = value;
    }
  }

  const rawGrading = formData.get("grading");
  if (typeof rawGrading === "string" && rawGrading.trim()) {
    try {
      const parsedGrading = JSON.parse(rawGrading);
      Object.assign(gradingMap, parsedGrading);
    } catch {
      // ignore
    }
  }

  let customerToNotify: {
    email: string;
    name?: string | null;
    phone?: string | null;
    orderNumber: string;
  } | null = null;

  try {
    customerToNotify = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReturnRequest" WHERE id = ${id} FOR UPDATE`;
      const request = await tx.returnRequest.findUnique({
        where: { id },
        include: { order: true, items: { include: { orderItem: true } } },
      });
      if (!request) throw new Error("Return request not found.");
      if (request.status === status) return null;
      if (!transitions[request.status].includes(status)) {
        throw new Error("That return status transition is not allowed.");
      }

      await tx.returnRequest.update({ where: { id }, data: { status } });

      if (status === "COMPLETED") {
        await new ReturnService().processReturnRestock(id, tx, gradingMap);
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
          metadata: {
            from: request.status,
            to: status,
            notes: notes ?? null,
            grading: Object.keys(gradingMap).length > 0 ? gradingMap : undefined,
          },
        },
      });

      return {
        email: request.order.customerEmail,
        name: request.order.customerName,
        phone: request.order.customerPhone,
        orderNumber: request.order.orderNumber,
      };
    });
  } catch (error) {
    return {
      error: knownError(error) ?? "The return status could not be updated. Please try again.",
    };
  }

  // Dispatch real-time email & SMS notification when parcel is received at warehouse
  if (customerToNotify && status === "RECEIVED") {
    await notifyReturnReceived({
      customerEmail: customerToNotify.email,
      customerName: customerToNotify.name,
      customerPhone: customerToNotify.phone,
      orderNumber: customerToNotify.orderNumber,
    });
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

      const existingCredit = await tx.auditLog.findFirst({
        where: {
          entityType: "ReturnRequest",
          entityId: request.id,
          action: "STORE_CREDIT_ISSUED",
        },
        select: { id: true },
      });
      if (existingCredit)
        throw new Error("A store credit voucher has already been issued for this return.");

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

    // Notify customer of cash refund
    const fullOrder = await prisma.order.findUnique({
      where: { id: request.orderId },
      select: { customerEmail: true, customerName: true, customerPhone: true, orderNumber: true },
    });
    if (fullOrder) {
      await notifyCashRefundProcessed({
        customerEmail: fullOrder.customerEmail,
        customerName: fullOrder.customerName,
        customerPhone: fullOrder.customerPhone,
        orderNumber: fullOrder.orderNumber,
        amount: Number(refund.amount),
        gateway: "Payment Provider",
      });
    }
  } catch (error) {
    return { error: knownError(error) ?? "The refund could not be processed. Please try again." };
  }

  refreshReturns();
  return { error: null, message: "Refund provider processing completed." };
}

export async function loadMoreAdminReturnsAction(options: {
  status?: ReturnRequestStatus;
  search?: string;
  page: number;
  limit?: number;
}) {
  await requireRole("ADMIN");
  return getAdminReturns(options);
}

export async function bookSteadfastReturnPickupAction(
  _previous: AdminReturnActionState,
  formData: FormData
): Promise<AdminReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });
  const returnId = String(formData.get("returnId") ?? "").trim();
  if (!returnId) return { error: "Return ID is required." };

  try {
    const request = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true,
        items: { include: { orderItem: true } },
      },
    });

    if (!request) return { error: "Return request not found." };
    if (request.status === "REJECTED" || request.status === "COMPLETED") {
      return { error: `Cannot book pickup for a ${request.status.toLowerCase()} return request.` };
    }

    // Check if pickup has already been booked (idempotency check)
    const existingAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "ReturnRequest",
        entityId: returnId,
        action: "RETURN_PICKUP_BOOKED",
      },
    });
    if (existingAudit) {
      const meta = (existingAudit.metadata as Record<string, unknown>) || {};
      return {
        error: null,
        message: `Pickup already booked with Steadfast. Tracking: ${meta.trackingCode || meta.consignmentId}`,
      };
    }

    if (!request.order.shippingStreet || !request.order.shippingCity) {
      return { error: "Customer shipping address is incomplete for courier pickup." };
    }

    const cleanPhone = request.order.customerPhone?.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return { error: "A valid customer contact phone number is required for courier pickup." };
    }

    // Dispatch to courier provider
    const provider = getShippingProvider();
    const invoiceNumber = `RET-${request.order.orderNumber}`;
    const note = `Return Pickup: Order #${request.order.orderNumber} (${request.items.length} items). Return ID: ${request.id.slice(0, 8)}`;

    const dispatchRes = await provider.createShipment({
      orderId: request.order.id,
      orderNumber: invoiceNumber,
      recipientName: request.order.customerName ? `${request.order.customerName} (Return)` : "Return Customer",
      recipientPhone: request.order.customerPhone || "",
      street: request.order.shippingStreet,
      city: request.order.shippingCity,
      state: request.order.shippingState || "",
      zip: request.order.shippingZip || "",
      country: request.order.shippingCountry || "BD",
      amount: 0,
      codAmount: 0,
      referenceId: request.id,
      note,
    });

    if (!dispatchRes.success || !dispatchRes.providerShipmentId || !dispatchRes.trackingNumber) {
      return {
        error: dispatchRes.error || "Steadfast rejected the return pickup request.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Transition from PENDING to APPROVED if pending
      if (request.status === "PENDING") {
        await tx.returnRequest.update({
          where: { id: returnId },
          data: { status: "APPROVED" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "RETURN_PICKUP_BOOKED",
          entityType: "ReturnRequest",
          entityId: returnId,
          metadata: {
            provider: provider.name || "steadfast",
            consignmentId: dispatchRes.providerShipmentId,
            trackingCode: dispatchRes.trackingNumber,
            bookedAt: new Date().toISOString(),
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: request.orderId,
          status: request.order.status,
          notes: `[RETURN PICKUP] Steadfast pickup booked. Consignment ID: ${dispatchRes.providerShipmentId}, Tracking: ${dispatchRes.trackingNumber}`,
        },
      });
    });

    refreshReturns();

    // Send real-time notification to customer (Email & SMS)
    await notifyReturnApproved({
      customerEmail: request.order.customerEmail,
      customerName: request.order.customerName,
      customerPhone: request.order.customerPhone,
      orderNumber: request.order.orderNumber,
      trackingCode: dispatchRes.trackingNumber,
    });

    return {
      error: null,
      message: `Steadfast pickup booked! Consignment #${dispatchRes.providerShipmentId}, Tracking: ${dispatchRes.trackingNumber}`,
    };
  } catch (err) {
    console.error("[bookSteadfastReturnPickupAction] error:", err);
    return { error: "Failed to book return pickup. Please try again." };
  }
}

const storeCreditSchema = z.object({
  returnId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid refund amount.")
    .optional(),
  grading: z.string().optional(),
});

export async function issueStoreCreditRefundAction(
  _previous: AdminReturnActionState,
  formData: FormData
): Promise<AdminReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const returnId = String(formData.get("returnId") ?? "");
  const amountStr = String(formData.get("amount") ?? "");
  const parsed = storeCreditSchema.safeParse({
    returnId,
    amount: amountStr || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Parse item grading map
  const gradingMap: Record<string, "RESELLABLE" | "DAMAGED"> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("item_grade_") && (value === "RESELLABLE" || value === "DAMAGED")) {
      const itemId = key.replace("item_grade_", "");
      gradingMap[itemId] = value;
    }
  }

  const rawGrading = formData.get("grading");
  if (typeof rawGrading === "string" && rawGrading.trim()) {
    try {
      const parsedGrading = JSON.parse(rawGrading);
      Object.assign(gradingMap, parsedGrading);
    } catch {
      // ignore
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReturnRequest" WHERE id = ${returnId} FOR UPDATE`;
      const request = await tx.returnRequest.findUnique({
        where: { id: returnId },
        include: {
          order: true,
          items: { include: { orderItem: true } },
        },
      });

      if (!request) throw new Error("Return request not found.");
      if (request.status === "REJECTED") {
        throw new Error("Cannot issue store credit for a rejected return.");
      }

      // Enforce 1-Time Limit: Prevent duplicate store credit or double refund
      const existingCredit = await tx.auditLog.findFirst({
        where: {
          entityType: "ReturnRequest",
          entityId: returnId,
          action: "STORE_CREDIT_ISSUED",
        },
        select: { id: true },
      });
      if (existingCredit) {
        throw new Error("A store credit voucher has already been issued for this return.");
      }

      const existingRefundAudit = await tx.auditLog.findFirst({
        where: {
          entityType: "Refund",
          metadata: { path: ["returnId"], equals: returnId },
        },
        select: { id: true },
      });
      if (existingRefundAudit) {
        throw new Error("A refund has already been initiated or processed for this return.");
      }

      const requestedAmount = request.items.reduce(
        (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
        0
      );

      const baseAmount = parsed.data.amount ? Number(parsed.data.amount) : requestedAmount;
      if (baseAmount <= 0) {
        throw new Error("Store credit amount must be greater than zero.");
      }
      if (baseAmount > requestedAmount) {
        throw new Error("Store credit amount cannot exceed requested return value.");
      }

      // Calculate 105% value (5% bonus)
      const bonusRate = 0.05;
      const finalOriginalAmount = baseAmount;
      const finalBonusAmount = Math.round(baseAmount * bonusRate * 100) / 100;
      const finalVoucherAmount = Math.round((baseAmount + finalBonusAmount) * 100) / 100;

      // Generate a unique single-use coupon code
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const generatedCouponCode = `VL-CREDIT-${randomSuffix}`;

      // 1. Create the single-use 105% Coupon
      await tx.coupon.create({
        data: {
          code: generatedCouponCode,
          discountType: "FIXED",
          discountValue: finalVoucherAmount,
          usageLimit: 1,
          minOrderValue: null,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
        },
      });

      // 2. Mark ReturnRequest as COMPLETED
      await tx.returnRequest.update({
        where: { id: returnId },
        data: { status: "COMPLETED" },
      });

      // 3. Process Inventory Restock with Quality Grading
      await new ReturnService().processReturnRestock(returnId, tx, gradingMap);

      // 4. Log Audit & Order History
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "STORE_CREDIT_ISSUED",
          entityType: "ReturnRequest",
          entityId: returnId,
          metadata: {
            couponCode: generatedCouponCode,
            originalAmount: finalOriginalAmount,
            voucherAmount: finalVoucherAmount,
            bonusAmount: finalBonusAmount,
            grading: Object.keys(gradingMap).length > 0 ? gradingMap : undefined,
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: request.orderId,
          status: request.order.status,
          notes: `[STORE CREDIT] 105% Store Credit voucher issued: ${generatedCouponCode} (Value: ৳${finalVoucherAmount.toLocaleString("en-BD")}, incl. ৳${finalBonusAmount.toLocaleString("en-BD")} bonus).`,
        },
      });

      return {
        couponCode: generatedCouponCode,
        voucherAmount: finalVoucherAmount,
        bonusAmount: finalBonusAmount,
        customer: {
          email: request.order.customerEmail,
          name: request.order.customerName,
          phone: request.order.customerPhone,
          orderNumber: request.order.orderNumber,
        },
      };
    });

    // 5. Notify customer via Email & SMS
    if (result?.customer) {
      await notifyStoreCreditIssued({
        customerEmail: result.customer.email,
        customerName: result.customer.name,
        customerPhone: result.customer.phone,
        orderNumber: result.customer.orderNumber,
        couponCode: result.couponCode,
        voucherAmount: result.voucherAmount,
        bonusAmount: result.bonusAmount,
      });
    }

    refreshReturns();
    return {
      error: null,
      message: `105% Store Credit voucher ${result?.couponCode} (৳${result?.voucherAmount.toLocaleString("en-BD")}) successfully issued! Sent to customer.`,
    };
  } catch (error) {
    return {
      error: knownError(error) ?? "Failed to issue store credit voucher. Please try again.",
    };
  }
}
