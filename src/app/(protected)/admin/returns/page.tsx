import { Suspense } from "react";
import Link from "next/link";
import { ReturnRequestStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAdminReturns } from "@/lib/admin/return-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function ReturnsTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const rawStatus = valueOf(searchParams.status);
  const status = Object.values(ReturnRequestStatus).includes(rawStatus as ReturnRequestStatus)
    ? (rawStatus as ReturnRequestStatus)
    : undefined;
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { returns, totalPages } = await getAdminReturns({ search, status, page });

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input name="q" placeholder="Search order, customer, email..." defaultValue={search} className="max-w-sm" />
        <select name="status" defaultValue={status ?? ""} className="flex h-9 w-[180px] rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">All statuses</option>
          {Object.values(ReturnRequestStatus).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="submit" className="inline-flex h-9 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-medium">Order #</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Requested</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Refund estimate</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {returns.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No return requests found.</td></tr>
            ) : returns.map((request) => (
              <tr key={request.id} className="hover:bg-muted/30">
                <td className="p-3 font-medium">{request.order.orderNumber}</td>
                <td className="p-3"><div>{request.order.customerName || "Guest"}</div><div className="text-xs text-muted-foreground">{request.order.customerEmail}</div></td>
                <td className="p-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                <td className="p-3"><Badge variant={request.status === "REJECTED" ? "destructive" : "outline"}>{request.status}</Badge></td>
                <td className="p-3">৳{request.requestedAmount.toFixed(2)}</td>
                <td className="p-3 text-right"><Link href={`/admin/returns/${request.id}`} className="font-medium text-primary hover:underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1 && <Link href={`?q=${encodeURIComponent(search ?? "")}&status=${status ?? ""}&page=${page - 1}`} className="inline-flex size-10 items-center justify-center rounded-sm border">←</Link>}
          <span className="text-sm font-medium">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`?q=${encodeURIComponent(search ?? "")}&status=${status ?? ""}&page=${page + 1}`} className="inline-flex size-10 items-center justify-center rounded-sm border">→</Link>}
        </div>
      )}
    </div>
  );
}

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Returns &amp; Refunds</h1><p className="text-muted-foreground">Review customer return requests and payment refunds.</p></div>
      <Suspense fallback={<div className="p-12 text-center">Loading returns...</div>}>
        <ReturnsTable searchParams={await searchParams} />
      </Suspense>
    </div>
  );
}
