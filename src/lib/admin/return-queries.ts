import "server-only";

import { Prisma, ReturnRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export type ReturnReverseLogistics = {
  provider: string;
  consignmentId: string;
  trackingCode: string;
  bookedAt: string;
  trackingUrl: string;
  labelUrl?: string | null;
};

export type AdminReturnListItem = {
  id: string;
  status: ReturnRequestStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    customerEmail: string;
    customerPhone: string | null;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
  };
  items: {
    id: string;
    quantity: number;
    orderItem: {
      id: string;
      productName: string;
      sku: string;
      size: string | null;
      color: string | null;
      unitPrice: number;
      lineTotal: number;
    };
  }[];
  totalQuantity: number;
  requestedAmount: number;
  reverseLogistics?: ReturnReverseLogistics | null;
};

export async function getAdminReturns({
  status,
  search,
  page = 1,
  limit = 20,
}: {
  status?: ReturnRequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireRole("ADMIN");

  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  const where: Prisma.ReturnRequestWhereInput = {};

  if (status) where.status = status;
  if (search?.trim()) {
    const value = search.trim();
    where.OR = [
      { order: { orderNumber: { contains: value, mode: "insensitive" } } },
      { order: { customerName: { contains: value, mode: "insensitive" } } },
      { order: { customerEmail: { contains: value, mode: "insensitive" } } },
      { order: { customerPhone: { contains: value, mode: "insensitive" } } },
      { reason: { contains: value, mode: "insensitive" } },
      { items: { some: { orderItem: { productName: { contains: value, mode: "insensitive" } } } } },
      { items: { some: { orderItem: { sku: { contains: value, mode: "insensitive" } } } } },
    ];
  }

  // Calculate search-scoped status counts for the tabs
  const searchWhere = search?.trim() ? { ...where } : {};
  delete (searchWhere as { status?: unknown }).status;

  const [returns, total, statusGroups, allCount] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            total: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            orderItem: {
              select: {
                id: true,
                productName: true,
                sku: true,
                size: true,
                color: true,
                unitPrice: true,
                lineTotal: true,
              },
            },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
    prisma.returnRequest.groupBy({
      by: ["status"],
      where: searchWhere,
      _count: { _all: true },
    }),
    prisma.returnRequest.count({ where: searchWhere }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: allCount,
    PENDING: 0,
    APPROVED: 0,
    RECEIVED: 0,
    COMPLETED: 0,
    REJECTED: 0,
  };

  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
  }

  // Fetch Steadfast return pickup logs for the retrieved returns
  const returnIds = returns.map((r) => r.id);
  const pickupLogs =
    returnIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            entityType: "ReturnRequest",
            entityId: { in: returnIds },
            action: "RETURN_PICKUP_BOOKED",
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const pickupMap = new Map<string, ReturnReverseLogistics>();
  for (const log of pickupLogs) {
    if (!pickupMap.has(log.entityId)) {
      const meta = log.metadata as Record<string, unknown> | null;
      if (meta?.consignmentId && meta?.trackingCode) {
        pickupMap.set(log.entityId, {
          provider: String(meta.provider || "steadfast"),
          consignmentId: String(meta.consignmentId),
          trackingCode: String(meta.trackingCode),
          bookedAt: String(meta.bookedAt || log.createdAt.toISOString()),
          trackingUrl: `https://steadfast.com.bd/t/${meta.trackingCode}`,
          labelUrl: meta.consignmentId
            ? `https://steadfast.com.bd/user/consignment/print-label/${meta.consignmentId}`
            : null,
        });
      }
    }
  }

  const mappedReturns: AdminReturnListItem[] = returns.map((request) => {
    const requestedAmount = request.items.reduce(
      (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
      0
    );
    const totalQuantity = request.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: request.id,
      status: request.status,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      orderId: request.orderId,
      order: {
        id: request.order.id,
        orderNumber: request.order.orderNumber,
        customerName: request.order.customerName,
        customerEmail: request.order.customerEmail,
        customerPhone: request.order.customerPhone,
        total: Number(request.order.total),
        status: request.order.status,
        paymentStatus: request.order.paymentStatus,
        paymentMethod: request.order.paymentMethod,
      },
      items: request.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        orderItem: {
          id: item.orderItem.id,
          productName: item.orderItem.productName,
          sku: item.orderItem.sku,
          size: item.orderItem.size,
          color: item.orderItem.color,
          unitPrice: Number(item.orderItem.unitPrice),
          lineTotal: Number(item.orderItem.lineTotal),
        },
      })),
      totalQuantity,
      requestedAmount,
      reverseLogistics: pickupMap.get(request.id) || null,
    };
  });

  return {
    returns: mappedReturns,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    page: safePage,
    limit: safeLimit,
    statusCounts,
  };
}

export async function getAdminReturnById(id: string) {
  await requireRole("ADMIN");

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
          history: { orderBy: { createdAt: "desc" } },
          payments: { include: { refunds: { orderBy: { createdAt: "desc" } } } },
          shipment: true,
        },
      },
      items: {
        include: { orderItem: true },
      },
    },
  });

  if (!returnRequest) return null;

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "ReturnRequest", entityId: id },
        {
          entityType: "Refund",
          entityId: {
            in: returnRequest.order.payments.flatMap((payment) =>
              payment.refunds.map((refund) => refund.id)
            ),
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });

  return {
    ...returnRequest,
    order: {
      ...returnRequest.order,
      total: Number(returnRequest.order.total),
      subtotal: Number(returnRequest.order.subtotal),
      shippingCost: Number(returnRequest.order.shippingCost),
      discount: Number(returnRequest.order.discount),
      items: returnRequest.order.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        costPrice: Number(it.costPrice),
        lineTotal: Number(it.lineTotal),
      })),
    },
    items: returnRequest.items.map((it) => ({
      ...it,
      orderItem: {
        ...it.orderItem,
        unitPrice: Number(it.orderItem.unitPrice),
        costPrice: Number(it.orderItem.costPrice),
        lineTotal: Number(it.orderItem.lineTotal),
      },
    })),
    requestedAmount: returnRequest.items.reduce(
      (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
      0
    ),
    auditLogs,
    reverseLogistics: (() => {
      const log = auditLogs.find((l) => l.action === "RETURN_PICKUP_BOOKED");
      const meta = (log?.metadata as Record<string, unknown> | null) || null;
      if (meta?.consignmentId && meta?.trackingCode) {
        return {
          provider: String(meta.provider || "steadfast"),
          consignmentId: String(meta.consignmentId),
          trackingCode: String(meta.trackingCode),
          bookedAt: String(meta.bookedAt || log?.createdAt.toISOString()),
          trackingUrl: `https://steadfast.com.bd/t/${meta.trackingCode}`,
          labelUrl: meta.consignmentId
            ? `https://steadfast.com.bd/user/consignment/print-label/${meta.consignmentId}`
            : null,
        } as ReturnReverseLogistics;
      }
      return null;
    })(),
  };
}
