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
import { ReorderButton } from "@/components/storefront/orders/reorder-button";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";
import { OrderPrintAction } from "@/components/storefront/orders/order-print-action";
import { Button } from "@/components/ui/button";
import { getCustomerOrder } from "@/lib/orders/queries";
import { formatOrderDateTime, calculateDeliveryEstimate } from "@/lib/format";

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

const formatDate = formatOrderDateTime;

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
          className="group hover:text-vl-dark-900 inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Orders</span>
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <OrderPrintAction order={order} />

          {/* Buy Again / Reorder for Delivered Orders */}
          {order.status === "DELIVERED" && <ReorderButton orderNumber={order.orderNumber} />}

          {order.isReturnable && (
            <Button asChild variant="primary" size="sm">
              <Link href={`/account/orders/${order.orderNumber}/return`}>
                <span>Return</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}

          {canCancel && <CancelOrderButton orderNumber={order.orderNumber} />}
        </div>
      </div>

      {/* ── Unified Master Order Receipt Canvas (No fragmented disjointed boxes!) ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* 1. Header Section: Order Identity & Meta */}
        <div className="border-vl-dark-900/8 border-b p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-vl-cyan text-[11px] font-semibold tracking-[0.2em] uppercase">
                  Order Details
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs text-neutral-500">
                  Placed {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-vl-dark-900 text-xl font-bold tracking-tight uppercase sm:text-2xl">
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
            <div className="border-vl-dark-900/6 mt-6 border-t pt-6">
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
                                ? "bg-vl-dark-900 ring-vl-cyan text-white ring-2"
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
                            st.isDone || st.isCurrent ? "text-vl-dark-900" : "text-neutral-400"
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
          <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Package className="text-vl-dark-900 size-4" />
              <h2 className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase sm:text-sm">
                Purchased Items
              </h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
              {order.items.reduce((acc, it) => acc + it.quantity, 0)}{" "}
              {order.items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Item List */}
          <ul className="divide-vl-dark-900/6 divide-y">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5"
              >
                {/* Product Thumbnail */}
                <div className="border-vl-dark-900/10 relative size-14 shrink-0 overflow-hidden rounded-xl border bg-neutral-100 sm:size-16">
                  <Image
                    src={item.imageUrl ?? "/images/categories/cat-t-shirts.jpg"}
                    alt={item.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-vl-dark-900 line-clamp-2 text-xs font-semibold sm:text-sm">
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
                  <p className="text-vl-dark-900 text-sm font-bold sm:text-base">
                    ৳ {item.lineTotal.toLocaleString("en-BD")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Financial Breakdown (Seamless right-aligned receipt calculation) */}
          <div className="border-vl-dark-900/8 mt-4 border-t pt-5 sm:flex sm:justify-end">
            <div className="w-full space-y-2 text-xs sm:w-72 sm:max-w-xs sm:text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="text-vl-dark-900 font-normal">
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
                <span className="text-vl-dark-900 font-normal">
                  ৳ {order.shippingCost.toLocaleString("en-BD")}
                </span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Estimated Tax</span>
                  <span className="text-vl-dark-900 font-normal">
                    ৳ {order.taxAmount.toLocaleString("en-BD")}
                  </span>
                </div>
              )}
              <div className="border-vl-dark-900/8 my-2 flex items-baseline justify-between border-t pt-3">
                <span className="text-vl-dark-900 text-sm font-bold tracking-wide uppercase">
                  Total Amount
                </span>
                <span className="text-vl-dark-900 text-lg font-bold sm:text-xl">
                  ৳ {order.total.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integrated Metadata Grid (Address, Payment & Delivery - all in one footer panel!) */}
        <div className="border-vl-dark-900/8 bg-vl-white-100 border-t p-5 sm:p-7">
          <div className="divide-vl-dark-900/8 grid grid-cols-1 gap-6 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {/* Delivery Address */}
            <div className="sm:pr-6">
              <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <MapPin className="text-vl-dark-900 size-3.5" />
                <span>Delivery Address</span>
              </div>
              <div className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600">
                <p className="text-vl-dark-900 font-semibold">{order.customerName || "Customer"}</p>
                {order.customerPhone && (
                  <p className="font-medium text-neutral-700">{order.customerPhone}</p>
                )}
                <p className="text-neutral-500">{order.customerEmail}</p>
                <div className="text-vl-dark-900 pt-2">
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
              <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <CreditCard className="text-vl-dark-900 size-3.5" />
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
              <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <Truck className="text-vl-dark-900 size-3.5" />
                <span>Fulfillment & Courier</span>
              </div>
              <div className="mt-3 space-y-2 text-xs text-neutral-600">
                {order.shipment ? (
                  <>
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-neutral-400">Carrier</span>
                      <span className="text-vl-dark-900 font-semibold capitalize">
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
                        <span className="border-vl-dark-900/10 text-vl-dark-900 rounded border bg-white px-2 py-0.5 font-mono font-semibold">
                          {order.shipment.trackingNumber}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="text-vl-dark-900 font-normal">
                      {order.shippingMethodName || "Standard Delivery"}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {order.status === "DELIVERED"
                        ? "Delivered successfully."
                        : order.status === "CANCELLED"
                          ? "Fulfillment was cancelled."
                          : `Estimated delivery: ${calculateDeliveryEstimate(order.createdAt, order.shippingCity)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Returns & Refunds (if any exist) */}
        {(order.returnRequests.length > 0 || order.refunds.length > 0) && (
          <div className="border-vl-dark-900/8 border-t p-5 sm:p-7">
            <h3 className="text-vl-dark-900 mb-3.5 text-xs font-bold tracking-wider uppercase sm:text-sm">
              Returns & Refunds
            </h3>
            <div className="space-y-3">
              {order.returnRequests.map((req) => (
                <div
                  key={req.id}
                  className="border-vl-dark-900/8 flex items-center justify-between rounded-xl border bg-white p-3.5"
                >
                  <div>
                    <p className="text-vl-dark-900 text-xs font-semibold">Return Request</p>
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
