"use client";

import { StarRating } from "./star-rating";
import { Badge } from "@/components/ui/badge";
import type { ReviewSummary } from "@/lib/reviews/types";

interface ProductReviewsSummaryProps {
  summary: ReviewSummary;
}

export function ProductReviewsSummary({ summary }: ProductReviewsSummaryProps) {
  const { averageRating, totalReviews, distribution, percentages } = summary;

  return (
    <div className="rounded-2xl border border-vl-dark-900/10 bg-white p-6 shadow-xs sm:p-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-8">
        {/* Left Side: Score & Stars */}
        <div className="flex flex-col items-center justify-center border-b border-vl-dark-900/10 pb-6 text-center sm:border-r sm:border-b-0 sm:pr-8 sm:pb-0">
          <div className="text-5xl font-black tracking-tight text-vl-dark-900 sm:text-6xl">
            {totalReviews > 0 ? averageRating.toFixed(1) : "0.0"}
          </div>
          <div className="mt-2">
            <StarRating value={Math.round(averageRating)} size="lg" />
          </div>
          <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-wider text-vl-dark-900/70 uppercase">
            {totalReviews === 0
              ? "No reviews yet"
              : `Based on ${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`}
          </p>
          <Badge variant="cyan" size="default" className="mt-2">
            100% Verified Buyers
          </Badge>
        </div>

        {/* Right Side: Rating Distribution Bars */}
        <div className="space-y-2.5">
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = distribution[stars];
            const pct = percentages[stars];

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-7 font-bold text-vl-dark-900">{stars} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-vl-dark-900/10">
                  <div
                    className="h-full rounded-full bg-vl-cyan transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="w-12 text-right text-vl-dark-900/60 tabular-nums">
                  {count} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
