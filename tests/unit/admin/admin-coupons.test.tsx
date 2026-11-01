import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Prisma } from "@prisma/client";
import {
  AdminCouponsTable,
  CouponCreateModal,
  CouponDeleteModal,
  CouponForm,
} from "@/components/admin/coupons";
import { couponStatus, type AdminCouponListItem } from "@/lib/admin/coupons";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/coupons",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Coupons & Discounts Module", () => {
  const sampleCoupons: AdminCouponListItem[] = [
    {
      id: "coupon-1",
      code: "VIP20",
      discountType: "PERCENTAGE",
      discountValue: new Prisma.Decimal(20),
      minOrderValue: new Prisma.Decimal(1500),
      usageLimit: 100,
      usageCount: 25,
      isActive: true,
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T23:59:59Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      categories: [{ id: "cat-1", name: "T-Shirts", slug: "t-shirts" }],
    },
    {
      id: "coupon-2",
      code: "FLAT300",
      discountType: "FIXED",
      discountValue: new Prisma.Decimal(300),
      minOrderValue: null,
      usageLimit: 50,
      usageCount: 50, // Depleted!
      isActive: true,
      startDate: null,
      endDate: null,
      createdAt: new Date("2026-02-01T00:00:00Z"),
      categories: [],
    },
    {
      id: "coupon-3",
      code: "OLD50",
      discountType: "PERCENTAGE",
      discountValue: new Prisma.Decimal(50),
      minOrderValue: null,
      usageLimit: null,
      usageCount: 10,
      isActive: true,
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-06-01T00:00:00Z"), // Expired!
      createdAt: new Date("2025-01-01T00:00:00Z"),
      categories: [],
    },
    {
      id: "coupon-4",
      code: "UNUSED10",
      discountType: "PERCENTAGE",
      discountValue: new Prisma.Decimal(10),
      minOrderValue: null,
      usageLimit: 20,
      usageCount: 0, // Unused!
      isActive: false, // Paused!
      startDate: null,
      endDate: null,
      createdAt: new Date("2026-03-01T00:00:00Z"),
      categories: [],
    },
  ];

  describe("couponStatus Helper Logic", () => {
    const fixedNow = new Date("2026-10-27T12:00:00Z");

    test("identifies ACTIVE coupon within valid dates and under usage limit", () => {
      const status = couponStatus(sampleCoupons[0], fixedNow);
      expect(status).toBe("ACTIVE");
    });

    test("identifies DEPLETED coupon when usageCount reaches usageLimit", () => {
      const status = couponStatus(sampleCoupons[1], fixedNow);
      expect(status).toBe("DEPLETED");
    });

    test("identifies EXPIRED coupon when endDate is in the past", () => {
      const status = couponStatus(sampleCoupons[2], fixedNow);
      expect(status).toBe("EXPIRED");
    });

    test("identifies INACTIVE coupon when isActive is false", () => {
      const status = couponStatus(sampleCoupons[3], fixedNow);
      expect(status).toBe("INACTIVE");
    });

    test("identifies INACTIVE coupon when startDate is in the future", () => {
      const futureCoupon = {
        isActive: true,
        startDate: new Date("2026-11-01T00:00:00Z"),
        endDate: new Date("2026-12-01T00:00:00Z"),
      };
      const status = couponStatus(futureCoupon, fixedNow);
      expect(status).toBe("INACTIVE");
    });
  });

  describe("AdminCouponsTable Rendering", () => {
    test("renders coupon codes, discount benefits, and status badges", () => {
      const html = renderToStaticMarkup(
        <AdminCouponsTable
          coupons={sampleCoupons}
          total={sampleCoupons.length}
          segmentCounts={{ all: 4, active: 1, expired: 2, inactive: 1 }}
        />
      );

      // Verify codes are rendered
      expect(html).toContain("VIP20");
      expect(html).toContain("FLAT300");
      expect(html).toContain("OLD50");
      expect(html).toContain("UNUSED10");

      // Verify discount values
      expect(html).toContain("20% OFF");
      expect(html).toContain("৳300 OFF");

      // Verify minimum spend rule
      expect(html).toContain("Min spend ৳1,500");

      // Verify statuses
      expect(html).toContain("ACTIVE");
      expect(html).toContain("DEPLETED");
      expect(html).toContain("EXPIRED");
      expect(html).toContain("INACTIVE");

      // Verify progress bar and counts
      expect(html).toContain("25");
      expect(html).toContain("100");
      expect(html).toContain("25% redeemed");

      // Verify tabs
      expect(html).toContain("All Coupons");
      expect(html).toContain("Active &amp; Live");
      expect(html).toContain("Expired / Depleted");

      // Verify search input with / hotkey and toolbar actions
      expect(html).toContain("press / to focus");
      expect(html).toContain("Columns");
      expect(html).toContain("Customize visible columns");
      expect(html).toContain("Export CSV");
      expect(html).toContain("Create Coupon");
      // Verify bulk selection checkboxes
      expect(html).toContain('aria-label="Select all coupons"');
      expect(html).toContain('aria-label="Select coupon VIP20"');
      // Verify infinite scroll loaded count indicator when all loaded
      expect(html).toContain("All ");
      expect(html).toContain("coupons loaded");
    });

    test("renders infinite scroll load more button when hasMore is true", () => {
      const html = renderToStaticMarkup(
        <AdminCouponsTable
          coupons={sampleCoupons}
          total={10}
          segmentCounts={{ all: 10, active: 5, expired: 3, inactive: 2 }}
        />
      );

      expect(html).toContain("Load more coupons");
      expect(html).toContain("Showing 4 of 10");
    });

    test("renders empty state when no coupons match", () => {
      const html = renderToStaticMarkup(
        <AdminCouponsTable coupons={[]} total={0} currentSearch="NONEXISTENT" />
      );

      expect(html).toContain("No coupons found");
      expect(html).toContain("Try adjusting your search terms or filters");
    });
  });

  describe("CouponCreateModal Component", () => {
    test("renders create modal with preview and form fields when open", () => {
      const html = renderToStaticMarkup(<CouponCreateModal isOpen={true} onClose={() => {}} />);

      expect(html).toContain("Create New Coupon");
      expect(html).toContain("Live Customer Preview");
      expect(html).toContain("Coupon Code *");
      expect(html).toContain("Discount Type *");
      expect(html).toContain("Percentage (%)");
      expect(html).toContain("Fixed (৳ BDT)");
      expect(html).toContain("Minimum Order Spend");
      expect(html).toContain("Usage Limit");
    });

    test("renders edit modal with populated coupon details", () => {
      const html = renderToStaticMarkup(
        <CouponCreateModal isOpen={true} onClose={() => {}} couponToEdit={sampleCoupons[0]} />
      );

      expect(html).toContain("Edit Coupon &amp; Rules");
      expect(html).toContain("VIP20");
      expect(html).toContain("Update Coupon");
    });

    test("does not render when isOpen is false", () => {
      const html = renderToStaticMarkup(<CouponCreateModal isOpen={false} onClose={() => {}} />);
      expect(html).toBe("");
    });

    test("renders CouponForm with CategoryMultiSelect target categories", () => {
      const html = renderToStaticMarkup(
        <CouponForm
          categories={[
            { id: "cat-1", name: "T-Shirts", slug: "t-shirts" },
            { id: "cat-2", name: "Hoodies", slug: "hoodies" },
          ]}
        />
      );

      expect(html).toContain("Target Categories");
      expect(html).toContain("Select categories (leave empty for storewide discount)...");
      expect(html).toContain("Storewide:");
    });

    test("renders CouponForm in edit mode targeting specific category", () => {
      const html = renderToStaticMarkup(
        <CouponForm
          coupon={sampleCoupons[0]}
          categories={[
            { id: "cat-1", name: "T-Shirts", slug: "t-shirts" },
            { id: "cat-2", name: "Hoodies", slug: "hoodies" },
          ]}
        />
      );

      expect(html).toContain("Target Categories");
      expect(html).toContain('<input type="hidden" name="categoryIds" value="cat-1"/>');
      expect(html).toContain("Targeted:");
    });
  });

  describe("CouponDeleteModal Safety Safeguard", () => {
    test("prevents permanent deletion of coupons with usage history and suggests deactivation", () => {
      const html = renderToStaticMarkup(
        <CouponDeleteModal
          isOpen={true}
          onClose={() => {}}
          coupon={sampleCoupons[0]} // has usageCount = 25
        />
      );

      expect(html).toContain("Audit Protected Coupon");
      expect(html).toContain("VIP20");
      expect(html).toContain("25 time(s)");
      expect(html).toContain("cannot be permanently deleted");
      expect(html).toContain("Deactivate Coupon");
      expect(html).not.toContain("Delete Permanently");
    });

    test("allows permanent deletion for coupons with 0 redemptions", () => {
      const html = renderToStaticMarkup(
        <CouponDeleteModal
          isOpen={true}
          onClose={() => {}}
          coupon={sampleCoupons[3]} // has usageCount = 0
        />
      );

      expect(html).toContain("Delete Coupon");
      expect(html).toContain("UNUSED10");
      expect(html).toContain("0 redemptions");
      expect(html).toContain("Delete Permanently");
    });
  });
});
