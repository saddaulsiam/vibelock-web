"use server";

import { Prisma, InventoryTransactionType } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { getAdminInventory, type InventoryFilter } from "@/lib/admin/inventory-queries";

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

export async function quickAdjustInventoryAction({
  variantId,
  quantity,
  reason,
  type = "ADJUSTMENT",
}: {
  variantId: string;
  quantity: number;
  reason: string;
  type?: InventoryTransactionType;
}): Promise<InventoryActionState> {
  await requireRole("ADMIN");

  const q = Number(quantity);
  if (!Number.isInteger(q) || q === 0) {
    return { error: "Adjustment quantity must be a non-zero integer." };
  }
  if (Math.abs(q) > 100000) {
    return { error: "Adjustment quantity exceeds safe limit (±100,000)." };
  }
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    return { error: "An adjustment reason is required." };
  }

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
      if (currentStock + q < reservedStock) {
        throw new Error(
          `Adjustment cannot reduce stock (${currentStock + q}) below active reservations (${reservedStock}).`
        );
      }

      await tx.inventoryTransaction.create({
        data: {
          variantId,
          type,
          quantity: q,
          referenceId: crypto.randomUUID(),
          notes: cleanReason,
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
  return {
    error: null,
    message: `Successfully adjusted inventory by ${q > 0 ? `+${q}` : q} units.`,
  };
}

export async function bulkAdjustInventoryAction({
  variantIds,
  quantity,
  reason,
  type = "RESTOCK",
}: {
  variantIds: string[];
  quantity: number;
  reason: string;
  type?: InventoryTransactionType;
}): Promise<InventoryActionState> {
  await requireRole("ADMIN");

  if (!Array.isArray(variantIds) || variantIds.length === 0) {
    return { error: "No inventory items selected." };
  }
  const q = Number(quantity);
  if (!Number.isInteger(q) || q === 0) {
    return { error: "Quantity must be a non-zero integer." };
  }
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) {
    return { error: "A reason is required for bulk stock adjustment." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const variantId of variantIds) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { id: true },
        });
        if (!variant) continue;

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
        if (currentStock + q < reservedStock) {
          throw new Error(`Adjustment on variant ${variantId} would reduce stock below reserved count.`);
        }

        await tx.inventoryTransaction.create({
          data: {
            variantId,
            type,
            quantity: q,
            referenceId: crypto.randomUUID(),
            notes: cleanReason,
          },
        });
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Bulk inventory adjustment failed.",
    };
  }

  updateTag("admin-inventory");
  revalidatePath("/admin/inventory");
  return {
    error: null,
    message: `Adjusted inventory for ${variantIds.length} item(s) by ${q > 0 ? `+${q}` : q} units.`,
  };
}

export async function loadMoreAdminInventoryAction(options: {
  search?: string;
  filter?: InventoryFilter;
  page?: number;
}) {
  await requireRole("ADMIN");
  return getAdminInventory(options);
}

