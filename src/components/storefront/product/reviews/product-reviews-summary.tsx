"use client";

import { StarRating } from "./star-rating";
import type { ReviewSummary } from "@/lib/reviews/types";
import { Filter } from "lucide-react";

interface ProductReviewsSummaryProps {
  summary: ReviewSummary;
  selectedRating?: number | null;
  onSelectRating?: (rating: number | null) => void;
}

export function ProductReviewsSummary({
  summary,
  selectedRating,
  onSelectRating,
}: ProductReviewsSummaryProps) {
  const { averageRating, totalReviews, distribution, percentages } = summary;

  if (totalReviews === 0) {
    return null;
  }

  const positiveReviews = (distribution[5] || 0) + (distribution[4] || 0);
  const recommendPercent = Math.round((positiveReviews / totalReviews) * 100);

  return (
    <div className="border-vl-dark-900/10 rounded-xs border bg-white p-4 shadow-2xs sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center sm:gap-5">
        {/* Left Side: Score & Rating */}
        <div className="border-vl-dark-900/10 flex flex-col items-center justify-center border-b pb-4 text-center sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
          <div className="font-heading text-vl-dark-900 text-4xl font-black tracking-tight sm:text-5xl">
            {averageRating.toFixed(1)}
          </div>
          <div className="mt-1.5">
            <StarRating value={Math.round(averageRating)} size="md" />
          </div>
          <p className="text-vl-dark-900/60 mt-1.5 text-xs font-semibold">
            {totalReviews} {totalReviews === 1 ? "review" : "reviews"} • {recommendPercent}%
            recommended
          </p>
        </div>

        {/* Right Side: Rating Distribution Bars */}
        <div className="space-y-1.5">
          <div className="text-vl-dark-900/60 flex items-center justify-between pb-0.5 text-xs font-bold">
            <span className="text-[11px] tracking-wider uppercase">Breakdown</span>
            {selectedRating && (
              <button
                type="button"
                onClick={() => onSelectRating?.(null)}
                className="text-vl-cyan-dark flex cursor-pointer items-center gap-1 text-[11px] font-bold hover:underline"
              >
                <Filter className="size-3" />
                Clear ({selectedRating}★)
              </button>
            )}
          </div>

          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = distribution[stars] || 0;
            const pct = percentages[stars] || 0;
            const isSelected = selectedRating === stars;

            return (
              <button
                key={stars}
                type="button"
                onClick={() => onSelectRating?.(isSelected ? null : stars)}
                className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-0.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-vl-cyan-50 ring-vl-cyan-300 font-bold ring-1"
                    : "hover:bg-vl-dark-900/5"
                }`}
                title={`Filter by ${stars} star reviews`}
              >
                <span className="text-vl-dark-900 w-7 shrink-0 text-xs font-bold">{stars} ★</span>
                <div className="bg-vl-dark-900/10 h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isSelected ? "bg-vl-dark-900" : "bg-vl-cyan"
                    }`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="text-vl-dark-900/60 w-12 shrink-0 text-right font-mono text-[11px] tabular-nums">
                  {count}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
