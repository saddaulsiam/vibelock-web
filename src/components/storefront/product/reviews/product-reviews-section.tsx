"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductReviewsSummary } from "./product-reviews-summary";
import { ProductReviewModal } from "./product-review-modal";
import { ProductReviewList } from "./product-review-list";
import type { ReviewItem, ReviewSummary, UserReviewEligibility } from "@/lib/reviews/types";
import { Star, PenLine, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductReviewsSectionProps {
  productId: string;
  productSlug: string;
  reviews: ReviewItem[];
  summary: ReviewSummary;
  eligibility: UserReviewEligibility;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function ProductReviewsSection({
  productId,
  productSlug,
  reviews,
  summary,
  eligibility,
  currentUserId,
  isAdmin = false,
}: ProductReviewsSectionProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasReviews = reviews.length > 0;

  return (
    <section
      id="reviews"
      aria-labelledby="product-reviews-heading"
      className="border-t border-vl-dark-900/10 pt-10 sm:pt-12"
    >
      {/* ── Section Header ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <h2
            id="product-reviews-heading"
            className="font-heading text-xl font-black tracking-tight text-vl-dark-900 sm:text-2xl"
          >
            Ratings & Reviews
          </h2>
          <Badge variant="cyan" size="sm" className="h-4.5 px-1.5 text-[9px] font-bold">
            Verified
          </Badge>
        </div>

        {hasReviews && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-vl-dark-900/60">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
            {eligibility.canReview && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-8 gap-1.5 px-3 text-xs font-bold text-white shadow-2xs"
              >
                <PenLine className="size-3 text-vl-cyan" />
                <span>{eligibility.existingReview ? "Edit Review" : "Write Review"}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Compact Card when NO Reviews ── */}
      {!hasReviews ? (
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-6 text-center shadow-2xs sm:p-7">
          <Star className="mx-auto size-7 fill-vl-cyan text-vl-cyan" />
          <h3 className="mt-2 font-heading text-base font-bold text-vl-dark-900">
            No reviews yet
          </h3>
          <p className="mt-1 text-xs text-vl-dark-900/60">
            Be the first to share your thoughts on this product.
          </p>

          <div className="mt-4 flex justify-center">
            {eligibility.canReview ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-8 gap-1.5 px-3.5 text-xs font-bold text-white shadow-2xs"
              >
                <PenLine className="size-3 text-vl-cyan" />
                <span>Write a Review</span>
              </Button>
            ) : !eligibility.isLoggedIn ? (
              <Link
                href={`/login?callbackUrl=/product/${productSlug}#reviews`}
                className="inline-flex h-8 items-center gap-1.5 rounded-brand bg-vl-dark-900 px-3.5 text-xs font-bold text-white hover:bg-vl-dark-900/90 shadow-2xs"
              >
                <Lock className="size-3 text-vl-cyan" />
                <span>Sign in to Review</span>
              </Link>
            ) : (
              <p className="text-xs text-vl-dark-900/50">
                Verified buyers can review once their order is delivered.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* ── Structured Breakdown & Feed when Reviews Exist ── */
        <div className="space-y-6">
          <ProductReviewsSummary
            summary={summary}
            selectedRating={selectedRating}
            onSelectRating={setSelectedRating}
          />

          <div className="space-y-3 pt-1">
            <h3 className="font-heading text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
              Customer Reviews ({reviews.length})
            </h3>
            <ProductReviewList
              reviews={reviews}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              selectedRating={selectedRating}
              onSelectRating={setSelectedRating}
            />
          </div>
        </div>
      )}

      {/* ── Create & Edit Review Modal ── */}
      {eligibility.canReview && (
        <ProductReviewModal
          productId={productId}
          productSlug={productSlug}
          eligibility={eligibility}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </section>
  );
}
