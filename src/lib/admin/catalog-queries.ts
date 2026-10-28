import "server-only";

import { ProductStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type AdminProductsQueryOptions = {
  search?: string;
  category?: string;
  status?: string;
  stockStatus?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type AdminProductVariantItem = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  costPrice: number;
  sellingPrice: number;
  discountPrice: number | null;
  stock: number;
};

export type AdminProductItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  primaryImage: string | null;
  categories: { id: string; name: string; slug: string }[];
  categoryNames: string[];
  variantCount: number;
  totalStock: number;
  skus: string[];
  minCostPrice: number | null;
  maxCostPrice: number | null;
  minSellingPrice: number | null;
  maxSellingPrice: number | null;
  minDiscountPrice: number | null;
  variants: AdminProductVariantItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type AdminProductsResult = {
  products: AdminProductItem[];
  allCategories: { id: string; name: string; slug: string }[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
};

export async function getAdminCategories() {
  await requireRole("ADMIN");
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      parent: { select: { name: true } },
      isActive: true,
      sortOrder: true,
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
            isActive: true,
            sortOrder: true,
          },
        })
      : Promise.resolve(null),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  return { category, categories };
}

export async function getAdminProducts(
  options?: AdminProductsQueryOptions
): Promise<AdminProductsResult> {
  await requireRole("ADMIN");

  const search = options?.search?.trim() || "";
  const categoryFilter = options?.category?.trim() || "all";
  const statusFilter = options?.status?.trim() || "all";
  const stockFilter = options?.stockStatus?.trim() || "all";
  const sort = options?.sort?.trim() || "newest";
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = Math.max(5, Math.min(100, Number(options?.pageSize) || 20));

  const [allCategories, rawProducts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { url: true },
        },
        categories: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            costPrice: true,
            sellingPrice: true,
            discountPrice: true,
            inventoryTransactions: {
              select: { quantity: true },
            },
          },
        },
      },
    }),
  ]);

  const allMappedProducts: AdminProductItem[] = rawProducts.map((p) => {
    const costPrices = p.variants.map((v) => Number(v.costPrice));
    const sellingPrices = p.variants.map((v) => Number(v.sellingPrice));
    const discountPrices = p.variants
      .filter((v) => v.discountPrice !== null && v.discountPrice.lt(v.sellingPrice))
      .map((v) => Number(v.discountPrice!));

    const mappedVariants: AdminProductVariantItem[] = p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size ?? null,
      color: v.color ?? null,
      costPrice: Number(v.costPrice),
      sellingPrice: Number(v.sellingPrice),
      discountPrice: v.discountPrice !== null ? Number(v.discountPrice) : null,
      stock: v.inventoryTransactions.reduce((sum, tx) => sum + tx.quantity, 0),
    }));

    const totalStock = mappedVariants.reduce((acc, v) => acc + v.stock, 0);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      primaryImage: p.images[0]?.url ?? null,
      categories: p.categories,
      categoryNames: p.categories.map((c) => c.name),
      variantCount: p.variants.length,
      totalStock,
      skus: p.variants.map((v) => v.sku),
      minCostPrice: costPrices.length ? Math.min(...costPrices) : null,
      maxCostPrice: costPrices.length ? Math.max(...costPrices) : null,
      minSellingPrice: sellingPrices.length ? Math.min(...sellingPrices) : null,
      maxSellingPrice: sellingPrices.length ? Math.max(...sellingPrices) : null,
      minDiscountPrice: discountPrices.length ? Math.min(...discountPrices) : null,
      variants: mappedVariants,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  const counts = {
    total: allMappedProducts.length,
    published: allMappedProducts.filter((p) => p.status === "PUBLISHED").length,
    draft: allMappedProducts.filter((p) => p.status === "DRAFT").length,
    archived: allMappedProducts.filter((p) => p.status === "ARCHIVED").length,
    inStock: allMappedProducts.filter((p) => p.totalStock > 0).length,
    lowStock: allMappedProducts.filter((p) => p.totalStock > 0 && p.totalStock <= 5).length,
    outOfStock: allMappedProducts.filter((p) => p.totalStock <= 0).length,
  };

  let filtered = allMappedProducts;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesSlug = p.slug.toLowerCase().includes(q);
      const matchesSku = p.skus.some((s) => s.toLowerCase().includes(q));
      const matchesCat = p.categoryNames.some((c) => c.toLowerCase().includes(q));
      return matchesName || matchesSlug || matchesSku || matchesCat;
    });
  }

  if (statusFilter && statusFilter.toUpperCase() !== "ALL") {
    filtered = filtered.filter((p) => p.status === statusFilter.toUpperCase());
  }

  if (categoryFilter && categoryFilter.toLowerCase() !== "all") {
    filtered = filtered.filter((p) =>
      p.categories.some((c) => c.id === categoryFilter || c.slug === categoryFilter)
    );
  }

  if (stockFilter && stockFilter.toLowerCase() !== "all") {
    const sf = stockFilter.toLowerCase();
    if (sf === "in-stock") {
      filtered = filtered.filter((p) => p.totalStock > 0);
    } else if (sf === "low-stock") {
      filtered = filtered.filter((p) => p.totalStock > 0 && p.totalStock <= 5);
    } else if (sf === "out-of-stock") {
      filtered = filtered.filter((p) => p.totalStock <= 0);
    }
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "price_asc":
        return (a.minSellingPrice ?? 0) - (b.minSellingPrice ?? 0);
      case "price_desc":
        return (b.minSellingPrice ?? 0) - (a.minSellingPrice ?? 0);
      case "stock_asc":
        return a.totalStock - b.totalStock;
      case "stock_desc":
        return b.totalStock - a.totalStock;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const paginatedProducts = filtered.slice(offset, offset + pageSize);

  return {
    products: paginatedProducts,
    allCategories,
    totalFiltered,
    page: currentPage,
    pageSize,
    totalPages,
    counts,
  };
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
                weight: true,
                inventoryTransactions: {
                  select: { quantity: true },
                },
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
            weight: variant.weight ? String(variant.weight) : "",
            costPrice: variant.costPrice.toFixed(2),
            sellingPrice: variant.sellingPrice.toFixed(2),
            discountPrice: variant.discountPrice?.toFixed(2) ?? "",
            stock: String(variant.inventoryTransactions.reduce((acc, t) => acc + t.quantity, 0)),
          })),
          images: product.images,
          status: product.status as ProductStatus,
        }
      : null,
    categories,
  };
}

export type CategoryAssignedProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  primaryImage: string | null;
  categoryNames: string[];
  variantCount: number;
  totalStock: number;
  minSellingPrice: number | null;
  minDiscountPrice: number | null;
};

export type CategoryAvailableProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  primaryImage: string | null;
  categoryNames: string[];
  totalStock: number;
  minSellingPrice: number | null;
};

export type AdminCategoryDetail = {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    sortOrder: number;
    parentId: string | null;
    parent: { id: string; name: string; slug: string } | null;
    children: {
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      sortOrder: number;
      productCount: number;
    }[];
  };
  products: CategoryAssignedProduct[];
  metrics: {
    totalProducts: number;
    totalStockUnits: number;
    inStockCount: number;
    outOfStockCount: number;
    publishedCount: number;
    subCategoryCount: number;
  };
};

export async function getAdminCategoryDetail(id: string): Promise<AdminCategoryDetail | null> {
  await requireRole("ADMIN");

  const raw = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          sortOrder: true,
          _count: { select: { products: true } },
        },
      },
      products: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
            select: { url: true },
          },
          categories: { select: { name: true } },
          variants: {
            select: {
              id: true,
              sellingPrice: true,
              discountPrice: true,
              inventoryTransactions: { select: { quantity: true } },
            },
          },
        },
      },
    },
  });

  if (!raw) return null;

  const products: CategoryAssignedProduct[] = raw.products.map((p) => {
    const sellingPrices = p.variants.map((v) => Number(v.sellingPrice));
    const discountPrices = p.variants
      .filter((v) => v.discountPrice !== null && v.discountPrice.lt(v.sellingPrice))
      .map((v) => Number(v.discountPrice!));

    const totalStock = p.variants.reduce(
      (sum, v) => sum + v.inventoryTransactions.reduce((txSum, tx) => txSum + tx.quantity, 0),
      0
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      primaryImage: p.images[0]?.url ?? null,
      categoryNames: p.categories.map((c) => c.name),
      variantCount: p.variants.length,
      totalStock,
      minSellingPrice: sellingPrices.length ? Math.min(...sellingPrices) : null,
      minDiscountPrice: discountPrices.length ? Math.min(...discountPrices) : null,
    };
  });

  const totalStockUnits = products.reduce((acc, p) => acc + p.totalStock, 0);

  return {
    category: {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      imageUrl: raw.imageUrl,
      isActive: raw.isActive,
      sortOrder: raw.sortOrder,
      parentId: raw.parentId,
      parent: raw.parent,
      children: raw.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        productCount: c._count.products,
      })),
    },
    products,
    metrics: {
      totalProducts: products.length,
      totalStockUnits,
      inStockCount: products.filter((p) => p.totalStock > 0).length,
      outOfStockCount: products.filter((p) => p.totalStock <= 0).length,
      publishedCount: products.filter((p) => p.status === "PUBLISHED").length,
      subCategoryCount: raw.children.length,
    },
  };
}

export async function getAdminAvailableProductsForCategory(
  categoryId: string
): Promise<CategoryAvailableProduct[]> {
  await requireRole("ADMIN");

  const raw = await prisma.product.findMany({
    where: {
      categories: {
        none: { id: categoryId },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { url: true },
      },
      categories: { select: { name: true } },
      variants: {
        select: {
          id: true,
          sellingPrice: true,
          inventoryTransactions: { select: { quantity: true } },
        },
      },
    },
  });

  return raw.map((p) => {
    const sellingPrices = p.variants.map((v) => Number(v.sellingPrice));
    const totalStock = p.variants.reduce(
      (sum, v) => sum + v.inventoryTransactions.reduce((txSum, tx) => txSum + tx.quantity, 0),
      0
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      primaryImage: p.images[0]?.url ?? null,
      categoryNames: p.categories.map((c) => c.name),
      totalStock,
      minSellingPrice: sellingPrices.length ? Math.min(...sellingPrices) : null,
    };
  });
}
