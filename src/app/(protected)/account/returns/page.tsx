import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RotateCcw, ShoppingBag } from "lucide-react";
import { getCustomerReturns } from "@/lib/account/queries";
import { ReturnsInfiniteList } from "@/components/account/returns/returns-infinite-list";

export const metadata: Metadata = {
  title: "Returns & Exchanges | VibeLock",
  description: "Track return requests, replacement statuses, and doorstep pickup refunds.",
  robots: { index: false, follow: false },
};

const pageSize = 10;

export default async function ReturnsPage() {
  const result = await getCustomerReturns(1, pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Main Returns Container ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 p-5 sm:p-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-[#00D9FF] uppercase sm:text-[11px] sm:tracking-[0.2em]">
                Customer Care
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-[11px] text-neutral-500 sm:text-xs">
                72-Hour Doorstep Return Policy
              </span>
            </div>
            <h1 className="mt-0.5 text-base font-bold tracking-tight text-[#101114] uppercase sm:text-xl">
              Returns &amp; Refunds
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Track courier pickup status, QC inspection, and refund disbursements
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              {result.total} {result.total === 1 ? "Return" : "Returns"}
            </span>
            <Link
              href="/account/orders"
              className="hidden items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wider text-[#101114] uppercase transition-colors hover:bg-neutral-50 sm:inline-flex"
            >
              <ShoppingBag className="size-3.5" />
              <span>New Return</span>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {result.returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 py-16 text-center sm:p-14">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-[#101114]">
              <RotateCcw className="size-6 text-neutral-600" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#101114] uppercase">
              No return requests yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 sm:text-sm">
              You haven&apos;t filed any returns. If you need to exchange an item or request a
              refund for a delivered order, you can initiate a return within 72 hours of delivery.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/account/orders"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101114] px-5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
              >
                <span>View Eligible Orders</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <ReturnsInfiniteList
            key={result.total}
            initialReturns={result.returns}
            total={result.total}
            pageSize={pageSize}
          />
        )}
      </div>
    </div>
  );
}
