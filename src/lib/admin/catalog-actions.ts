"use server";

import { randomUUID } from "node:crypto";
import { Prisma, ProductStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type AdminActionState = { error: string | null; message?: string };
const ok: AdminActionState = { error: null, message: "Changes saved." };
const nameField = z.string().trim().min(1, "Name is required.").max(120, "Name must be 120 characters or fewer.");

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromForm(formData: FormData, name: string) {
  const requested = String(formData.get("slug") ?? "").trim();
  const slug = slugify(requested || name);
  return z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).safeParse(slug);
}

function money(value: FormDataEntryValue | null, label: string, allowEmpty = false) {
  const raw = String(value ?? "").trim();
  if (allowEmpty && raw === "") return { success: true as const, data: null };
  return z
    .string()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, `${label} must be a non-negative amount with up to two decimals.`)
    .safeParse(raw);
}

function duplicateMessage(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? "That name or slug is already in use. Choose a unique value."
    : null;
}

function refreshCatalog() {
  updateTag("products");
  updateTag("categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/category/[slug]", "page");
}

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: nameField,
  description: z.string().trim().max(1000).optional(),
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
    parentId: String(formData.get("parentId") ?? "") || undefined,
  };
  const parsed = categorySchema.safeParse(raw);
  const slug = slugFromForm(formData, rawName);
  if (!parsed.success || !slug.success) {
    return { error: parsed.error?.issues[0]?.message ?? "Enter a valid slug using letters, numbers, and hyphens." };
  }

  const { id, name, description, parentId } = parsed.data;
  if (id && parentId === id) return { error: "A category cannot be its own parent." };
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) return { error: "Choose an existing parent category." };
    if (id) {
      let ancestorId: string | null = parentId;
      const visited = new Set<string>();
      while (ancestorId) {
        if (ancestorId === id) return { error: "A category cannot be moved beneath one of its descendants." };
        if (visited.has(ancestorId)) return { error: "The selected category hierarchy is invalid." };
        visited.add(ancestorId);
        const ancestor = await prisma.category.findUnique({ where: { id: ancestorId }, select: { parentId: true } });
        ancestorId = ancestor?.parentId ?? null;
      }
    }
  }

  try {
    if (id) {
      const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return { error: "This category no longer exists." };
      await prisma.category.update({
        where: { id },
        data: { name, slug: slug.data, description: description || null, parentId: parentId ?? null },
      });
    } else {
      await prisma.category.create({
        data: { name, slug: slug.data, description: description || null, parentId: parentId ?? null },
      });
    }
  } catch (error) {
    return { error: duplicateMessage(error) ?? "The category could not be saved. Please try again." };
  }

  refreshCatalog();
  return ok;
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
    return { error: "This category has products or child categories. Reassign them before deleting it." };
  }
  try {
    await prisma.category.delete({ where: { id: id.data } });
  } catch {
    return { error: "The category is still in use and could not be deleted." };
  }
  refreshCatalog();
  return ok;
}

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: nameField,
  description: z.string().trim().max(5000).optional(),
  categoryIds: z.array(z.string().uuid()).max(30),
  status: z.nativeEnum(ProductStatus),
});

type ProductValues = {
  id?: string;
  name: string;
  description?: string;
  categoryIds: string[];
  status: ProductStatus;
  slug: string;
  costPrice: string;
  sellingPrice: string;
  discountPrice: string | null;
};

function parseProduct(formData: FormData) {
  const rawName = String(formData.get("name") ?? "");
  const parsed = productSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: rawName,
    description: String(formData.get("description") ?? "") || undefined,
    categoryIds: formData.getAll("categoryIds").map(String),
    status: String(formData.get("status") ?? ""),
  });
  const slug = slugFromForm(formData, rawName);
  const costPrice = money(formData.get("costPrice"), "Cost price");
  const sellingPrice = money(formData.get("sellingPrice"), "Selling price");
  const discountPrice = money(formData.get("discountPrice"), "Discount price", true);
  if (!parsed.success || !slug.success || !costPrice.success || !sellingPrice.success || !discountPrice.success) {
    const issue = parsed.error?.issues[0]?.message ??
      (!slug.success ? "Enter a valid slug using letters, numbers, and hyphens." :
      !costPrice.success ? costPrice.error.issues[0]?.message :
      !sellingPrice.success ? sellingPrice.error.issues[0]?.message : discountPrice.success ? undefined : discountPrice.error.issues[0]?.message);
    return { error: issue ?? "Enter valid product details and prices." } as const;
  }
  if (discountPrice.data !== null && Number(discountPrice.data) >= Number(sellingPrice.data)) {
    return { error: "Discount price must be lower than selling price." } as const;
  }
  return {
    data: {
      ...parsed.data,
      slug: slug.data,
      costPrice: costPrice.data,
      sellingPrice: sellingPrice.data,
      discountPrice: discountPrice.data,
    } satisfies ProductValues,
  } as const;
}

async function validateCategories(categoryIds: string[]) {
  const uniqueIds = [...new Set(categoryIds)];
  if (uniqueIds.length !== categoryIds.length) return false;
  return (await prisma.category.count({ where: { id: { in: uniqueIds } } })) === uniqueIds.length;
}

export async function saveProductAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const parsed = parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };
  const product = parsed.data;
  if (!(await validateCategories(product.categoryIds))) return { error: "One or more selected categories are unavailable." };

  try {
    if (product.id) {
      const existing = await prisma.product.findUnique({
        where: { id: product.id },
        select: { id: true, _count: { select: { variants: true } } },
      });
      if (!existing) return { error: "This product no longer exists." };
      const mutations = [
        prisma.product.update({
          where: { id: product.id },
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description || null,
            status: product.status,
            categories: { set: product.categoryIds.map((id) => ({ id })) },
          },
        }),
        prisma.productVariant.updateMany({
          where: { productId: product.id },
          data: {
            costPrice: new Prisma.Decimal(product.costPrice),
            sellingPrice: new Prisma.Decimal(product.sellingPrice),
            discountPrice: product.discountPrice === null ? null : new Prisma.Decimal(product.discountPrice),
          },
        }),
      ];
      if (existing._count.variants === 0) {
        mutations.push(
          prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `VL-${slugify(product.slug).slice(0, 24).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
              costPrice: new Prisma.Decimal(product.costPrice),
              sellingPrice: new Prisma.Decimal(product.sellingPrice),
              discountPrice: product.discountPrice === null ? null : new Prisma.Decimal(product.discountPrice),
            },
          })
        );
      }
      await prisma.$transaction(mutations);
    } else {
      const base = await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          description: product.description || null,
          status: product.status,
          categories: { connect: product.categoryIds.map((id) => ({ id })) },
          variants: {
            create: {
              sku: `VL-${slugify(product.slug).slice(0, 24).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
              costPrice: new Prisma.Decimal(product.costPrice),
              sellingPrice: new Prisma.Decimal(product.sellingPrice),
              discountPrice: product.discountPrice === null ? null : new Prisma.Decimal(product.discountPrice),
            },
          },
        },
        select: { id: true },
      });
      if (!base.id) return { error: "The product could not be created." };
    }
  } catch (error) {
    return { error: duplicateMessage(error) ?? "The product could not be saved. Please try again." };
  }
  refreshCatalog();
  return ok;
}

export async function toggleProductPublishedAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Choose a valid product." };
  const product = await prisma.product.findUnique({ where: { id: id.data }, select: { status: true } });
  if (!product) return { error: "This product no longer exists." };
  await prisma.product.update({
    where: { id: id.data },
    data: { status: product.status === ProductStatus.PUBLISHED ? ProductStatus.DRAFT : ProductStatus.PUBLISHED },
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
          _count: { select: { inventoryTransactions: true, inventoryReservations: true, cartItems: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  });
  if (!product) return { error: "This product no longer exists." };
  if (
    product._count.reviews > 0 ||
    product.variants.some((variant) =>
      variant._count.inventoryTransactions > 0 ||
      variant._count.inventoryReservations > 0 ||
      variant._count.cartItems > 0
    )
  ) {
    return { error: "This product has reviews, cart items, or inventory history. Unpublish it instead of deleting it." };
  }
  try {
    await prisma.product.delete({ where: { id: id.data } });
  } catch {
    return { error: "This product is still in use and could not be deleted. Unpublish it instead." };
  }
  refreshCatalog();
  return ok;
}
