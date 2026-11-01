import { ProductReviewsSummary } from "./product-reviews-summary";
import { ProductReviewForm } from "./product-review-form";
import { ProductReviewList } from "./product-review-list";
import type { ReviewItem, ReviewSummary, UserReviewEligibility } from "@/lib/reviews/types";

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
  return (
    <section
      id="reviews"
      aria-labelledby="product-reviews-heading"
      className="border-t border-[#101114]/10 pt-12 sm:pt-16"
    >
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#008ca6] uppercase">
            Customer Feedback
          </p>
          <h2
            id="product-reviews-heading"
            className="mt-1 text-2xl font-black tracking-tight text-[#101114] sm:text-3xl"
          >
            Ratings & Reviews
          </h2>
        </div>
        <p className="text-xs text-[#101114]/60">
          Showing {reviews.length} {reviews.length === 1 ? "review" : "reviews"} from verified
          buyers
        </p>
      </div>

      <div className="space-y-8">
        {/* Rating Breakdown & Score */}
        <ProductReviewsSummary summary={summary} />

        {/* Review Form (Conditional on verification status) */}
        <ProductReviewForm
          productId={productId}
          productSlug={productSlug}
          eligibility={eligibility}
        />

        {/* Reviews Feed */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-[#101114] uppercase">
            All Reviews ({reviews.length})
          </h3>
          <ProductReviewList reviews={reviews} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
      </div>
    </section>
  );
}
