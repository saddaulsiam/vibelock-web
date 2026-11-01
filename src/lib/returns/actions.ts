"use server";

import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";
import { ReturnService } from "./service";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/media/cloudinary";
import { serializeReturnReason } from "./utils";

const ReturnRequestSchema = z.object({
  orderNumber: z.string(),
  reason: z.string().optional().default("OTHER"),
  customerNote: z.string().max(1000).optional(),
  images: z.array(z.string()).max(5).optional().default([]),
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

/**
 * Server action to securely upload return photo proof to Cloudinary.
 * Enforces authenticated user, 5MB limit, and supported image formats.
 */
export async function uploadReturnProofAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No image file provided." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image file size must be under 5MB." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, and WebP images are supported." };
  }

  try {
    if (isCloudinaryConfigured()) {
      const uploadRes = await uploadToCloudinary(file, "vibelock/returns");
      if (uploadRes.success) {
        return { success: true, url: uploadRes.url };
      }
      return { success: false, error: uploadRes.error };
    }

    // Local / development fallback if Cloudinary credentials are not in .env
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    return { success: true, url: base64 };
  } catch (err) {
    console.error("[uploadReturnProofAction] Error:", err);
    return { success: false, error: "Failed to upload image. Please try again." };
  }
}

export async function createReturnRequestAction(data: z.input<typeof ReturnRequestSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  const result = ReturnRequestSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid return request data",
    };
  }

  const { orderNumber, items, reason, customerNote, images } = result.data;

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

      // Check 3-day return window from delivery date
      const deliveredHistory = await tx.orderHistory.findFirst({
        where: { orderId: order.id, status: "DELIVERED" },
        orderBy: { createdAt: "desc" },
      });
      const shipment = await tx.shipment.findUnique({
        where: { orderId: order.id },
      });

      const deliveredAt = shipment?.deliveredAt || deliveredHistory?.createdAt || order.updatedAt;
      const daysSinceDelivery =
        (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceDelivery > 3) {
        throw new Error(
          "Return window has expired. Returns must be requested within 3 days of delivery."
        );
      }

      // Mandatory photo proof check for Defective or Wrong Item
      if ((reason === "DEFECTIVE" || reason === "WRONG_ITEM") && (!images || images.length === 0)) {
        throw new Error("Please upload at least one photo showing the defective or wrong item.");
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

      // 3. Serialize structured reason
      const serializedReason = serializeReturnReason({
        category: reason,
        customerNote,
        images,
      });

      // 4. Create ReturnRequest
      const returnRequest = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          reason: serializedReason,
          items: {
            create: items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
            })),
          },
        },
      });

      // 5. Create AuditLog
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "RETURN_REQUESTED",
          entityType: "ReturnRequest",
          entityId: returnRequest.id,
          metadata: {
            category: reason,
            customerNote: customerNote?.trim() || "",
            imageCount: images?.length || 0,
            images: images || [],
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
        "Return window has expired. Returns must be requested within 3 days of delivery.",
        "Please upload at least one photo showing the defective or wrong item.",
      ].includes(message)
        ? message
        : "Failed to submit the return request. Please try again later.",
    };
  } finally {
    revalidatePath(`/account/orders/${orderNumber}`);
    revalidatePath("/account/orders");
  }
}
