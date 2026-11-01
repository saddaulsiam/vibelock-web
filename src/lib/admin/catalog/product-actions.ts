"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Prisma, ProductStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/media/cloudinary";
import prisma from "@/lib/prisma/client";
import { getAdminProducts, type AdminProductsQueryOptions } from "./catalog-queries";
import {
  type AdminActionState,
  ok,
  nameField,
  slugify,
  slugFromForm,
  duplicateMessage,
  refreshCatalog,
} from "./catalog-action-helpers";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: nameField,
  description: z.string().trim().max(5000).optional(),
  categoryIds: z.array(z.string().uuid()).max(30),
  status: z.nativeEnum(ProductStatus),
});

const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().max(100).optional().default(""),
  size: z.string().trim().max(40).optional().default(""),
  color: z.string().trim().max(60).optional().default(""),
  costPrice: z
    .string()
    .regex(
      /^\d{1,10}(?:\.\d{1,2})?$/,
      "Cost price must be a non-negative amount with up to two decimals."
    ),
  sellingPrice: z
    .string()
    .regex(
      /^\d{1,10}(?:\.\d{1,2})?$/,
      "Selling price must be a non-negative amount with up to two decimals."
    ),
  discountPrice: z.string().optional().default(""),
  stock: z.union([z.string(), z.number()]).optional().default("0"),
  weight: z.string().optional().default(""),
});

export type ProductVariantInput = z.infer<typeof variantInputSchema>;

export type ProductValues = {
  id?: string;
  name: string;
  description?: string;
  categoryIds: string[];
  status: ProductStatus;
  slug: string;
  variants: ProductVariantInput[];
  imageUrls: string[];
};

async function parseProduct(formData: FormData) {
  const rawName = String(formData.get("name") ?? "");
  const parsed = productSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: rawName,
    description: String(formData.get("description") ?? "") || undefined,
    categoryIds: formData.getAll("categoryIds").map(String),
    status: String(formData.get("status") ?? ""),
  });
  const slug = slugFromForm(formData, rawName);

  let rawVariants: unknown;
  try {
    rawVariants = JSON.parse(String(formData.get("variantsJson") ?? "[]"));
  } catch {
    return { error: "Variant data is invalid. Refresh the form and try again." } as const;
  }
  const variantsParsed = z
    .array(variantInputSchema)
    .min(1, "Add at least one product variant.")
    .max(100, "A product can have at most 100 variants.")
    .safeParse(rawVariants);

  // 1. Parse string image URLs (existing or external)
  const rawImageUrls = formData
    .getAll("imageUrls")
    .flatMap((val) => String(val).split(/\r?\n/))
    .map((url) => url.trim())
    .filter(Boolean);

  const imageUrls: string[] = [];
  for (const rawUrl of rawImageUrls) {
    if (rawUrl.startsWith("/uploads/")) {
      if (!imageUrls.includes(rawUrl)) imageUrls.push(rawUrl);
      continue;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return { error: "Every image must be a valid HTTP or HTTPS URL." } as const;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { error: "Every image must be a valid HTTP or HTTPS URL." } as const;
    }
    if (!imageUrls.includes(parsedUrl.toString())) imageUrls.push(parsedUrl.toString());
  }

  // 2. Upload any local image files (like in Category upload)
  const rawFiles = [...formData.getAll("imageFiles"), ...formData.getAll("imageFile")];
  const uploadedUrls: string[] = [];
  for (const item of rawFiles) {
    if (item && typeof item === "object" && "size" in item && (item as File).size > 0) {
      const file = item as File;
      if (file.size > 5 * 1024 * 1024) {
        return { error: `Image file "${file.name}" size must be under 5MB.` } as const;
      }
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
      if (!allowedMimes.includes(file.type)) {
        return {
          error: `Only JPG, PNG, WebP, GIF, or AVIF image files are supported (${file.name}).`,
        } as const;
      }

      if (isCloudinaryConfigured()) {
        const uploadRes = await uploadToCloudinary(file, "vibelock/products");
        if (!uploadRes.success) {
          return { error: `Cloudinary upload failed: ${uploadRes.error}` } as const;
        }
        uploadedUrls.push(uploadRes.url);
      } else {
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
        const slugPrefix = slug.success ? slug.data : "item";
        const fileName = `prod-${slugPrefix}-${Date.now()}-${randomUUID().slice(0, 6)}.${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
        await fs.mkdir(uploadDir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadDir, fileName), buffer);
        uploadedUrls.push(`/uploads/products/${fileName}`);
      }
    }
  }

  // 3. Assemble final image URLs according to imageManifest if provided
  let finalImageUrls: string[] = [];
  const manifestRaw = String(formData.get("imageManifest") ?? "");
  if (manifestRaw) {
    try {
      const manifest = JSON.parse(manifestRaw) as Array<{
        type: "url" | "file";
        value?: string;
        fileIndex?: number;
      }>;
      if (Array.isArray(manifest)) {
        for (const entry of manifest) {
          if (entry.type === "url" && entry.value && imageUrls.includes(entry.value)) {
            finalImageUrls.push(entry.value);
          } else if (
            entry.type === "file" &&
            typeof entry.fileIndex === "number" &&
            uploadedUrls[entry.fileIndex]
          ) {
            finalImageUrls.push(uploadedUrls[entry.fileIndex]);
          }
        }
      }
    } catch {
      // Ignore manifest JSON errors and fallback
    }
  }

  if (finalImageUrls.length === 0) {
    finalImageUrls = [...imageUrls, ...uploadedUrls];
  }
  // Deduplicate while maintaining sequence
  finalImageUrls = Array.from(new Set(finalImageUrls));

  if (finalImageUrls.length > 12) {
    return { error: "A product can have at most 12 images." } as const;
  }

  if (!parsed.success || !slug.success || !variantsParsed.success) {
    return {
      error:
        parsed.error?.issues[0]?.message ??
        (!slug.success
          ? "Enter a valid slug using letters, numbers, and hyphens."
          : variantsParsed.success
            ? "Enter valid product details."
            : variantsParsed.error.issues[0]?.message),
    } as const;
  }

  const variants = variantsParsed.data.map((variant) => ({
    ...variant,
    sku: variant.sku.trim(),
    size: variant.size.trim(),
    color: variant.color.trim(),
    discountPrice: variant.discountPrice.trim(),
    stock: String(variant.stock ?? "0").trim(),
    weight: variant.weight.trim(),
  }));
  const seenSkus = new Set<string>();
  const seenCombinations = new Set<string>();
  for (const variant of variants) {
    if (variant.sku) {
      const normalizedSku = variant.sku.toLowerCase();
      if (seenSkus.has(normalizedSku))
        return { error: "Each variant must have a unique SKU." } as const;
      seenSkus.add(normalizedSku);
    }
    if (variant.size || variant.color) {
      const combination = `${variant.size.toLowerCase()}::${variant.color.toLowerCase()}`;
      if (seenCombinations.has(combination))
        return { error: "Each size/color combination must be unique." } as const;
      seenCombinations.add(combination);
    }
    if (variant.discountPrice !== "" && !/^\d{1,10}(?:\.\d{1,2})?$/.test(variant.discountPrice)) {
      return {
        error: "Discount price must be a non-negative amount with up to two decimals.",
      } as const;
    }
    if (
      variant.discountPrice !== "" &&
      Number(variant.discountPrice) >= Number(variant.sellingPrice)
    ) {
      return { error: "Discount price must be lower than the variant selling price." } as const;
    }
  }

  return {
    data: {
      ...parsed.data,
      slug: slug.data,
      variants,
      imageUrls: finalImageUrls,
    } satisfies ProductValues,
  } as const;
}

async function validateCategories(categoryIds: string[]) {
  const uniqueIds = [...new Set(categoryIds)];
  if (uniqueIds.length !== categoryIds.length) return false;
  return (await prisma.category.count({ where: { id: { in: uniqueIds } } })) === uniqueIds.length;
}

function generatedSku(slug: string) {
  return `VL-${slugify(slug).slice(0, 24).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function saveProductAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const parsed = await parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error ?? null };
  const product = parsed.data;
  if (!(await validateCategories(product.categoryIds)))
    return { error: "One or more selected categories are unavailable." };

  try {
    await prisma.$transaction(async (tx) => {
      let productId = product.id;
      if (productId) {
        const existing = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, variants: { select: { id: true } } },
        });
        if (!existing) throw new Error("PRODUCT_NOT_FOUND");

        const existingVariantIds = new Set(existing.variants.map((variant) => variant.id));
        if (product.variants.some((variant) => variant.id && !existingVariantIds.has(variant.id))) {
          throw new Error("INVALID_VARIANT");
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description || null,
            status: product.status,
            categories: { set: product.categoryIds.map((id) => ({ id })) },
          },
        });

        const submittedIds = new Set(
          product.variants.flatMap((variant) => (variant.id ? [variant.id] : []))
        );
        const removedIds = existing.variants
          .map((variant) => variant.id)
          .filter((id) => !submittedIds.has(id));
        for (const variantId of removedIds) {
          const usage = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: {
              sku: true,
              _count: {
                select: {
                  inventoryTransactions: true,
                  inventoryReservations: true,
                  cartItems: true,
                },
              },
            },
          });
          if (!usage) continue;
          const historicalOrderItems = await tx.orderItem.count({ where: { sku: usage.sku } });
          if (
            historicalOrderItems ||
            usage._count.inventoryTransactions ||
            usage._count.inventoryReservations ||
            usage._count.cartItems
          ) {
            throw new Error("VARIANT_IN_USE");
          }
          await tx.productVariant.delete({ where: { id: variantId } });
        }
      } else {
        const created = await tx.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description || null,
            status: product.status,
            categories: { connect: product.categoryIds.map((id) => ({ id })) },
          },
          select: { id: true },
        });
        productId = created.id;
      }

      if (!productId) throw new Error("PRODUCT_NOT_FOUND");

      for (const variant of product.variants) {
        const data = {
          sku: variant.sku || generatedSku(product.slug),
          size: variant.size || null,
          color: variant.color || null,
          weight:
            variant.weight && !isNaN(Number(variant.weight))
              ? new Prisma.Decimal(variant.weight)
              : null,
          costPrice: new Prisma.Decimal(variant.costPrice),
          sellingPrice: new Prisma.Decimal(variant.sellingPrice),
          discountPrice:
            variant.discountPrice === "" ? null : new Prisma.Decimal(variant.discountPrice),
        };
        let variantId = variant.id;
        if (variantId) {
          await tx.productVariant.update({
            where: { id: variantId, productId },
            data,
          });
        } else {
          const created = await tx.productVariant.create({ data: { ...data, productId } });
          variantId = created.id;
        }

        const requestedStock = parseInt(String(variant.stock ?? ""), 10);
        if (!isNaN(requestedStock) && requestedStock >= 0) {
          const existingStockAgg = await tx.inventoryTransaction.aggregate({
            where: { variantId },
            _sum: { quantity: true },
          });
          const currentStock = existingStockAgg._sum.quantity ?? 0;
          const diff = requestedStock - currentStock;

          if (diff > 0) {
            await tx.inventoryTransaction.create({
              data: {
                variantId,
                type: "RESTOCK",
                quantity: diff,
                referenceId: randomUUID(),
                notes: variant.id
                  ? "Stock adjustment from product edit"
                  : "Initial stock upon product creation",
              },
            });
          } else if (diff < 0) {
            const reservedAgg = await tx.inventoryReservation.aggregate({
              where: {
                variantId,
                status: "RESERVED",
                expiresAt: { gt: new Date() },
              },
              _sum: { quantity: true },
            });
            const reservedStock = reservedAgg._sum.quantity ?? 0;
            if (currentStock + diff < reservedStock) {
              throw new Error(
                `Stock for ${variant.sku || "variant"} cannot be reduced below reserved quantity (${reservedStock}).`
              );
            }
            await tx.inventoryTransaction.create({
              data: {
                variantId,
                type: "ADJUSTMENT",
                quantity: diff,
                referenceId: randomUUID(),
                notes: "Stock adjustment from product form",
              },
            });
          }
        }
      }

      await tx.productImage.deleteMany({ where: { productId } });
      if (product.imageUrls.length) {
        await tx.productImage.createMany({
          data: product.imageUrls.map((url, index) => ({
            productId: productId!,
            url,
            alt: `${product.name} image ${index + 1}`,
            isPrimary: index === 0,
          })),
        });
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") return { error: "This product no longer exists." };
      if (error.message === "INVALID_VARIANT")
        return { error: "A submitted variant does not belong to this product." };
      if (error.message === "VARIANT_IN_USE")
        return {
          error:
            "A variant with inventory, reservation, or cart history cannot be removed. Keep it and update its details instead.",
        };
    }
    return {
      error: duplicateMessage(error) ?? "The product could not be saved. Please try again.",
    };
  }
  refreshCatalog();
  updateTag("admin-inventory");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return ok;
}

export async function toggleProductPublishedAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Choose a valid product." };
  const product = await prisma.product.findUnique({
    where: { id: id.data },
    select: { status: true },
  });
  if (!product) return { error: "This product no longer exists." };
  await prisma.product.update({
    where: { id: id.data },
    data: {
      status:
        product.status === ProductStatus.PUBLISHED ? ProductStatus.DRAFT : ProductStatus.PUBLISHED,
    },
  });
  refreshCatalog();
  return ok;
}

export async function deleteProductAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Choose a valid product." };
  const product = await prisma.product.findUnique({
    where: { id: id.data },
    select: {
      variants: {
        select: {
          _count: {
            select: { inventoryTransactions: true, inventoryReservations: true, cartItems: true },
          },
        },
      },
      _count: { select: { reviews: true } },
    },
  });
  if (!product) return { error: "This product no longer exists." };
  if (
    product._count.reviews > 0 ||
    product.variants.some(
      (variant) =>
        variant._count.inventoryTransactions > 0 ||
        variant._count.inventoryReservations > 0 ||
        variant._count.cartItems > 0
    )
  ) {
    return {
      error:
        "This product has reviews, cart items, or inventory history. Unpublish it instead of deleting it.",
    };
  }
  try {
    await prisma.product.delete({ where: { id: id.data } });
  } catch {
    return {
      error: "This product is still in use and could not be deleted. Unpublish it instead.",
    };
  }
  refreshCatalog();
  return ok;
}

export async function loadMoreAdminProductsAction(options: AdminProductsQueryOptions) {
  await requireRole("ADMIN");
  const result = await getAdminProducts(options);
  return {
    ...result,
    products: result.products.map((p) => ({
      ...p,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    })),
  };
}

export async function toggleProductFeaturedAction(
  productId: string,
  isFeatured: boolean
): Promise<AdminActionState & { isFeatured?: boolean }> {
  await requireRole("ADMIN");
  if (!productId) return { error: "Missing product ID." };

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { isFeatured },
      select: { id: true, name: true, isFeatured: true },
    });

    refreshCatalog();
    return {
      error: null,
      message: updated.isFeatured
        ? `"${updated.name}" is now pinned / featured.`
        : `"${updated.name}" unpinned from featured.`,
      isFeatured: updated.isFeatured,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to toggle featured status.",
    };
  }
}

