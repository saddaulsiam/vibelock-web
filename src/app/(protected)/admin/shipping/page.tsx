import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { getAdminShippingOverview } from "@/lib/admin/shipping-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function ShipmentTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { shipments, totalPages } = await getAdminShippingOverview(page);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/shipping/zones" className="border px-4 py-2 text-sm font-medium">
          Manage zones
        </Link>
        <Link href="/admin/shipping/methods" className="border px-4 py-2 text-sm font-medium">
          Manage methods
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium">Provider / tracking</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-10 text-center">
                  No shipments found.
                </td>
              </tr>
            ) : (
              shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td className="p-3 font-medium">
                    <Link
                      href={`/admin/orders/${shipment.order.id}`}
                      className="text-primary hover:underline"
                    >
                      {shipment.order.orderNumber}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div>{shipment.order.customerName || "Guest"}</div>
                    <div className="text-muted-foreground text-xs">
                      {shipment.order.customerEmail}
                    </div>
                  </td>
                  <td className="p-3">{shipment.order.shippingMethodName}</td>
                  <td className="p-3">
                    <div>{shipment.provider}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {shipment.trackingNumber ||
                        shipment.providerShipmentId ||
                        "Pending provider reference"}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        shipment.status === "FAILED" || shipment.status === "CANCELLED"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {shipment.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {new Date(shipment.createdAt).toLocaleDateString("en-BD")}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/shipping/shipments/${shipment.id}`}
                      className="text-primary font-medium hover:underline"
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
        <nav aria-label="Shipment pages" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/shipping?page=${page - 1}`}
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
              href={`/admin/shipping?page=${page + 1}`}
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

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipping</h1>
        <p className="text-muted-foreground">
          Manage shipping configuration and existing shipments.
        </p>
      </div>
      <Suspense fallback={<div className="p-12 text-center">Loading shipments...</div>}>
        <ShipmentTable searchParams={await searchParams} />
      </Suspense>
    </div>
  );
}
