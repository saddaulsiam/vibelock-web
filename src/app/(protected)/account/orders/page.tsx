import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PackageOpen } from "lucide-react";
import { getCustomerOrders } from "@/lib/orders/queries";
import { Section } from "@/components/shared/section";
import { Container } from "@/components/shared/container";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Price } from "@/components/storefront/price";

export const metadata: Metadata = {
  title: "My Orders | VibeLock",
  description: "View your VibeLock order history.",
  robots: { index: false, follow: false },
};

const pageSize = 10;

export default async function OrdersPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const requestedPage = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { orders, total } = await getCustomerOrders(page, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-5xl">
        <header className="mb-8 border-b border-[#101114]/15 pb-6 sm:mb-10">
          <div className="flex justify-between items-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              VibeLock / Account
            </p>
            <Link
              href="/account"
              className="inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to account
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
                Your orders
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Review order status and details.</p>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {total} {total === 1 ? "order" : "orders"}
            </p>
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center border border-dashed border-[#101114]/20 bg-white/65 px-5 py-16 text-center">
            <PackageOpen className="mb-4 size-9 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-tight">No orders yet</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Once you place an order, its status and details will appear here.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[#101114] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
            >
              Shop products <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="border border-[#101114]/10 bg-white">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="break-words text-base font-semibold tracking-tight text-[#101114] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                    >
                      Order {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Placed{" "}
                      {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(
                        order.createdAt
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <OrderStatusBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[#101114]/10 bg-[#F3F0E8]/55 px-4 py-4 sm:grid-cols-3 sm:px-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="mt-1 text-sm font-medium text-[#101114]">
                      {order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p className="mt-1 text-sm font-medium text-[#101114]">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 sm:text-right">
                    <p className="text-xs text-muted-foreground">Order total</p>
                    <Price
                      amount={order.total}
                      className="mt-1 text-base font-semibold text-[#101114]"
                    />
                  </div>
                </div>
                {order.shipment ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#101114]/10 px-4 py-3 text-xs text-muted-foreground sm:px-5">
                    <span>
                      Shipment:{" "}
                      <span className="font-semibold uppercase text-[#101114]">
                        {order.shipment.status}
                      </span>
                    </span>
                    {order.shipment.trackingNumber ? (
                      <span>· Tracking {order.shipment.trackingNumber}</span>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end border-t border-[#101114]/10 p-4 sm:px-5">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm font-semibold text-[#101114] transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  >
                    View order <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}

            {totalPages > 1 && (
              <nav
                aria-label="Order history pages"
                className="flex items-center justify-center gap-3 pt-5"
              >
                {page > 1 ? (
                  <Link
                    href={`/account/orders?page=${page - 1}`}
                    className="inline-flex min-h-10 items-center gap-2 border border-[#101114]/20 bg-white px-4 text-sm font-medium transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Previous
                  </Link>
                ) : (
                  <span
                    className="inline-flex min-h-10 items-center gap-2 border border-[#101114]/10 px-4 text-sm text-muted-foreground/60"
                    aria-disabled="true"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Previous
                  </span>
                )}
                <span className="min-w-24 text-center text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/account/orders?page=${page + 1}`}
                    className="inline-flex min-h-10 items-center gap-2 border border-[#101114]/20 bg-white px-4 text-sm font-medium transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  >
                    Next <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span
                    className="inline-flex min-h-10 items-center gap-2 border border-[#101114]/10 px-4 text-sm text-muted-foreground/60"
                    aria-disabled="true"
                  >
                    Next <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </div>
        )}
      </Container>
    </Section>
  );
}
