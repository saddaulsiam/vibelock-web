import "server-only";

import { Prisma, ReturnRequestStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

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
    ];
  }

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
          },
        },
        items: {
          select: {
            quantity: true,
            orderItem: { select: { unitPrice: true } },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns: returns.map((request) => ({
      ...request,
      requestedAmount: request.items.reduce(
        (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
        0
      ),
    })),
    total,
    totalPages: Math.ceil(total / safeLimit),
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
    requestedAmount: returnRequest.items.reduce(
      (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
      0
    ),
    auditLogs,
  };
}
