"use server";

import { DiscountType, Prisma } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { recordAuditLog } from "@/lib/audit";

export type CouponActionState = { error: string | null; message?: string };

const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{2,49}$/, "Use 3-50 letters, numbers, hyphens, or underscores.");
const money = (label: string) =>
  z
    .string()
    .regex(
      /^\d{1,10}(?:\.\d{1,2})?$/,
      `${label} must be a non-negative amount with up to two decimals.`
    );
const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value ? new Date(value) : null));

const couponSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: couponCode,
    discountType: z.nativeEnum(DiscountType),
    discountValue: money("Discount value"),
    minOrderValue: z.string().trim().optional(),
    usageLimit: z.string().trim().optional(),
    isActive: z.enum(["on", "true", "false"]).optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .superRefine((data, ctx) => {
    const value = Number(data.discountValue);
    if (data.discountType === "PERCENTAGE" && (value <= 0 || value > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage must be greater than 0 and at most 100.",
      });
    }
    if (data.discountType === "FIXED" && value <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Fixed discount must be greater than 0.",
      });
    }
    if (
      data.minOrderValue &&
      (!/^\d{1,10}(?:\.\d{1,2})?$/.test(data.minOrderValue) || Number(data.minOrderValue) < 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["minOrderValue"],
        message: "Minimum order value must be a valid non-negative amount.",
      });
    }
    if (data.usageLimit && (!/^\d+$/.test(data.usageLimit) || Number(data.usageLimit) < 1)) {
      ctx.addIssue({
        code: "custom",
        path: ["usageLimit"],
        message: "Usage limit must be a positive whole number.",
      });
    }
    if (data.startDate && Number.isNaN(data.startDate.getTime()))
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date is invalid." });
    if (data.endDate && Number.isNaN(data.endDate.getTime()))
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date is invalid." });
    if (data.startDate && data.endDate && data.endDate <= data.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
  });

function refreshCoupons() {
  updateTag("admin-coupons");
  revalidatePath("/admin/coupons");
  revalidatePath("/admin/coupons/new");
  revalidatePath("/admin/coupons/[id]/edit", "page");
}

export async function saveCouponAction(
  _previous: CouponActionState,
  formData: FormData
): Promise<CouponActionState> {
  const admin = await requireRole("MANAGER");

  const parsed = couponSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: String(formData.get("discountValue") ?? "").trim(),
    minOrderValue: String(formData.get("minOrderValue") ?? "").trim() || undefined,
    usageLimit: String(formData.get("usageLimit") ?? "").trim() || undefined,
    isActive: formData.get("isActive") ? "on" : "false",
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: String(formData.get("endDate") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, code, discountType, discountValue, minOrderValue, usageLimit, startDate, endDate } =
    parsed.data;
  const isActive = parsed.data.isActive !== "false";

  const rawCategoryIds = formData
    .getAll("categoryIds")
    .map(String)
    .filter((v) => /^[0-9a-fA-F-]{36}$/.test(v));

  try {
    await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.coupon.findUnique({
          where: { id },
          select: { id: true, usageCount: true },
        });
        if (!existing) throw new Error("COUPON_NOT_FOUND");
        if (usageLimit && Number(usageLimit) < existing.usageCount)
          throw new Error("USAGE_LIMIT_BELOW_CURRENT");
        const updated = await tx.coupon.update({
          where: { id },
          data: {
            code,
            discountType,
            discountValue: new Prisma.Decimal(discountValue),
            minOrderValue: minOrderValue ? new Prisma.Decimal(minOrderValue) : null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            isActive,
            startDate,
            endDate,
            categories: {
              set: rawCategoryIds.map((catId) => ({ id: catId })),
            },
          },
        });
        await recordAuditLog({
          actorId: admin?.id,
          action: "COUPON_UPDATED",
          entityType: "Coupon",
          entityId: updated.id,
          metadata: {
            code: updated.code,
            discountType: updated.discountType,
            discountValue: Number(updated.discountValue),
            minOrderValue: updated.minOrderValue ? Number(updated.minOrderValue) : null,
            usageLimit: updated.usageLimit,
            isActive: updated.isActive,
            startDate: updated.startDate,
            endDate: updated.endDate,
          },
          tx,
        });
      } else {
        const created = await tx.coupon.create({
          data: {
            code,
            discountType,
            discountValue: new Prisma.Decimal(discountValue),
            minOrderValue: minOrderValue ? new Prisma.Decimal(minOrderValue) : null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            isActive,
            startDate,
            endDate,
            categories: rawCategoryIds.length
              ? { connect: rawCategoryIds.map((catId) => ({ id: catId })) }
              : undefined,
          },
        });
        await recordAuditLog({
          actorId: admin?.id,
          action: "COUPON_CREATED",
          entityType: "Coupon",
          entityId: created.id,
          metadata: {
            code: created.code,
            discountType: created.discountType,
            discountValue: Number(created.discountValue),
            minOrderValue: created.minOrderValue ? Number(created.minOrderValue) : null,
            usageLimit: created.usageLimit,
            isActive: created.isActive,
            startDate: created.startDate,
            endDate: created.endDate,
          },
          tx,
        });
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "COUPON_NOT_FOUND") return { error: "This coupon no longer exists." };
      if (error.message === "USAGE_LIMIT_BELOW_CURRENT")
        return { error: "Usage limit cannot be below current usage." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That coupon code is already in use." };
    }
    return { error: "The coupon could not be saved. Please try again." };
  }

  refreshCoupons();
  return {
    error: null,
    message: id ? "Coupon updated successfully." : "Coupon created successfully.",
  };
}

export async function toggleCouponStatusAction(
  id: string
): Promise<{ success: boolean; newStatus?: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.coupon.findUnique({
        where: { id },
        select: { id: true, code: true, isActive: true },
      });

      if (!existing) {
        throw new Error("COUPON_NOT_FOUND");
      }

      const res = await tx.coupon.update({
        where: { id },
        data: { isActive: !existing.isActive },
        select: { id: true, code: true, isActive: true },
      });

      await recordAuditLog({
        actorId: admin?.id,
        action: "COUPON_STATUS_TOGGLED",
        entityType: "Coupon",
        entityId: res.id,
        metadata: {
          code: res.code,
          previousActive: existing.isActive,
          isActive: res.isActive,
        },
        tx,
      });

      return res;
    });

    refreshCoupons();
    return { success: true, newStatus: updated.isActive };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "COUPON_NOT_FOUND") {
      return { success: false, error: "Coupon not found." };
    }
    const msg = err instanceof Error ? err.message : "Failed to toggle coupon status.";
    console.error("[CouponActions] toggleCouponStatusAction error:", err);
    return { success: false, error: msg };
  }
}

export async function deleteCouponAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireRole("MANAGER");

  try {
    const existing = await prisma.coupon.findUnique({
      where: { id },
      select: { id: true, code: true, usageCount: true },
    });

    if (!existing) {
      return { success: false, error: "Coupon not found or already deleted." };
    }

    // Safety constraint: Never delete a coupon that has redemptions
    if (existing.usageCount > 0) {
      return {
        success: false,
        error: `Coupon "${existing.code}" has been used ${existing.usageCount} time(s). Historical order auditing requires preserving this coupon. Please pause or deactivate it instead.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.coupon.delete({ where: { id } });

      await recordAuditLog({
        actorId: admin?.id,
        action: "COUPON_DELETED",
        entityType: "Coupon",
        entityId: id,
        metadata: {
          code: existing.code,
          usageCount: existing.usageCount,
        },
        tx,
      });
    });

    refreshCoupons();
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete coupon.";
    console.error("[CouponActions] deleteCouponAction error:", err);
    return { success: false, error: msg };
  }
}

export async function loadMoreAdminCouponsAction(options: {
  search?: string;
  filter?: import("./coupon-shared").CouponFilter;
  type?: DiscountType;
  page: number;
}) {
  await requireRole("MANAGER");
  const { getAdminCoupons } = await import("./coupon-queries");
  return getAdminCoupons(options);
}

export async function bulkUpdateCouponStatusAction(
  ids: string[],
  isActive: boolean
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
  await requireRole("MANAGER");

  if (!ids || ids.length === 0) {
    return { success: false, error: "No coupons selected." };
  }

  try {
    const res = await prisma.coupon.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    refreshCoupons();
    return { success: true, updatedCount: res.count };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update selected coupons.";
    console.error("[CouponActions] bulkUpdateCouponStatusAction error:", err);
    return { success: false, error: msg };
  }
}

export async function bulkDeleteCouponsAction(ids: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  deactivatedCount: number;
  message?: string;
  error?: string;
}> {
  await requireRole("MANAGER");

  if (!ids || ids.length === 0) {
    return { success: false, deletedCount: 0, deactivatedCount: 0, error: "No coupons selected." };
  }

  try {
    const coupons = await prisma.coupon.findMany({
      where: { id: { in: ids } },
      select: { id: true, usageCount: true },
    });

    const unusedIds = coupons.filter((c) => c.usageCount === 0).map((c) => c.id);
    const usedIds = coupons.filter((c) => c.usageCount > 0).map((c) => c.id);

    let deletedCount = 0;
    if (unusedIds.length > 0) {
      const delRes = await prisma.coupon.deleteMany({
        where: { id: { in: unusedIds } },
      });
      deletedCount = delRes.count;
    }

    let deactivatedCount = 0;
    if (usedIds.length > 0) {
      const updateRes = await prisma.coupon.updateMany({
        where: { id: { in: usedIds } },
        data: { isActive: false },
      });
      deactivatedCount = updateRes.count;
    }

    refreshCoupons();

    const parts: string[] = [];
    if (deletedCount > 0) parts.push(`Deleted ${deletedCount} unused coupon(s)`);
    if (deactivatedCount > 0)
      parts.push(
        `Deactivated ${deactivatedCount} coupon(s) (preserved because they have order redemption history)`
      );

    return {
      success: true,
      deletedCount,
      deactivatedCount,
      message: parts.join(". ") || "Completed.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete selected coupons.";
    console.error("[CouponActions] bulkDeleteCouponsAction error:", err);
    return { success: false, deletedCount: 0, deactivatedCount: 0, error: msg };
  }
}
