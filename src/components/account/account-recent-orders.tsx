import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PackageOpen, ArrowUpRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

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
    <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
        <h3 className="text-base font-bold text-[#101114] sm:text-lg">Recent Orders</h3>
        <Link
          href="/account/orders"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-[#0099b8] transition-colors hover:text-[#00c2e5]"
        >
          <span>View All Orders</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F0E8] text-muted-foreground">
            <PackageOpen className="size-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-[#101114]">No orders yet</h4>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Once you place your first order, its tracking and delivery updates will appear here.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#101114] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1a1c22]"
          >
            <span>Explore Streetwear</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <>
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
                  <tr key={order.orderNumber} className="hover:bg-[#F3F0E8]/40 transition-colors">
                    {/* Order Number */}
                    <td className="py-4 pr-4 font-bold text-[#101114]">
                      <Link
                        href={`/account/orders/${order.orderNumber}`}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D9FF]"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Items Thumbnail + Count */}
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

                    {/* Total Price */}
                    <td className="py-4 px-4 font-bold text-[#101114] whitespace-nowrap">
                      ৳ {order.total.toLocaleString("en-BD")}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} />
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
              <div key={order.orderNumber} className="py-4 first:pt-4 last:pb-0">
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

                <div className="mt-3 flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-[#101114]">
                    ৳ {order.total.toLocaleString("en-BD")}
                  </span>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#101114]/15 bg-white px-2.5 py-1 text-xs font-semibold text-[#101114]"
                  >
                    <span>View Details</span>
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
