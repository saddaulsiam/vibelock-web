import "server-only";

import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { parseReturnReason } from "@/lib/returns/utils";

export async function getAccountOverview() {
  const user = await requireUser();
  const now = new Date();

  const [profile, orderCount, returnCount, addresses, recentOrders, totalSpentAgg, activeCoupons] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          createdAt: true,
          emailVerified: true,
          image: true,
        },
      }),
      prisma.order.count({ where: { userId: user.id } }),
      prisma.returnRequest.count({ where: { order: { userId: user.id } } }),
      prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 2,
      }),
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          total: true,
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              sku: true,
              unitPrice: true,
            },
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          userId: user.id,
          status: { notIn: ["CANCELLED"] },
        },
        _sum: {
          total: true,
        },
      }),
      prisma.coupon.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          minOrderValue: true,
          usageLimit: true,
          usageCount: true,
          endDate: true,
        },
      }),
    ]);

  const unredeemedCoupons = activeCoupons.filter(
    (c) => c.usageLimit === null || c.usageCount < c.usageLimit
  );

  return {
    profile: {
      name: profile?.name ?? user.name ?? null,
      email: profile?.email ?? user.email ?? "",
      createdAt: profile?.createdAt ?? new Date(),
      emailVerified: profile?.emailVerified ?? null,
      image: profile?.image ?? null,
    },
    orderCount,
    returnCount,
    addressCount: addresses.length,
    addresses: addresses.map((addr) => ({
      ...addr,
    })),
    totalSpent: Number(totalSpentAgg._sum.total ?? 0),
    activeCouponsCount: unredeemedCoupons.length,
    coupons: unredeemedCoupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
      endDate: c.endDate,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      itemCount: order.items.reduce((sum, it) => sum + it.quantity, 0),
      items: order.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
      })),
    })),
  };
}

export async function getCustomerAddresses() {
  const user = await requireUser();
  return prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function getCustomerReturns(page = 1, pageSize = 10) {
  const user = await requireUser();
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 10;
  const where = { order: { userId: user.id } };

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      include: {
        order: { select: { orderNumber: true, createdAt: true } },
        items: {
          include: {
            orderItem: {
              select: {
                productName: true,
                sku: true,
                size: true,
                color: true,
                unitPrice: true,
              },
            },
          },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns: returns.map((request) => {
      const parsed = parseReturnReason(request.reason);
      return {
        id: request.id,
        status: request.status,
        reason: parsed.categoryLabel,
        rawReason: request.reason,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        order: request.order,
        itemCount: request.items.reduce((sum, item) => sum + item.quantity, 0),
        requestedAmount: request.items.reduce(
          (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
          0
        ),
        items: request.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          productName: item.orderItem.productName,
          sku: item.orderItem.sku,
          size: item.orderItem.size,
          color: item.orderItem.color,
          unitPrice: Number(item.orderItem.unitPrice),
        })),
      };
    }),
    total,
    totalPages: Math.ceil(total / safePageSize),
  };
}

export async function getCustomerReturnById(id: string) {
  const user = await requireUser();
  const request = await prisma.returnRequest.findFirst({
    where: { id, order: { userId: user.id } },
    include: {
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          shippingStreet: true,
          shippingCity: true,
          shippingState: true,
          shippingZip: true,
          shippingCountry: true,
          paymentMethod: true,
          payments: {
            select: {
              refunds: {
                orderBy: { createdAt: "desc" },
                select: { id: true, amount: true, status: true, createdAt: true },
              },
            },
          },
        },
      },
      items: {
        include: {
          orderItem: {
            select: { productName: true, sku: true, size: true, color: true, unitPrice: true },
          },
        },
      },
    },
  });

  if (!request) return null;

  // Resolve product thumbnail images by SKU
  const skus = request.items.map((it) => it.orderItem.sku).filter(Boolean);
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
      variants.filter((v) => v.product.images[0]?.url).map((v) => [v.sku, v.product.images[0].url])
    );
  }

  const parsedReason = parseReturnReason(request.reason);

  return {
    id: request.id,
    status: request.status,
    reason: parsedReason.categoryLabel,
    parsedReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    order: request.order,
    items: request.items.map((item) => ({
      ...item,
      orderItem: {
        ...item.orderItem,
        unitPrice: Number(item.orderItem.unitPrice),
        imageUrl: imageBySku.get(item.orderItem.sku) ?? "/images/categories/cat-t-shirts.jpg",
      },
    })),
    requestedAmount: request.items.reduce(
      (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
      0
    ),
    refunds: request.order.payments.flatMap((payment) =>
      payment.refunds.map((refund) => ({ ...refund, amount: Number(refund.amount) }))
    ),
  };
}

export async function getCustomerCoupons() {
  const user = await requireUser();
  const now = new Date();

  const [activeCoupons, userReturnRequests] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        usageLimit: true,
        usageCount: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [{ discountValue: "desc" }, { createdAt: "desc" }],
    }),
    prisma.returnRequest.findMany({
      where: {
        order: {
          OR: [{ userId: user.id }, ...(user.email ? [{ customerEmail: user.email }] : [])],
        },
      },
      select: { id: true },
    }),
  ]);

  const userReturnIds = userReturnRequests.map((r) => r.id);
  const userCreditAuditLogs =
    userReturnIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            action: "STORE_CREDIT_ISSUED",
            entityType: "ReturnRequest",
            entityId: { in: userReturnIds },
          },
          select: { metadata: true },
        })
      : [];

  const userCreditCodes = new Set<string>();
  for (const log of userCreditAuditLogs) {
    const meta = (log.metadata as Record<string, unknown> | null) || {};
    if (meta.couponCode && typeof meta.couponCode === "string") {
      userCreditCodes.add(meta.couponCode.toUpperCase());
    }
  }

  const eligibleCoupons = activeCoupons.filter((c) => {
    if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
      return false;
    }
    if (c.code.toUpperCase().startsWith("VL-CREDIT-")) {
      return userCreditCodes.has(c.code.toUpperCase());
    }
    return true;
  });

  return eligibleCoupons.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
    startDate: c.startDate,
    endDate: c.endDate,
    isPersonalCredit: c.code.toUpperCase().startsWith("VL-CREDIT-"),
  }));
}
