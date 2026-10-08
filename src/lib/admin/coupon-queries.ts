import "server-only";

import { DiscountType, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";

const pageSize = 20;

export type CouponFilter = "all" | "active" | "inactive" | "expired";

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function couponStatus(coupon: {
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}, now = new Date()) {
  if (coupon.endDate && coupon.endDate < now) return "EXPIRED" as const;
  if (!coupon.isActive || (coupon.startDate && coupon.startDate > now)) return "INACTIVE" as const;
  return "ACTIVE" as const;
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
        AND: [
          { endDate: null },
          { OR: [{ isActive: false }, { startDate: { gt: now } }] },
        ],
      },
      {
        AND: [
          { endDate: { gte: now } },
          { OR: [{ isActive: false }, { startDate: { gt: now } }] },
        ],
      },
    ];
  }

  const [coupons, total] = await Promise.all([
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
        usageLimit: true,
        usageCount: true,
        isActive: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    coupons,
    total,
    totalPages: Math.ceil(total / pageSize),
    page: normalizedPage,
    sourceTotal: total,
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
