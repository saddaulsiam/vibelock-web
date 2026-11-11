"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StarRating } from "./star-rating";
import { submitReviewAction } from "@/lib/reviews/actions";
import type { UserReviewEligibility } from "@/lib/reviews/types";
import { CheckCircle2, AlertCircle, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ProductReviewFormProps {
  productId: string;
  productSlug: string;
  eligibility: UserReviewEligibility;
}

export function ProductReviewForm({ productId, productSlug, eligibility }: ProductReviewFormProps) {
  const [rating, setRating] = useState<number>(eligibility.existingReview?.rating ?? 5);
  const [comment, setComment] = useState<string>(eligibility.existingReview?.comment ?? "");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // 1. If not logged in
  if (!eligibility.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-vl-dark-900/10 bg-white p-6 sm:flex-row sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-vl-dark-900/5 text-vl-dark-900">
            <Lock className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-vl-dark-900">Have you bought this item?</h4>
            <p className="text-xs text-vl-dark-900/65">
              Sign in to your account to review sizing, comfort, and fabric quality.
            </p>
          </div>
        </div>
        <Link
          href={`/login?callbackUrl=/product/${productSlug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-sm bg-vl-dark-900 px-6 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-vl-dark-900/85 focus-visible:outline-2 focus-visible:outline-vl-cyan"
        >
          Sign in to Review
        </Link>
      </div>
    );
  }

  // 2. If logged in but not a verified delivered buyer
  if (!eligibility.canReview) {
    return (
      <div className="rounded-xl border border-vl-dark-900/10 bg-vl-white-300/50 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-vl-cyan-100 text-vl-cyan-dark">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-vl-dark-900">Verified Buyer Reviews Only</h4>
            <p className="text-xs leading-relaxed text-vl-dark-900/70">
              To ensure 100% authentic ratings and prevent misleading feedback, reviews on VibeLock
              are exclusive to customers who have ordered and received delivery of this item. If you
              recently placed an order, your review form will automatically unlock upon delivery!
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
    <div className="rounded-2xl border border-vl-dark-900/10 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-center justify-between border-b border-vl-dark-900/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black tracking-tight text-vl-dark-900 sm:text-lg">
              {isEditing ? "Edit Your Review" : "Write a Verified Review"}
            </h3>
            <Badge variant="cyan" size="sm">
              <Sparkles className="size-3" /> Verified Buyer
            </Badge>
          </div>
          <p className="mt-1 text-xs text-vl-dark-900/65">
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
          <label className="mb-2 block text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
            Your Rating
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={rating}
              size="lg"
              interactive
              onChange={(newRating) => setRating(newRating)}
            />
            <span className="text-sm font-bold text-vl-dark-900">{rating} / 5 Stars</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="review-comment"
              className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase"
            >
              Your Review (Optional)
            </label>
            <span className="text-[11px] text-vl-dark-900/50 tabular-nums">
              {comment.length} / 1000
            </span>
          </div>
          <Textarea
            id="review-comment"
            variant="brand"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about the fabric GSM, true-to-size fit, collar durability, or style recommendations..."
            className="p-3.5 text-sm"
          />
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            size="default"
            disabled={isPending}
            loading={isPending}
            className="px-7"
          >
            {isPending ? "Submitting..." : isEditing ? "Update Review" : "Post Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
