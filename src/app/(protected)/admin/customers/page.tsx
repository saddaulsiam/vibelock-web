import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAdminCustomers } from "@/lib/admin/customer-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}

async function CustomersTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { customers, total, totalPages } = await getAdminCustomers({ search, page });

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          name="q"
          placeholder="Search name, email, or phone..."
          defaultValue={search}
          className="max-w-md"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "customer" : "customers"}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Orders</th>
              <th className="p-3 font-medium">Paid value</th>
              <th className="p-3 font-medium">Latest order</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{customer.name || "Unnamed customer"}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </td>
                  <td className="p-3">{customer.phone || "N/A"}</td>
                  <td className="p-3">{customer.orderCount}</td>
                  <td className="p-3">{currency(customer.paidOrderValue)}</td>
                  <td className="p-3">
                    {customer.latestOrderDate
                      ? new Date(customer.latestOrderDate).toLocaleDateString("en-BD")
                      : "No orders"}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">Customer</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="font-medium text-primary hover:underline"
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

      {totalPages > 1 ? (
        <nav aria-label="Customer pages" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/customers?q=${encodeURIComponent(search ?? "")}&page=${page - 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              ←
            </Link>
          ) : null}
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/customers?q=${encodeURIComponent(search ?? "")}&page=${page + 1}`}
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

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">View customer accounts and order history.</p>
      </div>
      <Suspense fallback={<div className="p-12 text-center">Loading customers...</div>}>
        <CustomersTable searchParams={await searchParams} />
      </Suspense>
    </div>
  );
}
