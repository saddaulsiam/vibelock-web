import { Suspense } from "react";
import Link from "next/link";
import { ReturnRequestStatus } from "@prisma/client";
import { ShoppingBag, ArrowUpRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { getAdminReturns } from "@/lib/admin/return-queries";
import { AdminReturnsTable } from "@/components/admin/returns";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function ReturnsTableContainer({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const rawStatus = valueOf(searchParams.status);
  const status = Object.values(ReturnRequestStatus).includes(rawStatus as ReturnRequestStatus)
    ? (rawStatus as ReturnRequestStatus)
    : undefined;
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const { returns, total, totalPages, statusCounts } = await getAdminReturns({
    search,
    status,
    page,
    limit: 20,
  });

  return (
    <AdminReturnsTable
      initialReturns={returns}
      total={total}
      totalPages={totalPages}
      page={page}
      statusCounts={statusCounts}
      currentStatus={status}
      currentSearch={search}
    />
  );
}

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Harmonized Page Header ── */}
      <AdminPageHeader
        eyebrow="Operations / Post-Purchase"
        title="Returns & Refunds"
        badgeLabel="Returns Desk"
        badgeVariant="amber"
        description="Review customer return requests, inspect returned merchandise, and process payment refunds."
      >
        <Link
          href="/admin/orders"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 transition"
        >
          <ShoppingBag className="size-3.5 text-neutral-500" />
          <span>View All Orders</span>
          <ArrowUpRight className="size-3 text-neutral-400" />
        </Link>
      </AdminPageHeader>

      {/* ── Main Returns Table ── */}
      <Suspense
        fallback={
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-neutral-200/90 bg-white p-12 text-center text-xs text-neutral-500">
            <div className="flex items-center gap-2 font-medium">
              <span className="size-4 animate-spin rounded-full border-2 border-[#101114] border-t-transparent" />
              <span>Loading return requests...</span>
            </div>
          </div>
        }
      >
        <ReturnsTableContainer searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
