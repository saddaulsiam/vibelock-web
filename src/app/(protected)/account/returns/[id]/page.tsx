import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Package,
  CreditCard,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { getCustomerReturnById } from "@/lib/account/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const request = await getCustomerReturnById(params.id);
  return {
    title: request
      ? `Return #${request.id.slice(0, 8).toUpperCase()} | VibeLock`
      : "Return Request | VibeLock",
    description: "Track return request status, doorstep pickup, and refund disbursement.",
    robots: { index: false, follow: false },
  };
}

export default async function ReturnDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const request = await getCustomerReturnById(params.id);
  if (!request) notFound();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  // Progress Stepper segments
  const isRejected = request.status === "REJECTED";
  const steps = [
    {
      id: "requested",
      label: "Requested",
      sublabel: formatShortDate(request.createdAt),
      isDone: true,
      isCurrent: request.status === "PENDING",
    },
    {
      id: "pickup",
      label: "Pickup",
      sublabel: "Steadfast Courier",
      isDone: ["APPROVED", "RECEIVED", "COMPLETED"].includes(request.status),
      isCurrent: request.status === "APPROVED",
    },
    {
      id: "qc",
      label: "QC Hub",
      sublabel: "Verification",
      isDone: ["RECEIVED", "COMPLETED"].includes(request.status),
      isCurrent: request.status === "RECEIVED",
    },
    {
      id: "refund",
      label: "Settled",
      sublabel: "Disbursed",
      isDone: request.status === "COMPLETED",
      isCurrent: request.status === "COMPLETED",
    },
  ];

  const totalItemCount = request.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Navigation (Sleek single-line layout) ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/account/returns"
          className="group inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Returns</span>
        </Link>

        <Link
          href={`/account/orders/${request.order.orderNumber}`}
          className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-neutral-600 transition-colors hover:text-[#101114]"
        >
          <span>Order #{request.order.orderNumber}</span>
          <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
        </Link>
      </div>

      {/* ── Unified Master Return Document Canvas ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        {/* 1. Header Section: Return Identity & Status */}
        <div className="border-b border-[#101114]/8 p-4 sm:p-6 md:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-[#00D9FF] uppercase">
                  Return & Exchange
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs text-neutral-500">
                  Requested {formatDate(request.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-lg font-bold tracking-tight text-[#101114] uppercase sm:text-2xl">
                  Return #{request.id.slice(0, 8).toUpperCase()}
                </h1>
                <OrderStatusBadge status={request.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-500">
                <span>
                  Order:{" "}
                  <Link
                    href={`/account/orders/${request.order.orderNumber}`}
                    className="font-semibold text-[#101114] hover:underline"
                  >
                    #{request.order.orderNumber}
                  </Link>
                </span>
                <span className="text-neutral-300">•</span>
                <span>
                  Reason:{" "}
                  <strong className="font-semibold text-[#101114]">
                    {request.reason || "General Return"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar or Rejection State */}
          {isRejected ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 sm:p-4">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-rose-600" />
              <div>
                <h4 className="text-xs font-semibold tracking-wider text-rose-900 uppercase">
                  Return Request Rejected
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-rose-700">
                  This return request was reviewed by our QC team and could not be approved under
                  our return policy. If you believe this is in error, please reach out to customer support.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 border-t border-[#101114]/6 pt-4 sm:mt-6 sm:pt-5">
              {/* Connected Segmented Progress Bars */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {steps.map((st) => (
                  <div
                    key={st.id}
                    className={`h-1.5 rounded-full transition-colors ${
                      st.isDone
                        ? "bg-emerald-600"
                        : st.isCurrent
                          ? "bg-[#101114]"
                          : "bg-neutral-100"
                    }`}
                  />
                ))}
              </div>

              {/* Step Labels */}
              <div className="mt-2.5 grid grid-cols-4 gap-1">
                {steps.map((st) => (
                  <div key={st.id} className="flex flex-col">
                    <span
                      className={`text-[10px] font-bold tracking-wider uppercase sm:text-xs ${
                        st.isDone || st.isCurrent ? "text-[#101114]" : "text-neutral-400"
                      }`}
                    >
                      {st.label}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] text-neutral-400 sm:text-[11px]">
                      {st.sublabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Returned Items Section */}
        <div className="p-4 sm:p-6 md:p-7">
          <div className="flex items-center justify-between border-b border-[#101114]/8 pb-4">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-[#101114]" />
              <h2 className="text-xs font-bold tracking-wider text-[#101114] uppercase sm:text-sm">
                Returned Items
              </h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Item List */}
          <ul className="divide-y divide-[#101114]/6">
            {request.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3.5 py-4 first:pt-4 last:pb-2 sm:gap-4 sm:py-5"
              >
                {/* Product Thumbnail */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[#101114]/10 bg-neutral-100 sm:size-16">
                  <Image
                    src={item.orderItem.imageUrl || "/images/categories/cat-t-shirts.jpg"}
                    alt={item.orderItem.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-xs font-semibold text-[#101114] sm:text-sm">
                    {item.orderItem.productName}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                    {item.orderItem.size && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                        Size: {item.orderItem.size}
                      </span>
                    )}
                    {item.orderItem.color && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                        Color: {item.orderItem.color}
                      </span>
                    )}
                    {item.orderItem.sku && (
                      <span className="font-mono text-[10px] text-neutral-400 sm:text-[11px]">
                        SKU: {item.orderItem.sku}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-neutral-500">
                      Qty: {item.quantity} × ৳{item.orderItem.unitPrice.toLocaleString("en-BD")}
                    </span>
                  </div>
                </div>

                {/* Item Line Refund */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#101114] sm:text-base">
                    ৳ {(item.orderItem.unitPrice * item.quantity).toLocaleString("en-BD")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Customer Note / Feedback if provided */}
          {request.parsedReason?.customerNote && (
            <div className="mt-4 rounded-xl border border-[#101114]/8 bg-[#FAF9F5] p-3.5 text-xs">
              <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                Customer Comments
              </span>
              <p className="mt-1 leading-relaxed text-[#101114]">
                &ldquo;{request.parsedReason.customerNote}&rdquo;
              </p>
            </div>
          )}

          {/* Attached Proof Photos if any */}
          {request.parsedReason?.images && request.parsedReason.images.length > 0 && (
            <div className="mt-4">
              <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                Attached Photo Proofs ({request.parsedReason.images.length})
              </span>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {request.parsedReason.images.map((imgUrl, idx) => (
                  <a
                    key={idx}
                    href={imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative size-16 overflow-hidden rounded-xl border border-[#101114]/10 bg-neutral-100 shadow-2xs transition-transform hover:scale-105"
                    title={`View proof photo ${idx + 1}`}
                  >
                    <Image
                      src={imgUrl}
                      alt={`Proof photo ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Seamless Financial Receipt Calculation (Matching Order Details!) */}
          <div className="mt-4 border-t border-[#101114]/8 pt-5 sm:flex sm:justify-end">
            <div className="w-full space-y-2 text-xs sm:w-72 sm:max-w-xs sm:text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Merchandise Value</span>
                <span className="font-normal text-[#101114]">
                  ৳ {request.requestedAmount.toLocaleString("en-BD")}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Steadfast Pickup Fee</span>
                <span className="font-normal text-emerald-700">FREE</span>
              </div>
              <Separator className="my-2! bg-[#101114]/8" />
              <div className="my-2 flex items-baseline justify-between pt-1">
                <span className="text-sm font-bold tracking-wide text-[#101114] uppercase">
                  Total Refund
                </span>
                <span className="text-lg font-bold text-[#101114] sm:text-xl">
                  ৳ {request.requestedAmount.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integrated Metadata Grid (Address & Settlement) */}
        <div className="border-t border-[#101114]/8 bg-[#FAF9F5] p-4 sm:p-6 md:p-7">
          <div className="grid grid-cols-1 gap-6 divide-y divide-[#101114]/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {/* Doorstep Pickup Information */}
            <div className="sm:pr-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                <Truck className="size-3.5 text-[#101114]" />
                <span>Steadfast Doorstep Pickup</span>
              </div>
              <div className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600">
                <p className="font-semibold text-[#101114]">{request.order.customerName || "Customer"}</p>
                {request.order.customerPhone && (
                  <p className="font-medium text-neutral-700">{request.order.customerPhone}</p>
                )}
                <p className="text-neutral-500">{request.order.customerEmail}</p>
                <div className="pt-2 text-[#101114]">
                  <p>{request.order.shippingStreet}</p>
                  <p>
                    {request.order.shippingCity}
                    {request.order.shippingState ? `, ${request.order.shippingState}` : ""}
                    {request.order.shippingZip ? ` - ${request.order.shippingZip}` : ""}
                  </p>
                  <p>{request.order.shippingCountry}</p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <ShieldCheck className="size-3.5" />
                  <span>Complimentary Doorstep Collection</span>
                </div>
              </div>
            </div>

            {/* Refund Settlement Details */}
            <div className="pt-5 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                <CreditCard className="size-3.5 text-[#101114]" />
                <span>Refund Settlement</span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <span className="text-neutral-400">Method</span>
                  <span className="font-semibold text-[#101114]">
                    {request.order.paymentMethod || "COD"}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <span className="text-neutral-400">Status</span>
                  <OrderStatusBadge status={request.status} />
                </div>

                {request.refunds.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                    <span className="block font-semibold text-emerald-900 uppercase">
                      Settlement Disbursed:
                    </span>
                    <div className="mt-1.5 space-y-1">
                      {request.refunds.map((ref) => (
                        <div key={ref.id} className="flex items-center justify-between">
                          <span className="text-emerald-950 font-medium">
                            {formatDate(ref.createdAt)}
                          </span>
                          <span className="font-bold text-emerald-950">
                            ৳ {ref.amount.toLocaleString("en-BD")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                    Refund is disbursed to your original payment method within 3–5 working days post
                    hub inspection.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
