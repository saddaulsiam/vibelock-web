import { Suspense } from "react";
import { getAdminOrders } from "@/lib/admin/order-queries";
import { OrderStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

async function OrdersTable({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const status = (searchParams.status as OrderStatus) || undefined;
  const search = (searchParams.q as string) || undefined;
  const page = Number(searchParams.page) || 1;

  const { orders, totalPages } = await getAdminOrders({
    status,
    search,
    page,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Input
            name="q"
            placeholder="Search order #, email, name..."
            defaultValue={search}
            className="max-w-sm"
          />
          <Select defaultValue={status}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">Order #</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Payment</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{order.orderNumber}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{order.customerName || "Guest"}</span>
                      <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={order.status === "CANCELLED" ? "destructive" : "outline"}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {order.paymentStatus}
                    </Badge>
                  </td>
                  <td className="p-3">${Number(order.total).toFixed(2)}</td>
                  <td className="p-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border border-border hover:bg-muted transition-colors"
            >
              ←
            </Link>
          )}
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border border-border hover:bg-muted transition-colors"
            >
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
      </div>
      <Suspense fallback={<div className="flex justify-center p-12">Loading orders...</div>}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
