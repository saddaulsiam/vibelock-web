"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";
import { ReturnService } from "./service";

const ReturnRequestSchema = z.object({
  orderNumber: z.string(),
  reason: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Must select at least one item to return")
    .superRefine((items, context) => {
      const itemIds = new Set<string>();
      items.forEach((item, index) => {
        if (itemIds.has(item.orderItemId)) {
          context.addIssue({
            code: "custom",
            message: "Each order item can only appear once in a return request",
            path: [index, "orderItemId"],
          });
        }
        itemIds.add(item.orderItemId);
      });
    }),
});

export async function createReturnRequestAction(data: z.infer<typeof ReturnRequestSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  const result = ReturnRequestSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: "Invalid return request data" };
  }

  const { orderNumber, items, reason } = result.data;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify ownership and state
      await tx.$queryRaw`
        SELECT id FROM "Order"
        WHERE "orderNumber" = ${orderNumber} AND "userId" = ${userId}
        FOR UPDATE
      `;
      const order = await tx.order.findUnique({
        where: { orderNumber, userId },
      });

      if (!order) {
        throw new Error("Order not found or access denied.");
      }

      if (order.status !== "DELIVERED") {
        throw new Error("Only delivered orders can be returned.");
      }

      // 2. Validate returnable quantities server-side
      const returnService = new ReturnService();
      const returnableMap = await returnService.getReturnableQuantities(order.id, tx);

      for (const item of items) {
        const available = returnableMap[item.orderItemId] || 0;
        if (item.quantity > available) {
          throw new Error("Requested quantity exceeds the remaining returnable quantity.");
        }
      }

      // 3. Create ReturnRequest
      const returnRequest = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          reason,
          items: {
            create: items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
            })),
          },
        },
      });

      return {
        success: true,
        returnRequestId: returnRequest.id,
        message: "Return request submitted successfully.",
      };
    });
  } catch (error: unknown) {
    console.error("[createReturnRequestAction] Error:", error);
    const message = error instanceof Error ? error.message : "";
    return {
      success: false,
      error: [
        "Order not found or access denied.",
        "Only delivered orders can be returned.",
        "Requested quantity exceeds the remaining returnable quantity.",
      ].includes(message)
        ? message
        : "Failed to submit the return request. Please try again later.",
    };
  } finally {
    revalidatePath(`/account/orders/${orderNumber}`);
    revalidatePath("/account/orders");
  }
}
