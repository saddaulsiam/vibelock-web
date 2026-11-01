"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { StarRating } from "./star-rating";
import { deleteReviewAction } from "@/lib/reviews/actions";
import type { ReviewItem } from "@/lib/reviews/types";
import { CheckCircle2, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductReviewListProps {
  reviews: ReviewItem[];
  currentUserId?: string;
  isAdmin?: boolean;
}

export function ProductReviewList({
  reviews,
  currentUserId,
  isAdmin = false,
}: ProductReviewListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    setDeletingId(reviewId);
    startTransition(async () => {
      const res = await deleteReviewAction(reviewId);
      if (res.success) {
        toast.success(res.message || "Review deleted successfully.");
      } else {
        toast.error(res.error || "Failed to delete review.");
      }
      setDeletingId(null);
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#101114]/15 bg-white p-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#101114]/5 text-[#101114]/60">
          <MessageSquare className="size-6" />
        </div>
        <h4 className="mt-3 text-sm font-bold text-[#101114]">No reviews yet</h4>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#101114]/65">
          Be the first verified customer to share feedback on sizing, fit, and comfort for this product!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const canDelete =
          isAdmin || (currentUserId && review.userId === currentUserId);
        const reviewDate = new Date(review.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const initial = review.user?.name
          ? review.user.name.charAt(0).toUpperCase()
          : "V";

        return (
          <div
            key={review.id}
            className="rounded-xl border border-[#101114]/10 bg-white p-5 shadow-2xs sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#101114]/5 pb-4">
              <div className="flex items-center gap-3">
                {review.user?.image ? (
                  <Image
                    src={review.user.image}
                    alt={review.user.name || "Customer"}
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#101114] text-xs font-bold text-white">
                    {initial}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#101114]">
                      {review.user?.name || "Verified Customer"}
                    </span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#00D9FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#008ca6]">
                        <CheckCircle2 className="size-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={review.rating} size="sm" />
                    <span className="text-[11px] text-[#101114]/50">
                      {reviewDate}
                    </span>
                  </div>
                </div>
              </div>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  disabled={isPending && deletingId === review.id}
                  className="inline-flex size-8 items-center justify-center rounded-md text-[#101114]/40 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-[#00D9FF]"
                  title="Delete review"
                  aria-label="Delete review"
                >
                  {isPending && deletingId === review.id ? (
                    <Loader2 className="size-4 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              )}
            </div>

            {review.comment ? (
              <p className="mt-4 text-sm leading-relaxed text-[#101114]/85">
                {review.comment}
              </p>
            ) : (
              <p className="mt-3 text-xs italic text-[#101114]/40">
                Customer left a {review.rating}-star rating without a written comment.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

