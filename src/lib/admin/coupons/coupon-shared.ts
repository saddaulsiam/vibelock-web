import type { DiscountType, Prisma } from "@prisma/client";

export type CouponFilter = "all" | "active" | "inactive" | "expired";
export type CouponStatus = "ACTIVE" | "EXPIRED" | "DEPLETED" | "INACTIVE";

export interface AdminCouponListItem {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number | Prisma.Decimal;
  minOrderValue: number | Prisma.Decimal | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  categories: { id: string; name: string; slug: string }[];
}

export function couponStatus(
  coupon: {
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
    usageLimit?: number | null;
    usageCount?: number;
  },
  now = new Date()
): CouponStatus {
  if (coupon.usageLimit != null && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
    return "DEPLETED";
  }
  if (coupon.endDate && coupon.endDate < now) {
    return "EXPIRED";
  }
  if (!coupon.isActive || (coupon.startDate && coupon.startDate > now)) {
    return "INACTIVE";
  }
  return "ACTIVE";
}
