import { Prisma, ShipmentStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import {
  type AdminShippingKPIs,
  type AdminShipmentListItem,
  type ShipmentFilter,
} from "./shipping-shared";

export * from "./shipping-shared";

const pageSize = 20;

function pageNumber(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function getAdminShippingOverviewKPIs(): Promise<AdminShippingKPIs> {
  await requireRole("ADMIN");

  const [
    totalShipments,
    inTransitCount,
    deliveredCount,
    returnedOrFailedCount,
    providerCounts,
    pendingCodOrders,
  ] = await Promise.all([
    prisma.shipment.count(),
    prisma.shipment.count({
      where: {
        status: {
          in: [
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.CREATED,
          ],
        },
      },
    }),
    prisma.shipment.count({
      where: { status: ShipmentStatus.DELIVERED },
    }),
    prisma.shipment.count({
      where: {
        status: {
          in: [ShipmentStatus.RETURNED, ShipmentStatus.FAILED, ShipmentStatus.CANCELLED],
        },
      },
    }),
    prisma.shipment.groupBy({
      by: ["provider"],
      _count: true,
    }),
    prisma.shipment.findMany({
      where: {
        status: {
          in: [
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.CREATED,
          ],
        },
        order: {
          paymentMethod: "COD",
          paymentStatus: { not: "SUCCESS" },
        },
      },
      select: {
        order: {
          select: { total: true },
        },
      },
    }),
  ]);

  const pendingCodAmount = pendingCodOrders.reduce(
    (sum, s) => sum + Number(s.order.total || 0),
    0
  );

  const successRate =
    totalShipments > 0 ? Math.round((deliveredCount / totalShipments) * 100) : 0;

  const providerBreakdown = {
    steadfast: 0,
    manual: 0,
    other: 0,
  };
  providerCounts.forEach((p) => {
    const prov = p.provider.toUpperCase();
    if (prov.includes("STEADFAST")) {
      providerBreakdown.steadfast += p._count;
    } else if (prov.includes("MANUAL")) {
      providerBreakdown.manual += p._count;
    } else {
      providerBreakdown.other += p._count;
    }
  });

  return {
    totalShipments,
    inTransitCount,
    deliveredCount,
    returnedOrFailedCount,
    pendingCodAmount,
    successRate,
    providerBreakdown,
  };
}

export async function getAdminShipments({
  search,
  filter = "all",
  provider,
  page = 1,
  pageSize: customPageSize = 20,
}: {
  search?: string;
  filter?: ShipmentFilter;
  provider?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  shipments: AdminShipmentListItem[];
  total: number;
  segmentCounts: {
    all: number;
    in_transit: number;
    delivered: number;
    returned: number;
    pending: number;
  };
}> {
  await requireRole("ADMIN");
  const currentPage = pageNumber(page);

  // Status mapping
  const statusFilter: Prisma.ShipmentWhereInput["status"] =
    filter === "in_transit"
      ? {
          in: [
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.CREATED,
          ],
        }
      : filter === "delivered"
        ? ShipmentStatus.DELIVERED
        : filter === "returned"
          ? { in: [ShipmentStatus.RETURNED, ShipmentStatus.FAILED, ShipmentStatus.CANCELLED] }
          : filter === "pending"
            ? ShipmentStatus.PENDING
            : undefined;

  const providerFilter =
    provider && provider !== "ALL"
      ? { contains: provider, mode: "insensitive" as const }
      : undefined;

  const searchFilter: Prisma.ShipmentWhereInput | undefined = search?.trim()
    ? {
        OR: [
          { trackingNumber: { contains: search.trim(), mode: "insensitive" } },
          { providerShipmentId: { contains: search.trim(), mode: "insensitive" } },
          { order: { orderNumber: { contains: search.trim(), mode: "insensitive" } } },
          { order: { customerName: { contains: search.trim(), mode: "insensitive" } } },
          { order: { customerPhone: { contains: search.trim(), mode: "insensitive" } } },
        ],
      }
    : undefined;

  const where: Prisma.ShipmentWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(providerFilter ? { provider: providerFilter } : {}),
    ...(searchFilter ? searchFilter : {}),
  };

  const [rawShipments, total, countAll, countInTransit, countDelivered, countReturned, countPending] =
    await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * customPageSize,
        take: customPageSize,
        select: {
          id: true,
          provider: true,
          providerShipmentId: true,
          trackingNumber: true,
          status: true,
          shippingAmount: true,
          failureReason: true,
          createdAt: true,
          updatedAt: true,
          shippedAt: true,
          deliveredAt: true,
          cancelledAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              shippingMethodName: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              total: true,
              paymentMethod: true,
              paymentStatus: true,
            },
          },
        },
      }),
      prisma.shipment.count({ where }),
      prisma.shipment.count(),
      prisma.shipment.count({
        where: {
          status: {
            in: [
              ShipmentStatus.IN_TRANSIT,
              ShipmentStatus.OUT_FOR_DELIVERY,
              ShipmentStatus.PICKED_UP,
              ShipmentStatus.CREATED,
            ],
          },
        },
      }),
      prisma.shipment.count({ where: { status: ShipmentStatus.DELIVERED } }),
      prisma.shipment.count({
        where: {
          status: { in: [ShipmentStatus.RETURNED, ShipmentStatus.FAILED, ShipmentStatus.CANCELLED] },
        },
      }),
      prisma.shipment.count({ where: { status: ShipmentStatus.PENDING } }),
    ]);

  const shipments: AdminShipmentListItem[] = rawShipments.map((s) => ({
    id: s.id,
    orderId: s.order.id,
    orderNumber: s.order.orderNumber,
    customerName: s.order.customerName,
    customerEmail: s.order.customerEmail,
    customerPhone: s.order.customerPhone,
    shippingMethodName: s.order.shippingMethodName,
    shippingAmount: Number(s.shippingAmount),
    orderTotal: Number(s.order.total),
    paymentMethod: s.order.paymentMethod,
    paymentStatus: s.order.paymentStatus,
    provider: s.provider,
    providerShipmentId: s.providerShipmentId,
    trackingNumber: s.trackingNumber,
    status: s.status,
    failureReason: s.failureReason,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    shippedAt: s.shippedAt,
    deliveredAt: s.deliveredAt,
    cancelledAt: s.cancelledAt,
  }));

  return {
    shipments,
    total,
    segmentCounts: {
      all: countAll,
      in_transit: countInTransit,
      delivered: countDelivered,
      returned: countReturned,
      pending: countPending,
    },
  };
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
