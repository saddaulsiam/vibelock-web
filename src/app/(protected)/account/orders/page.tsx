import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, PackageOpen, ArrowUpRight, Truck } from "lucide-react";
import { getCustomerOrders } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

export const metadata: Metadata = {
  title: "My Orders | VibeLock",
  description: "View your VibeLock order history and track shipments.",
  robots: { index: false, follow: false },
};

const pageSize = 10;

export default async function OrdersPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const requestedPage = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { orders, total } = await getCustomerOrders(page, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Orders Card Container */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[#101114] sm:text-2xl">
              My Orders
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Review order history, payment status, and track deliveries.
            </p>
          </div>
          <span className="rounded-full bg-[#101114]/5 px-3 py-1 text-xs font-bold text-[#101114]">
            {total} {total === 1 ? "Order" : "Orders"}
          </span>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F0E8] text-muted-foreground">
              <PackageOpen className="size-7" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#101114]">No orders found</h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
              You haven&apos;t placed any orders yet. Once you make a purchase, it will appear here.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#101114] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229] active:scale-95"
            >
              <span>Explore Streetwear</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#101114]/10 text-muted-foreground font-semibold">
                    <th className="py-3.5 pr-4">Order</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101114]/5 text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F3F0E8]/40 transition-colors">
                      {/* Order Number */}
                      <td className="py-4 pr-4">
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="font-bold text-[#101114] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D9FF]"
                        >
                          #{order.orderNumber}
                        </Link>
                        {order.shipment?.trackingNumber && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Truck className="size-3 text-[#0099b8]" />
                            <span>Track: {order.shipment.trackingNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#101114] flex items-center justify-center text-white">
                            <Image
                              src="/images/categories/cat-t-shirts.jpg"
                              alt="Product preview"
                              fill
                              sizes="36px"
                              className="object-cover opacity-80"
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 font-bold text-[#101114] whitespace-nowrap">
                        ৳ {order.total.toLocaleString("en-BD")}
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="group inline-flex items-center gap-1 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] transition-all hover:bg-[#101114] hover:text-white hover:border-[#101114]"
                        >
                          <span>View Details</span>
                          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="flex flex-col divide-y divide-[#101114]/10 md:hidden">
              {orders.map((order) => (
                <div key={order.id} className="py-4 first:pt-2 last:pb-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="font-bold text-sm text-[#101114] hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</span>
                  </div>

                  {order.shipment?.trackingNumber && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-[#F3F0E8]/50 p-2 rounded-lg">
                      <Truck className="size-3.5 text-[#0099b8]" />
                      <span>Tracking: {order.shipment.trackingNumber}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-[#101114]">
                      ৳ {order.total.toLocaleString("en-BD")}
                    </span>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114]"
                    >
                      <span>View Details</span>
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav
                aria-label="Order pagination"
                className="mt-6 flex items-center justify-between border-t border-[#101114]/10 pt-4"
              >
                <div>
                  {page > 1 ? (
                    <Link
                      href={`/account/orders?page=${page - 1}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
                    >
                      <ArrowLeft className="size-3.5" /> Previous
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/10 px-3.5 py-2 text-xs text-muted-foreground/50 cursor-not-allowed">
                      <ArrowLeft className="size-3.5" /> Previous
                    </span>
                  )}
                </div>

                <span className="text-xs font-medium text-muted-foreground">
                  Page {page} of {totalPages}
                </span>

                <div>
                  {page < totalPages ? (
                    <Link
                      href={`/account/orders?page=${page + 1}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
                    >
                      Next <ArrowRight className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#101114]/10 px-3.5 py-2 text-xs text-muted-foreground/50 cursor-not-allowed">
                      Next <ArrowRight className="size-3.5" />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
