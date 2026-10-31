import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RotateCcw,
  ChevronLeft,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Clock,
  Truck,
  PackageCheck,
  CheckCircle2,
  XCircle,
  User,
  CreditCard,
  History,
  ShieldCheck,
  Image as ImageIcon,
  Gift,
} from "lucide-react";
import { getAdminReturnById } from "@/lib/admin/return-queries";
import { parseReturnReason } from "@/lib/returns/utils";
import {
  initiateReturnRefundAction,
  processReturnRefundAction,
  updateReturnStatusAction,
  bookSteadfastReturnPickupAction,
  issueStoreCreditRefundAction,
} from "@/lib/admin/return-actions";
import {
  ProcessRefundForm,
  ReturnStatusForm,
  ReturnSteadfastPickupCard,
  ReturnSteadfastHeaderAction,
  StoreCreditRefundForm,
} from "@/components/admin/return-action-forms";
import { OrderCopyButton } from "@/components/admin/order-copy-button";
import { generateWhatsAppUrl } from "@/components/admin/admin-order-badges";
import type { ReturnRequestStatus } from "@prisma/client";

const nextStatuses: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["COMPLETED"],
};

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(dateValue: string | Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function getReturnStatusBadge(status: ReturnRequestStatus | string) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs">
          <Clock className="size-3.5 text-amber-600" />
          <span>Pending Review</span>
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 shadow-2xs">
          <Truck className="size-3.5 text-blue-600" />
          <span>Approved (In Transit)</span>
        </span>
      );
    case "RECEIVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-900 shadow-2xs">
          <PackageCheck className="size-3.5 text-purple-600" />
          <span>Received at Warehouse</span>
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 shadow-2xs">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span>Completed &amp; Refunded</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900 shadow-2xs">
          <XCircle className="size-3.5 text-rose-600" />
          <span>Rejected</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800">
          {status}
        </span>
      );
  }
}

export default async function AdminReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getAdminReturnById(id);
  if (!request) notFound();

  const refunds = request.order.payments.flatMap((payment) =>
    payment.refunds.map((refund) => ({
      ...refund,
      gateway: payment.gateway,
      paymentStatus: payment.status,
    }))
  );

  const whatsAppUrl = request.order.customerPhone
    ? generateWhatsAppUrl(
        request.order.customerPhone,
        request.order.orderNumber,
        request.order.customerName
      )
    : null;

  const shippingAddress = [
    request.order.shippingStreet,
    request.order.shippingCity,
    request.order.shippingState,
    request.order.shippingZip,
    request.order.shippingCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Breadcrumb & Navigation ── */}
      <div>
        <Link
          href="/admin/returns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition"
        >
          <ChevronLeft className="size-4" />
          <span>Back to Returns</span>
        </Link>
      </div>

      {/* ── Screen Header & Status Banner ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                Return Request
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="font-mono text-xs text-neutral-500">ID: {request.id}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
                Order #{request.order.orderNumber}
              </h1>
              <OrderCopyButton
                text={request.order.orderNumber}
                variant="pill"
                label="Copy #"
                successMessage="Order number copied"
                title="Copy order number"
              />
              <Link
                href={`/admin/orders/${request.order.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                <span>View Full Order</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>

            <p className="mt-1.5 text-xs text-neutral-500">
              Submitted on {formatDate(request.createdAt)} &middot; Order Placed:{" "}
              {formatDate(request.order.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {getReturnStatusBadge(request.status)}

            <ReturnSteadfastHeaderAction
              reverseLogistics={request.reverseLogistics}
              status={request.status}
            />

            {request.order.customerPhone && whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
                title="Chat with customer on WhatsApp"
              >
                <MessageSquare className="size-3.5 text-emerald-600" />
                <span>WhatsApp Customer</span>
              </a>
            )}
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-4">
          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Refund Estimate
            </span>
            <p className="mt-0.5 text-lg font-black text-neutral-900">
              {formatBdt(request.requestedAmount)}
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Original Order Total
            </span>
            <p className="mt-0.5 text-lg font-black text-neutral-900">
              {formatBdt(request.order.total)}
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Items Flagged
            </span>
            <p className="mt-0.5 text-lg font-black text-neutral-900">
              {request.items.reduce((s, it) => s + it.quantity, 0)} item(s)
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Order Status
            </span>
            <p className="mt-0.5 text-sm font-bold text-neutral-800">
              {request.order.status}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Detail Grid Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Items, Reason, History) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Return Items Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                  <ShoppingBag className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                    Return Items Verification
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Line items requested for return by customer
                  </p>
                </div>
              </div>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-700">
                {request.items.length} line(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                  <tr>
                    <th className="py-2.5 pl-3 pr-2">Product Name &amp; Variants</th>
                    <th className="px-2 py-2.5 font-mono">SKU</th>
                    <th className="px-2 py-2.5 text-center">Qty</th>
                    <th className="px-2 py-2.5 text-right">Unit Price</th>
                    <th className="py-2.5 pr-3 pl-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {request.items.map((item) => {
                    const lineSubtotal = Number(item.orderItem.unitPrice) * item.quantity;
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 pl-3 pr-2">
                          <p className="font-bold text-neutral-900">{item.orderItem.productName}</p>
                          {(item.orderItem.size || item.orderItem.color) && (
                            <p className="mt-0.5 text-[11px] text-neutral-500">
                              {item.orderItem.size && <span>Size: {item.orderItem.size} </span>}
                              {item.orderItem.color && <span>&bull; Color: {item.orderItem.color}</span>}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-3 font-mono text-[11px] text-neutral-600">
                          {item.orderItem.sku}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-neutral-900">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-neutral-700">
                          {formatBdt(item.orderItem.unitPrice)}
                        </td>
                        <td className="py-3 pr-3 pl-2 text-right font-black text-neutral-900">
                          {formatBdt(lineSubtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs">
              <span className="font-bold text-neutral-600">Estimated Total Refund Amount:</span>
              <span className="text-base font-black text-neutral-900">
                {formatBdt(request.requestedAmount)}
              </span>
            </div>
          </div>

          {/* Refund History Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                    Refund History &amp; Settlements
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Payment gateway refunds recorded for this order
                  </p>
                </div>
              </div>
            </div>

            {refunds.length === 0 && (!request.storeCreditVouchers || request.storeCreditVouchers.length === 0) ? (
              <p className="text-xs text-neutral-400 italic">
                No refunds or store vouchers have been processed for this return request yet.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Issued 105% Store Credit Vouchers */}
                {request.storeCreditVouchers?.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50/50 p-3.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-neutral-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {voucher.code}
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          105% STORE CREDIT
                        </span>
                      </div>
                      <OrderCopyButton text={voucher.code} label="Copy Voucher" />
                    </div>
                    <div className="flex items-center justify-between text-neutral-700">
                      <span>
                        Value: <strong>{formatBdt(voucher.voucherAmount)}</strong>{" "}
                        <span className="text-[11px] text-emerald-700">
                          (Includes {formatBdt(voucher.bonusAmount)} Bonus)
                        </span>
                      </span>
                      <span className="text-[11px] text-neutral-500">{formatDate(voucher.issuedAt)}</span>
                    </div>
                  </div>
                ))}

                {refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/50 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-neutral-900">
                          {formatBdt(refund.amount)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            refund.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {refund.status}
                        </span>
                        <span className="text-neutral-400">&bull;</span>
                        <span className="font-semibold text-neutral-600 capitalize">
                          {refund.gateway}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {formatDate(refund.createdAt)}
                      </span>
                    </div>

                    {refund.reason && (
                      <p className="text-neutral-600 text-[11px]">
                        <strong>Reason:</strong> {refund.reason}
                      </p>
                    )}

                    {refund.status === "PENDING" && (
                      <div className="mt-1 border-t border-neutral-200/60 pt-2">
                        <ProcessRefundForm
                          returnId={request.id}
                          refundId={refund.id}
                          action={processReturnRefundAction}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit & Order History Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <History className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                    Audit Trail &amp; Order Timeline
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Chronological activity log of this return request
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {request.auditLogs.map((entry) => (
                <div key={entry.id} className="border-l-2 border-neutral-300 pl-3.5 text-xs space-y-0.5">
                  <p className="font-bold text-neutral-800">{entry.action}</p>
                  <p className="text-[11px] text-neutral-500">
                    {formatDate(entry.createdAt)} &bull; By{" "}
                    {entry.actor?.name || entry.actor?.email || "System Admin"}
                  </p>
                </div>
              ))}

              {request.order.history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-neutral-200 pl-3.5 text-xs space-y-0.5">
                  <p className="font-semibold text-neutral-700">Order: {entry.status}</p>
                  <p className="text-[11px] text-neutral-500">
                    {entry.notes || "Status updated"} &bull; {formatDate(entry.createdAt)}
                  </p>
                </div>
              ))}

              {request.auditLogs.length === 0 && request.order.history.length === 0 && (
                <p className="text-xs text-neutral-400 italic">No timeline entries recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Customer, Reason Details, Actions) */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                  <User className="size-4" />
                </div>
                <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                  Customer Details
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Name
                </span>
                <p className="font-bold text-neutral-900 text-sm mt-0.5">
                  {request.order.customerName || "Guest Customer"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Email
                </span>
                <p className="font-medium text-neutral-700 truncate mt-0.5">
                  {request.order.customerEmail}
                </p>
              </div>

              {request.order.customerPhone && (
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Phone &amp; WhatsApp
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono font-bold text-neutral-900">
                      {request.order.customerPhone}
                    </span>
                    {whatsAppUrl && (
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                      >
                        <MessageSquare className="size-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Steadfast Reverse Logistics Card */}
          <ReturnSteadfastPickupCard
            returnId={request.id}
            orderNumber={request.order.orderNumber}
            customerName={request.order.customerName}
            customerPhone={request.order.customerPhone}
            shippingAddress={shippingAddress}
            reverseLogistics={request.reverseLogistics}
            status={request.status}
            action={bookSteadfastReturnPickupAction}
          />

          {/* Reason, Custom Message & Photo Proof Card */}
          {(() => {
            const parsedReason = parseReturnReason(request.reason);
            return (
              <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
                <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <RotateCcw className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                        Customer Return Reason &amp; Proof
                      </h3>
                      <p className="text-[10px] text-neutral-500">
                        Category, custom message, and photo proof
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Category Badge */}
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      Reason Category
                    </span>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                        {parsedReason.categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Customer Custom Message / Details */}
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      Custom Message / Customer Details
                    </span>
                    {parsedReason.customerNote ? (
                      <div className="mt-1 rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 text-neutral-800 leading-relaxed font-medium">
                        &ldquo;{parsedReason.customerNote}&rdquo;
                      </div>
                    ) : (
                      <p className="mt-1 text-neutral-400 italic">No custom message provided.</p>
                    )}
                  </div>

                  {/* Uploaded Photo Proof Gallery */}
                  {parsedReason.images.length > 0 && (
                    <div className="border-t border-neutral-100 pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase flex items-center gap-1.5">
                          <ImageIcon className="size-3 text-neutral-600" />
                          <span>Uploaded Photo Proof ({parsedReason.images.length})</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">Click to view full image</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {parsedReason.images.map((imgUrl, idx) => (
                          <a
                            key={idx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 hover:border-neutral-400 transition"
                            title="Click to view full photo in new tab"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`Return proof photo ${idx + 1}`}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                              <ExternalLink className="size-4 text-white opacity-0 group-hover:opacity-100 transition" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-neutral-100 pt-2.5 text-[11px] text-neutral-500">
                    <div className="flex justify-between">
                      <span>Current Return Status:</span>
                      <span className="font-bold text-neutral-900">{request.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Payment Method:</span>
                      <span className="font-semibold text-neutral-800">{request.order.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Manage Status Transitions */}
          {nextStatuses[request.status] && (
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                      Update Return Status
                    </h3>
                    <p className="text-[10px] text-neutral-500">
                      Validated server transitions
                    </p>
                  </div>
                </div>
              </div>

              <ReturnStatusForm
                id={request.id}
                statuses={nextStatuses[request.status]}
                items={request.items.map((i) => ({
                  id: i.id,
                  productName: i.orderItem.productName,
                  sku: i.orderItem.sku,
                  quantity: i.quantity,
                }))}
                action={updateReturnStatusAction}
              />
            </div>
          )}

          {/* Refund & Store Credit Settlement Console */}
          {(request.status === "RECEIVED" || request.status === "COMPLETED") && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-5 shadow-2xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-emerald-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Gift className="size-4 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-emerald-950 uppercase">
                      Issue Refund / 105% Store Credit
                    </h3>
                    <p className="text-[10px] text-emerald-700">
                      Eligible requested: {formatBdt(request.requestedAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <StoreCreditRefundForm
                returnId={request.id}
                maxRequestedAmount={request.requestedAmount}
                creditAction={issueStoreCreditRefundAction}
                cashAction={initiateReturnRefundAction}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
