import "server-only";

import { DiscountType, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;

import {
  couponStatus,
  type AdminCouponListItem,
  type CouponFilter,
  type CouponStatus,
} from "./coupon-shared";

export { couponStatus, type AdminCouponListItem, type CouponFilter, type CouponStatus };

export interface AdminCouponsSummaryKPIs {
  totalCoupons: number;
  activeCoupons: number;
  expiredOrDepleted: number;
  totalRedemptions: number;
  percentageCount: number;
  fixedCount: number;
}

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function getAdminCouponsSummaryKPIs(): Promise<AdminCouponsSummaryKPIs> {
  await requireRole("ADMIN");

  const now = new Date();
  const [allCoupons, totalRedemptionsAggregate] = await Promise.all([
    prisma.coupon.findMany({
      select: {
        id: true,
        discountType: true,
        usageLimit: true,
        usageCount: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.coupon.aggregate({
      _sum: { usageCount: true },
    }),
  ]);

  let activeCoupons = 0;
  let expiredOrDepleted = 0;
  let percentageCount = 0;
  let fixedCount = 0;

  for (const c of allCoupons) {
    const status = couponStatus(c, now);
    if (status === "ACTIVE") activeCoupons++;
    if (status === "EXPIRED" || status === "DEPLETED") expiredOrDepleted++;
    if (c.discountType === "PERCENTAGE") percentageCount++;
    if (c.discountType === "FIXED") fixedCount++;
  }

  return {
    totalCoupons: allCoupons.length,
    activeCoupons,
    expiredOrDepleted,
    totalRedemptions: totalRedemptionsAggregate._sum.usageCount ?? 0,
    percentageCount,
    fixedCount,
  };
}

export async function getAdminCoupons({
  search,
  filter = "all",
  type,
  page = 1,
}: {
  search?: string;
  filter?: CouponFilter;
  type?: DiscountType;
  page?: number;
}) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const where: Prisma.CouponWhereInput = {};
  if (search?.trim()) where.code = { contains: search.trim().toUpperCase(), mode: "insensitive" };
  if (type) where.discountType = type;
  const now = new Date();
  if (filter === "active") {
    where.isActive = true;
    where.AND = [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ];
  } else if (filter === "expired") {
    where.endDate = { lt: now };
  } else if (filter === "inactive") {
    where.OR = [
      {
        AND: [{ endDate: null }, { OR: [{ isActive: false }, { startDate: { gt: now } }] }],
      },
      {
        AND: [{ endDate: { gte: now } }, { OR: [{ isActive: false }, { startDate: { gt: now } }] }],
      },
    ];
  }

  const [coupons, total, segmentCounts] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        usageLimit: true,
        usageCount: true,
        isActive: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    }),
    prisma.coupon.count({ where }),
    Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      }),
      prisma.coupon.count({
        where: { endDate: { lt: now } },
      }),
      prisma.coupon.count({
        where: {
          OR: [
            {
              AND: [{ endDate: null }, { OR: [{ isActive: false }, { startDate: { gt: now } }] }],
            },
            {
              AND: [{ endDate: { gte: now } }, { OR: [{ isActive: false }, { startDate: { gt: now } }] }],
            },
          ],
        },
      }),
    ]).then(([allCount, activeCount, expiredCount, inactiveCount]) => ({
      all: allCount,
      active: activeCount,
      expired: expiredCount,
      inactive: inactiveCount,
    })),
  ]);

  return {
    coupons: coupons as AdminCouponListItem[],
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: normalizedPage,
    sourceTotal: total,
    segmentCounts,
  };
}

export async function getAdminCouponById(id: string) {
  await requireRole("ADMIN");
  return prisma.coupon.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      minOrderValue: true,
      usageLimit: true,
      usageCount: true,
      isActive: true,
      startDate: true,
      endDate: true,
    },
  });
}
