"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/media/cloudinary";

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
  phone: z.string().trim().max(25).optional().nullable(),
  image: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        if (val.startsWith("/")) return true;
        if (val.startsWith("data:image/")) return true;
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
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.create({
        data: {
          ...parsed.data,
          userId: user.id,
          label: parsed.data.label || null,
          state: parsed.data.state || null,
          zip: parsed.data.zip || null,
        },
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
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };

  try {
    await prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!address) throw new Error("Address not found.");
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      await tx.address.update({
        where: { id: address.id },
        data: {
          ...parsed.data,
          label: parsed.data.label || null,
          state: parsed.data.state || null,
          zip: parsed.data.zip || null,
        },
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
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };

  try {
    const phoneValue =
      parsed.data.phone !== undefined ? parsed.data.phone?.trim() || null : undefined;

    // Check unique phone if provided
    if (phoneValue) {
      const existingUser = await prisma.user.findFirst({
        where: { phone: phoneValue, id: { not: user.id } },
        select: { id: true },
      });
      if (existingUser) {
        return { success: false, error: "This phone number is already registered to another account." };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        image: parsed.data.image && parsed.data.image.length > 0 ? parsed.data.image : null,
        ...(phoneValue !== undefined && { phone: phoneValue }),
      },
    });
    refreshAccount();
    return { success: true };
  } catch (error) {
    console.error("[updateProfileAction] Error:", error);
    return { success: false, error: "Unable to update your profile." };
  }
}

export async function uploadAvatarAction(formData: FormData) {
  await requireUser({ throw: true });
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "Please select an image file to upload." };
  }

  // Validate image MIME type
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Only image files (JPEG, PNG, WebP) are supported." };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image file size must not exceed 5MB." };
  }

  try {
    if (isCloudinaryConfigured()) {
      const uploadRes = await uploadToCloudinary(file, "vibelock/avatars");
      if (!uploadRes.success) {
        return { success: false, error: uploadRes.error || "Failed to upload image to cloud." };
      }
      return { success: true, url: uploadRes.url };
    }

    // Local fallback: Base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Data}`;
    return { success: true, url: dataUrl };
  } catch (err) {
    console.error("[uploadAvatarAction] Error:", err);
    return { success: false, error: "Failed to process image upload." };
  }
}

export async function getCustomerReturnsAction(page: number, pageSize = 10) {
  const { getCustomerReturns } = await import("./queries");
  const result = await getCustomerReturns(page, pageSize);
  return {
    returns: result.returns,
    total: result.total,
    hasMore: page * pageSize < result.total,
  };
}
