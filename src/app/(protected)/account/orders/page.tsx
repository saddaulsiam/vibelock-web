import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PackageOpen, Truck } from "lucide-react";
import { getCustomerOrders } from "@/lib/orders/queries";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { PaymentGatewayBadge } from "@/components/shared/payment-gateway-badge";

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
      {/* Orders Container */}
      <div className="rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 pb-4 sm:pb-5">
          <div>
            <h1 className="text-base font-black tracking-tight text-[#101114] uppercase sm:text-lg">
              Order History
            </h1>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
              Track fulfillment progress, payment details, and courier shipments
            </p>
          </div>
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-700">
            {total} {total === 1 ? "Order" : "Orders"}
          </span>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
              <PackageOpen className="size-6" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-[#101114]">No orders found</h2>
            <p className="mt-1 max-w-sm text-xs text-neutral-500 leading-relaxed">
              You haven&apos;t placed any orders yet. Once you make a purchase, it will appear here.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#101114] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-neutral-800"
            >
              <span>Explore Collection</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            {/* Desktop Table View (>= md) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#101114]/8 font-bold text-neutral-500 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 pr-4">Order #</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Items</th>
                    <th className="px-4 py-3.5">Total</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="py-3.5 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101114]/6 text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-neutral-50/70">
                      {/* Order Number */}
                      <td className="py-4 pr-4">
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="font-bold text-[#101114] hover:underline focus-visible:ring-1 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                        >
                          #{order.orderNumber}
                        </Link>
                        {order.shipment?.trackingNumber && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                            <Truck className="size-3 text-neutral-400" />
                            <span>Track: {order.shipment.trackingNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-xs font-medium text-neutral-500 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4 text-xs font-medium text-neutral-600 whitespace-nowrap">
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-4 font-black whitespace-nowrap text-[#101114]">
                        ৳ {order.total.toLocaleString("en-BD")}
                      </td>

                      {/* Status Badges */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusBadge status={order.status} />
                          <PaymentGatewayBadge
                            gateway={order.paymentGateway}
                            paymentMethod={order.paymentMethod}
                          />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <Link
                          href={`/account/orders/${order.orderNumber}`}
                          className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-neutral-700 transition-colors hover:text-[#101114]"
                        >
                          <span>View Details</span>
                          <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Intentional Stacked View (< md) - Zero horizontal scroll */}
            <div className="flex flex-col divide-y divide-[#101114]/8 md:hidden">
              {orders.map((order) => (
                <div key={order.id} className="py-3.5 first:pt-2 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="truncate text-xs font-bold text-[#101114] hover:underline sm:text-sm"
                    >
                      #{order.orderNumber}
                    </Link>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <PaymentGatewayBadge
                        gateway={order.paymentGateway}
                        paymentMethod={order.paymentMethod}
                      />
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {order.shipment?.trackingNumber && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-neutral-100 p-2 text-xs text-neutral-600">
                      <Truck className="size-3.5 shrink-0 text-neutral-500" />
                      <span className="truncate">Tracking: {order.shipment.trackingNumber}</span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between pt-1">
                    <span className="text-xs font-black text-[#101114] sm:text-sm">
                      ৳ {order.total.toLocaleString("en-BD")}
                    </span>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="group inline-flex min-h-[38px] items-center gap-1 rounded-md border border-[#101114]/10 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition-colors active:scale-95"
                    >
                      <span>View details</span>
                      <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav
                aria-label="Order pagination"
                className="mt-5 flex items-center justify-between border-t border-[#101114]/8 pt-4"
              >
                <div>
                  {page > 1 ? (
                    <Link
                      href={`/account/orders?page=${page - 1}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#101114] transition-colors hover:bg-neutral-50"
                    >
                      <ArrowLeft className="size-3" /> Previous
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-2 text-xs text-neutral-300">
                      <ArrowLeft className="size-3" /> Previous
                    </span>
                  )}
                </div>

                <span className="text-xs font-medium text-neutral-500">
                  Page {page} of {totalPages}
                </span>

                <div>
                  {page < totalPages ? (
                    <Link
                      href={`/account/orders?page=${page + 1}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#101114] transition-colors hover:bg-neutral-50"
                    >
                      Next <ArrowRight className="size-3" />
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-2 text-xs text-neutral-300">
                      Next <ArrowRight className="size-3" />
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
