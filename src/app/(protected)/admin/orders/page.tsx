import { Suspense } from "react";
import { getAdminOrders } from "@/lib/admin/order-queries";
import { OrderTable } from "./order-table";
import { OrderFilters } from "./order-filters";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const filters = {
    status: params.status as any,
    paymentStatus: params.paymentStatus as any,
    search: params.search,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <div className="flex items-center gap-2">
          <OrderFilters />
        </div>
      </div>

      <Suspense key={`${page}-${filters.status}-${filters.paymentStatus}-${filters.search}`} fallback={<OrderTableSkeleton />}>
        <OrderTable page={page} filters={filters} />
      </Suspense>
    </div>
  );
}

function OrderTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
