import { auth } from "@/auth";
import { Container } from "@/components/shared/container";
import { Price } from "@/components/storefront/catalog/price";
import { OrderPrintAction } from "@/components/storefront/orders/order-print-action";
import { cancelOrderAction } from "@/lib/orders/actions";
import { getCustomerOrderConfirmation } from "@/lib/orders/queries";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Order Confirmation | VibeLock",
  robots: { index: false, follow: false },
};

interface OrderSuccessPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams?: Promise<{ payment?: string }>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getHumanGatewayName(gateway?: string | null, method?: string) {
  if (method === "COD" || gateway === "COD" || gateway === "CASH") {
    return "Cash on Delivery";
  }
  if (!gateway || gateway === "ONLINE") return "Online Gateway (Cards / MFS)";
  const normalized = gateway.toUpperCase();
  if (normalized === "BKASH") return "bKash";
  if (normalized === "NAGAD") return "Nagad";
  if (normalized === "SSLCOMMERZ") return "SSLCommerz (Card / MFS)";
  if (normalized === "BANGLA_QR") return "Bangla QR";
  if (normalized === "CARD") return "Credit / Debit Card";
  return gateway;
}

export default async function OrderSuccessPage({ params, searchParams }: OrderSuccessPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const paymentQuery = resolvedSearchParams.payment?.toLowerCase();

  // If customer returned from payment gateway after cancelling or failing,
  // automatically cancel the pending order and release reserved stock.
  if (paymentQuery === "cancelled" || paymentQuery === "failed") {
    await cancelOrderAction(orderNumber);
  }

  const order = await getCustomerOrderConfirmation(orderNumber);
  if (!order) notFound();

  const isOrderCancelled = order.status === "CANCELLED";
  const isPaymentCancelled = order.paymentStatus === "CANCELLED";
  const isCancelled = isOrderCancelled || isPaymentCancelled;
  const isPaymentFailed = order.paymentStatus === "FAILED";
  const isPaid = order.paymentStatus === "SUCCESS";
  const isCod = order.paymentMethod === "COD";

  const firstName = order.customerName ? order.customerName.trim().split(" ")[0] : null;
  const discountTotal = Math.max(0, order.discount);
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const gatewayLabel = getHumanGatewayName(order.paymentGateway, order.paymentMethod);

  return (
    <div className="bg-background min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16">
      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-semibold text-rose-800">
          This order has been cancelled and held inventory was returned to stock. No funds were
          debited.
        </div>
      )}

      <Container className="max-w-6xl">
        {/* Split Grid: 7 Cols Left, 5 Cols Right (Global E-Commerce Standard) */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Confirmation Hero, Stepper & Customer Details */}
          <div className="space-y-6 lg:col-span-7">
            {/* Header Hero Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                {isCancelled || isPaymentFailed ? (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-4 ring-rose-50 sm:size-14 sm:ring-8">
                    <AlertCircle className="size-6 stroke-[2.5] sm:size-7" />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50 sm:size-14 sm:ring-8">
                    <Check className="size-6 stroke-[2.5] sm:size-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase sm:text-xs">
                      Order #{order.orderNumber}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-[11px] sm:text-xs">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <h1 className="truncate text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl lg:text-3xl">
                    {isCancelled
                      ? "Order Cancelled"
                      : isPaymentFailed
                        ? "Payment Incomplete"
                        : `Thank you, ${firstName || "Valued Customer"}!`}
                  </h1>
                </div>
              </div>

              {/* Single Clear, Human-Friendly Status Indicator (NO Confusing Raw DB Pills) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {isCancelled ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-800">
                    <span className="size-2 rounded-full bg-rose-600" />
                    <span>Order Cancelled</span>
                  </div>
                ) : isPaymentFailed ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-800">
                    <span className="size-2 rounded-full bg-rose-600" />
                    <span>Payment Failed — Action Required</span>
                  </div>
                ) : isPaid ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
                    <span className="size-2 animate-pulse rounded-full bg-emerald-600" />
                    <span>Order Confirmed & Payment Verified</span>
                  </div>
                ) : isCod ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-800">
                    <span className="size-2 rounded-full bg-blue-600" />
                    <span>Order Confirmed · Cash on Delivery</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800">
                    <span className="size-2 animate-pulse rounded-full bg-amber-600" />
                    <span>Order Received — Processing</span>
                  </div>
                )}

                <div>
                  <OrderPrintAction order={order} />
                </div>
              </div>
            </div>

            {/* Reassurance Message Card */}
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800">
                  <Package className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[#101114]">
                    {isCancelled
                      ? "Items Returned to Storefront Stock"
                      : isCod
                        ? "Order Confirmed — Preparing for Dispatch"
                        : isPaid
                          ? "Payment Confirmed — Order Processing"
                          : "Order Received — Awaiting Gateway Settlement"}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {isCancelled
                      ? "This order was cancelled. You can restart checkout anytime from your cart or continue shopping our latest collections."
                      : isCod
                        ? `We have confirmed your order. Our Dhaka warehouse is packing your items. You will pay ৳${order.total.toLocaleString("en-BD")} in cash when the delivery arrives.`
                        : isPaid
                          ? `We have verified your payment of ৳${order.total.toLocaleString("en-BD")} via ${gatewayLabel}. Our warehouse has received your order and is packing your garments.`
                          : "Your order is recorded in our system. You will receive real-time SMS and email notifications as the courier picks up your package."}
                  </p>
                  {order.customerEmail && (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-xs font-medium text-neutral-600">
                      Receipt and tracking link sent to{" "}
                      <span className="font-bold text-[#101114]">{order.customerEmail}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Delivery Stepper (4-Step Linear Journey) */}
            {!isCancelled && (
              <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs sm:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-xs font-bold tracking-wider text-[#101114] uppercase">
                    Delivery Journey
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
                    Steadfast Courier (Est. 2–4 Business Days)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* Step 1 */}
                  <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <Check className="size-3.5 stroke-[3]" />
                      <span>1. Confirmed</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-emerald-700">
                      Order accepted
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div
                    className={`rounded-lg p-3 ${
                      isPaid || isCod
                        ? "border border-emerald-200/70 bg-emerald-50/70 text-emerald-800"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {isPaid || isCod ? (
                        <Check className="size-3.5 stroke-[3]" />
                      ) : (
                        <Clock className="size-3.5" />
                      )}
                      <span>2. Payment</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight">
                      {isPaid ? "Paid in full" : isCod ? "Due on delivery" : "Pending"}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="rounded-lg border border-neutral-900 bg-neutral-900 p-3 text-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="size-1.5 animate-ping rounded-full bg-[#00D9FF]" />
                      <span>3. Packing</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-neutral-300">
                      Warehouse prepping
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="rounded-lg border border-neutral-200/70 bg-neutral-50 p-3 text-neutral-400">
                    <div className="text-xs font-bold text-neutral-600">4. Delivered</div>
                    <p className="mt-1 text-[11px] leading-tight text-neutral-400">
                      At your doorstep
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Clear Customer & Delivery Information Grid */}
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs sm:p-6">
              <h3 className="mb-4 text-xs font-bold tracking-wider text-[#101114] uppercase">
                Customer & Order Information
              </h3>

              <div className="grid grid-cols-1 gap-6 text-xs sm:grid-cols-2 sm:text-sm">
                {/* 1. Contact Info */}
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Contact Details
                  </p>
                  <p className="font-semibold text-[#101114]">
                    {order.customerEmail || "Not provided"}
                  </p>
                  {order.customerPhone && (
                    <p className="font-mono text-xs text-neutral-600">{order.customerPhone}</p>
                  )}
                  <p className="text-muted-foreground text-[11px]">SMS & Email updates active</p>
                </div>

                {/* 2. Payment Method Details (Crystal Clear, No Ambiguity) */}
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Payment Method
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#101114] sm:text-sm">
                      {gatewayLabel}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : isCod
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isPaid ? "PAID" : isCod ? "CASH ON DELIVERY" : "PENDING"}
                    </span>
                  </div>
                  {order.transactionId && (
                    <p className="truncate font-mono text-xs text-neutral-600">
                      TrxID: {order.transactionId}
                    </p>
                  )}
                  <p className="text-muted-foreground text-[11px]">
                    {isPaid
                      ? `Paid ৳${order.total.toLocaleString("en-BD")} successfully`
                      : isCod
                        ? `Pay ৳${order.total.toLocaleString("en-BD")} upon arrival`
                        : "Awaiting settlement confirmation"}
                  </p>
                </div>

                {/* 3. Shipping Address */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Shipping Address
                  </p>
                  <p className="font-bold text-[#101114]">{order.customerName || "Customer"}</p>
                  <p className="text-neutral-700">
                    {order.shippingStreet || "Standard Street Address"}
                  </p>
                  <p className="text-neutral-700">
                    {[order.shippingCity, order.shippingState, order.shippingZip]
                      .filter(Boolean)
                      .join(", ") || "Dhaka, Bangladesh"}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {order.shippingCountry || "Bangladesh"}
                  </p>
                </div>

                {/* 4. Shipping Method */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    Delivery Method
                  </p>
                  <p className="font-semibold text-[#101114]">
                    {order.shippingMethodName || "Standard Home Delivery"}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    Inside Dhaka 2–3 days, outside 3–5 days
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 text-xs font-bold text-[#101114] transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:text-sm"
              >
                <ShoppingBag className="size-4" />
                Continue Shopping
              </Link>

              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#101114] px-7 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:text-sm"
              >
                <span>Track Order in Account</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Sticky Order Summary & Receipt Breakdown */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Order Summary
                </h3>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-800">
                  {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-neutral-100">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.productName}-${item.size ?? ""}-${item.color ?? ""}-${index}`}
                    className="flex items-center gap-3.5 py-3.5 first:pt-1 last:pb-1"
                  >
                    {/* Thumbnail with Quantity Badge */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized={!item.imageUrl.startsWith("https://res.cloudinary.com")}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-neutral-400">
                          <Package className="size-6 stroke-[1.5]" />
                        </div>
                      )}
                      {/* Floating Quantity Pill */}
                      <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-white shadow-xs">
                        {item.quantity}
                      </span>
                    </div>

                    {/* Item Details */}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs leading-snug font-bold text-[#101114] sm:text-sm">
                        {item.productName}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {[item.size, item.color].filter(Boolean).join(" · ") || "Standard"}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      <Price
                        amount={item.lineTotal}
                        className="text-xs font-bold text-[#101114] sm:text-sm"
                      />
                      {item.quantity > 1 && (
                        <p className="text-muted-foreground text-[10px]">
                          <Price amount={item.unitPrice} /> ea
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Ledger */}
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <dl className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold text-[#101114]">
                      <Price amount={order.subtotal} />
                    </dd>
                  </div>

                  {discountTotal > 0 && (
                    <div className="flex justify-between font-semibold text-emerald-700">
                      <dt>Discount</dt>
                      <dd>
                        -<Price amount={discountTotal} />
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between text-neutral-600">
                    <dt>Shipping ({order.shippingMethodName || "Standard"})</dt>
                    <dd className="font-semibold text-[#101114]">
                      <Price amount={order.shippingCost} />
                    </dd>
                  </div>

                  {order.taxAmount > 0 && (
                    <div className="flex justify-between text-neutral-600">
                      <dt>Estimated VAT / Tax</dt>
                      <dd className="font-semibold text-[#101114]">
                        <Price amount={order.taxAmount} />
                      </dd>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-neutral-200/90 pt-3.5 text-base font-black text-[#101114]">
                    <dt>Total Amount</dt>
                    <dd>
                      <Price amount={order.total} className="text-lg font-black text-[#101114]" />
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Assurance & Help Box */}
            <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 shrink-0 text-neutral-700" />
                <div className="text-xs">
                  <p className="font-bold text-[#101114]">100% Authentic Garment Guarantee</p>
                  <p className="text-neutral-500">Curated premium streetwear drops</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <RotateCcw className="size-5 shrink-0 text-neutral-700" />
                <div className="text-xs">
                  <p className="font-bold text-[#101114]">7-Day Easy Exchange Policy</p>
                  <p className="text-neutral-500">Hassle-free size and product replacement</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs">
                <span className="text-neutral-600">Need support?</span>
                <a
                  href="tel:01311333277"
                  className="inline-flex items-center gap-1 font-bold text-[#101114] hover:underline"
                >
                  <Phone className="size-3" /> 01311-333277
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
