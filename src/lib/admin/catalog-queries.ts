import "server-only";

import { ProductStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export async function getAdminCategories() {
  await requireRole("ADMIN");
  return prisma.category.findMany({
    orderBy: [{ name: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export async function getAdminCategoryFormData(id?: string) {
  await requireRole("ADMIN");
  const [category, categories] = await Promise.all([
    id
      ? prisma.category.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            parentId: true,
          },
        })
      : Promise.resolve(null),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { category, categories };
}

export async function getAdminProducts() {
  await requireRole("ADMIN");
  const products = await prisma.product.findMany({
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      categories: { select: { name: true } },
      variants: { select: { sellingPrice: true, discountPrice: true } },
    },
  });
  return products.map((product) => {
    const sellingPrices = product.variants.map((variant) => variant.sellingPrice);
    const discountPrices = product.variants
      .filter(
        (variant) =>
          variant.discountPrice !== null && variant.discountPrice.lt(variant.sellingPrice)
      )
      .map((variant) => variant.discountPrice!);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      categories: product.categories.map((category) => category.name),
      minSellingPrice: sellingPrices.length
        ? Math.min(...sellingPrices.map((price) => Number(price)))
        : null,
      minDiscountPrice: discountPrices.length
        ? Math.min(...discountPrices.map((price) => Number(price)))
        : null,
    };
  });
}

export async function getAdminProductFormData(id?: string) {
  await requireRole("ADMIN");
  const [product, categories] = await Promise.all([
    id
      ? prisma.product.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            categories: { select: { id: true } },
            variants: {
              orderBy: [{ createdAt: "asc" }, { sku: "asc" }],
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                costPrice: true,
                sellingPrice: true,
                discountPrice: true,
              },
            },
            images: {
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              select: { url: true, alt: true, isPrimary: true },
            },
          },
        })
      : Promise.resolve(null),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return {
    product: product
      ? {
          ...product,
          categoryIds: product.categories.map((category) => category.id),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size ?? "",
            color: variant.color ?? "",
            costPrice: variant.costPrice.toFixed(2),
            sellingPrice: variant.sellingPrice.toFixed(2),
            discountPrice: variant.discountPrice?.toFixed(2) ?? "",
          })),
          images: product.images,
          status: product.status as ProductStatus,
        }
      : null,
    categories,
  };
}
