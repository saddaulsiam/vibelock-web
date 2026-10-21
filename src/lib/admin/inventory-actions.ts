"use server";

import { Prisma } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const adjustmentSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((value) => value !== 0, {
      message: "Adjustment quantity cannot be zero.",
    }),
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
});

export type InventoryActionState = { error: string | null; message?: string };

export async function adjustInventoryAction(
  _previous: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  await requireRole("ADMIN");

  const parsed = adjustmentSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { variantId, quantity, reason } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });
      if (!variant) throw new Error("Inventory variant not found.");

      const [stock, reserved] = await Promise.all([
        tx.inventoryTransaction.aggregate({
          where: { variantId },
          _sum: { quantity: true },
        }),
        tx.inventoryReservation.aggregate({
          where: {
            variantId,
            status: "RESERVED",
            expiresAt: { gt: new Date() },
          },
          _sum: { quantity: true },
        }),
      ]);
      const currentStock = stock._sum.quantity ?? 0;
      const reservedStock = reserved._sum.quantity ?? 0;
      if (currentStock + quantity < reservedStock) {
        throw new Error("Adjustment cannot reduce stock below reserved quantity.");
      }

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          type: "ADJUSTMENT",
          quantity,
          referenceId: crypto.randomUUID(),
          notes: reason,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This inventory adjustment could not be recorded. Please try again." };
    }
    return {
      error: error instanceof Error ? error.message : "Failed to adjust inventory.",
    };
  }

  updateTag("admin-inventory");
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${variantId}`);
  return { error: null, message: "Inventory adjusted successfully." };
}
