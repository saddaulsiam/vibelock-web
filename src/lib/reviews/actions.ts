"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma/client";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export interface SubmitReviewInput {
  productId: string;
  productSlug?: string;
  rating: number;
  comment?: string | null;
}

export interface ReviewActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Submit or update a product review.
 * Only verified buyers who have received delivery (or are updating their existing review) can submit.
 */
export async function submitReviewAction(
  input: SubmitReviewInput
): Promise<ReviewActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return { success: false, error: "Please log in to submit a review." };
    }

    const { productId, productSlug, rating, comment } = input;

    if (!productId || typeof productId !== "string") {
      return { success: false, error: "Invalid product ID." };
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return {
        success: false,
        error: "Rating must be an integer between 1 and 5 stars.",
      };
    }

    const trimmedComment = comment?.trim() ? comment.trim().slice(0, 1000) : null;

    // Check if user already reviewed this product
    const existing = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });

    let isVerified = existing?.verified ?? false;

    if (!isVerified) {
      // Check if user has an order with status "DELIVERED" containing this product
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        select: { sku: true },
      });
      const skus = variants.map((v) => v.sku);

      if (skus.length === 0) {
        return { success: false, error: "Product not available for review." };
      }

      const deliveredOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: "DELIVERED",
          items: {
            some: {
              sku: { in: skus },
            },
          },
        },
        select: { id: true },
      });

      if (!deliveredOrder) {
        return {
          success: false,
          error: "Only verified buyers who have received delivery can write a review.",
        };
      }
      isVerified = true;
    }

    // Upsert review directly into database
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
      create: {
        userId: user.id,
        productId,
        rating: parsedRating,
        comment: trimmedComment,
        verified: isVerified,
      },
      update: {
        rating: parsedRating,
        comment: trimmedComment,
        verified: isVerified,
      },
    });

    if (productSlug) {
      revalidatePath(`/products/${productSlug}`);
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/products");

    return {
      success: true,
      message: existing
        ? "Your review has been updated!"
        : "Thank you! Your review has been posted.",
    };
  } catch (error) {
    console.error("[submitReviewAction] Error:", error);
    return {
      success: false,
      error: "Failed to submit review. Please try again later.",
    };
  }
}

/**
 * Delete a review (accessible by ADMIN or the author of the review).
 */
export async function deleteReviewAction(
  reviewId: string
): Promise<ReviewActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { select: { slug: true } },
      },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    const isAdmin = user.role === "ADMIN";
    const isOwner = review.userId === user.id;

    if (!isAdmin && !isOwner) {
      return {
        success: false,
        error: "You do not have permission to delete this review.",
      };
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    if (review.product?.slug) {
      revalidatePath(`/products/${review.product.slug}`);
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/products");

    return { success: true, message: "Review deleted successfully." };
  } catch (error) {
    console.error("[deleteReviewAction] Error:", error);
    return { success: false, error: "Failed to delete review." };
  }
}

