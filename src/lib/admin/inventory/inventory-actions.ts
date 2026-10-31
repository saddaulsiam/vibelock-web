"use server";

import { Prisma, InventoryTransactionType } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { getAdminInventory, type InventoryFilter } from "./inventory-queries";
import {
  getAdminInventoryIntelligence,
  type InventoryIntelligenceWindow,
  type InventoryIntelligenceStatusFilter,
  type InventoryIntelligenceSort,
} from "./inventory-intelligence-queries";

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

export async function loadMoreAdminInventoryIntelligenceAction(options?: {
  window?: InventoryIntelligenceWindow;
  status?: InventoryIntelligenceStatusFilter;
  search?: string;
  sort?: InventoryIntelligenceSort;
  page?: number;
  pageSize?: number;
}) {
  await requireRole("ADMIN");
  return getAdminInventoryIntelligence(options);
}

export type StocktakeReconcileItem = {
  variantId: string;
  scannedQuantity: number;
  expectedQuantity: number;
  notes?: string;
};

export async function reconcileStocktakeAction({
  items,
  auditNote,
}: {
  items: StocktakeReconcileItem[];
  auditNote?: string;
}): Promise<InventoryActionState> {
  await requireRole("ADMIN");

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No stocktake items provided to reconcile." };
  }

  // Filter items where there is a non-zero discrepancy (scanned != expected)
  const discrepancies = items.filter(
    (item) => item.scannedQuantity !== item.expectedQuantity
  );

  if (discrepancies.length === 0) {
    return {
      error: null,
      message: "All scanned items match system stock perfectly! No adjustments required.",
    };
  }

  const cleanNote = (auditNote || "Physical stocktake audit reconciliation").trim();

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of discrepancies) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, sku: true },
        });
        if (!variant) continue;

        const [stock, reserved] = await Promise.all([
          tx.inventoryTransaction.aggregate({
            where: { variantId: item.variantId },
            _sum: { quantity: true },
          }),
          tx.inventoryReservation.aggregate({
            where: {
              variantId: item.variantId,
              status: "RESERVED",
              expiresAt: { gt: new Date() },
            },
            _sum: { quantity: true },
          }),
        ]);

        const currentPhysical = stock._sum.quantity ?? 0;
        const currentReserved = reserved._sum.quantity ?? 0;
        const delta = item.scannedQuantity - currentPhysical;

        if (delta === 0) continue;

        // Ensure physical stock does not drop below unexpired reservation count
        if (currentPhysical + delta < currentReserved) {
          throw new Error(
            `Reconciliation for ${variant.sku} would reduce physical stock to ${currentPhysical + delta}, which is below active checkout reservations (${currentReserved}).`
          );
        }

        const note = item.notes?.trim()
          ? `${cleanNote}: ${item.notes.trim()} (Audit: ${currentPhysical} -> ${item.scannedQuantity})`
          : `${cleanNote} (Audit: ${currentPhysical} -> ${item.scannedQuantity})`;

        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            type: "ADJUSTMENT",
            quantity: delta,
            referenceId: crypto.randomUUID(),
            notes: note,
          },
        });
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Stocktake reconciliation failed.",
    };
  }

  updateTag("admin-inventory");
  revalidatePath("/admin/inventory");
  return {
    error: null,
    message: `Successfully reconciled ${discrepancies.length} discrepancy variant(s).`,
  };
}

export interface ReorderSuggestionItem {
  id: string;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  primaryImage: string | null;
  totalStock: number;
  reserved: number;
  available: number;
  costPrice: number;
  sellingPrice: number;
}

export async function getReorderSuggestionsAction(threshold = 5): Promise<{
  error: string | null;
  items: ReorderSuggestionItem[];
}> {
  await requireRole("ADMIN");

  try {
    const rawItems = await prisma.$queryRaw<
      {
        id: string;
        sku: string;
        size: string | null;
        color: string | null;
        costPrice: number | null;
        sellingPrice: number | null;
        productName: string;
        primaryImage: string | null;
        totalStock: number;
        reserved: number;
        available: number;
      }[]
    >(Prisma.sql`
      SELECT
        "ProductVariant"."id",
        "ProductVariant"."sku",
        "ProductVariant"."size",
        "ProductVariant"."color",
        "ProductVariant"."costPrice"::float AS "costPrice",
        "ProductVariant"."sellingPrice"::float AS "sellingPrice",
        "Product"."name" AS "productName",
        COALESCE(stock.total_stock, 0)::int AS "totalStock",
        COALESCE(reserved.reserved_stock, 0)::int AS reserved,
        (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0))::int AS available,
        (
          SELECT "url" FROM "ProductImage"
          WHERE "ProductImage"."productId" = "Product"."id"
          ORDER BY "isPrimary" DESC, "createdAt" ASC
          LIMIT 1
        ) AS "primaryImage"
      FROM "ProductVariant"
      INNER JOIN "Product" ON "Product"."id" = "ProductVariant"."productId"
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS total_stock
        FROM "InventoryTransaction"
        GROUP BY "variantId"
      ) stock ON stock."variantId" = "ProductVariant"."id"
      LEFT JOIN (
        SELECT "variantId", SUM(quantity)::int AS reserved_stock
        FROM "InventoryReservation"
        WHERE status = 'RESERVED'::"ReservationStatus" AND "expiresAt" > (NOW() AT TIME ZONE 'UTC')
        GROUP BY "variantId"
      ) reserved ON reserved."variantId" = "ProductVariant"."id"
      WHERE (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) <= ${threshold}
      ORDER BY (COALESCE(stock.total_stock, 0) - COALESCE(reserved.reserved_stock, 0)) ASC, "Product"."name" ASC
      LIMIT 200
    `);

    return {
      error: null,
      items: rawItems.map((item) => ({
        id: item.id,
        sku: item.sku,
        productName: item.productName,
        size: item.size,
        color: item.color,
        primaryImage: item.primaryImage,
        totalStock: item.totalStock,
        reserved: item.reserved,
        available: item.available,
        costPrice: item.costPrice ?? 0,
        sellingPrice: item.sellingPrice ?? 0,
      })),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load reorder suggestions.",
      items: [],
    };
  }
}

