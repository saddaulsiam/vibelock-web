"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { StarRating } from "./star-rating";
import { deleteReviewAction } from "@/lib/reviews/actions";
import type { ReviewItem } from "@/lib/reviews/types";
import { CheckCircle2, Trash2, MessageSquare, ThumbsUp, ArrowUpDown, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductReviewListProps {
  reviews: ReviewItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  selectedRating?: number | null;
  onSelectRating?: (rating: number | null) => void;
}

type SortOption = "newest" | "highest" | "lowest";

export function ProductReviewList({
  reviews,
  currentUserId,
  isAdmin = false,
  selectedRating,
  onSelectRating,
}: ProductReviewListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [userVoted, setUserVoted] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isPending, startTransition] = useTransition();

  const handleVoteHelpful = (reviewId: string) => {
    if (userVoted[reviewId]) {
      toast.info("You already marked this review as helpful.");
      return;
    }
    setHelpfulVotes((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1,
    }));
    setUserVoted((prev) => ({
      ...prev,
      [reviewId]: true,
    }));
    toast.success("Thank you for your feedback!");
  };

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

  // Filter by selectedRating
  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (selectedRating !== null && selectedRating !== undefined) {
      list = list.filter((r) => r.rating === selectedRating);
    }

    return [...list].sort((a, b) => {
      if (sortBy === "highest") return b.rating - a.rating;
      if (sortBy === "lowest") return a.rating - b.rating;
      // newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reviews, selectedRating, sortBy]);

  // Overall 0 reviews
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-vl-dark-900/15 bg-white p-10 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-vl-dark-900/5 text-vl-dark-900/60">
          <MessageSquare className="size-6" />
        </div>
        <h4 className="mt-3 font-heading text-sm font-bold text-vl-dark-900">No reviews yet</h4>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-vl-dark-900/65">
          Be the first verified customer to share feedback on sizing, fit, and comfort for this product!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-vl-dark-900/10 bg-white p-2.5 shadow-2xs">
        {/* Rating Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectRating?.(null)}
            className={`rounded-xs px-2.5 py-1 font-bold transition-all ${
              selectedRating === null || selectedRating === undefined
                ? "bg-vl-dark-900 text-white"
                : "bg-vl-dark-900/5 text-vl-dark-900/70 hover:bg-vl-dark-900/10"
            }`}
          >
            All ({reviews.length})
          </button>
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            if (count === 0) return null;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => onSelectRating?.(selectedRating === stars ? null : stars)}
                className={`rounded-xs px-2.5 py-1 font-bold transition-all ${
                  selectedRating === stars
                    ? "bg-vl-cyan-500 text-vl-dark-900 font-extrabold shadow-2xs"
                    : "bg-vl-dark-900/5 text-vl-dark-900/70 hover:bg-vl-dark-900/10"
                }`}
              >
                {stars}★ ({count})
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-vl-dark-900/70">
          <ArrowUpDown className="size-3 text-vl-dark-900/50" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xs border border-vl-dark-900/15 bg-white px-2 py-1 text-xs font-bold text-vl-dark-900 focus-visible:outline-2 focus-visible:outline-vl-cyan"
            aria-label="Sort reviews by"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Filtered Empty State */}
      {filteredReviews.length === 0 && selectedRating !== null && (
        <div className="rounded-2xl border border-dashed border-vl-dark-900/15 bg-white p-8 text-center">
          <Filter className="mx-auto size-6 text-vl-dark-900/40" />
          <p className="mt-2 text-sm font-bold text-vl-dark-900">
            No {selectedRating}-star reviews found
          </p>
          <button
            type="button"
            onClick={() => onSelectRating?.(null)}
            className="mt-3 text-xs font-bold text-vl-cyan-dark underline underline-offset-4"
          >
            Show all reviews
          </button>
        </div>
      )}

      {/* Reviews Cards */}
      <div className="space-y-3 sm:space-y-4">
        {filteredReviews.map((review) => {
          const canDelete = isAdmin || (currentUserId && review.userId === currentUserId);
          const reviewDate = new Date(review.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          const initial = review.user?.name ? review.user.name.charAt(0).toUpperCase() : "V";
          const helpfulCount = (helpfulVotes[review.id] || 0);

          return (
            <div
              key={review.id}
              className="rounded-xs border border-vl-dark-900/10 bg-white p-4 shadow-2xs sm:p-5 transition-all hover:border-vl-dark-900/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-vl-dark-900/5 pb-4">
                <div className="flex items-center gap-3">
                  {review.user?.image ? (
                    <Image
                      src={review.user.image}
                      alt={review.user.name || "Customer"}
                      width={40}
                      height={40}
                      className="size-10 rounded-full object-cover ring-2 ring-vl-cyan/30"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-vl-dark-900 font-mono text-xs font-bold text-vl-cyan shadow-2xs ring-1 ring-black/5">
                      {initial}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-vl-dark-900">
                        {review.user?.name || "Verified Customer"}
                      </span>
                      {review.verified && (
                        <Badge variant="cyan" size="sm" className="h-4.5 px-1.5 text-[10px]">
                          <CheckCircle2 className="size-3" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-vl-dark-900/50">{reviewDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} size="sm" />
                  <span className="font-mono text-xs font-bold text-vl-dark-900">
                    {review.rating}.0
                  </span>
                </div>
              </div>

              {/* Review Comment Text */}
              {review.comment && (
                <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-vl-dark-900/80">
                  {review.comment}
                </p>
              )}

              {/* Footer: Helpful Button & Delete Action */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-vl-dark-900/5">
                <button
                  type="button"
                  onClick={() => handleVoteHelpful(review.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer rounded-md px-2 py-1 ${
                    userVoted[review.id]
                      ? "text-vl-cyan-dark bg-vl-cyan-50 font-bold"
                      : "text-vl-dark-900/60 hover:text-vl-dark-900 hover:bg-vl-dark-900/5"
                  }`}
                  title="Mark review as helpful"
                >
                  <ThumbsUp className="size-3.5" />
                  <span>Helpful</span>
                  {helpfulCount > 0 && <span className="font-mono text-[11px]">({helpfulCount})</span>}
                </button>

                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(review.id)}
                    disabled={isPending && deletingId === review.id}
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-2"
                  >
                    <Trash2 className="size-3 mr-1" />
                    <span>Delete</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
