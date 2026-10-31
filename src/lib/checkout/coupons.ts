import { DiscountType, Prisma } from "@prisma/client";

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export interface CouponTargetCategory {
  id: string;
  name: string;
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
  categories?: CouponTargetCategory[];
}

export interface CartItemCategoryInfo {
  price: number;
  quantity: number;
  categoryIds: string[];
}

export function getEligibleSubtotal(
  coupon: { categories?: CouponTargetCategory[] },
  items: CartItemCategoryInfo[]
): { eligibleSubtotal: number; hasEligibleItems: boolean } {
  const targetCategories = coupon.categories ?? [];
  if (targetCategories.length === 0) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { eligibleSubtotal: subtotal, hasEligibleItems: items.length > 0 };
  }

  const targetCategoryIds = new Set(targetCategories.map((c) => c.id));
  let eligibleSubtotal = 0;
  let hasEligibleItems = false;

  for (const item of items) {
    const isTargeted = item.categoryIds.some((catId) => targetCategoryIds.has(catId));
    if (isTargeted) {
      eligibleSubtotal += item.price * item.quantity;
      hasEligibleItems = true;
    }
  }

  return { eligibleSubtotal, hasEligibleItems };
}

export function validateCouponRules(
  coupon: CouponData,
  subtotal: number,
  now = new Date(),
  eligibleCategoryCheck?: { hasEligibleItems: boolean }
) {
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
  if (coupon.categories && coupon.categories.length > 0) {
    if (eligibleCategoryCheck && !eligibleCategoryCheck.hasEligibleItems) {
      const categoryNames = coupon.categories.map((c) => c.name).join(", ");
      throw new CouponError(
        `This coupon only applies to items in the following categories: ${categoryNames}. Your cart does not contain any eligible items.`
      );
    }
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
