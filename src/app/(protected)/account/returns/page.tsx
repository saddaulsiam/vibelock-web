import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { getCustomerReturns } from "@/lib/account/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

export const metadata: Metadata = {
  title: "Returns & Refunds | VibeLock",
  robots: { index: false, follow: false },
};

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getCustomerReturns(page);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5 mb-5">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[#101114] sm:text-2xl">
              Returns & Refunds
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Track return requests, status updates, and refund settlements.
            </p>
          </div>
          <span className="rounded-full bg-[#101114]/5 px-3 py-1 text-xs font-bold text-[#101114]">
            {result.total} {result.total === 1 ? "Request" : "Requests"}
          </span>
        </div>

        {result.returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F0E8] text-muted-foreground">
              <RotateCcw className="size-7" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#101114]">No return requests</h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
              You haven&apos;t filed any returns yet. Eligible delivered items will appear here when requested.
            </p>
            <Link
              href="/account/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#101114] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229]"
            >
              <span>View Past Orders</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {result.returns.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-[#101114]/10 bg-white p-4 transition-all hover:border-[#101114]/20 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#101114]/10 pb-3">
                  <div>
                    <Link
                      href={`/account/returns/${request.id}`}
                      className="text-sm font-bold text-[#101114] hover:underline"
                    >
                      Return Request #{request.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Order:{" "}
                      <Link
                        href={`/account/orders/${request.order.orderNumber}`}
                        className="font-semibold text-[#101114] hover:underline"
                      >
                        #{request.order.orderNumber}
                      </Link>{" "}
                      • {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={request.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {request.itemCount} {request.itemCount === 1 ? "item" : "items"}
                  </span>
                  <span className="font-bold text-[#101114]">
                    Requested Refund: ৳ {request.requestedAmount.toLocaleString("en-BD")}
                  </span>
                  <Link
                    href={`/account/returns/${request.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#0099b8] hover:text-[#00c2e5]"
                  >
                    <span>View Details</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {result.totalPages > 1 && (
              <nav aria-label="Pagination" className="flex justify-between items-center pt-4 border-t border-[#101114]/10 text-xs">
                {page > 1 ? (
                  <Link
                    href={`/account/returns?page=${page - 1}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
                  >
                    <ArrowLeft className="size-3.5" /> Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/10 px-3.5 py-2 text-muted-foreground/50 cursor-not-allowed">
                    <ArrowLeft className="size-3.5" /> Previous
                  </span>
                )}
                <span className="text-muted-foreground">
                  Page {page} of {result.totalPages}
                </span>
                {page < result.totalPages ? (
                  <Link
                    href={`/account/returns?page=${page + 1}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
                  >
                    Next <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/10 px-3.5 py-2 text-muted-foreground/50 cursor-not-allowed">
                    Next <ArrowRight className="size-3.5" />
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
