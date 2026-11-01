/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, vi } from "vitest";
import { calculateReviewSummary } from "@/lib/reviews/queries";

// Mock prisma using vi.hoisted
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    review: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock auth helpers
const mockCurrentUser = vi.fn();
vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: () => mockCurrentUser(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getProductReviews, getUserReviewEligibility } from "@/lib/reviews/queries";
import { submitReviewAction, deleteReviewAction } from "@/lib/reviews/actions";
import { renderToStaticMarkup } from "react-dom/server";
import { StarRating } from "@/components/storefront/product/reviews/star-rating";
import { ProductReviewsSummary } from "@/components/storefront/product/reviews/product-reviews-summary";
import { ProductReviewList } from "@/components/storefront/product/reviews/product-review-list";

describe("Product Reviews System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. calculateReviewSummary", () => {
    test("handles empty reviews array gracefully", () => {
      const summary = calculateReviewSummary([]);
      expect(summary.totalReviews).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      expect(summary.percentages).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    test("computes correct average rating and percentage distributions", () => {
      const reviews = [{ rating: 5 }, { rating: 5 }, { rating: 5 }, { rating: 4 }];
      const summary = calculateReviewSummary(reviews);
      expect(summary.totalReviews).toBe(4);
      expect(summary.averageRating).toBe(4.8);
      expect(summary.distribution[5]).toBe(3);
      expect(summary.distribution[4]).toBe(1);
      expect(summary.percentages[5]).toBe(75);
      expect(summary.percentages[4]).toBe(25);
    });

    test("getProductReviews fetches reviews and formats summary", async () => {
      mockPrisma.review.findMany.mockResolvedValueOnce([
        {
          id: "rev-1",
          userId: "user-1",
          productId: "prod-1",
          rating: 5,
          comment: "Best oversized tee",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: "user-1", name: "Siam", image: null },
        },
      ]);

      const res = await getProductReviews("prod-1");
      expect(res.reviews).toHaveLength(1);
      expect(res.summary.averageRating).toBe(5);
      expect(res.summary.totalReviews).toBe(1);
    });
  });

  describe("2. getUserReviewEligibility", () => {
    test("returns not logged in state when userId is missing", async () => {
      const res = await getUserReviewEligibility(undefined, "prod-1");
      expect(res.isLoggedIn).toBe(false);
      expect(res.canReview).toBe(false);
      expect(res.isVerifiedBuyer).toBe(false);
    });

    test("returns canReview: true when user already has an existing review", async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: "rev-1",
        userId: "user-1",
        productId: "prod-1",
        rating: 5,
        comment: "Great tee!",
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "Siam", image: null },
      });

      const res = await getUserReviewEligibility("user-1", "prod-1");
      expect(res.isLoggedIn).toBe(true);
      expect(res.canReview).toBe(true);
      expect(res.isVerifiedBuyer).toBe(true);
      expect(res.existingReview?.rating).toBe(5);
    });

    test("returns canReview: false when user has no delivered order for product", async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([{ sku: "SKU-BLK-L" }]);
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);

      const res = await getUserReviewEligibility("user-1", "prod-1");
      expect(res.isLoggedIn).toBe(true);
      expect(res.canReview).toBe(false);
      expect(res.isVerifiedBuyer).toBe(false);
    });

    test("returns canReview: true and verified: true when user has a DELIVERED order", async () => {
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([{ sku: "SKU-BLK-L" }]);
      mockPrisma.order.findFirst.mockResolvedValueOnce({ id: "ord-1" });

      const res = await getUserReviewEligibility("user-1", "prod-1");
      expect(res.isLoggedIn).toBe(true);
      expect(res.canReview).toBe(true);
      expect(res.isVerifiedBuyer).toBe(true);
    });
  });

  describe("3. submitReviewAction", () => {
    test("fails when user is not authenticated", async () => {
      mockCurrentUser.mockResolvedValueOnce(null);

      const res = await submitReviewAction({
        productId: "prod-1",
        rating: 5,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("log in");
    });

    test("fails when rating is out of bounds", async () => {
      mockCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "CUSTOMER" });

      const res = await submitReviewAction({
        productId: "prod-1",
        rating: 6,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("between 1 and 5");
    });

    test("fails when customer has not purchased or received delivery", async () => {
      mockCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "CUSTOMER" });
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([{ sku: "SKU-TEST" }]);
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);

      const res = await submitReviewAction({
        productId: "prod-1",
        rating: 5,
        comment: "Fake review attempt",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("verified buyers");
    });

    test("successfully upserts review for verified delivered buyer", async () => {
      mockCurrentUser.mockResolvedValueOnce({ id: "user-1", role: "CUSTOMER" });
      mockPrisma.review.findUnique.mockResolvedValueOnce(null);
      mockPrisma.productVariant.findMany.mockResolvedValueOnce([{ sku: "SKU-TEST" }]);
      mockPrisma.order.findFirst.mockResolvedValueOnce({ id: "ord-1" });
      mockPrisma.review.upsert.mockResolvedValueOnce({ id: "rev-new" });

      const res = await submitReviewAction({
        productId: "prod-1",
        productSlug: "heavyweight-tee",
        rating: 5,
        comment: "Amazing 240 GSM heavy cotton! Fits oversized nicely.",
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.review.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_productId: { userId: "user-1", productId: "prod-1" },
          },
          create: expect.objectContaining({
            rating: 5,
            verified: true,
          }),
        })
      );
    });
  });

  describe("4. deleteReviewAction", () => {
    test("fails when unauthorized", async () => {
      mockCurrentUser.mockResolvedValueOnce(null);
      const res = await deleteReviewAction("rev-1");
      expect(res.success).toBe(false);
    });

    test("fails when non-admin tries to delete another user's review", async () => {
      mockCurrentUser.mockResolvedValueOnce({ id: "user-2", role: "CUSTOMER" });
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: "rev-1",
        userId: "user-1",
      });

      const res = await deleteReviewAction("rev-1");
      expect(res.success).toBe(false);
      expect(res.error).toContain("permission");
    });

    test("admin can delete any review", async () => {
      mockCurrentUser.mockResolvedValueOnce({ id: "admin-1", role: "ADMIN" });
      mockPrisma.review.findUnique.mockResolvedValueOnce({
        id: "rev-1",
        userId: "user-1",
        product: { slug: "tee" },
      });
      mockPrisma.review.delete.mockResolvedValueOnce({});

      const res = await deleteReviewAction("rev-1");
      expect(res.success).toBe(true);
      expect(mockPrisma.review.delete).toHaveBeenCalledWith({
        where: { id: "rev-1" },
      });
    });
  });

  describe("5. Component Rendering", () => {
    test("StarRating renders correct aria-label and star count", () => {
      const html = renderToStaticMarkup(<StarRating value={4} />);
      expect(html).toContain("4 out of 5 stars");
    });

    test("ProductReviewsSummary renders average rating and distribution bars", () => {
      const summary = {
        averageRating: 4.8,
        totalReviews: 12,
        distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 9 },
        percentages: { 1: 0, 2: 0, 3: 8, 4: 17, 5: 75 },
      };

      const html = renderToStaticMarkup(<ProductReviewsSummary summary={summary} />);
      expect(html).toContain("4.8");
      expect(html).toContain("Based on 12 reviews");
      expect(html).toContain("100% Verified Buyers");
      expect(html).toContain("5 ★");
    });

    test("ProductReviewList renders customer feedback with verified purchase badge", () => {
      const reviews = [
        {
          id: "rev-1",
          userId: "user-1",
          productId: "prod-1",
          rating: 5,
          comment: "Heavyweight drop shoulder tee is super comfortable!",
          verified: true,
          createdAt: new Date("2026-10-15"),
          user: {
            id: "user-1",
            name: "Tanvir Ahmed",
            image: null,
          },
        },
      ];

      const html = renderToStaticMarkup(<ProductReviewList reviews={reviews} />);
      expect(html).toContain("Tanvir Ahmed");
      expect(html).toContain("Verified Purchase");
      expect(html).toContain("Heavyweight drop shoulder tee is super comfortable!");
    });
  });
});
