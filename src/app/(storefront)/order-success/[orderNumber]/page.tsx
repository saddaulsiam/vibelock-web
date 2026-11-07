import { auth } from "@/auth";
import { OrderPrintAction } from "@/components/storefront/orders/order-print-action";
import { cancelOrderAction } from "@/lib/orders/actions";
import { getCustomerOrderConfirmation } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Order Confirmation | VibeLock",
  description: "Your VibeLock order has been confirmed. View receipt and delivery tracking.",
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
  }).format(new Date(date));
}

function getHumanGatewayName(gateway?: string | null, method?: string) {
  if (method === "COD" || gateway === "COD" || gateway === "CASH") {
    return "Cash on Delivery";
  }
  if (!gateway || gateway === "ONLINE") return "SSLCOMMERZ (Cards / MFS)";
  const normalized = gateway.toUpperCase();
  if (normalized === "BKASH") return "bKash";
  if (normalized === "NAGAD") return "Nagad";
  if (normalized === "SSLCOMMERZ") return "SSLCOMMERZ (Cards / MFS)";
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

  // Delivery Journey milestones
  const steps = [
    {
      id: "placed",
      label: "Placed",
      sublabel: formatDate(order.createdAt),
      isDone: true,
      isCurrent: false,
    },
    {
      id: "payment",
      label: isCod ? "COD Confirmed" : "Payment Verified",
      sublabel: isCod
        ? "Pay on delivery"
        : isPaid
          ? "Settled via " + gatewayLabel
          : "Pending settlement",
      isDone: isPaid || isCod,
      isCurrent: !isPaid && !isCod,
    },
    {
      id: "processing",
      label: "Packing & QC",
      sublabel: "Warehouse prepping",
      isDone: false,
      isCurrent: isPaid || isCod,
    },
    {
      id: "delivery",
      label: "Delivered",
      sublabel: "Steadfast doorstep",
      isDone: false,
      isCurrent: false,
    },
  ];

  return (
    <div className="relative min-h-screen bg-white">
      {/* ── Architectural Dot Matrix Background (VibeLock Technical Grid) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        {/* ── Top Navigation & Utility Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 print:hidden">
          <Link
            href="/shop"
            className="group inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Continue Shopping</span>
          </Link>

          <OrderPrintAction order={order} />
        </div>

        {/* ── Main Unified Master Order Receipt Canvas ── */}
        <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
          {/* 1. Header Section: Identity, Thank You & Status */}
          <div className="border-b border-[#101114]/8 p-5 sm:p-7 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#00D9FF] uppercase sm:text-[11px]">
                    Order Confirmation
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-xs text-neutral-500">
                    Placed {formatDate(order.createdAt)}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#101114] uppercase sm:text-3xl">
                  {isCancelled
                    ? "Order Cancelled"
                    : isPaymentFailed
                      ? "Payment Incomplete"
                      : `Thank you, ${firstName || "Customer"}!`}
                </h1>
                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  {isCancelled
                    ? "This order was cancelled. Reserved inventory was released and no funds were debited."
                    : `Order #${order.orderNumber} is confirmed. A receipt has been sent to ${
                        order.customerEmail || "your email"
                      }.`}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
                <PaymentGatewayBadge
                  gateway={order.paymentGateway}
                  paymentMethod={order.paymentMethod}
                />
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            {/* Live Progress Tracker / Cancellation State */}
            {isCancelled ? (
              <div className="mt-6 flex items-center gap-3.5 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                    Items Returned to Stock
                  </h4>
                  <p className="mt-0.5 text-xs text-rose-700">
                    You can restart checkout anytime from your cart or continue browsing the
                    collection.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-[#101114]/6 pt-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
                  {steps.map((st, i) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Purchased Items Section & Financial Calculation */}
          <div className="p-5 sm:p-7 md:p-8">
            <div className="flex items-center justify-between border-b border-[#101114]/8 pb-4">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[#101114]" />
                <h2 className="text-xs font-bold tracking-wider text-[#101114] uppercase sm:text-sm">
                  Purchased Items
                </h2>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Items List */}
            <ul className="divide-y divide-[#101114]/6">
              {order.items.map((item, index) => (
                <li
                  key={`${item.productName}-${item.size ?? ""}-${item.color ?? ""}-${index}`}
                  className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5"
                >
                  {/* Thumbnail */}
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[#101114]/10 bg-neutral-100 sm:size-16">
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

                  {/* Line Total */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[#101114] sm:text-base">
                      ৳ {item.lineTotal.toLocaleString("en-BD")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Financial Breakdown (Seamless right-aligned receipt) */}
            <div className="mt-4 border-t border-[#101114]/8 pt-5 sm:flex sm:justify-end">
              <div className="w-full space-y-2 text-xs sm:w-72 sm:max-w-xs sm:text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#101114]">
                    ৳ {order.subtotal.toLocaleString("en-BD")}
                  </span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Discount</span>
                    <span>-৳ {discountTotal.toLocaleString("en-BD")}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-500">
                  <span>Shipping ({order.shippingMethodName || "Standard Delivery"})</span>
                  <span className="font-medium text-[#101114]">
                    ৳ {order.shippingCost.toLocaleString("en-BD")}
                  </span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Estimated VAT / Tax</span>
                    <span className="font-medium text-[#101114]">
                      ৳ {order.taxAmount.toLocaleString("en-BD")}
                    </span>
                  </div>
                )}
                <div className="my-2 flex items-baseline justify-between border-t border-[#101114]/8 pt-3">
                  <span className="text-sm font-bold tracking-wide text-[#101114] uppercase">
                    Total Amount
                  </span>
                  <span className="text-lg font-extrabold text-[#101114] sm:text-xl">
                    ৳ {order.total.toLocaleString("en-BD")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Integrated Metadata Grid (Address, Payment & Delivery) */}
          <div className="border-t border-[#101114]/8 bg-[#FAF9F5] p-5 sm:p-7 md:p-8">
            <div className="grid grid-cols-1 gap-6 divide-y divide-[#101114]/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {/* Delivery Destination */}
              <div className="sm:pr-6">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                  <MapPin className="size-3.5 text-[#101114]" />
                  <span>Delivery Destination</span>
                </div>
                <div className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600">
                  <p className="font-bold text-[#101114]">{order.customerName || "Customer"}</p>
                  {order.customerPhone && (
                    <p className="font-medium text-neutral-700">{order.customerPhone}</p>
                  )}
                  {order.customerEmail && <p className="text-neutral-500">{order.customerEmail}</p>}
                  <div className="pt-2 text-[#101114]">
                    <p>{order.shippingStreet || "Standard Street Address"}</p>
                    <p>
                      {[order.shippingCity, order.shippingState, order.shippingZip]
                        .filter(Boolean)
                        .join(", ") || "Dhaka, Bangladesh"}
                    </p>
                    <p>{order.shippingCountry || "Bangladesh"}</p>
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
                    <span className="text-neutral-500">Method</span>
                    <span className="font-semibold text-[#101114]">{gatewayLabel}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span className="text-neutral-500">Status</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
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
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-neutral-500">TrxID</span>
                      <span className="font-mono text-neutral-800">{order.transactionId}</span>
                    </div>
                  )}
                  <p className="pt-1 text-[11px] text-neutral-500">
                    {isPaid
                      ? "Payment settled and verified."
                      : isCod
                        ? "Please have exact cash ready for courier."
                        : "Awaiting settlement verification."}
                  </p>
                </div>
              </div>

              {/* Courier & Assurance */}
              <div className="pt-5 sm:col-span-2 sm:pt-6 lg:col-span-1 lg:pt-0 lg:pl-6">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#101114] uppercase">
                  <Truck className="size-3.5 text-[#101114]" />
                  <span>Courier &amp; Assurance</span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-neutral-600">
                  <p className="font-medium text-[#101114]">Steadfast Doorstep Delivery</p>
                  <p className="text-neutral-500">Inside Dhaka 2–3 days, outside 3–5 days.</p>
                  <div className="space-y-1.5 border-t border-[#101114]/6 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                      <span>100% Authentic Garment Guarantee</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                      <RotateCcw className="size-3.5 text-emerald-600" />
                      <span>72-Hour Doorstep Return Policy</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                      <Phone className="size-3.5 text-neutral-500" />
                      <span>WhatsApp Support: 01942565664</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Navigation Action Controls ── */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/shop">
              <ShoppingBag className="size-4 text-neutral-500" />
              <span>Explore More Drops</span>
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
          >
            <Link href={`/account/orders/${order.orderNumber}`}>
              <span>Track in Account Orders</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
