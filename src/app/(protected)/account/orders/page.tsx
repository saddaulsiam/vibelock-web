import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { getCustomerOrders } from "@/lib/orders/queries";
import { OrdersInfiniteList } from "@/components/account/orders/orders-infinite-list";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "My Orders | VibeLock",
  description: "View your VibeLock order history and track shipments.",
  robots: { index: false, follow: false },
};

const pageSize = 10;

export default async function OrdersPage() {
  const { orders, total } = await getCustomerOrders(1, pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Orders Container */}
      <div className="border-vl-dark-900/8 rounded-xl border bg-white p-4 sm:p-6">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b pb-4 sm:pb-5">
          <div>
            <p className="text-vl-cyan sm:tracking-streetwear text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px]">
              My Account
            </p>
            <h1 className="text-vl-dark-900 text-base font-bold tracking-tight uppercase sm:text-lg">
              Order History
            </h1>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
              Track fulfillment progress, payment details, and courier shipments
            </p>
          </div>
          <Badge variant={"info"} size={"default"}>
            {total} {total === 1 ? "Order" : "Orders"}
          </Badge>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400">
              <PackageOpen className="size-6" />
            </div>
            <h2 className="text-vl-dark-900 mt-4 text-sm font-semibold">No orders found</h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
              You haven&apos;t placed any orders yet. Once you make a purchase, it will appear here.
            </p>
            <Link
              href="/shop"
              className="bg-vl-dark-900 mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              <span>Explore Collection</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : (
          <OrdersInfiniteList
            key={total}
            initialOrders={orders}
            total={total}
            pageSize={pageSize}
          />
        )}
      </div>
    </div>
  );
}
