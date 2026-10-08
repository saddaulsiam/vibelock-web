import { notFound } from "next/navigation";
import { getAdminOrderById } from "@/lib/admin/order-queries";
import { updateOrderStatusAction, updateOrderPaymentStatusAction } from "@/lib/admin/order-actions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatus, PaymentStatus } from "@prisma/client";

async function OrderStatusForm({ orderId, currentStatus }: { orderId: string, currentStatus: OrderStatus }) {
  return (
    <form action={async (formData) => {
      await updateOrderStatusAction({} as any, formData);
    }} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />
      <div className="space-y-2">
        <Label htmlFor="status">Order Status</Label>
        <select
          name="status"
          defaultValue={currentStatus}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {Object.values(OrderStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Change Notes</Label>
        <Textarea name="notes" placeholder="Reason for status change..." />
      </div>
      <Button type="submit">Update Status</Button>
    </form>
  );
}

async function OrderPaymentForm({ orderId, currentPaymentStatus }: { orderId: string, currentPaymentStatus: PaymentStatus }) {
  return (
    <form action={async (formData) => {
      await updateOrderPaymentStatusAction({} as any, formData);
    }} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />
      <div className="space-y-2">
        <Label htmlFor="paymentStatus">Payment Status</Label>
        <select
          name="paymentStatus"
          defaultValue={currentPaymentStatus}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {Object.values(PaymentStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Payment Notes</Label>
        <Textarea name="notes" placeholder="Payment reference or notes..." />
      </div>
      <Button type="submit">Update Payment</Button>
    </form>
  );
}

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-muted-foreground">Order ID: {order.id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {order.status}
          </Badge>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Items included in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-xs font-mono">{item.sku}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${Number(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>${Number(item.lineTotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Method:</strong> {order.shippingMethodName}</p>
                <p><strong>Street:</strong> {order.shippingStreet}</p>
                <p><strong>City:</strong> {order.shippingCity}</p>
                <p><strong>State:</strong> {order.shippingState || "N/A"}</p>
                <p><strong>Zip:</strong> {order.shippingZip || "N/A"}</p>
                <p><strong>Country:</strong> {order.shippingCountry}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Financials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Subtotal:</span> <span>${Number(order.subtotal).toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Tax:</span> <span>${Number(order.taxAmount).toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Shipping:</span> <span>${Number(order.shippingCost).toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Discount:</span> <span>-${Number(order.discount).toFixed(2)}</span></p>
                <Separator className="my-2" />
                <p className="flex justify-between font-bold text-base"><span>Total:</span> <span>${Number(order.total).toFixed(2)}</span></p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Audit trail of status changes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.history.length === 0 ? (
                <p className="text-muted-foreground text-sm">No history available.</p>
              ) : (
                order.history.map((entry) => (
                  <div key={entry.id} className="flex gap-4 text-sm border-l-2 border-muted pl-4 py-1">
                    <div className="flex-1">
                      <p className="font-medium">{entry.status}</p>
                      <p className="text-muted-foreground">{entry.notes || "No notes provided."}</p>
                    </div>
                    <div className="text-muted-foreground text-right">
                      {format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm")}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Order</CardTitle>
              <CardDescription>Update status and payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <OrderStatusForm orderId={order.id} currentStatus={order.status} />
              <Separator />
              <OrderPaymentForm orderId={order.id} currentPaymentStatus={order.paymentStatus} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Name:</strong> {order.customerName || "Guest"}</p>
              <p><strong>Email:</strong> {order.customerEmail}</p>
              <p><strong>Phone:</strong> {order.customerPhone || "N/A"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
