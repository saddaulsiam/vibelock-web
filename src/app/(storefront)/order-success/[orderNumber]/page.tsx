import { auth } from "@/auth";
import { OrderPrintAction } from "@/components/storefront/orders/order-print-action";
import { getCustomerOrderConfirmation } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";
import { getHumanGatewayName } from "@/lib/payment/format";
import { CancelOrderButton } from "@/components/storefront/orders/cancel-order-button";
import { RetryPaymentButton } from "@/components/storefront/orders/retry-payment-button";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
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
import { getDisplayPhoneNumber, getWhatsAppUrl } from "@/lib/config/contact";
import { MetaPurchaseTracker } from "@/components/storefront/analytics/meta-purchase-tracker";
import { getCheckoutSettings } from "@/lib/settings/checkout-settings";
import { getGeneralStoreSettings } from "@/lib/settings/store-settings-service";
import { isDhakaCity } from "@/lib/shipping/pricing";

export const metadata: Metadata = {
  title: "Order Confirmation",
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

export default async function OrderSuccessPage({ params, searchParams }: OrderSuccessPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const paymentQuery = resolvedSearchParams.payment?.toLowerCase();

  const [order, { settings: checkoutPolicies }, { settings: generalSettings }] = await Promise.all([
    getCustomerOrderConfirmation(orderNumber),
    getCheckoutSettings(),
    getGeneralStoreSettings(),
  ]);
  if (!order) notFound();

  const isOrderCancelled = order.status === "CANCELLED";
  const isPaymentCancelled = order.paymentStatus === "CANCELLED";
  const isCancelled = isOrderCancelled || isPaymentCancelled;
  const isPaymentFailed = order.paymentStatus === "FAILED";
  const isPaid = order.paymentStatus === "SUCCESS";
  const isCod = order.paymentMethod === "COD";

  const isDhaka = isDhakaCity(order.shippingCity, order.shippingState);
  const isAdvanceRequired =
    isCod &&
    checkoutPolicies.requireCodAdvanceDeliveryCharge &&
    checkoutPolicies.codAdvanceCollectionMode === "MANUAL_VERIFICATION";
  const advanceAmount = isDhaka
    ? checkoutPolicies.codAdvanceInsideDhaka
    : checkoutPolicies.codAdvanceOutsideDhaka;
  const balanceDueOnDelivery = Math.max(0, order.total - advanceAmount);
  const mfsNumber =
    checkoutPolicies.codAdvancePaymentNumber?.trim() ||
    generalSettings.whatsappNumber?.trim() ||
    generalSettings.supportPhone?.trim() ||
    "01311333277";
  const cleanMfsWhatsApp = mfsNumber.replace(/\D/g, "");
  const hotline = generalSettings.supportPhone || "01311333277";
  const instructions =
    checkoutPolicies.codAdvanceInstructions ||
    "Send courier advance via bKash/Nagad to confirm order dispatch. Our representative will also call you.";
  const isAwaitingPayment = !isPaid && !isCod && !isCancelled && !isPaymentFailed;
  const isPaystation = order.paymentGateway === "PAYSTATION";
  const isPaystationCancelled =
    isAwaitingPayment &&
    isPaystation &&
    (paymentQuery === "cancelled" || order.latestPaymentStatus === "CANCELLED");
  const isRedirectUnfinished =
    isAwaitingPayment &&
    (paymentQuery === "cancelled" ||
      paymentQuery === "failed" ||
      paymentQuery === "pending" ||
      order.latestPaymentStatus === "CANCELLED");

  const displayOrderStatus = isCancelled
    ? "CANCELLED"
    : (isPaid || isCod) && order.status === "PENDING"
      ? "CONFIRMED"
      : order.status;

  const isOrderConfirmed =
    (isPaid || isCod) &&
    !isCancelled &&
    !isPaymentFailed &&
    !isPaystationCancelled &&
    !isRedirectUnfinished &&
    paymentQuery !== "cancelled" &&
    paymentQuery !== "failed";

  const firstName = order.customerName ? order.customerName.trim().split(" ")[0] : null;
  const discountTotal = Math.max(0, order.discount);
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const gatewayLabel = getHumanGatewayName(
    order.paymentGateway,
    order.paymentMethod,
    order.cardType,
    order.cardBrand
  );

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
      label: isCod
        ? isAdvanceRequired
          ? "Advance Required"
          : "COD Confirmed"
        : "Payment Verified",
      sublabel: isCod
        ? isAdvanceRequired
          ? `৳${advanceAmount} Courier Fee Due`
          : "Pay on delivery"
        : isPaid
          ? "Settled via " + gatewayLabel
          : isRedirectUnfinished
            ? "Session incomplete"
            : isPaymentFailed
              ? "Payment failed"
              : "Verifying payment",
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
      {isOrderConfirmed && (
        <MetaPurchaseTracker
          orderNumber={order.orderNumber}
          total={order.total}
          items={order.items.map((item) => ({
            id: item.sku,
            quantity: item.quantity,
            price: item.unitPrice,
            name: item.productName,
          }))}
        />
      )}
      {/* ── Architectural Dot Matrix Background (VibeLock Technical Grid) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        {/* ── Top Navigation & Utility Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 print:hidden">
          <Link
            href="/shop"
            className="group hover:text-vl-dark-900 inline-flex min-h-9.5 items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Continue Shopping</span>
          </Link>

          <OrderPrintAction order={order} />
        </div>

        {/* ── Main Unified Master Order Receipt Canvas ── */}
        <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
          {/* 1. Header Section: Identity, Thank You & Status */}
          <div className="border-vl-dark-900/8 border-b p-5 sm:p-7 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tracking-streetwear text-vl-cyan text-[10px] font-bold uppercase sm:text-[11px]">
                    Order Confirmation
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-xs text-neutral-500">
                    Placed {formatDate(order.createdAt)}
                  </span>
                </div>
                <h1 className="text-vl-dark-900 mt-1 text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
                  {isCancelled
                    ? "Order Cancelled"
                    : isPaymentFailed
                      ? "Payment Incomplete"
                      : isPaystationCancelled
                        ? "Checkout Cancelled"
                        : isRedirectUnfinished
                          ? "Payment Incomplete"
                          : `Thank you, ${firstName || "Customer"}!`}
                </h1>
                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  {isCancelled
                    ? "This order was cancelled. Reserved inventory was released and no funds were debited."
                    : isPaymentFailed
                      ? `Payment for order #${order.orderNumber} was not successful. Your items remain reserved temporarily if you wish to retry.`
                      : isPaystationCancelled
                        ? "You closed or exited the PayStation checkout before payment was completed. Your reserved items remain safe if you wish to try payment again or close the order."
                        : isRedirectUnfinished
                          ? `Order #${order.orderNumber} is pending payment confirmation. Your reserved items remain safe while awaiting gateway confirmation.`
                          : `Order #${order.orderNumber} is confirmed. A receipt has been sent to ${
                              order.customerEmail || "your email"
                            }.`}
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2 sm:mt-0">
                <PaymentGatewayBadge
                  gateway={order.paymentGateway}
                  paymentMethod={order.paymentMethod}
                  cardType={order.cardType}
                  cardBrand={order.cardBrand}
                />
                <OrderStatusBadge status={displayOrderStatus} />
              </div>
            </div>

            {/* Live Progress Tracker / Cancellation State / Payment Notice */}
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
              <>
                {/* ── COD Advance Verification Card (Method 1) ── */}
                {isAdvanceRequired && !isCancelled && (
                  <div className="mt-6 overflow-hidden rounded-xl border border-amber-300 bg-amber-50/80 p-5 shadow-2xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/80 bg-amber-100 text-amber-800 shadow-2xs">
                        <Banknote className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-bold tracking-wider text-amber-950 uppercase sm:text-sm">
                            COD ডেলিভারি চার্জ এডভান্স ভেরিফিকেশন
                          </h4>
                          <span className="rounded-full border border-amber-300 bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            Action Needed
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                          আপনার পার্সেলটি দ্রুত কুরিয়ারে বুক করার জন্য ডেলিভারি চার্জ অগ্রিম পরিশোধ করতে হবে। ডেলিভারির সময় কুরিয়ারকে বাকি মূল্য ক্যাশ পরিশোধ করবেন।
                        </p>

                        {/* Amount breakdown boxes */}
                        <div className="mt-3 grid gap-2.5 rounded-lg border border-amber-200/90 bg-white/90 p-3 sm:grid-cols-2">
                          <div>
                            <span className="text-[11px] font-medium text-neutral-500">
                              অগ্রিম কুরিয়ার ফি ({isDhaka ? "ঢাকার ভেতরে" : "ঢাকার বাইরে"}):
                            </span>
                            <p className="mt-0.5 font-mono text-base font-black text-amber-700">
                              ৳{advanceAmount.toLocaleString("en-BD")}
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-neutral-500">
                              ডেলিভারির সময় প্রদেয় বাকি ক্যাশ:
                            </span>
                            <p className="mt-0.5 font-mono text-base font-black text-neutral-900">
                              ৳{balanceDueOnDelivery.toLocaleString("en-BD")}
                            </p>
                          </div>
                        </div>

                        {/* bKash / Nagad payment number card */}
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-100/60 p-3 text-xs text-amber-950">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-neutral-700">
                              বিকাশ / নগদ পার্সোনাল/মার্চেন্ট নম্বর:
                            </span>
                            <code className="rounded border border-amber-300 bg-white px-2.5 py-1 font-mono text-sm font-bold text-amber-950 select-all">
                              {mfsNumber}
                            </code>
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-amber-900">
                            {instructions}
                          </p>
                        </div>

                        {/* Quick Contact Action Buttons */}
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          <a
                            href={`https://wa.me/${cleanMfsWhatsApp}?text=${encodeURIComponent(
                              `আসসালামু আলাইকুম! আমার অর্ডার #${order.orderNumber} এর জন্য কুরিয়ার চার্জ ৳${advanceAmount} বিকাশ করেছি/করতে চাই।`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-emerald-700"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>WhatsApp-এ TrxID পাঠান</span>
                          </a>
                          <a
                            href={`tel:${hotline}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-all hover:bg-neutral-50"
                          >
                            <Phone className="size-3.5 text-neutral-600" />
                            <span>হেল্পলাইনে কল করুন ({hotline})</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isRedirectUnfinished && (
                  <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                          {isPaystationCancelled ? "Checkout Cancelled" : "Payment Not Confirmed"}
                        </h4>
                        <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                          {isPaystationCancelled
                            ? "You closed or exited the PayStation checkout before payment was completed. Your items remain safely reserved if you wish to try payment again or close the order."
                            : "The checkout window was closed or incomplete before payment confirmation was received. Your items remain safely reserved while awaiting gateway confirmation."}
                        </p>
                        {order.hasUnresolvedOnlinePayment ? (
                          <p className="mt-2 text-xs text-amber-800">
                            A payment attempt is currently awaiting gateway confirmation. To protect
                            you from duplicate charges, retry and cancellation are paused until the
                            transaction is confirmed by the gateway. If you completed payment,
                            please wait a few moments or contact support on WhatsApp (
                            <a
                              href={getWhatsAppUrl()}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold underline hover:text-amber-950"
                            >
                              {getDisplayPhoneNumber("international")}
                            </a>
                            ).
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-amber-800">
                            {order.hasActiveReservation
                              ? "Your items remain safely reserved. You can retry payment now to complete your order."
                              : "Inventory reservation has expired. Please create a new order."}
                          </p>
                        )}
                      </div>
                    </div>
                    {(order.canRetryPayment || order.canCancelOrder) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-12.5">
                        {order.canRetryPayment && (
                          <RetryPaymentButton
                            orderNumber={order.orderNumber}
                            gateway={order.paymentGateway ?? undefined}
                            variant="brand"
                            size="sm"
                            label="Try Payment Again"
                          />
                        )}
                        {order.canCancelOrder && (
                          <CancelOrderButton
                            orderNumber={order.orderNumber}
                            variant="outline"
                            size="sm"
                            label="Close Order"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
                {isPaymentFailed && (
                  <div className="mt-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                        <AlertCircle className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                          Payment Failed
                        </h4>
                        <p className="mt-0.5 text-xs leading-relaxed text-rose-700">
                          The payment transaction was declined or failed by the gateway. No funds
                          were debited.
                          {order.hasActiveReservation ? (
                            <span>
                              {" "}
                              Your reserved items remain safe temporarily if you wish to retry
                              payment.
                            </span>
                          ) : (
                            <span>
                              {" "}
                              The temporary reservation window has expired and items have been
                              released back to stock.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {(order.canRetryPayment || order.canCancelOrder) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-12.5">
                        {order.canRetryPayment && (
                          <RetryPaymentButton
                            orderNumber={order.orderNumber}
                            gateway={order.paymentGateway ?? undefined}
                            variant="brand"
                            size="sm"
                            label="Try Payment Again"
                          />
                        )}
                        {order.canCancelOrder && (
                          <CancelOrderButton
                            orderNumber={order.orderNumber}
                            variant="outline"
                            size="sm"
                            label="Close Order"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="border-vl-dark-900/6 mt-6 border-t pt-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
                    {steps.map((st, i) => (
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
                              <Check className="size-3 stroke-3" />
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
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Purchased Items Section & Financial Calculation */}
          <div className="p-5 sm:p-7 md:p-8">
            <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Package className="text-vl-dark-900 size-4" />
                <h2 className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase sm:text-sm">
                  Purchased Items
                </h2>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Items List */}
            <ul className="divide-vl-dark-900/6 divide-y">
              {order.items.map((item, index) => (
                <li
                  key={`${item.productName}-${item.size ?? ""}-${item.color ?? ""}-${index}`}
                  className="flex items-center gap-4 py-4 first:pt-4 last:pb-2 sm:py-5"
                >
                  {/* Thumbnail */}
                  <div className="border-vl-dark-900/10 relative size-14 shrink-0 overflow-hidden rounded-xl border bg-neutral-100 sm:size-16">
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

                  {/* Line Total */}
                  <div className="shrink-0 text-right">
                    <p className="text-vl-dark-900 text-sm font-bold sm:text-base">
                      ৳ {item.lineTotal.toLocaleString("en-BD")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Financial Breakdown (Seamless right-aligned receipt) */}
            <div className="border-vl-dark-900/8 mt-4 border-t pt-5 sm:flex sm:justify-end">
              <div className="w-full space-y-2 text-xs sm:w-72 sm:max-w-xs sm:text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="text-vl-dark-900 font-medium">
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
                  <span className="text-vl-dark-900 font-medium">
                    ৳ {order.shippingCost.toLocaleString("en-BD")}
                  </span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Estimated VAT / Tax</span>
                    <span className="text-vl-dark-900 font-medium">
                      ৳ {order.taxAmount.toLocaleString("en-BD")}
                    </span>
                  </div>
                )}
                <div className="border-vl-dark-900/8 my-2 flex items-baseline justify-between border-t pt-3">
                  <span className="text-vl-dark-900 text-sm font-bold tracking-wide uppercase">
                    Total Amount
                  </span>
                  <span className="text-vl-dark-900 text-lg font-extrabold sm:text-xl">
                    ৳ {order.total.toLocaleString("en-BD")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Integrated Metadata Grid (Address, Payment & Delivery) */}
          <div className="border-vl-dark-900/8 bg-vl-white-100 border-t p-5 sm:p-7 md:p-8">
            <div className="divide-vl-dark-900/8 grid grid-cols-1 gap-6 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {/* Delivery Destination */}
              <div>
                <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                  <MapPin className="text-vl-dark-900 size-3.5" />
                  <span>Delivery Destination</span>
                </div>
                <div className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600">
                  <p className="text-vl-dark-900 font-bold">{order.customerName || "Customer"}</p>
                  {order.customerPhone && (
                    <p className="font-medium text-neutral-700">{order.customerPhone}</p>
                  )}
                  {order.customerEmail && <p className="text-neutral-500">{order.customerEmail}</p>}
                  <div className="text-vl-dark-900 pt-2">
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
              <div>
                <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                  <CreditCard className="text-vl-dark-900 size-3.5" />
                  <span>Payment Details</span>
                </div>
                <div className="mt-3 space-y-2.5 text-xs text-neutral-600">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span className="text-neutral-500">Method:</span>
                    <span className="text-vl-dark-900 font-semibold">{gatewayLabel}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                    <span className="text-neutral-500">Status:</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : isCancelled
                            ? "bg-rose-100 text-rose-800"
                            : isPaymentFailed
                              ? "bg-rose-100 text-rose-800"
                              : isCod
                                ? isAdvanceRequired
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isPaid
                        ? "PAID"
                        : isCancelled
                          ? "CANCELLED"
                          : isPaymentFailed
                            ? "FAILED"
                            : isCod
                              ? isAdvanceRequired
                                ? "COD (ADVANCE REQUIRED)"
                                : "CASH ON DELIVERY"
                              : "PENDING"}
                    </span>
                  </div>
                  {order.transactionId && (
                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                      <span className="text-neutral-500">TrxID:</span>
                      <span className="overflow-hidden font-mono wrap-break-word text-neutral-800">
                        {order.transactionId}
                      </span>
                    </div>
                  )}
                  <p className="pt-1 text-[11px] text-neutral-500">
                    {isPaid
                      ? "Payment settled and verified."
                      : isCancelled
                        ? "Order was cancelled and payment was not completed."
                        : isCod
                          ? isAdvanceRequired
                            ? `Please send ৳${advanceAmount} delivery advance to confirm order. Remaining ৳${balanceDueOnDelivery.toLocaleString("en-BD")} is due on delivery.`
                            : "Please have exact cash ready for courier."
                          : isRedirectUnfinished
                            ? "Payment session incomplete. Awaiting trusted confirmation."
                            : isPaymentFailed
                              ? "Payment attempt declined or failed."
                              : "Payment status is being verified. Please check again shortly."}
                  </p>
                </div>
              </div>

              {/* Courier & Assurance */}
              <div>
                <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                  <Truck className="text-vl-dark-900 size-3.5" />
                  <span>Courier &amp; Assurance</span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-neutral-600">
                  <p className="text-vl-dark-900 font-medium">Steadfast Doorstep Delivery</p>
                  <p className="text-neutral-500">Inside Dhaka 2–3 days, outside 3–5 days.</p>
                  <div className="border-vl-dark-900/6 space-y-1.5 border-t pt-2">
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
                      <a
                        href={getWhatsAppUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        WhatsApp Support: {getDisplayPhoneNumber("international")}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Navigation Action Controls ── */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Button asChild variant="outline" size="lg">
            <Link href="/shop">
              <ShoppingBag className="size-4 text-neutral-500" />
              <span>Explore More Drops</span>
            </Link>
          </Button>

          <Button asChild size="lg">
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
