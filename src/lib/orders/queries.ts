import "server-only";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { mapOrderSummary, mapOrderDetail } from "./mappers";
import { OrderSummary, OrderDetail, OrderConfirmation } from "./types";

export async function getCustomerOrders(
  page = 1,
  pageSize = 10
): Promise<{ orders: OrderSummary[]; total: number }> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        shipment: true,
        payments: {
          select: { gateway: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    orders: orders.map(mapOrderSummary),
    total,
  };
}

export async function getCustomerOrder(orderNumber: string): Promise<OrderDetail | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const order = await prisma.order.findUnique({
    where: {
      orderNumber,
      userId, // CRITICAL: Only fetch if it belongs to the authenticated user
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
      returns: {
        include: { items: true },
      },
      payments: {
        include: { refunds: true },
      },
      shipment: true,
      history: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return null;
  }

  // Resolve product thumbnail images by SKU (same pattern as getCustomerOrderConfirmation)
  const skus = order.items.map((it) => it.sku).filter(Boolean);
  let imageBySku = new Map<string, string>();
  if (skus.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      select: {
        sku: true,
        product: {
          select: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });
    imageBySku = new Map(
      variants
        .filter((v) => v.product.images[0]?.url)
        .map((v) => [v.sku, v.product.images[0].url])
    );
  }

  return mapOrderDetail(order, imageBySku);
}

/**
 * Read only the order and item snapshot needed by the public confirmation page.
 * This avoids coupling that page to optional order relations such as shipment,
 * returns, and payments while retaining the same authenticated ownership check.
 */
export async function getCustomerOrderConfirmation(
  orderNumber: string
): Promise<OrderConfirmation | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId: session.user.id,
    },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingState: true,
      shippingZip: true,
      shippingCountry: true,
      shippingMethodName: true,
      subtotal: true,
      shippingCost: true,
      taxAmount: true,
      discount: true,
      total: true,
      payments: {
        select: {
          gateway: true,
          gatewayTransactionId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      items: {
        select: {
          productName: true,
          sku: true,
          size: true,
          color: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!order) return null;

  // Resolve product thumbnail images by SKU
  const skus = order.items.map((it) => it.sku).filter(Boolean);
  let imageBySku = new Map<string, string>();
  if (skus.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      select: {
        sku: true,
        product: {
          select: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });
    imageBySku = new Map(
      variants
        .filter((v) => v.product.images[0]?.url)
        .map((v) => [v.sku, v.product.images[0].url])
    );
  }

  const latestPayment = order.payments?.[0];
  const paymentGateway =
    latestPayment?.gateway ?? (order.paymentMethod === "COD" ? "COD" : "ONLINE");

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentGateway,
    transactionId: latestPayment?.gatewayTransactionId ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingStreet: order.shippingStreet,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingZip: order.shippingZip,
    shippingCountry: order.shippingCountry,
    shippingMethodName: order.shippingMethodName,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      size: item.size,
      color: item.color,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
      imageUrl: imageBySku.get(item.sku) ?? null,
    })),
  };
}
