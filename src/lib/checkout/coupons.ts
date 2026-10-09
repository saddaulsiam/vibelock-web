import { DiscountType, Prisma } from "@prisma/client";

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export interface CouponData {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: Prisma.Decimal | number;
  minOrderValue: Prisma.Decimal | number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

export function validateCouponRules(coupon: CouponData, subtotal: number, now = new Date()) {
  if (!coupon.isActive) {
    throw new CouponError("This coupon is not active.");
  }
  if (coupon.startDate && coupon.startDate > now) {
    throw new CouponError("This coupon is not active yet.");
  }
  if (coupon.endDate && coupon.endDate < now) {
    throw new CouponError("This coupon has expired.");
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponError("This coupon has reached its usage limit.");
  }
  if (coupon.minOrderValue !== null && subtotal < Number(coupon.minOrderValue)) {
    throw new CouponError(
      `Minimum order value of ${Number(coupon.minOrderValue).toFixed(0)} BDT required for this coupon.`
    );
  }
}

export function calculateCouponDiscount(
  coupon: { discountType: DiscountType; discountValue: Prisma.Decimal | number },
  subtotal: number
): number {
  if (subtotal <= 0) return 0;
  const value = Number(coupon.discountValue);
  let rawDiscount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    rawDiscount = (subtotal * value) / 100;
  } else if (coupon.discountType === "FIXED") {
    rawDiscount = value;
  }

  // Round to 2 decimal places and cap at subtotal
  const rounded = Math.round(rawDiscount * 100) / 100;
  return Math.max(0, Math.min(subtotal, rounded));
}
