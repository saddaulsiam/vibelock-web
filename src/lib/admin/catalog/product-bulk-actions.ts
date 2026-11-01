"use server";

import { Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { getAdminProducts, type AdminProductsQueryOptions } from "./catalog-queries";
import { type AdminActionState, refreshCatalog } from "./catalog-action-helpers";

export async function bulkUpdateProductStatusAction(
  productIds: string[],
  status: ProductStatus
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { error: "No products selected." };
  }
  const validStatus = z.nativeEnum(ProductStatus).safeParse(status);
  if (!validStatus.success) {
    return { error: "Invalid product status." };
  }

  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { status: validStatus.data },
  });

  refreshCatalog();
  return {
    error: null,
    message: `Updated status to ${status.toLowerCase()} for ${productIds.length} product(s).`,
  };
}

export async function bulkDeleteProductsAction(productIds: string[]): Promise<AdminActionState> {
  await requireRole("ADMIN");
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { error: "No products selected." };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
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

  const safeToDeleteIds: string[] = [];
  const blockedNames: string[] = [];

  for (const product of products) {
    const hasHistory =
      product._count.reviews > 0 ||
      product.variants.some(
        (v) =>
          v._count.inventoryTransactions > 0 ||
          v._count.inventoryReservations > 0 ||
          v._count.cartItems > 0
      );

    if (hasHistory) {
      blockedNames.push(product.name);
    } else {
      safeToDeleteIds.push(product.id);
    }
  }

  if (safeToDeleteIds.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: safeToDeleteIds } },
    });
    refreshCatalog();
  }

  if (blockedNames.length > 0) {
    if (safeToDeleteIds.length === 0) {
      return {
        error: `Cannot delete selected product(s) because they have inventory, orders, or reviews. Unpublish them instead.`,
      };
    }
    return {
      error: null,
      message: `Deleted ${safeToDeleteIds.length} product(s). ${blockedNames.length} could not be deleted due to existing history and should be unpublished instead.`,
    };
  }

  return {
    error: null,
    message: `Successfully deleted ${safeToDeleteIds.length} product(s).`,
  };
}

function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // Formula injection defense: prefix with single quote if starting with =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function exportAdminProductsCsvAction(
  options: AdminProductsQueryOptions
): Promise<{ error: string | null; csv?: string; filename?: string }> {
  await requireRole("ADMIN");
  const result = await getAdminProducts({
    ...options,
    page: 1,
    pageSize: 5000,
  });

  const headers = [
    "Product Name",
    "Slug",
    "Status",
    "Categories",
    "Total Stock",
    "Variants Count",
    "SKUs",
    "Min Price (BDT)",
    "Max Price (BDT)",
    "Min Discount Price (BDT)",
  ];

  const rows = result.products.map((p) => [
    sanitizeCsvCell(p.name),
    sanitizeCsvCell(p.slug),
    sanitizeCsvCell(p.status),
    sanitizeCsvCell(p.categoryNames.join("; ")),
    sanitizeCsvCell(p.totalStock),
    sanitizeCsvCell(p.variantCount),
    sanitizeCsvCell(p.skus.join("; ")),
    sanitizeCsvCell(p.minSellingPrice ?? ""),
    sanitizeCsvCell(p.maxSellingPrice ?? ""),
    sanitizeCsvCell(p.minDiscountPrice ?? ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  return {
    error: null,
    csv: csvContent,
    filename: `vibelock-products-${dateStr}.csv`,
  };
}

export async function bulkAssignProductCategoryAction(
  productIds: string[],
  categoryId: string,
  mode: "add" | "replace" = "add"
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { error: "No products selected." };
  }
  if (!categoryId) {
    return { error: "Please select a category." };
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });
  if (!category) {
    return { error: "Category not found." };
  }

  await prisma.$transaction(async (tx) => {
    for (const pid of productIds) {
      if (mode === "replace") {
        await tx.product.update({
          where: { id: pid },
          data: {
            categories: {
              set: [{ id: categoryId }],
            },
          },
        });
      } else {
        await tx.product.update({
          where: { id: pid },
          data: {
            categories: {
              connect: [{ id: categoryId }],
            },
          },
        });
      }
    }
  });

  refreshCatalog();
  return {
    error: null,
    message: `Assigned category "${category.name}" to ${productIds.length} product(s).`,
  };
}

export async function quickUpdateProductPricesAction(
  productId: string,
  prices: { sellingPrice: number; discountPrice: number | null }
): Promise<AdminActionState> {
  await requireRole("ADMIN");
  if (!productId) return { error: "Missing product ID." };

  const sellingPrice = Number(prices.sellingPrice);
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    return { error: "Selling price must be a valid non-negative number." };
  }

  let discountPrice: Prisma.Decimal | null = null;
  if (
    prices.discountPrice !== null &&
    prices.discountPrice !== undefined &&
    prices.discountPrice !== ("" as unknown as number)
  ) {
    const discNum = Number(prices.discountPrice);
    if (isNaN(discNum) || discNum < 0) {
      return { error: "Discount price must be a non-negative number." };
    }
    if (discNum >= sellingPrice) {
      return { error: "Discount price must be lower than selling price." };
    }
    discountPrice = new Prisma.Decimal(discNum);
  }

  await prisma.productVariant.updateMany({
    where: { productId },
    data: {
      sellingPrice: new Prisma.Decimal(sellingPrice),
      discountPrice,
    },
  });

  refreshCatalog();
  return {
    error: null,
    message: "Product prices updated successfully.",
  };
}
