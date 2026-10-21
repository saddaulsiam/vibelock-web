import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Package, Truck, ArrowRight } from "lucide-react";
import { CancelOrderButton } from "@/components/storefront/orders/cancel-order-button";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Separator } from "@/components/ui/separator";
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
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function OrderDetailPage(props: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await props.params;
  const order = await getCustomerOrder(orderNumber);
  if (!order) notFound();

  const canCancel =
    order.status === "PENDING" &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "INITIATED") &&
    !order.shipment;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Link
            href="/account/orders"
            className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to My Orders</span>
          </Link>
          <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
            Order Details
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
                Order #{order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCancel && <CancelOrderButton orderNumber={order.orderNumber} />}
            {order.isReturnable && (
              <Link
                href={`/account/orders/${order.orderNumber}/return`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/20 bg-[#F3F0E8] px-3.5 py-2 text-xs font-bold text-[#101114] transition-colors hover:bg-[#101114] hover:text-white"
              >
                <span>Request Return</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Order Items & Financials */}
        <div className="space-y-6">
          {/* Order Items Card */}
          <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <Package className="size-4.5 text-[#101114]" />
              <span>Purchased Items</span>
              <span className="text-muted-foreground ml-auto rounded-full bg-[#101114]/5 px-2.5 py-0.5 text-xs font-bold">
                {order.items.reduce((acc, it) => acc + it.quantity, 0)} items
              </span>
            </h2>

            <ul className="mt-2 divide-y divide-[#101114]/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4 first:pt-4 last:pb-0">
                  {/* Item Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#101114]/10 bg-[#101114]">
                    <Image
                      src="/images/categories/cat-t-shirts.jpg"
                      alt={item.productName}
                      fill
                      sizes="56px"
                      className="object-cover opacity-85"
                    />
                  </div>

                  {/* Item Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-[#101114]">
                      {item.productName}
                    </h3>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
                        .filter(Boolean)
                        .map((opt) => (
                          <span
                            key={opt as string}
                            className="rounded-md bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]"
                          >
                            {opt}
                          </span>
                        ))}
                      <span>• Qty: {item.quantity}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-sm font-black text-[#101114]">
                      ৳ {item.lineTotal.toLocaleString("en-BD")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      ৳ {item.unitPrice.toLocaleString("en-BD")} each
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Price Breakdown Footer */}
            <div className="mt-6 border-t border-[#101114]/10 pt-5">
              <dl className="space-y-2 text-xs sm:text-sm">
                <div className="text-muted-foreground flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-[#101114]">
                    ৳ {order.subtotal.toLocaleString("en-BD")}
                  </dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <dt>Discount</dt>
                    <dd>-৳ {order.discount.toLocaleString("en-BD")}</dd>
                  </div>
                )}
                <div className="text-muted-foreground flex justify-between">
                  <dt>Shipping ({order.shippingMethodName})</dt>
                  <dd className="font-semibold text-[#101114]">
                    ৳ {order.shippingCost.toLocaleString("en-BD")}
                  </dd>
                </div>
                {order.taxAmount > 0 && (
                  <div className="text-muted-foreground flex justify-between">
                    <dt>Estimated Tax</dt>
                    <dd className="font-semibold text-[#101114]">
                      ৳ {order.taxAmount.toLocaleString("en-BD")}
                    </dd>
                  </div>
                )}
                <Separator className="!my-3 bg-[#101114]/10" />
                <div className="flex justify-between text-base font-black text-[#101114]">
                  <dt>Total Amount</dt>
                  <dd className="text-[#101114]">৳ {order.total.toLocaleString("en-BD")}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Returns & Refunds if any */}
          {(order.returnRequests.length > 0 || order.refunds.length > 0) && (
            <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="mb-4 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
                Returns & Refunds
              </h2>
              <div className="space-y-3">
                {order.returnRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#101114]/10 bg-[#F3F0E8]/40 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#101114]">Return Request</span>
                      <OrderStatusBadge status={req.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Requested on {formatDate(req.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Payment & Shipping Info */}
        <div className="space-y-6">
          {/* Payment Info Card */}
          <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <CreditCard className="size-4 text-[#101114]" />
              <span>Payment Details</span>
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-bold text-[#101114]">
                  {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Status</span>
                <OrderStatusBadge status={order.paymentStatus} />
              </div>
            </div>
          </div>

          {/* Shipment Tracking Card */}
          {order.shipment && (
            <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
                <Truck className="size-4 text-[#0099b8]" />
                <span>Shipment Tracking</span>
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <OrderStatusBadge status={order.shipment.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="font-bold text-[#101114] capitalize">
                    {order.shipment.provider}
                  </span>
                </div>
                {order.shipment.trackingNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tracking #</span>
                    <span className="rounded bg-[#F3F0E8] px-2 py-0.5 font-mono font-bold text-[#101114]">
                      {order.shipment.trackingNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Address Card */}
          <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <MapPin className="size-4 text-[#101114]" />
              <span>Delivery Address</span>
            </h2>
            <div className="mt-4 space-y-1 text-xs leading-relaxed">
              <p className="font-bold text-[#101114]">{order.customerName || "Customer"}</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
              {order.customerPhone && (
                <p className="text-muted-foreground">{order.customerPhone}</p>
              )}
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
        </div>
      </div>
    </div>
  );
}
