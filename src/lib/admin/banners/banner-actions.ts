"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { BannerPlacement, Prisma } from "@prisma/client";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/media/cloudinary";
import { updateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type BannerActionState = { error: string | null; message?: string };

const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return false;
    if (value.startsWith("/")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
    } catch {
      return false;
    }
  }, "Use a secure Cloudinary image URL.");
const linkUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || value.startsWith("/") || /^https:\/\//i.test(value),
    "Link must be a site path or HTTPS URL."
  );

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  imageUrl: imageUrlSchema,
  mobileImageUrl: z.union([imageUrlSchema, z.literal("")]).optional(),
  linkUrl: linkUrlSchema,
  placement: z.nativeEnum(BannerPlacement),
  sortOrder: z
    .string()
    .regex(/^-?\d{1,5}$/)
    .transform(Number),
  isActive: z.enum(["on", "true", "false"]).optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
});

function refreshBanners() {
  updateTag("promo-banners");
  revalidatePath("/admin/banners");
  revalidatePath("/admin/banners/new");
  revalidatePath("/admin/banners/[id]/edit", "page");
  revalidatePath("/products");
  revalidatePath("/category/[slug]", "page");
}

export async function saveBannerAction(
  _previous: BannerActionState,
  formData: FormData
): Promise<BannerActionState> {
  await requireRole("ADMIN", { throw: true });

  let rawImageUrl = String(formData.get("imageUrl") ?? "").trim();
  const desktopImageFile = formData.get("desktopImageFile");
  if (
    desktopImageFile &&
    typeof desktopImageFile === "object" &&
    "size" in desktopImageFile &&
    (desktopImageFile as File).size > 0
  ) {
    const file = desktopImageFile as File;
    if (file.size > 8 * 1024 * 1024) {
      return { error: "Desktop banner image must be under 8MB." };
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedMimes.includes(file.type)) {
      return { error: "Only JPG, PNG, WebP, GIF, or AVIF image files are supported." };
    }
    let uploadedUrl: string | null = null;
    if (isCloudinaryConfigured()) {
      try {
        const uploadRes = await uploadToCloudinary(file, "vibelock/banners");
        if (uploadRes.success) {
          uploadedUrl = uploadRes.url;
        } else {
          console.warn("[saveBannerAction] Cloudinary upload unsuccessful, falling back to local:", uploadRes.error);
        }
      } catch (err) {
        console.warn("[saveBannerAction] Cloudinary upload error, falling back to local:", err);
      }
    }

    if (!uploadedUrl) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `banner-desktop-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "banners");
      await fs.mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      uploadedUrl = `/uploads/banners/${fileName}`;
    }
    rawImageUrl = uploadedUrl;
  }

  let rawMobileImageUrl = String(formData.get("mobileImageUrl") ?? "").trim();
  const mobileImageFile = formData.get("mobileImageFile");
  if (
    mobileImageFile &&
    typeof mobileImageFile === "object" &&
    "size" in mobileImageFile &&
    (mobileImageFile as File).size > 0
  ) {
    const file = mobileImageFile as File;
    if (file.size > 8 * 1024 * 1024) {
      return { error: "Mobile banner image must be under 8MB." };
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedMimes.includes(file.type)) {
      return { error: "Only JPG, PNG, WebP, GIF, or AVIF image files are supported." };
    }
    let uploadedMobileUrl: string | null = null;
    if (isCloudinaryConfigured()) {
      try {
        const uploadRes = await uploadToCloudinary(file, "vibelock/banners");
        if (uploadRes.success) {
          uploadedMobileUrl = uploadRes.url;
        } else {
          console.warn("[saveBannerAction] Mobile Cloudinary upload unsuccessful, falling back to local:", uploadRes.error);
        }
      } catch (err) {
        console.warn("[saveBannerAction] Mobile Cloudinary upload error, falling back to local:", err);
      }
    }

    if (!uploadedMobileUrl) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `banner-mobile-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "banners");
      await fs.mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      uploadedMobileUrl = `/uploads/banners/${fileName}`;
    }
    rawMobileImageUrl = uploadedMobileUrl;
  }

  if (!rawImageUrl) {
    return { error: "Please upload or provide a desktop banner image." };
  }

  const rawCategoryIds = formData
    .getAll("categoryIds")
    .map((value) => String(value))
    .filter(Boolean);
  const parsed = bannerSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    title: formData.get("title"),
    imageUrl: rawImageUrl,
    mobileImageUrl: rawMobileImageUrl,
    linkUrl: String(formData.get("linkUrl") ?? "").trim(),
    placement: formData.get("placement"),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") ? "on" : "false",
    categoryIds: rawCategoryIds,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Please check the banner details." };

  const { id, title, imageUrl, mobileImageUrl, linkUrl, placement, sortOrder, categoryIds } =
    parsed.data;
  const isActive = parsed.data.isActive !== "false";
  try {
    const data = {
      title,
      imageUrl,
      mobileImageUrl: mobileImageUrl || null,
      linkUrl: linkUrl || null,
      placement,
      sortOrder,
      isActive,
    };
    if (id) {
      const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return { error: "This banner no longer exists." };
      await prisma.banner.update({
        where: { id },
        data: {
          ...data,
          categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) },
        },
      });
    } else {
      await prisma.banner.create({
        data: {
          ...data,
          categories: { connect: categoryIds.map((categoryId) => ({ id: categoryId })) },
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "One of the selected categories no longer exists." };
    }
    return {
      error: "The banner could not be saved. Please check the selected categories and try again.",
    };
  }
  refreshBanners();
  return {
    error: null,
    message: id ? "Banner updated successfully." : "Banner created successfully.",
  };
}

export async function toggleBannerAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN", { throw: true });
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!z.string().uuid().safeParse(id).success) throw new Error("Invalid banner ID.");
  await prisma.banner.update({ where: { id }, data: { isActive: active } });
  refreshBanners();
}

export async function deleteBannerAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN", { throw: true });
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) throw new Error("Invalid banner ID.");
  await prisma.banner.delete({ where: { id } });
  refreshBanners();
}
