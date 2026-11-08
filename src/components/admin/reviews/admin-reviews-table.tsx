"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { deleteReviewAction } from "@/lib/reviews/actions";
import type { AdminReviewItem, AdminReviewsKPIs } from "@/lib/reviews/types";
import {
  CheckCircle2,
  Trash2,
  Search,
  ExternalLink,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";

interface AdminReviewsTableProps {
  reviews: AdminReviewItem[];
  kpis: AdminReviewsKPIs;
  totalCount: number;
}

export function AdminReviewsTable({ reviews, kpis, totalCount }: AdminReviewsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") || "";
  const currentRating = searchParams.get("rating") || "";
  const currentVerified = searchParams.get("verified") || "";

  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters("search", searchTerm);
  };

  const handleDelete = (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;

    setDeletingId(reviewId);
    startTransition(async () => {
      const res = await deleteReviewAction(reviewId);
      if (res.success) {
        toast.success(res.message || "Review deleted successfully.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete review.");
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold tracking-wider text-[#101114]/60 uppercase">
            Total Reviews
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#101114] sm:text-3xl">
              {kpis.totalReviews}
            </span>
            <MessageSquare className="size-4 text-[#101114]/40" />
          </div>
        </div>

        <div className="rounded-xl border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold tracking-wider text-[#101114]/60 uppercase">
            Store Average
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#101114] sm:text-3xl">
              {kpis.averageRating.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-amber-500">★ / 5.0</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold tracking-wider text-[#101114]/60 uppercase">
            5-Star Reviews
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 sm:text-3xl">
              {kpis.fiveStarCount}
            </span>
            <Sparkles className="size-4 text-emerald-500" />
          </div>
        </div>

        <div className="rounded-xl border border-[#101114]/10 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold tracking-wider text-[#101114]/60 uppercase">
            Verified Buyers
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#008ca6] sm:text-3xl">
              {kpis.verifiedCount}
            </span>
            <CheckCircle2 className="size-4 text-[#008ca6]" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#101114]/10 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#101114]/40" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product, customer name, email, or comment..."
            className="w-full rounded-md border border-[#101114]/15 bg-white py-2 pr-3 pl-9 text-xs text-[#101114] placeholder:text-[#101114]/40 focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF] focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rating Filter */}
          <NativeSelect
            value={currentRating}
            onChange={(e) => updateFilters("rating", e.target.value)}
            size="sm"
            className="w-auto min-w-32 bg-white"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars (★★★★★)</option>
            <option value="4">4 Stars (★★★★)</option>
            <option value="3">3 Stars (★★★)</option>
            <option value="2">2 Stars (★★)</option>
            <option value="1">1 Star (★)</option>
          </NativeSelect>

          {/* Verified Filter */}
          <NativeSelect
            value={currentVerified}
            onChange={(e) => updateFilters("verified", e.target.value)}
            size="sm"
            className="w-auto min-w-36 bg-white"
          >
            <option value="">All Purchases</option>
            <option value="true">Verified Purchases Only</option>
            <option value="false">Unverified Only</option>
          </NativeSelect>

          <span className="text-xs font-semibold text-[#101114]/60">
            {reviews.length} of {totalCount} reviews
          </span>

          {(currentSearch || currentRating || currentVerified) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                router.push(pathname);
              }}
              className="rounded-md border border-[#101114]/15 px-3 py-2 text-xs font-bold text-[#101114]/70 hover:bg-[#101114]/5"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Reviews Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sm:px-6">Product</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Review Comment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-8 text-center text-xs text-[#101114]/50">
                No reviews found matching your criteria.
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((review) => {
              const dateStr = new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <TableRow key={review.id}>
                  {/* Product Column */}
                  <TableCell className="sm:px-6">
                    <div className="flex items-center gap-3">
                      {review.product.primaryImage ? (
                        <Image
                          src={review.product.primaryImage}
                          alt={review.product.name}
                          width={40}
                          height={40}
                          className="size-10 rounded-md border border-[#101114]/10 object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-[#101114]/5 font-bold text-[#101114]/40">
                          VL
                        </div>
                      )}
                      <div className="max-w-48 min-w-0">
                        <Link
                          href={`/products/${review.product.slug}`}
                          target="_blank"
                          className="hover:text-vl-cyan flex items-center gap-1 font-bold text-[#101114] transition-colors"
                        >
                          <span className="truncate">{review.product.name}</span>
                          <ExternalLink className="size-3 shrink-0 opacity-60" />
                        </Link>
                      </div>
                    </div>
                  </TableCell>

                  {/* Customer Column */}
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-bold text-[#101114]">
                        {review.user?.name || "Customer"}
                      </p>
                      <p className="truncate text-[11px] text-[#101114]/50">
                        {review.user?.email || "No email"}
                      </p>
                      {review.verified && (
                        <Badge variant="cyan" size="sm" className="mt-1 gap-1">
                          <CheckCircle2 className="size-2.5" /> Verified Buyer
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Rating Column */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#101114]">{review.rating}</span>
                      <span className="text-amber-500">★</span>
                    </div>
                  </TableCell>

                  {/* Comment Column */}
                  <TableCell className="max-w-xs sm:max-w-md">
                    {review.comment ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#101114]/80">
                        {review.comment}
                      </p>
                    ) : (
                      <span className="text-[11px] text-[#101114]/40 italic">
                        Rating only (No comment)
                      </span>
                    )}
                  </TableCell>

                  {/* Date Column */}
                  <TableCell className="whitespace-nowrap text-[#101114]/60">{dateStr}</TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={isPending && deletingId === review.id}
                      className="inline-flex size-8 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-500"
                      title="Delete spam/inappropriate review"
                      aria-label="Delete review"
                    >
                      {isPending && deletingId === review.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
