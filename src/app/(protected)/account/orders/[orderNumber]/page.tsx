import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, ImageOff, MapPin, Package, UserRound } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { CancelOrderButton } from "@/components/storefront/orders/cancel-order-button";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Price } from "@/components/storefront/price";
import { Separator } from "@/components/ui/separator";
import { getCustomerOrder } from "@/lib/orders/queries";

export async function generateMetadata(props: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await props.params;
  return {
    title: `Order ${orderNumber} | VibeLock`,
    description: "View your VibeLock order details.",
    robots: { index: false, follow: false },
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function OrderDetailPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await props.params;
  const order = await getCustomerOrder(orderNumber);
  if (!order) notFound();

  const canCancel =
    order.status === "PENDING" &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "INITIATED") &&
    !order.shipment;

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-6xl">
        <header className="mb-7 border-b border-[#101114]/15 pb-6 sm:mb-9">
          <Link
            href="/account/orders"
            className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to orders
          </Link>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            VibeLock / Account / Orders
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
                Order {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <OrderStatusBadge status={order.status} />
                <OrderStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            {canCancel && <CancelOrderButton orderNumber={order.orderNumber} />}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <section className="border border-[#101114]/10 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-4 py-4 sm:px-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#101114]">
                  <Package className="size-5" aria-hidden="true" /> Items
                </h2>
                {order.isReturnable && (
                  <Link
                    href={`/account/orders/${order.orderNumber}/return`}
                    className="inline-flex min-h-9 items-center justify-center border border-[#101114]/20 px-3 text-sm font-medium transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  >
                    Request return
                  </Link>
                )}
              </div>

              <ul className="divide-y divide-[#101114]/10 px-4 sm:px-6">
                {order.items.map((item) => (
                  <li key={item.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-4">
                    <span role="img" aria-label="Product image unavailable" className="flex aspect-square items-center justify-center bg-[#F3F0E8] text-muted-foreground">
                      <ImageOff className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#101114]">{item.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" · ") || "Standard option"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-[#101114]">
                          {new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(item.unitPrice)}
                        </span>{" "}× {item.quantity}
                      </p>
                    </div>
                    <Price amount={item.lineTotal} className="text-sm font-semibold text-[#101114]" />
                  </li>
                ))}
              </ul>

              <div className="border-t border-[#101114]/10 bg-[#F3F0E8]/55 px-4 py-5 sm:px-6">
                <dl className="ml-auto max-w-sm space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd><Price amount={order.subtotal} className="font-medium text-[#101114]" /></dd>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Discount</dt>
                      <dd><Price amount={-order.discount} className="font-medium text-[#101114]" /></dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Shipping · {order.shippingMethodName}</dt>
                    <dd><Price amount={order.shippingCost} className="font-medium text-[#101114]" /></dd>
                  </div>
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Tax</dt>
                      <dd><Price amount={order.taxAmount} className="font-medium text-[#101114]" /></dd>
                    </div>
                  )}
                  <Separator className="!my-4 bg-[#101114]/15" />
                  <div className="flex justify-between gap-4 text-base font-semibold text-[#101114]">
                    <dt>Total</dt>
                    <dd><Price amount={order.total} /></dd>
                  </div>
                </dl>
              </div>
            </section>

            {(order.returnRequests.length > 0 || order.refunds.length > 0) && (
              <section className="border border-[#101114]/10 bg-white">
                <div className="border-b border-[#101114]/10 px-4 py-4 sm:px-6">
                  <h2 className="text-lg font-semibold tracking-tight text-[#101114]">Returns & refunds</h2>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  {order.returnRequests.map((request) => (
                    <article key={request.id} className="border border-[#101114]/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[#101114]">Return request</h3>
                        <OrderStatusBadge status={request.status} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Requested {formatDate(request.createdAt)}</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {request.items.map((requestItem) => {
                          const orderItem = order.items.find((item) => item.id === requestItem.orderItemId);
                          return (
                            <li key={requestItem.orderItemId} className="flex justify-between gap-3">
                              <span>{orderItem?.productName ?? "Order item"}</span>
                              <span className="text-muted-foreground">Qty {requestItem.quantity}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ))}
                  {order.refunds.map((refund) => (
                    <article key={`${refund.createdAt.toISOString()}-${refund.amount}`} className="flex flex-wrap items-center justify-between gap-3 border border-[#101114]/10 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[#101114]">Refund</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(refund.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={refund.status} />
                        <Price amount={refund.amount} className="font-semibold text-[#101114]" />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="border border-[#101114]/10 bg-white p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#101114]">
                <CreditCard className="size-4" aria-hidden="true" /> Payment
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Method</dt>
                  <dd className="mt-1 font-medium text-[#101114]">
                    {order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-muted-foreground">Payment status</dt>
                  <dd><OrderStatusBadge status={order.paymentStatus} /></dd>
                </div>
              </dl>
            </section>

            {order.shipment && (
              <section className="border border-[#101114]/10 bg-white p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#101114]">
                  <Package className="size-4" aria-hidden="true" /> Shipment
                </h2>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">Status</dt>
                    <dd><OrderStatusBadge status={order.shipment.status} /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Carrier</dt>
                    <dd className="mt-1 font-medium capitalize text-[#101114]">{order.shipment.provider}</dd>
                  </div>
                  {order.shipment.trackingNumber && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Tracking number</dt>
                      <dd className="mt-1 break-all font-medium text-[#101114]">{order.shipment.trackingNumber}</dd>
                    </div>
                  )}
                  {order.shipment.shippedAt && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Shipped</dt>
                      <dd className="mt-1 text-[#101114]">{formatDate(order.shipment.shippedAt)}</dd>
                    </div>
                  )}
                  {order.shipment.deliveredAt && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Delivered</dt>
                      <dd className="mt-1 text-[#101114]">{formatDate(order.shipment.deliveredAt)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {order.history.length > 0 && (
              <section className="border border-[#101114]/10 bg-white p-4 sm:p-5">
                <h2 className="text-base font-semibold text-[#101114]">Order history</h2>
                <ol className="mt-4 space-y-4 border-l border-[#101114]/15 pl-4">
                  {order.history.map((entry, index) => (
                    <li key={`${entry.createdAt.toISOString()}-${index}`} className="relative">
                      <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-[#101114]" />
                      <p className="text-sm font-medium text-[#101114]">{entry.status.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                      {entry.notes && !entry.notes.startsWith("[RETURN UPDATE]") ? <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="border border-[#101114]/10 bg-white p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#101114]">
                <UserRound className="size-4" aria-hidden="true" /> Customer & delivery
              </h2>
              <div className="mt-4 space-y-5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="mt-1 font-medium text-[#101114]">{order.customerName || "Customer"}</p>
                  <p className="break-all text-muted-foreground">{order.customerEmail}</p>
                  {order.customerPhone && <p className="text-muted-foreground">{order.customerPhone}</p>}
                </div>
                <Separator />
                <div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" /> Delivery address
                  </p>
                  <address className="mt-2 break-words not-italic leading-6 text-[#101114]">
                    {order.shippingStreet}<br />
                    {order.shippingCity}{order.shippingState ? `, ${order.shippingState}` : ""}<br />
                    {order.shippingZip ? <>{order.shippingZip}<br /></> : null}
                    {order.shippingCountry}
                  </address>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
