import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCustomerById } from "@/lib/admin/customer-queries";

function currency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}

function date(value: Date) {
  return new Date(value).toLocaleDateString("en-BD", {
    dateStyle: "medium",
  });
}

export default async function AdminCustomerDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number(query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getAdminCustomerById(id, page);

  if (!result) notFound();

  const { customer, orders, summary, totalOrderPages } = result;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-primary text-sm font-medium hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {customer.name || "Unnamed customer"}
        </h1>
        <p className="text-muted-foreground">{customer.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Email:</strong> {customer.email}
            </p>
            <p>
              <strong>Phone:</strong> {customer.phone || "N/A"}
            </p>
            <p>
              <strong>Joined:</strong> {date(customer.createdAt)}
            </p>
            <p>
              <strong>Status:</strong> <Badge variant="outline">Customer</Badge>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer summary</CardTitle>
            <CardDescription>
              Calculated from authoritative order and payment records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
            <div>
              <p className="text-muted-foreground">Orders</p>
              <p className="mt-1 text-xl font-semibold">{summary.totalOrders}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="mt-1 text-xl font-semibold">{summary.paidOrders}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Spent</p>
              <p className="mt-1 text-xl font-semibold">{currency(summary.totalSpent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cancelled</p>
              <p className="mt-1 text-xl font-semibold">{summary.cancelledOrders}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Returned/refunded</p>
              <p className="mt-1 text-xl font-semibold">{summary.returnedOrRefundedOrders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.addresses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No saved addresses.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customer.addresses.map((address) => (
                <div key={address.id} className="border p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    {address.label || "Address"}
                    {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </div>
                  <p>{address.street}</p>
                  <p>
                    {address.city}
                    {address.state ? `, ${address.state}` : ""}
                  </p>
                  <p>
                    {address.zip || ""}
                    {address.zip ? ", " : ""}
                    {address.country}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">This customer has no orders.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Order</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Payment</th>
                    <th className="p-3 font-medium">Total</th>
                    <th className="p-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="p-3 font-medium">{order.orderNumber}</td>
                      <td className="p-3">{date(order.createdAt)}</td>
                      <td className="p-3">
                        <Badge variant={order.status === "CANCELLED" ? "destructive" : "outline"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{order.paymentStatus}</Badge>
                      </td>
                      <td className="p-3">{currency(order.total)}</td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalOrderPages > 1 ? (
        <nav aria-label="Customer order pages" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/customers/${customer.id}?page=${page - 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              ←
            </Link>
          ) : null}
          <span className="text-sm font-medium">
            Page {page} of {totalOrderPages}
          </span>
          {page < totalOrderPages ? (
            <Link
              href={`/admin/customers/${customer.id}?page=${page + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
