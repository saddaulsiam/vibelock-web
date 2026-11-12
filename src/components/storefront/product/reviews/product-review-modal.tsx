"use client";

import { useState, useTransition } from "react";
import { StarRating } from "./star-rating";
import { submitReviewAction } from "@/lib/reviews/actions";
import type { UserReviewEligibility } from "@/lib/reviews/types";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProductReviewModalProps {
  productId: string;
  productSlug: string;
  eligibility: UserReviewEligibility;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "1 Star — Poor",
  2: "2 Stars — Fair",
  3: "3 Stars — Average",
  4: "4 Stars — Good Quality & Cut",
  5: "5 Stars — Outstanding Drop!",
};

const SUGGESTED_TAGS = [
  "True to size",
  "Heavyweight cotton",
  "Boxy drop-shoulder",
  "Great quality",
];

export function ProductReviewModal({
  productId,
  productSlug,
  eligibility,
  isOpen,
  onOpenChange,
}: ProductReviewModalProps) {
  const [rating, setRating] = useState<number>(eligibility.existingReview?.rating ?? 5);
  const [comment, setComment] = useState<string>(eligibility.existingReview?.comment ?? "");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(eligibility.existingReview);

  const handleAddTag = (tag: string) => {
    if (comment.includes(tag)) return;
    setComment((prev) => (prev ? `${prev.trim()} • ${tag}` : tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      const res = await submitReviewAction({
        productId,
        productSlug,
        rating,
        comment,
      });

      if (res.success) {
        toast.success(res.message || "Review submitted successfully!");
        onOpenChange(false);
      } else {
        setFormError(res.error || "Failed to submit review.");
        toast.error(res.error || "Failed to submit review.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent variant="brand" className="max-h-[90vh] overflow-y-auto max-w-md p-4 sm:p-6">
        <DialogHeader className="text-left space-y-1 pb-1">
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm" className="h-4.5 px-1.5 text-[9px] font-bold">
              <CheckCircle2 className="size-3" />
              Verified Buyer
            </Badge>
          </div>
          <DialogTitle className="font-heading text-lg sm:text-xl font-black tracking-tight text-vl-dark-900">
            {isEditing ? "Edit Your Review" : "Write a Review"}
          </DialogTitle>
          <DialogDescription className="text-xs text-vl-dark-900/60">
            Share your feedback on fabric, sizing, and streetwear styling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Rating Selection */}
          <div className="space-y-1.5 rounded-xs bg-vl-white-300/50 p-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/60 block">
              Your Rating
            </span>
            <div className="flex items-center gap-3">
              <StarRating value={rating} size="md" interactive onChange={setRating} />
              <span className="text-xs font-bold text-vl-dark-900">
                {RATING_DESCRIPTIONS[rating] || `${rating} Stars`}
              </span>
            </div>
          </div>

          {/* Quick Fit Tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-vl-dark-900/60 block">
              Quick Highlights:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => {
                const active = comment.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className={`rounded-xs px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-vl-cyan-100 text-vl-cyan-dark ring-1 ring-vl-cyan-300"
                        : "bg-vl-dark-900/5 text-vl-dark-900/70 hover:bg-vl-dark-900/10"
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="modal-review-comment" className="font-bold text-vl-dark-900/70">
                Feedback (Optional)
              </label>
              <span className="font-mono text-vl-dark-900/40">{comment.length}/2000</span>
            </div>
            <Textarea
              id="modal-review-comment"
              rows={3}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How does the fabric feel? Is the fit boxy or true to size?"
              className="rounded-xs border-vl-dark-900/15 focus-visible:border-vl-cyan focus-visible:ring-vl-cyan text-xs"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xs bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-vl-dark-900/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-8 rounded-xs text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isPending}
              disabled={isPending}
              className="h-8 min-w-28 rounded-xs bg-vl-dark-900 text-xs font-bold text-white hover:bg-vl-dark-900/90 shadow-2xs"
            >
              {isPending ? "Posting..." : isEditing ? "Save Changes" : "Post Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
