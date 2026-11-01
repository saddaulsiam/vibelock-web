"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StarRating } from "./star-rating";
import { submitReviewAction } from "@/lib/reviews/actions";
import type { UserReviewEligibility } from "@/lib/reviews/types";
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

interface ProductReviewFormProps {
  productId: string;
  productSlug: string;
  eligibility: UserReviewEligibility;
}

export function ProductReviewForm({
  productId,
  productSlug,
  eligibility,
}: ProductReviewFormProps) {
  const [rating, setRating] = useState<number>(
    eligibility.existingReview?.rating ?? 5
  );
  const [comment, setComment] = useState<string>(
    eligibility.existingReview?.comment ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // 1. If not logged in
  if (!eligibility.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#101114]/10 bg-white p-6 sm:flex-row sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#101114]/5 text-[#101114]">
            <Lock className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#101114]">Have you bought this item?</h4>
            <p className="text-xs text-[#101114]/65">
              Sign in to your account to review sizing, comfort, and fabric quality.
            </p>
          </div>
        </div>
        <Link
          href={`/login?callbackUrl=/products/${productSlug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#101114] px-6 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85 focus-visible:outline-2 focus-visible:outline-[#00D9FF]"
        >
          Sign in to Review
        </Link>
      </div>
    );
  }

  // 2. If logged in but not a verified delivered buyer
  if (!eligibility.canReview) {
    return (
      <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/50 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00D9FF]/15 text-[#008ca6]">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#101114]">
              Verified Buyer Reviews Only
            </h4>
            <p className="text-xs leading-relaxed text-[#101114]/70">
              To ensure 100% authentic ratings and prevent misleading feedback, reviews on
              VibeLock are exclusive to customers who have ordered and received delivery of
              this item. If you recently placed an order, your review form will automatically
              unlock upon delivery!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is eligible (Delivered buyer or editing existing review)
  const isEditing = Boolean(eligibility.existingReview);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const res = await submitReviewAction({
        productId,
        productSlug,
        rating,
        comment,
      });

      if (res.success) {
        setFormSuccess(res.message || "Review submitted successfully!");
        toast.success(res.message || "Review submitted successfully!");
      } else {
        setFormError(res.error || "Failed to submit review.");
        toast.error(res.error || "Failed to submit review.");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-[#101114]/10 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black tracking-tight text-[#101114] sm:text-lg">
              {isEditing ? "Edit Your Review" : "Write a Verified Review"}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00D9FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#008ca6] uppercase">
              <Sparkles className="size-3" /> Verified Buyer
            </span>
          </div>
          <p className="mt-1 text-xs text-[#101114]/65">
            Help other streetwear enthusiasts with honest feedback on sizing, fit, and fabric feel.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {formSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold tracking-wider text-[#101114] uppercase">
            Your Rating
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={rating}
              size="lg"
              interactive
              onChange={(newRating) => setRating(newRating)}
            />
            <span className="text-sm font-bold text-[#101114]">
              {rating} / 5 Stars
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="review-comment"
              className="text-xs font-bold tracking-wider text-[#101114] uppercase"
            >
              Your Review (Optional)
            </label>
            <span className="text-[11px] text-[#101114]/50 tabular-nums">
              {comment.length} / 1000
            </span>
          </div>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about the fabric GSM, true-to-size fit, collar durability, or style recommendations..."
            className="w-full resize-y rounded-lg border border-[#101114]/15 bg-white p-3.5 text-sm text-[#101114] transition-colors placeholder:text-[#101114]/40 focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#101114] px-7 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85 focus-visible:outline-2 focus-visible:outline-[#00D9FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : isEditing ? (
              <span>Update Review</span>
            ) : (
              <span>Post Review</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

