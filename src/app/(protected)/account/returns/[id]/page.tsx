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
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Link
            href="/account/returns"
            className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Returns</span>
          </Link>
          <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
            Return Request
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
                Return #{request.id.slice(0, 8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={request.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Order{" "}
              <Link
                href={`/account/orders/${request.order.orderNumber}`}
                className="font-bold text-[#101114] hover:underline"
              >
                #{request.order.orderNumber}
              </Link>{" "}
              • Requested {formatDate(request.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Return Information Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
          <RotateCcw className="size-4 text-[#0099b8]" />
          <span>Return Summary</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/50 p-4">
            <span className="text-muted-foreground font-medium">Reason for Return</span>
            <p className="mt-1 font-bold text-[#101114]">{request.reason || "Not specified"}</p>
          </div>
          <div className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/50 p-4">
            <span className="text-muted-foreground font-medium">Requested Refund Amount</span>
            <p className="mt-1 text-base font-black text-[#101114]">
              ৳ {request.requestedAmount.toLocaleString("en-BD")}
            </p>
          </div>
        </div>
      </div>

      {/* Returned Items Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
          Returned Items
        </h2>

        <ul className="divide-y divide-[#101114]/10">
          {request.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-4 text-xs">
              <div>
                <p className="text-sm font-bold text-[#101114]">{item.orderItem.productName}</p>
                <p className="text-muted-foreground mt-0.5">
                  {[
                    item.orderItem.size && `Size: ${item.orderItem.size}`,
                    item.orderItem.color && `Color: ${item.orderItem.color}`,
                  ]
                    .filter(Boolean)
                    .join(" • ") || item.orderItem.sku}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#101114]">
                  {item.quantity} × ৳ {item.orderItem.unitPrice.toLocaleString("en-BD")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Refunds settlements if any */}
      {request.refunds.length > 0 && (
        <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="mb-4 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
            Refund Transactions
          </h2>
          <div className="space-y-3">
            {request.refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex items-center justify-between rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-3.5 text-xs"
              >
                <div>
                  <p className="font-bold text-[#101114]">Refund Settlement</p>
                  <p className="text-muted-foreground">{formatDate(refund.createdAt)}</p>
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
