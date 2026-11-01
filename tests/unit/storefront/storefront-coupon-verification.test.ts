import { describe, expect, test } from "vitest";
import { Prisma } from "@prisma/client";
import {
  calculateCouponDiscount,
  getEligibleSubtotal,
  validateCouponRules,
  type CouponData,
  type CartItemCategoryInfo,
} from "@/lib/checkout/coupons";

describe("Storefront Coupon Application & End-to-End Verification", () => {
  // Test Categories
  const catTShirts = { id: "cat-tshirts", name: "T-Shirts" };
  const catHoodies = { id: "cat-hoodies", name: "Hoodies" };
  const catAccessories = { id: "cat-accessories", name: "Accessories" };

  describe("1. Storewide Coupon Calculations", () => {
    test("applies percentage discount across entire cart subtotal when storewide", () => {
      // 15% storewide coupon
      const coupon: CouponData = {
        id: "c-storewide-15",
        code: "DROP15",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("15"),
        minOrderValue: new Prisma.Decimal("1000"),
        usageLimit: 100,
        usageCount: 5,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [], // Empty means storewide
      };

      const cartItems: CartItemCategoryInfo[] = [
        { price: 1200, quantity: 1, categoryIds: [catTShirts.id] },
        { price: 800, quantity: 2, categoryIds: [catAccessories.id] }, // 1600
      ];
      const cartSubtotal = 1200 + 1600; // 2800

      const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItems);
      expect(hasEligibleItems).toBe(true);
      expect(eligibleSubtotal).toBe(2800);

      // Validate rules
      expect(() =>
        validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems })
      ).not.toThrow();

      // Discount = 15% of 2800 = 420
      const discount = calculateCouponDiscount(coupon, eligibleSubtotal);
      expect(discount).toBe(420);

      const netSubtotal = cartSubtotal - discount;
      expect(netSubtotal).toBe(2380);
    });

    test("applies fixed amount discount across entire cart when storewide", () => {
      // ৳300 fixed storewide coupon
      const coupon: CouponData = {
        id: "c-storewide-fixed",
        code: "FLAT300",
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("300"),
        minOrderValue: new Prisma.Decimal("1500"),
        usageLimit: 50,
        usageCount: 10,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [],
      };

      const cartItems: CartItemCategoryInfo[] = [
        { price: 2000, quantity: 1, categoryIds: [catHoodies.id] },
      ];
      const cartSubtotal = 2000;

      const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItems);
      expect(hasEligibleItems).toBe(true);
      expect(eligibleSubtotal).toBe(2000);

      expect(() =>
        validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems })
      ).not.toThrow();

      const discount = calculateCouponDiscount(coupon, eligibleSubtotal);
      expect(discount).toBe(300);

      const netSubtotal = cartSubtotal - discount;
      expect(netSubtotal).toBe(1700);
    });
  });

  describe("2. Category-Targeted Coupon Calculations", () => {
    test("targets specific category: discounts ONLY eligible items in mixed cart", () => {
      // 20% coupon valid ONLY for T-Shirts
      const coupon: CouponData = {
        id: "c-tshirt-20",
        code: "TSHIRT20",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("20"),
        minOrderValue: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [catTShirts],
      };

      // Mixed cart: 1 T-Shirt (৳1,000) + 1 Luxury Hoodie (৳3,000)
      const cartItems: CartItemCategoryInfo[] = [
        { price: 1000, quantity: 1, categoryIds: [catTShirts.id] },
        { price: 3000, quantity: 1, categoryIds: [catHoodies.id] },
      ];
      const cartSubtotal = 4000;

      const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItems);
      expect(hasEligibleItems).toBe(true);
      // Critical check: Only the 1,000 BDT T-Shirt is eligible, NOT the 3,000 BDT Hoodie!
      expect(eligibleSubtotal).toBe(1000);

      expect(() =>
        validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems })
      ).not.toThrow();

      // Discount = 20% of 1000 = 200 BDT (NOT 20% of 4000 = 800 BDT)
      const discount = calculateCouponDiscount(coupon, eligibleSubtotal);
      expect(discount).toBe(200);

      const netSubtotal = cartSubtotal - discount;
      expect(netSubtotal).toBe(3800);
    });

    test("supports multiple targeted categories in a single coupon", () => {
      // 10% coupon for T-Shirts AND Hoodies (Apparel promo)
      const coupon: CouponData = {
        id: "c-apparel-10",
        code: "APPAREL10",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("10"),
        minOrderValue: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [catTShirts, catHoodies],
      };

      const cartItems: CartItemCategoryInfo[] = [
        { price: 900, quantity: 1, categoryIds: [catTShirts.id] }, // 900 eligible
        { price: 2500, quantity: 1, categoryIds: [catHoodies.id] }, // 2500 eligible
        { price: 600, quantity: 1, categoryIds: [catAccessories.id] }, // 600 INELIGIBLE
      ];
      const cartSubtotal = 4000;

      const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItems);
      expect(hasEligibleItems).toBe(true);
      expect(eligibleSubtotal).toBe(3400); // 900 + 2500

      const discount = calculateCouponDiscount(coupon, eligibleSubtotal);
      expect(discount).toBe(340); // 10% of 3400

      expect(cartSubtotal - discount).toBe(3660);
    });

    test("rejects coupon with informative error when cart contains NO eligible category items", () => {
      const coupon: CouponData = {
        id: "c-tshirt-only",
        code: "TSHIRTONLY",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("25"),
        minOrderValue: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [catTShirts],
      };

      // Cart contains ONLY Accessories
      const cartItems: CartItemCategoryInfo[] = [
        { price: 1500, quantity: 1, categoryIds: [catAccessories.id] },
      ];
      const cartSubtotal = 1500;

      const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItems);
      expect(hasEligibleItems).toBe(false);
      expect(eligibleSubtotal).toBe(0);

      expect(() =>
        validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems })
      ).toThrowError(
        "This coupon only applies to items in the following categories: T-Shirts. Your cart does not contain any eligible items."
      );
    });
  });

  describe("3. Constraints & Boundary Safeguards", () => {
    test("rejects when cart subtotal is below minimum order value", () => {
      const coupon: CouponData = {
        id: "c-min-order",
        code: "VIP500",
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("500"),
        minOrderValue: new Prisma.Decimal("3000"),
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [],
      };

      const cartSubtotal = 2500; // < 3000
      expect(() =>
        validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems: true })
      ).toThrowError("Minimum order value of 3000 BDT required for this coupon.");
    });

    test("caps fixed discount to eligible subtotal so totals never go negative", () => {
      // ৳500 fixed coupon, but eligible item is only ৳250
      const coupon: CouponData = {
        id: "c-excess-fixed",
        code: "BIG500",
        discountType: "FIXED",
        discountValue: new Prisma.Decimal("500"),
        minOrderValue: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [catAccessories],
      };

      const eligibleSubtotal = 250;
      const discount = calculateCouponDiscount(coupon, eligibleSubtotal);

      // Capped at 250, NOT 500
      expect(discount).toBe(250);
      expect(eligibleSubtotal - discount).toBe(0);
    });

    test("rejects when usage limit is reached", () => {
      const coupon: CouponData = {
        id: "c-depleted",
        code: "LIMITED10",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("10"),
        minOrderValue: null,
        usageLimit: 5,
        usageCount: 5, // Depleted!
        isActive: true,
        startDate: null,
        endDate: null,
        categories: [],
      };

      expect(() =>
        validateCouponRules(coupon, 1000, new Date(), { hasEligibleItems: true })
      ).toThrowError("This coupon has reached its usage limit.");
    });

    test("rejects when coupon is inactive or expired", () => {
      const inactiveCoupon: CouponData = {
        id: "c-inactive",
        code: "OFF",
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("10"),
        minOrderValue: null,
        usageLimit: null,
        usageCount: 0,
        isActive: false, // Inactive!
        startDate: null,
        endDate: null,
        categories: [],
      };
      expect(() =>
        validateCouponRules(inactiveCoupon, 1000, new Date(), { hasEligibleItems: true })
      ).toThrowError("This coupon is not active.");

      const expiredCoupon: CouponData = {
        ...inactiveCoupon,
        isActive: true,
        endDate: new Date("2020-01-01T00:00:00Z"), // Expired!
      };
      expect(() =>
        validateCouponRules(expiredCoupon, 1000, new Date("2026-10-31T00:00:00Z"), {
          hasEligibleItems: true,
        })
      ).toThrowError("This coupon has expired.");
    });
  });
});
