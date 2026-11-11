import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RotateCcw, ShoppingBag } from "lucide-react";
import { getCustomerReturns } from "@/lib/account/queries";
import { ReturnsInfiniteList } from "@/components/account/returns/returns-infinite-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-7">
          <div>
            <p className="text-vl-cyan text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px] sm:tracking-[0.2em]">
              Customer Care
            </p>
            <h1 className="text-vl-dark-900 mt-0.5 text-base font-bold tracking-tight uppercase sm:text-xl">
              Returns &amp; Refunds
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">72-Hour Doorstep Return Policy</p>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant={"info"}>
              {result.total} {result.total === 1 ? "Return" : "Returns"}
            </Badge>
            <Button variant={"primary"} size={"sm"}>
              <Link href="/account/orders" className="hidden items-center gap-1.5 sm:inline-flex">
                <ShoppingBag className="size-3.5" />
                <span>New Return</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {result.returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 py-16 text-center sm:p-14">
            <div className="text-vl-dark-900 flex size-14 items-center justify-center rounded-2xl bg-neutral-100">
              <RotateCcw className="size-6 text-neutral-600" />
            </div>
            <h2 className="text-vl-dark-900 mt-4 text-base font-bold uppercase">
              No return requests yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 sm:text-sm">
              You haven&apos;t filed any returns. If you need to exchange an item or request a
              refund for a delivered order, you can initiate a return within 72 hours of delivery.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/account/orders"
                className="bg-vl-dark-900 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
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
