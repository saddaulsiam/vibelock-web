"use client";

import type { AdminCustomerReviewItem } from "@/lib/admin/customers/customer-queries";
import { CheckCircle2, ExternalLink, MessageSquareQuote, Package, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CustomerReviewsCardProps {
  reviews: AdminCustomerReviewItem[];
}

export function CustomerReviewsCard({ reviews }: CustomerReviewsCardProps) {
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;

  if (totalReviews === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Star className="size-4 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Product Reviews & Ratings</h2>
              <p className="text-[11px] text-neutral-400">
                Customer product reviews and ratings history
              </p>
            </div>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
            0 Reviews
          </span>
        </div>
        <p className="py-2 text-xs text-neutral-400 italic">
          This customer has not submitted any product reviews or ratings yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-600">
            <Star className="size-4.5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900">Product Reviews & Feedback</h2>
              <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                ⭐ {avgRating.toFixed(1)} / 5.0
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Total {totalReviews} {totalReviews === 1 ? "review" : "reviews"} submitted by customer
            </p>
          </div>
        </div>

        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
          {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
        </span>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-neutral-100">
        {reviews.map((review) => (
          <div key={review.id} className="space-y-2 py-3.5 first:pt-0 last:pb-0">
            {/* Top row: Rating + Verified + Date */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* 5-star display */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-3.5 ${
                        star <= review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-neutral-800">{review.rating}.0</span>

                {review.verified && (
                  <span className="py-0.2 inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-2.5 text-emerald-600" /> Verified Purchase
                  </span>
                )}
              </div>

              <span className="text-[11px] font-medium text-neutral-400">
                {new Date(review.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Product Tag */}
            <div className="flex items-center gap-2">
              <div className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                {review.productImageUrl ? (
                  <Image
                    src={review.productImageUrl}
                    alt={review.productName}
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <Package className="size-3 text-neutral-400" />
                )}
              </div>
              <Link
                href={`/products/${review.productSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 transition hover:text-neutral-900"
              >
                <span>{review.productName}</span>
                <ExternalLink className="size-2.5 text-neutral-400" />
              </Link>
            </div>

            {/* Review Comment */}
            {review.comment ? (
              <div className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50/80 p-2.5 text-xs text-neutral-700">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <p className="leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">
                (Rating only - No written comment provided)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
