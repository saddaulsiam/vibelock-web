import "server-only";

import { OrderStatus, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

export async function getAdminOrders({
  status,
  search,
  page = 1,
  limit = 20,
}: {
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireRole("ADMIN");

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        customerEmail: true,
        customerName: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    total,
    totalPages: Math.ceil(total / limit),
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

  return order;
}
