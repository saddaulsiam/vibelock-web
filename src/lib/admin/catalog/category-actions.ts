"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/media/cloudinary";
import prisma from "@/lib/prisma/client";
import {
  type AdminActionState,
  ok,
  nameField,
  slugFromForm,
  duplicateMessage,
  refreshCatalog,
} from "./catalog-action-helpers";

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: nameField,
  description: z.string().trim().max(1000).optional(),
  metaTitle: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  parentId: z.string().uuid().optional(),
});

export async function saveCategoryAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const rawName = String(formData.get("name") ?? "");
  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    name: rawName,
    description: String(formData.get("description") ?? "") || undefined,
    metaTitle: String(formData.get("metaTitle") ?? "") || undefined,
    metaDescription: String(formData.get("metaDescription") ?? "") || undefined,
    parentId: String(formData.get("parentId") ?? "") || undefined,
  };
  const parsed = categorySchema.safeParse(raw);
  const slug = slugFromForm(formData, rawName);
  if (!parsed.success || !slug.success) {
    return {
      error:
        parsed.error?.issues[0]?.message ??
        "Enter a valid slug using letters, numbers, and hyphens.",
    };
  }

  const { id, name, description, metaTitle, metaDescription, parentId } = parsed.data;
  if (id && parentId === id) return { error: "A category cannot be its own parent." };
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) return { error: "Choose an existing parent category." };
    if (id) {
      let ancestorId: string | null = parentId;
      const visited = new Set<string>();
      while (ancestorId) {
        if (ancestorId === id)
          return { error: "A category cannot be moved beneath one of its descendants." };
        if (visited.has(ancestorId))
          return { error: "The selected category hierarchy is invalid." };
        visited.add(ancestorId);
        const ancestor: { parentId: string | null } | null = await prisma.category.findUnique({
          where: { id: ancestorId },
          select: { parentId: true },
        });
        ancestorId = ancestor?.parentId ?? null;
      }
    }
  }

  const removeImage = formData.get("removeImage") === "true";
  const rawImageUrl = String(formData.get("imageUrl") ?? "").trim();
  const imageFile = formData.get("imageFile");

  let finalImageUrl: string | null | undefined = undefined;

  if (removeImage) {
    finalImageUrl = null;
  } else if (
    imageFile &&
    typeof imageFile === "object" &&
    "size" in imageFile &&
    (imageFile as File).size > 0
  ) {
    const file = imageFile as File;
    if (file.size > 5 * 1024 * 1024) {
      return { error: "Image file size must be under 5MB." };
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowedMimes.includes(file.type)) {
      return { error: "Only JPG, PNG, WebP, GIF, or AVIF image files are supported." };
    }

    if (isCloudinaryConfigured()) {
      const uploadRes = await uploadToCloudinary(file, "vibelock/categories");
      if (!uploadRes.success) {
        return { error: `Cloudinary upload failed: ${uploadRes.error}` };
      }
      finalImageUrl = uploadRes.url;
    } else {
      // Local fallback for offline/development if Cloudinary is not configured in .env yet
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : file.type === "image/avif"
                ? "avif"
                : "jpg";
      const fileName = `cat-${slug.data}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "categories");
      await fs.mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      finalImageUrl = `/uploads/categories/${fileName}`;
    }
  } else if (rawImageUrl) {
    finalImageUrl = rawImageUrl;
  }

  const sortOrderRaw = formData.get("sortOrder");
  const sortOrder =
    sortOrderRaw !== null && !isNaN(Number(sortOrderRaw)) ? Number(sortOrderRaw) : 0;
  const isActive = formData.get("isActive") !== "false";

  try {
    if (id) {
      const existing = await prisma.category.findUnique({
        where: { id },
        select: { id: true, imageUrl: true },
      });
      if (!existing) return { error: "This category no longer exists." };
      await prisma.category.update({
        where: { id },
        data: {
          name,
          slug: slug.data,
          description: description || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          imageUrl: finalImageUrl !== undefined ? finalImageUrl : existing.imageUrl,
          parentId: parentId ?? null,
          isActive,
          sortOrder,
        },
      });
    } else {
      await prisma.category.create({
        data: {
          name,
          slug: slug.data,
          description: description || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          imageUrl: finalImageUrl ?? null,
          parentId: parentId ?? null,
          isActive,
          sortOrder,
        },
      });
    }
  } catch (error) {
    return {
      error: duplicateMessage(error) ?? "The category could not be saved. Please try again.",
    };
  }

  refreshCatalog();
  return ok;
}

export async function toggleCategoryStatusAction(
  id: string,
  currentActive: boolean
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  try {
    await prisma.category.update({
      where: { id },
      data: { isActive: !currentActive },
    });
    refreshCatalog();
    return {
      error: null,
      message: `Category is now ${!currentActive ? "Active" : "Hidden"}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to toggle category status.",
    };
  }
}

export async function deleteCategoryAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Choose a valid category." };
  const category = await prisma.category.findUnique({
    where: { id: id.data },
    select: { _count: { select: { products: true, children: true } } },
  });
  if (!category) return { error: "This category no longer exists." };
  if (category._count.products || category._count.children) {
    return {
      error: "This category has products or child categories. Reassign them before deleting it.",
    };
  }
  try {
    await prisma.category.delete({ where: { id: id.data } });
  } catch {
    return { error: "The category is still in use and could not be deleted." };
  }
  refreshCatalog();
  return ok;
}

export async function assignProductsToCategoryAction(
  categoryId: string,
  productIds: string[]
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  if (!categoryId || !productIds.length) {
    return { error: "No products selected." };
  }
  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: {
        products: {
          connect: productIds.map((id) => ({ id })),
        },
      },
    });
    refreshCatalog();
    revalidatePath(`/admin/categories/${categoryId}`);
    return { error: null, message: `${productIds.length} product(s) assigned successfully.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to assign products to category.",
    };
  }
}

export async function removeProductFromCategoryAction(
  categoryId: string,
  productId: string
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
    });
    refreshCatalog();
    revalidatePath(`/admin/categories/${categoryId}`);
    return { error: null, message: "Product removed from category." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove product from category.",
    };
  }
}
