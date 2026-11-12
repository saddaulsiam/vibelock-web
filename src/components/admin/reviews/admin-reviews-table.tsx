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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <div className="border-vl-dark-900/10 rounded-xl border bg-white p-4 shadow-2xs">
          <p className="text-vl-dark-900/60 text-xs font-semibold tracking-wider uppercase">
            Total Reviews
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-vl-dark-900 text-2xl font-black sm:text-3xl">
              {kpis.totalReviews}
            </span>
            <MessageSquare className="text-vl-dark-900/40 size-4" />
          </div>
        </div>

        <div className="border-vl-dark-900/10 rounded-xl border bg-white p-4 shadow-2xs">
          <p className="text-vl-dark-900/60 text-xs font-semibold tracking-wider uppercase">
            Store Average
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-vl-dark-900 text-2xl font-black sm:text-3xl">
              {kpis.averageRating.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-amber-500">★ / 5.0</span>
          </div>
        </div>

        <div className="border-vl-dark-900/10 rounded-xl border bg-white p-4 shadow-2xs">
          <p className="text-vl-dark-900/60 text-xs font-semibold tracking-wider uppercase">
            5-Star Reviews
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 sm:text-3xl">
              {kpis.fiveStarCount}
            </span>
            <Sparkles className="size-4 text-emerald-500" />
          </div>
        </div>

        <div className="border-vl-dark-900/10 rounded-xl border bg-white p-4 shadow-2xs">
          <p className="text-vl-dark-900/60 text-xs font-semibold tracking-wider uppercase">
            Verified Buyers
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-vl-cyan-600 text-2xl font-black sm:text-3xl">
              {kpis.verifiedCount}
            </span>
            <CheckCircle2 className="text-vl-cyan-600 size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="border-vl-dark-900/10 flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="text-vl-dark-900/40 pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product, customer name, email, or comment..."
            size="default"
            className="pl-9"
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

          <span className="text-vl-dark-900/60 text-xs font-semibold">
            {reviews.length} of {totalCount} reviews
          </span>

          {(currentSearch || currentRating || currentVerified) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                router.push(pathname);
              }}
            >
              Reset
            </Button>
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
              <TableCell colSpan={6} className="text-vl-dark-900/50 p-8 text-center text-xs">
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
                          className="border-vl-dark-900/10 size-10 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="bg-vl-dark-900/5 text-vl-dark-900/40 flex size-10 items-center justify-center rounded-md font-bold">
                          VL
                        </div>
                      )}
                      <div className="max-w-48 min-w-0">
                        <Link
                          href={`/products/${review.product.slug}`}
                          target="_blank"
                          className="hover:text-vl-cyan text-vl-dark-900 flex items-center gap-1 font-bold transition-colors"
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
                      <p className="text-vl-dark-900 font-bold">
                        {review.user?.name || "Customer"}
                      </p>
                      <p className="text-vl-dark-900/50 truncate text-[11px]">
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
                      <span className="text-vl-dark-900 font-bold">{review.rating}</span>
                      <span className="text-amber-500">★</span>
                    </div>
                  </TableCell>

                  {/* Comment Column */}
                  <TableCell className="max-w-xs sm:max-w-md">
                    {review.comment ? (
                      <p className="text-vl-dark-900/80 line-clamp-2 text-xs leading-relaxed">
                        {review.comment}
                      </p>
                    ) : (
                      <span className="text-vl-dark-900/40 text-[11px] italic">
                        Rating only (No comment)
                      </span>
                    )}
                  </TableCell>

                  {/* Date Column */}
                  <TableCell className="text-vl-dark-900/60 whitespace-nowrap">{dateStr}</TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(review.id)}
                      disabled={isPending && deletingId === review.id}
                      className="size-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      title="Delete spam/inappropriate review"
                      aria-label="Delete review"
                    >
                      {isPending && deletingId === review.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
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
