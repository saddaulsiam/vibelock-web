import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ImageOff } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Price } from "@/components/storefront/price";
import { getCustomerOrderConfirmation } from "@/lib/orders/queries";

export const metadata: Metadata = {
  title: "Order Status | VibeLock",
  robots: { index: false, follow: false },
};

interface OrderSuccessPageProps {
  params: Promise<{ orderNumber: string }>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const order = await getCustomerOrderConfirmation(orderNumber);
  if (!order) notFound();

  const orderCancelled = order.status === "CANCELLED";
  const paymentCancelled = order.paymentStatus === "CANCELLED";
  const cancelled = orderCancelled || paymentCancelled;
  const paymentFailed = order.paymentStatus === "FAILED";
  const paymentComplete = order.paymentStatus === "SUCCESS";
  const confirmationTitle = orderCancelled
    ? "Order cancelled"
    : paymentCancelled
      ? "Payment cancelled"
    : paymentFailed
      ? "Payment not completed"
      : paymentComplete
        ? "Payment confirmed"
        : "Order received";
  const confirmationCopy = orderCancelled
    ? "The current order and payment status are shown below. Open the order details for the latest information."
    : paymentCancelled
      ? "Payment was cancelled. Review the order details for the current payment and order status."
    : paymentFailed
      ? "Your order is on record, but payment was not completed. Review your order details for the current status."
      : paymentComplete
        ? "Your payment is confirmed and your order is recorded."
        : order.paymentMethod === "COD"
          ? "Your order is recorded. Payment is due when it arrives."
          : "Your order is recorded. The payment status shown below reflects the latest update.";
  const ConfirmationIcon = cancelled || paymentFailed ? AlertCircle : paymentComplete ? CheckCircle2 : Clock3;
  const discountTotal = Math.max(0, order.discount);

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-4xl">
        <div className="border border-[#101114]/10 bg-white p-5 sm:p-8 lg:p-10">
          <header className="border-b border-[#101114]/10 pb-6 text-center sm:pb-8">
            <ConfirmationIcon
              className={`mx-auto mb-4 size-12 ${cancelled || paymentFailed ? "text-rose-700" : paymentComplete ? "text-emerald-700" : "text-[#101114]"}`}
              aria-hidden="true"
            />
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              VibeLock / Order update
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
              {confirmationTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {confirmationCopy}
            </p>
            <p className="mt-5 break-words font-mono text-sm font-semibold text-[#101114] sm:text-base">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <OrderStatusBadge status={order.status} />
              <OrderStatusBadge status={order.paymentStatus} />
            </div>
          </header>

          <section className="grid gap-6 py-6 sm:grid-cols-2 sm:py-8" aria-label="Order information">
            <div>
              <h2 className="text-sm font-semibold text-[#101114]">Payment method</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}
              </p>
            </div>
            <div className="sm:text-right">
              <h2 className="text-sm font-semibold text-[#101114]">Order total</h2>
              <Price amount={order.total} className="mt-1 text-xl font-semibold text-[#101114] sm:justify-end" />
            </div>
          </section>

          <section className="border-t border-[#101114]/10 pt-6" aria-labelledby="order-summary-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="order-summary-heading" className="text-lg font-semibold tracking-tight text-[#101114]">Order summary</h2>
              <span className="text-sm text-muted-foreground">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            <ul className="divide-y divide-[#101114]/10">
              {order.items.map((item, index) => (
                <li key={`${item.productName}-${item.size ?? ""}-${item.color ?? ""}-${index}`} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span role="img" aria-label="Product image unavailable" className="flex size-11 items-center justify-center bg-[#F3F0E8] text-muted-foreground">
                    <ImageOff className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-[#101114]">{item.productName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[item.size, item.color].filter(Boolean).join(" · ") || "Standard option"} · Qty {item.quantity}
                    </p>
                  </div>
                  <Price amount={item.lineTotal} className="text-sm font-medium text-[#101114]" />
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Order totals" className="mt-5 border-t border-[#101114]/10 pt-4">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd><Price amount={order.subtotal} className="font-medium text-[#101114]" /></dd>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd><Price amount={-discountTotal} className="font-medium text-[#101114]" /></dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd><Price amount={order.shippingCost} className="font-medium text-[#101114]" /></dd>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd><Price amount={order.taxAmount} className="font-medium text-[#101114]" /></dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-[#101114]/10 pt-4 text-base font-semibold text-[#101114]">
                <dt>Grand total</dt>
                <dd><Price amount={order.total} /></dd>
              </div>
            </dl>
          </section>

          <div className="mt-7 flex flex-col gap-3 border-t border-[#101114]/10 pt-6 sm:flex-row sm:justify-center">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#101114]/20 px-5 text-sm font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              View order details <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
            >
              Continue shopping <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
