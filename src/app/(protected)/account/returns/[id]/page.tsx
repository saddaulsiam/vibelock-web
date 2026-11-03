import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getCustomerReturnById } from "@/lib/account/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const request = await getCustomerReturnById(id);
  return {
    title: request ? `Return Request #${request.id.slice(0, 8)} | VibeLock` : "Return | VibeLock",
    robots: { index: false, follow: false },
  };
}

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getCustomerReturnById(id);
  if (!request) notFound();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(
      date
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <div className="mb-3.5 flex items-center justify-between border-b border-[#101114]/8 pb-3.5 sm:mb-4 sm:pb-4">
          <Link
            href="/account/returns"
            className="group inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Returns</span>
          </Link>
          <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase sm:text-[11px]">
            Return Request
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
                Return #{request.id.slice(0, 8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Order{" "}
              <Link
                href={`/account/orders/${request.order.orderNumber}`}
                className="font-bold text-[#101114] hover:underline"
              >
                #{request.order.orderNumber}
              </Link>{" "}
              • Requested on {formatDate(request.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Return Information Card */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <h2 className="mb-3.5 flex items-center gap-2 border-b border-[#101114]/8 pb-3.5 text-xs font-black tracking-tight text-[#101114] uppercase sm:text-sm">
          <RotateCcw className="size-4 text-[#101114]" />
          <span>Return Summary</span>
        </h2>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:gap-4">
          <div className="rounded-lg border border-[#101114]/8 bg-neutral-50/70 p-3.5 sm:p-4">
            <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 sm:text-[11px]">
              Reason for Return
            </span>
            <p className="mt-1 font-semibold text-[#101114]">{request.reason || "Not specified"}</p>
          </div>
          <div className="rounded-lg border border-[#101114]/8 bg-neutral-50/70 p-3.5 sm:p-4">
            <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 sm:text-[11px]">
              Requested Refund Amount
            </span>
            <p className="mt-1 text-sm font-black text-[#101114] sm:text-base">
              ৳ {request.requestedAmount.toLocaleString("en-BD")}
            </p>
          </div>
        </div>
      </div>

      {/* Returned Items Card */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        <h2 className="mb-2 border-b border-[#101114]/8 pb-3 text-xs font-black tracking-tight text-[#101114] uppercase sm:text-sm">
          Returned Items
        </h2>

        <ul className="divide-y divide-[#101114]/6">
          {request.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3 text-xs first:pt-3 last:pb-0 sm:py-4">
              <div>
                <p className="text-xs font-bold text-[#101114] sm:text-sm">{item.orderItem.productName}</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {[
                    item.orderItem.size && `Size: ${item.orderItem.size}`,
                    item.orderItem.color && `Color: ${item.orderItem.color}`,
                  ]
                    .filter(Boolean)
                    .join(" • ") || item.orderItem.sku}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-[#101114]">
                  {item.quantity} × ৳ {item.orderItem.unitPrice.toLocaleString("en-BD")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Refunds settlements if any */}
      {request.refunds.length > 0 && (
        <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
          <h2 className="mb-3.5 border-b border-[#101114]/8 pb-3.5 text-xs font-black tracking-tight text-[#101114] uppercase sm:text-sm">
            Refund Transactions
          </h2>
          <div className="divide-y divide-[#101114]/6">
            {request.refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex items-center justify-between py-3 text-xs first:pt-0 last:pb-0 sm:py-3.5"
              >
                <div>
                  <p className="font-bold text-[#101114]">Refund Settlement</p>
                  <p className="text-neutral-500">{formatDate(refund.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={refund.status} />
                  <span className="font-black text-[#101114]">
                    ৳ {refund.amount.toLocaleString("en-BD")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
