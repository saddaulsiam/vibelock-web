import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminReturnById } from "@/lib/admin/return-queries";
import { initiateReturnRefundAction, processReturnRefundAction, updateReturnStatusAction } from "@/lib/admin/return-actions";
import { ProcessRefundForm, RefundForm, ReturnStatusForm } from "@/components/admin/return-action-forms";

const nextStatuses: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["COMPLETED"],
};

function currency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}

function date(value: Date) {
  return new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getAdminReturnById(id);
  if (!request) notFound();

  const refunds = request.order.payments.flatMap((payment) =>
    payment.refunds.map((refund) => ({ ...refund, gateway: payment.gateway, paymentStatus: payment.status }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">Return request</h1><p className="text-muted-foreground">Order {request.order.orderNumber} · {date(request.createdAt)}</p></div>
        <Badge variant={request.status === "REJECTED" ? "destructive" : "outline"} className="w-fit px-3 py-1 text-base">{request.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Return items</CardTitle><CardDescription>Requested refund estimate: {currency(request.requestedAmount)}</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr className="text-left"><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Qty</th><th className="p-3">Unit price</th><th className="p-3">Subtotal</th></tr></thead>
                <tbody className="divide-y">{request.items.map((item) => <tr key={item.id}><td className="p-3">{item.orderItem.productName}</td><td className="p-3 font-mono text-xs">{item.orderItem.sku}</td><td className="p-3">{item.quantity}</td><td className="p-3">{currency(item.orderItem.unitPrice)}</td><td className="p-3">{currency(Number(item.orderItem.unitPrice) * item.quantity)}</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Refund history</CardTitle><CardDescription>Refunds are shown from the order payment records.</CardDescription></CardHeader><CardContent className="space-y-4">
            {refunds.length === 0 ? <p className="text-sm text-muted-foreground">No refund has been created.</p> : refunds.map((refund) => <div key={refund.id} className="flex flex-col gap-2 border-b pb-3 last:border-0"><div className="flex justify-between gap-3"><span className="font-medium">{currency(refund.amount)} · {refund.status}</span><span className="text-xs text-muted-foreground">{date(refund.createdAt)}</span></div><p className="text-sm text-muted-foreground">{refund.reason || "No reason provided."} · {refund.gateway}</p>{refund.status === "PENDING" && <ProcessRefundForm returnId={request.id} refundId={refund.id} action={processReturnRefundAction} />}</div>)}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Audit and order history</CardTitle></CardHeader><CardContent className="space-y-4">
            {request.auditLogs.map((entry) => <div key={entry.id} className="border-l-2 border-muted pl-4 text-sm"><p className="font-medium">{entry.action}</p><p className="text-muted-foreground">{date(entry.createdAt)} · {entry.actor?.name || entry.actor?.email || "Administrator"}</p></div>)}
            {request.order.history.map((entry) => <div key={entry.id} className="border-l-2 border-muted pl-4 text-sm"><p className="font-medium">Order {entry.status}</p><p className="text-muted-foreground">{entry.notes || "No notes provided."} · {date(entry.createdAt)}</p></div>)}
            {request.auditLogs.length === 0 && request.order.history.length === 0 && <p className="text-sm text-muted-foreground">No history available.</p>}
          </CardContent></Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Customer</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Name:</strong> {request.order.customerName || "Guest"}</p><p><strong>Email:</strong> {request.order.customerEmail}</p><p><strong>Phone:</strong> {request.order.customerPhone || "N/A"}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Request details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Reason:</strong> {request.reason || "Not provided"}</p><p><strong>Status:</strong> {request.status}</p><p><strong>Requested:</strong> {date(request.createdAt)}</p><p><strong>Order status:</strong> {request.order.status}</p><p><strong>Order date:</strong> {date(request.order.createdAt)}</p></CardContent></Card>
          {nextStatuses[request.status] && <Card><CardHeader><CardTitle>Manage return</CardTitle><CardDescription>Transitions are validated on the server.</CardDescription></CardHeader><CardContent><ReturnStatusForm id={request.id} statuses={nextStatuses[request.status]} action={updateReturnStatusAction} /></CardContent></Card>}
          {(request.status === "RECEIVED" || request.status === "COMPLETED") && <Card><CardHeader><CardTitle>Create refund</CardTitle><CardDescription>Maximum requested amount: {currency(request.requestedAmount)}</CardDescription></CardHeader><CardContent><RefundForm returnId={request.id} action={initiateReturnRefundAction} /></CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
