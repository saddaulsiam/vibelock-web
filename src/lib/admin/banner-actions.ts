"use server";

import { BannerPlacement, Prisma } from "@prisma/client";
import { updateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type BannerActionState = { error: string | null; message?: string };

const imageUrlSchema = z.string().trim().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}, "Use a secure Cloudinary image URL.");
const linkUrlSchema = z.string().trim().optional().refine((value) => !value || value.startsWith("/") || /^https:\/\//i.test(value), "Link must be a site path or HTTPS URL.");

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  imageUrl: imageUrlSchema,
  mobileImageUrl: z.union([imageUrlSchema, z.literal("")]).optional(),
  linkUrl: linkUrlSchema,
  placement: z.nativeEnum(BannerPlacement),
  sortOrder: z.string().regex(/^-?\d{1,5}$/).transform(Number),
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

export async function saveBannerAction(_previous: BannerActionState, formData: FormData): Promise<BannerActionState> {
  await requireRole("ADMIN", { throw: true });
  const rawCategoryIds = formData.getAll("categoryIds").map((value) => String(value)).filter(Boolean);
  const parsed = bannerSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl"),
    mobileImageUrl: String(formData.get("mobileImageUrl") ?? "").trim(),
    linkUrl: String(formData.get("linkUrl") ?? "").trim(),
    placement: formData.get("placement"),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") ? "on" : "false",
    categoryIds: rawCategoryIds,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the banner details." };

  const { id, title, imageUrl, mobileImageUrl, linkUrl, placement, sortOrder, categoryIds } = parsed.data;
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
      categories: { set: categoryIds.map((categoryId) => ({ id: categoryId })) },
    };
    if (id) {
      const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return { error: "This banner no longer exists." };
      await prisma.banner.update({ where: { id }, data });
    } else {
      await prisma.banner.create({ data });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "One of the selected categories no longer exists." };
    }
    return { error: "The banner could not be saved. Please check the selected categories and try again." };
  }
  refreshBanners();
  return { error: null, message: id ? "Banner updated successfully." : "Banner created successfully." };
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
