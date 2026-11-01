import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/authorization";
import { getAdminReviews } from "@/lib/reviews/queries";
import { AdminReviewsTable } from "@/components/admin/reviews/admin-reviews-table";

export const metadata: Metadata = {
  title: "Product Reviews Moderation | VibeLock Admin",
};

interface AdminReviewsPageProps {
  searchParams: Promise<{
    search?: string;
    rating?: string;
    verified?: string;
    page?: string;
  }>;
}

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  await requireRole("ADMIN");

  const params = await searchParams;
  const ratingNum = params.rating ? parseInt(params.rating, 10) : undefined;
  const verifiedBool =
    params.verified === "true" ? true : params.verified === "false" ? false : undefined;

  const { reviews, kpis, totalCount } = await getAdminReviews({
    search: params.search,
    rating: ratingNum,
    verified: verifiedBool,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#101114]/10 pb-5">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#101114]/60 uppercase">
            Marketing & Social Proof
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#101114] sm:text-3xl">
            Product Reviews & Ratings
          </h1>
          <p className="mt-1 text-xs text-[#101114]/65">
            Monitor customer feedback, verified purchases, and moderate store reviews.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-[#101114]/70">
            Total Results: <strong className="text-[#101114]">{totalCount}</strong>
          </span>
        </div>
      </div>

      <AdminReviewsTable reviews={reviews} kpis={kpis} totalCount={totalCount} />
    </div>
  );
}
