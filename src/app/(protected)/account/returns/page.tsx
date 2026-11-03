import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck, ShoppingBag } from "lucide-react";
import { getCustomerReturns } from "@/lib/account/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

export const metadata: Metadata = {
  title: "Returns & Exchanges | VibeLock",
  description: "Track return requests, replacement statuses, and doorstep pickup refunds.",
  robots: { index: false, follow: false },
};

export default async function ReturnsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const requestedPage = Number.parseInt(searchParams.page ?? "1", 10);
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
              Returns & Refunds
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
          <div>
            {/* Desktop Table View (>= md) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#101114]/8 bg-[#FAF9F5] text-[10px] font-semibold tracking-wider text-neutral-500 uppercase sm:text-[11px]">
                    <th className="py-4 pr-4 pl-7">Return ID</th>
                    <th className="px-4 py-4">Order & Date</th>
                    <th className="px-4 py-4">Items Returned</th>
                    <th className="px-4 py-4">Reason</th>
                    <th className="px-4 py-4">Est. Refund</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="py-4 pr-7 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101114]/6 text-sm">
                  {result.returns.map((request) => (
                    <tr key={request.id} className="transition-colors hover:bg-neutral-50/70">
                      {/* Return ID */}
                      <td className="py-4 pr-4 pl-7">
                        <Link
                          href={`/account/returns/${request.id}`}
                          className="font-semibold text-[#101114] hover:underline"
                        >
                          #RET-{request.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                          <ShieldCheck className="size-3" />
                          <span>Steadfast Pickup</span>
                        </div>
                      </td>

                      {/* Order & Date */}
                      <td className="px-4 py-4 text-xs">
                        <Link
                          href={`/account/orders/${request.order.orderNumber}`}
                          className="font-semibold text-[#101114] hover:underline"
                        >
                          #{request.order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-neutral-400">
                          {formatDate(request.createdAt)}
                        </p>
                      </td>

                      {/* Items Returned */}
                      <td className="px-4 py-4 text-xs">
                        <div className="max-w-[220px]">
                          <span className="font-semibold text-[#101114]">
                            {request.itemCount} {request.itemCount === 1 ? "item" : "items"}
                          </span>
                          {request.items && request.items.length > 0 && (
                            <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                              {request.items.map((it) => it.productName).join(", ")}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-4 text-xs font-medium text-neutral-700">
                        <span className="inline-block max-w-[150px] truncate rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                          {request.reason || "General Return"}
                        </span>
                      </td>

                      {/* Est. Refund */}
                      <td className="px-4 py-4 font-bold whitespace-nowrap text-[#101114]">
                        ৳ {request.requestedAmount.toLocaleString("en-BD")}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={request.status} />
                      </td>

                      {/* Action */}
                      <td className="py-4 pr-7 pl-4 text-right whitespace-nowrap">
                        <Link
                          href={`/account/returns/${request.id}`}
                          className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-normal text-neutral-700 transition-colors hover:text-[#101114]"
                        >
                          <span>Details</span>
                          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked View (< md) */}
            <div className="divide-y divide-[#101114]/8 p-4 sm:p-5 md:hidden">
              {result.returns.map((request) => (
                <div key={request.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/account/returns/${request.id}`}
                        className="text-xs font-semibold text-[#101114] hover:underline"
                      >
                        #RET-{request.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        Order{" "}
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

                  {request.items && request.items.length > 0 && (
                    <div className="mt-2.5 rounded-xl border border-[#101114]/6 bg-neutral-50/80 p-2.5">
                      <p className="text-[11px] font-semibold text-neutral-700">
                        {request.itemCount} {request.itemCount === 1 ? "Item" : "Items"}:
                      </p>
                      <ul className="mt-1 space-y-1">
                        {request.items.map((it, idx) => (
                          <li
                            key={idx}
                            className="flex justify-between text-[11px] text-neutral-600"
                          >
                            <span className="truncate pr-2">• {it.productName}</span>
                            <span className="shrink-0 font-semibold text-[#101114]">
                              Qty: {it.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                        Est. Refund
                      </span>
                      <span className="text-sm font-bold text-[#101114]">
                        ৳ {request.requestedAmount.toLocaleString("en-BD")}
                      </span>
                    </div>

                    <Link
                      href={`/account/returns/${request.id}`}
                      className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#101114] px-4 py-1.5 text-xs font-semibold tracking-wider text-white uppercase shadow-2xs transition-colors hover:bg-neutral-800"
                    >
                      <span>View Details</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {result.totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between border-t border-[#101114]/8 bg-[#FAF9F5] p-4 text-xs sm:px-7"
              >
                {page > 1 ? (
                  <Link
                    href={`/account/returns?page=${page - 1}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 font-semibold text-[#101114] transition-colors hover:bg-neutral-100"
                  >
                    <ArrowLeft className="size-3.5" /> Previous
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-[#101114]/10 bg-white/50 px-3.5 py-2 font-medium text-neutral-400">
                    <ArrowLeft className="size-3.5" /> Previous
                  </span>
                )}
                <span className="text-xs font-semibold text-neutral-500">
                  Page {page} of {result.totalPages}
                </span>
                {page < result.totalPages ? (
                  <Link
                    href={`/account/returns?page=${page + 1}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 font-semibold text-[#101114] transition-colors hover:bg-neutral-100"
                  >
                    Next <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-[#101114]/10 bg-white/50 px-3.5 py-2 font-medium text-neutral-400">
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
