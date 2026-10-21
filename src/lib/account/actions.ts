"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const addressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  street: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).optional(),
  zip: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2).max(100),
  isDefault: z.boolean().default(false),
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  image: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        if (val.startsWith("/")) return true;
        try {
          const parsed = new URL(val);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid image URL or path" }
    )
    .nullable()
    .optional()
    .or(z.literal("")),
});

function refreshAccount() {
  revalidatePath("/account", "layout");
  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function createAddressAction(input: unknown) {
  const user = await requireUser({ throw: true });
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.create({
        data: { ...parsed.data, userId: user.id, label: parsed.data.label || null, state: parsed.data.state || null, zip: parsed.data.zip || null },
      });
    });
    refreshAccount();
    return { success: true };
  } catch (error) {
    console.error("[createAddressAction] Error:", error);
    return { success: false, error: "Unable to save this address." };
  }
}

export async function updateAddressAction(id: string, input: unknown) {
  const user = await requireUser({ throw: true });
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
      if (!address) throw new Error("Address not found.");
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.update({
        where: { id: address.id },
        data: { ...parsed.data, label: parsed.data.label || null, state: parsed.data.state || null, zip: parsed.data.zip || null },
      });
    });
    refreshAccount();
    return { success: true };
  } catch (error) {
    console.error("[updateAddressAction] Error:", error);
    return { success: false, error: "Unable to update this address." };
  }
}

export async function deleteAddressAction(id: string) {
  const user = await requireUser({ throw: true });
  try {
    const result = await prisma.address.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return { success: false, error: "Address not found." };
    refreshAccount();
    return { success: true };
  } catch (error) {
    console.error("[deleteAddressAction] Error:", error);
    return { success: false, error: "Unable to delete this address." };
  }
}

export async function updateProfileAction(input: unknown) {
  const user = await requireUser({ throw: true });
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        image: parsed.data.image && parsed.data.image.length > 0 ? parsed.data.image : null,
      },
    });
    refreshAccount();
    return { success: true };
  } catch (error) {
    console.error("[updateProfileAction] Error:", error);
    return { success: false, error: "Unable to update your profile." };
  }
}
