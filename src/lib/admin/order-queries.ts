import "server-only";

import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, SalesChannel } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type AdminOrderDateRange = "today" | "yesterday" | "7d" | "30d";

export interface AdminOrderItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  salesChannel: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingCity: string;
  itemCount: number;
  itemsSummary?: string;
  createdAt: string;
  shipment?: {
    provider: string;
    trackingNumber: string | null;
    status: string;
  } | null;
}

export interface AdminOrdersResult {
  orders: AdminOrderItem[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  statusCounts: Record<string, number>;
}

export async function getAdminOrders({
  status,
  paymentStatus,
  paymentMethod,
  salesChannel,
  dateRange,
  search,
  page = 1,
  limit = 20,
}: {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  salesChannel?: SalesChannel;
  dateRange?: AdminOrderDateRange;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrdersResult> {
  await requireRole("ADMIN");

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (salesChannel) {
    where.salesChannel = salesChannel;
  }

  if (dateRange) {
    const now = new Date();
    if (dateRange === "today") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: startOfToday };
    } else if (dateRange === "yesterday") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.createdAt = { gte: startOfYesterday, lt: endOfYesterday };
    } else if (dateRange === "7d") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: sevenDaysAgo };
    } else if (dateRange === "30d") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: thirtyDaysAgo };
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { shippingCity: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total, statusGroups] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (page - 1) * limit),
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        salesChannel: true,
        total: true,
        subtotal: true,
        shippingCost: true,
        discount: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        shippingCity: true,
        createdAt: true,
        items: {
          take: 3,
          select: {
            productName: true,
            size: true,
            quantity: true,
          },
        },
        shipment: {
          select: {
            provider: true,
            trackingNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0,
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };

  let allCount = 0;
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    allCount += group._count._all;
  }
  statusCounts.ALL = allCount;

  const mappedOrders: AdminOrderItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    salesChannel: order.salesChannel,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: Number(order.discount),
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    shippingCity: order.shippingCity,
    itemCount: order._count.items,
    itemsSummary: order.items
      .map(
        (i) =>
          `${i.productName}${i.size ? ` (${i.size})` : ""}${
            i.quantity > 1 ? ` ×${i.quantity}` : ""
          }`
      )
      .join(", "),
    createdAt: order.createdAt.toISOString(),
    shipment: order.shipment
      ? {
          provider: order.shipment.provider,
          trackingNumber: order.shipment.trackingNumber,
          status: order.shipment.status,
        }
      : null,
  }));

  return {
    orders: mappedOrders,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    page,
    limit,
    statusCounts,
  };
}

export async function getAdminOrderById(id: string) {
  await requireRole("ADMIN");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          returnItems: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
      },
      payments: true,
      shipment: true,
      returns: {
        include: {
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  // Retrieve primary product image for each item SKU to assist warehouse packaging
  const skus = Array.from(new Set(order.items.map((i) => i.sku).filter(Boolean)));
  const variants =
    skus.length > 0
      ? await prisma.productVariant.findMany({
          where: { sku: { in: skus } },
          select: {
            sku: true,
            product: {
              select: {
                images: {
                  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        })
      : [];

  const skuImageMap = new Map<string, string>();
  for (const v of variants) {
    const firstImg = v.product.images[0]?.url;
    if (firstImg) {
      skuImageMap.set(v.sku, firstImg);
    }
  }

  // Fallback lookup by product name if any item didn't match SKU
  const missingProductNames = order.items
    .filter((i) => !skuImageMap.has(i.sku) && i.productName)
    .map((i) => i.productName);

  if (missingProductNames.length > 0) {
    const fallbackProducts = await prisma.product.findMany({
      where: { name: { in: missingProductNames } },
      select: {
        name: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { url: true },
        },
      },
    });
    for (const p of fallbackProducts) {
      const img = p.images[0]?.url;
      if (img) {
        skuImageMap.set(p.name, img);
      }
    }
  }

  const itemsWithImages = order.items.map((item) => ({
    ...item,
    unitPrice: Number(item.unitPrice),
    costPrice: Number(item.costPrice),
    appliedDiscount: Number(item.appliedDiscount),
    taxRate: Number(item.taxRate),
    lineSubtotal: Number(item.lineSubtotal),
    discountAmount: Number(item.discountAmount),
    taxAmount: Number(item.taxAmount),
    lineTotal: Number(item.lineTotal),
    imageUrl: skuImageMap.get(item.sku) || skuImageMap.get(item.productName) || null,
  }));

  return {
    ...order,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    discount: Number(order.discount),
    taxRate: Number(order.taxRate),
    shipment: order.shipment
      ? {
          ...order.shipment,
          shippingAmount: Number(order.shipment.shippingAmount),
        }
      : null,
    payments: order.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    items: itemsWithImages,
  };
}
