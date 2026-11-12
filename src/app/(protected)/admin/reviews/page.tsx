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
  await requireRole("MANAGER");

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
      <div className="border-vl-dark-900/10 flex flex-wrap items-baseline justify-between gap-4 border-b pb-5">
        <div>
          <p className="tracking-streetwear text-vl-dark-900/60 text-xs font-bold uppercase">
            Marketing & Social Proof
          </p>
          <h1 className="text-vl-dark-900 mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Product Reviews & Ratings
          </h1>
          <p className="text-vl-dark-900/65 mt-1 text-xs">
            Monitor customer feedback, verified purchases, and moderate store reviews.
          </p>
        </div>
        <div className="text-right">
          <span className="text-vl-dark-900/70 text-xs font-semibold">
            Total Results: <strong className="text-vl-dark-900">{totalCount}</strong>
          </span>
        </div>
      </div>

      <AdminReviewsTable reviews={reviews} kpis={kpis} totalCount={totalCount} />
    </div>
  );
}
