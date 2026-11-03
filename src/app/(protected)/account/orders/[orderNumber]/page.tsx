import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Truck,
  AlertCircle,
} from "lucide-react";
import { CancelOrderButton } from "@/components/storefront/orders/cancel-order-button";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";
import { OrderPrintAction } from "@/components/storefront/orders/order-print-action";
import { getCustomerOrder } from "@/lib/orders/queries";

export async function generateMetadata(props: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await props.params;
  return {
    title: `Order #${orderNumber} | VibeLock`,
    description: "View your VibeLock order details and tracking updates.",
    robots: { index: false, follow: false },
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function OrderDetailPage(props: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await props.params;
  const order = await getCustomerOrder(orderNumber);
  if (!order) notFound();

  const canCancel =
    order.status === "PENDING" &&
    order.paymentStatus !== "SUCCESS" &&
    order.paymentStatus !== "REFUNDED" &&
    order.paymentStatus !== "PARTIALLY_REFUNDED" &&
    !order.shipment;

  const isCancelled =
    order.status === "CANCELLED" ||
    order.paymentStatus === "CANCELLED" ||
    order.paymentStatus === "FAILED";

  // Tracker milestones
  const steps = [
    {
      id: "placed",
      label: "Placed",
      sublabel: formatDate(order.createdAt),
      isDone: true,
      isCurrent: order.status === "PENDING",
    },
    {
      id: "processing",
      label: "Processing",
      sublabel: "Packing order",
      isDone: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status),
      isCurrent: order.status === "CONFIRMED" || order.status === "PROCESSING",
    },
    {
      id: "shipped",
      label: "Shipped",
      sublabel: order.shipment?.provider ? `Via ${order.shipment.provider}` : "With courier",
      isDone: ["SHIPPED", "DELIVERED"].includes(order.status),
      isCurrent: order.status === "SHIPPED",
    },
    {
      id: "delivered",
      label: "Delivered",
      sublabel: "At your door",
      isDone: order.status === "DELIVERED",
      isCurrent: false,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Navigation & Utility Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/account/orders"
          className="group inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Orders</span>
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <OrderPrintAction orderNumber={order.orderNumber} />

          {order.isReturnable && (
            <Link
              href={`/account/orders/${order.orderNumber}/return`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#101114] bg-[#101114] px-3.5 py-1.5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
            >
              <span>Return</span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}

          {canCancel && (
            <CancelOrderButton
              orderNumber={order.orderNumber}
              className="min-h-[38px] cursor-pointer rounded-lg border-[1.5px] border-red-200 bg-red-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-red-500 uppercase transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          )}
        </div>
      </div>

      {/* ── Unified Master Order Receipt Canvas (No fragmented disjointed boxes!) ── */}
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        {/* 1. Header Section: Order Identity & Meta */}
        <div className="border-b border-[#101114]/8 p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-[#00D9FF] uppercase">
                  Order Details
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs text-neutral-500">
                  Placed {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-[#101114] uppercase sm:text-2xl">
                  Order #{order.orderNumber}
                </h1>
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>

          {/* Live Progress Tracker / Cancellation State */}
          {isCancelled ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 sm:p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold tracking-wider text-rose-900 uppercase">
                  Order Cancelled
                </h4>
                <p className="mt-0.5 text-xs text-rose-700">
                  This order was cancelled. Reserved inventory was released and no funds were
                  debited.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-[#101114]/6 pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
                {steps.map((st, i) => {
                  return (
                    <div key={st.id} className="relative flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                            st.isDone
                              ? "bg-emerald-600 text-white"
                              : st.isCurrent
                                ? "bg-[#101114] text-white ring-2 ring-[#00D9FF]"
                                : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {st.isDone ? (
                            <Check className="size-3 stroke-[3]" />
                          ) : st.isCurrent ? (
                            <Clock className="size-3" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold tracking-wider uppercase ${
                            st.isDone || st.isCurrent ? "text-[#101114]" : "text-neutral-400"
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="pl-8 text-[11px] text-neutral-500">{st.sublabel}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Purchased Items Section & Integrated Financial Breakdown */}
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-[#101114]/8 pb-4">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-[#101114]" />
              <h2 className="text-xs font-bold tracking-wider text-[#101114] uppercase sm:text-sm">
                Purchased Items
              </h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              {order.items.reduce((acc, it) => acc + it.quantity, 0)}{" "}
              {order.items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Item List */}
          <ul className="divide-y divide-[#101114]/6">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5"
              >
                {/* Product Thumbnail */}
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[#101114]/10 bg-neutral-100 sm:size-16">
                  <Image
                    src="/images/categories/cat-t-shirts.jpg"
                    alt={item.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-xs font-semibold text-[#101114] sm:text-sm">
                    {item.productName}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                    {item.sku && (
                      <span className="font-mono text-[10px] text-neutral-400 sm:text-[11px]">
                        SKU: {item.sku}
                      </span>
                    )}
                    {item.size && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                        Color: {item.color}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-neutral-500">
                      Qty: {item.quantity} × ৳{item.unitPrice.toLocaleString("en-BD")}
                    </span>
                  </div>
                </div>

                {/* Item Line Total */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#101114] sm:text-base">
                    ৳ {item.lineTotal.toLocaleString("en-BD")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Financial Breakdown (Seamless right-aligned receipt calculation) */}
          <div className="mt-4 border-t border-[#101114]/8 pt-5 sm:flex sm:justify-end">
            <div className="w-full space-y-2 text-xs sm:w-72 sm:max-w-xs sm:text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="font-normal text-[#101114]">
                  ৳ {order.subtotal.toLocaleString("en-BD")}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Discount</span>
                  <span>-৳ {order.discount.toLocaleString("en-BD")}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-500">
                <span>Shipping ({order.shippingMethodName || "Standard"})</span>
                <span className="font-normal text-[#101114]">
                  ৳ {order.shippingCost.toLocaleString("en-BD")}
                </span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Estimated Tax</span>
                  <span className="font-normal text-[#101114]">
                    ৳ {order.taxAmount.toLocaleString("en-BD")}
                  </span>
                </div>
              )}
              <div className="my-2 flex items-baseline justify-between border-t border-[#101114]/8 pt-3">
                <span className="text-sm font-bold tracking-wide text-[#101114] uppercase">
                  Total Amount
                </span>
                <span className="text-lg font-bold text-[#101114] sm:text-xl">
                  ৳ {order.total.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integrated Metadata Grid (Address, Payment & Delivery - all in one footer panel!) */}
        <div className="border-t border-[#101114]/8 bg-[#FAF9F5] p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-6 divide-y divide-[#101114]/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {/* Delivery Address */}
            <div className="sm:pr-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                <MapPin className="size-3.5 text-[#101114]" />
                <span>Delivery Address</span>
              </div>
              <div className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600">
                <p className="font-semibold text-[#101114]">{order.customerName || "Customer"}</p>
                {order.customerPhone && (
                  <p className="font-medium text-neutral-700">{order.customerPhone}</p>
                )}
                <p className="text-neutral-500">{order.customerEmail}</p>
                <div className="pt-2 text-[#101114]">
                  <p>{order.shippingStreet}</p>
                  <p>
                    {order.shippingCity}
                    {order.shippingState ? `, ${order.shippingState}` : ""}
                    {order.shippingZip ? ` - ${order.shippingZip}` : ""}
                  </p>
                  <p>{order.shippingCountry}</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="pt-5 sm:px-6 sm:pt-0">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                <CreditCard className="size-3.5 text-[#101114]" />
                <span>Payment Details</span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <span className="text-neutral-400">Method</span>
                  <PaymentGatewayBadge
                    gateway={order.paymentGateway}
                    paymentMethod={order.paymentMethod}
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <span className="text-neutral-400">Status</span>
                  <OrderStatusBadge status={order.paymentStatus} />
                </div>
              </div>
            </div>

            {/* Shipment / Fulfillment */}
            <div className="pt-5 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                <Truck className="size-3.5 text-[#101114]" />
                <span>Fulfillment & Courier</span>
              </div>
              <div className="mt-3 space-y-2 text-xs text-neutral-600">
                {order.shipment ? (
                  <>
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-neutral-400">Carrier</span>
                      <span className="font-semibold text-[#101114] capitalize">
                        {order.shipment.provider}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-neutral-400">Status</span>
                      <OrderStatusBadge status={order.shipment.status} />
                    </div>
                    {order.shipment.trackingNumber && (
                      <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                        <span className="text-neutral-400">Tracking #</span>
                        <span className="rounded border border-[#101114]/10 bg-white px-2 py-0.5 font-mono font-semibold text-[#101114]">
                          {order.shipment.trackingNumber}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="font-normal text-[#101114]">
                      {order.shippingMethodName || "Standard Delivery"}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {order.status === "DELIVERED"
                        ? "Delivered successfully."
                        : order.status === "CANCELLED"
                          ? "Fulfillment was cancelled."
                          : "Estimated delivery: 2–4 business days inside Dhaka, 3–5 days outside Dhaka."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Returns & Refunds (if any exist) */}
        {(order.returnRequests.length > 0 || order.refunds.length > 0) && (
          <div className="border-t border-[#101114]/8 p-5 sm:p-7">
            <h3 className="mb-3.5 text-xs font-bold tracking-wider text-[#101114] uppercase sm:text-sm">
              Returns & Refunds
            </h3>
            <div className="space-y-3">
              {order.returnRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-[#101114]/8 bg-white p-3.5"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#101114]">Return Request</p>
                    <p className="text-[11px] text-neutral-500">
                      Requested on {formatDate(req.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
