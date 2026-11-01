import "server-only";

import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import type {
  ReviewItem,
  ReviewSummary,
  UserReviewEligibility,
  AdminReviewItem,
  AdminReviewsKPIs,
} from "./types";

/**
 * Calculates review summary and rating distributions
 */
export function calculateReviewSummary(reviews: Array<{ rating: number }>): ReviewSummary {
  const totalReviews = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution,
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  let totalRatingSum = 0;
  for (const review of reviews) {
    const r = Math.min(Math.max(Math.round(review.rating), 1), 5) as 1 | 2 | 3 | 4 | 5;
    distribution[r] += 1;
    totalRatingSum += review.rating;
  }

  const averageRating = Number((totalRatingSum / totalReviews).toFixed(1));

  const percentages = {
    1: Math.round((distribution[1] / totalReviews) * 100),
    2: Math.round((distribution[2] / totalReviews) * 100),
    3: Math.round((distribution[3] / totalReviews) * 100),
    4: Math.round((distribution[4] / totalReviews) * 100),
    5: Math.round((distribution[5] / totalReviews) * 100),
  };

  return {
    averageRating,
    totalReviews,
    distribution,
    percentages,
  };
}

/**
 * Get all published reviews for a product with full summary metrics
 */
export async function getProductReviews(productId: string): Promise<{
  reviews: ReviewItem[];
  summary: ReviewSummary;
}> {
  const rawReviews = await prisma.review.findMany({
    where: { productId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews: ReviewItem[] = rawReviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    productId: r.productId,
    rating: r.rating,
    comment: r.comment,
    verified: r.verified,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: {
      id: r.user.id,
      name: r.user.name,
      image: r.user.image,
    },
  }));

  const summary = calculateReviewSummary(reviews);

  return { reviews, summary };
}

/**
 * Check if the current user is eligible to write or update a review
 */
export async function getUserReviewEligibility(
  userId: string | undefined,
  productId: string
): Promise<UserReviewEligibility> {
  if (!userId) {
    return {
      isLoggedIn: false,
      canReview: false,
      isVerifiedBuyer: false,
      existingReview: null,
      reason: "Please sign in to write a review.",
    };
  }

  // 1. Check if user already submitted a review
  const existingReviewRaw = await prisma.review.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (existingReviewRaw) {
    return {
      isLoggedIn: true,
      canReview: true,
      isVerifiedBuyer: existingReviewRaw.verified,
      existingReview: {
        id: existingReviewRaw.id,
        userId: existingReviewRaw.userId,
        productId: existingReviewRaw.productId,
        rating: existingReviewRaw.rating,
        comment: existingReviewRaw.comment,
        verified: existingReviewRaw.verified,
        createdAt: existingReviewRaw.createdAt,
        updatedAt: existingReviewRaw.updatedAt,
        user: {
          id: existingReviewRaw.user.id,
          name: existingReviewRaw.user.name,
          image: existingReviewRaw.user.image,
        },
      },
    };
  }

  // 2. Check if user purchased and received this product (DELIVERED status)
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: { sku: true },
  });

  const skus = variants.map((v) => v.sku);
  if (skus.length === 0) {
    return {
      isLoggedIn: true,
      canReview: false,
      isVerifiedBuyer: false,
      existingReview: null,
      reason: "This product is not currently available for review.",
    };
  }

  const deliveredOrder = await prisma.order.findFirst({
    where: {
      userId,
      status: "DELIVERED",
      items: {
        some: {
          sku: { in: skus },
        },
      },
    },
    select: { id: true },
  });

  if (deliveredOrder) {
    return {
      isLoggedIn: true,
      canReview: true,
      isVerifiedBuyer: true,
      existingReview: null,
    };
  }

  return {
    isLoggedIn: true,
    canReview: false,
    isVerifiedBuyer: false,
    existingReview: null,
    reason: "Only verified buyers who have received delivery can write a review.",
  };
}

/**
 * Fetch reviews for admin moderation with KPIs, search, and filters
 */
export async function getAdminReviews(options?: {
  rating?: number;
  verified?: boolean;
  search?: string;
  take?: number;
  skip?: number;
}): Promise<{
  reviews: AdminReviewItem[];
  kpis: AdminReviewsKPIs;
  totalCount: number;
}> {
  await requireRole("ADMIN");

  const [totalReviews, allReviewsForKPIs] = await Promise.all([
    prisma.review.count(),
    prisma.review.findMany({
      select: { rating: true, verified: true },
    }),
  ]);

  const fiveStarCount = allReviewsForKPIs.filter((r) => r.rating === 5).length;
  const verifiedCount = allReviewsForKPIs.filter((r) => r.verified).length;
  const totalRatingSum = allReviewsForKPIs.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 0;

  const kpis: AdminReviewsKPIs = {
    totalReviews,
    averageRating,
    fiveStarCount,
    verifiedCount,
  };

  // Build filter conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (options?.rating && options.rating >= 1 && options.rating <= 5) {
    where.rating = options.rating;
  }

  if (typeof options?.verified === "boolean") {
    where.verified = options.verified;
  }

  if (options?.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { comment: { contains: s, mode: "insensitive" } },
      { product: { name: { contains: s, mode: "insensitive" } } },
      { user: { name: { contains: s, mode: "insensitive" } } },
      { user: { email: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [totalCount, rawAdminReviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    }),
  ]);

  const reviews: AdminReviewItem[] = rawAdminReviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    productId: r.productId,
    rating: r.rating,
    comment: r.comment,
    verified: r.verified,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      image: r.user.image,
    },
    product: {
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      primaryImage: r.product.images[0]?.url ?? null,
    },
  }));

  return { reviews, kpis, totalCount };
}
