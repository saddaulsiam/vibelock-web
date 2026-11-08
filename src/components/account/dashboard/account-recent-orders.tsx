import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";
import { Card } from "@/components/ui/card";

interface OrderItemInfo {
  id: string;
  productName: string;
  quantity: number;
  sku: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  items: OrderItemInfo[];
}

interface AccountRecentOrdersProps {
  orders: RecentOrder[];
}

export function AccountRecentOrders({ orders }: AccountRecentOrdersProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <Card variant="brand" className="mt-6 p-4 sm:p-6">
      {/* Header */}
      <div className="border-vl-dark-900/8 flex items-center justify-between border-b pb-3.5 sm:pb-4">
        <div>
          <h3 className="text-vl-dark-900 text-sm font-bold tracking-tight uppercase sm:text-base">
            Recent Orders
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
            Track fulfillment and delivery of your latest purchases
          </p>
        </div>
        <Link
          href="/account/orders"
          className="group hover:text-vl-dark-900 inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-600 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="group-hover:text-vl-dark-900 size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center sm:py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
            <PackageOpen className="size-5" />
          </div>
          <h4 className="text-vl-dark-900 mt-3 text-sm font-semibold">No orders yet</h4>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            Your recent purchase history and delivery tracking will appear here once you place an
            order.
          </p>
          <Link
            href="/shop"
            className="bg-vl-dark-900 mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            <span>Explore Collection</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= md) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-vl-black/8 border-b text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                  <th className="py-3.5 pr-4">Order #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Total</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="py-3.5 pl-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-vl-black/6 divide-y text-sm">
                {orders.map((order) => (
                  <tr key={order.orderNumber} className="transition-colors hover:bg-neutral-50/70">
                    {/* Order Number */}
                    <td className="text-vl-dark-900 py-4 pr-4 font-semibold">
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="focus-visible:ring-vl-cyan hover:underline focus-visible:ring-1 focus-visible:outline-none"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-xs font-medium whitespace-nowrap text-neutral-500">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Items Count */}
                    <td className="px-4 py-4 text-xs font-medium whitespace-nowrap text-neutral-600">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </td>

                    {/* Total Price */}
                    <td className="text-vl-dark-900 px-4 py-4 font-bold whitespace-nowrap">
                      ৳ {order.total.toLocaleString("en-BD")}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} />
                    </td>

                    {/* Action */}
                    <td className="py-4 pl-4 text-right whitespace-nowrap">
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="group hover:text-vl-dark-900 inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-600 transition-colors"
                      >
                        <span>Details</span>
                        <ArrowRight className="group-hover:text-vl-dark-900 size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile High-End Scannable List (< md) - Clean 2-row layout, zero heavy button boxes */}
          <div className="divide-vl-black/6 divide-y md:hidden">
            {orders.map((order) => (
              <div key={order.orderNumber} className="py-3.5 first:pt-3 last:pb-0">
                {/* Row 1: Order Number + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="text-vl-dark-900 truncate text-xs font-bold tracking-tight hover:underline sm:text-sm"
                  >
                    #{order.orderNumber}
                  </Link>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Row 2: Metadata (Date · Items · Total) & View Link */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>·</span>
                    <span>
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </span>
                    <span>·</span>
                    <span className="text-vl-dark-900 font-bold">
                      ৳ {order.total.toLocaleString("en-BD")}
                    </span>
                  </div>

                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="group hover:text-vl-dark-900 inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-600 transition-colors active:scale-95"
                  >
                    <span>Details</span>
                    <ArrowRight className="group-hover:text-vl-dark-900 size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
