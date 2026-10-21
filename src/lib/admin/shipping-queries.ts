import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;

function pageNumber(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function getAdminShippingOverview(page = 1) {
  await requireRole("ADMIN");
  const currentPage = pageNumber(page);
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        provider: true,
        providerShipmentId: true,
        trackingNumber: true,
        status: true,
        shippingAmount: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            shippingMethodName: true,
            customerName: true,
            customerEmail: true,
          },
        },
      },
    }),
    prisma.shipment.count(),
  ]);
  return { shipments, total, totalPages: Math.ceil(total / pageSize), page: currentPage };
}

export async function getAdminShippingZones(search?: string) {
  await requireRole("ADMIN");
  return prisma.shippingZone.findMany({
    where: search?.trim() ? { name: { contains: search.trim(), mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      countries: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { methods: true } },
    },
  });
}

export async function getAdminShippingZone(id: string) {
  await requireRole("ADMIN");
  return prisma.shippingZone.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      countries: true,
      methods: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, cost: true, isActive: true },
      },
    },
  });
}

export async function getAdminShippingMethods({
  zoneId,
  active,
}: {
  zoneId?: string;
  active?: boolean;
}) {
  await requireRole("ADMIN");
  return prisma.shippingMethod.findMany({
    where: {
      ...(zoneId ? { zoneId } : {}),
      ...(active === undefined ? {} : { isActive: active }),
    },
    orderBy: [{ zone: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      cost: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      zone: { select: { id: true, name: true } },
    },
  });
}

export async function getAdminShippingMethod(id: string) {
  await requireRole("ADMIN");
  return prisma.shippingMethod.findUnique({
    where: { id },
    select: {
      id: true,
      zoneId: true,
      name: true,
      cost: true,
      isActive: true,
    },
  });
}

export async function getAdminShippingZonesForForm() {
  await requireRole("ADMIN");
  return prisma.shippingZone.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
