import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CreateShipmentForm,
  OrderPaymentForm,
  OrderStatusForm,
} from "@/components/admin/order-action-forms";
import { getAdminOrderById } from "@/lib/admin/order-queries";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { notFound } from "next/navigation";

function formatCurrency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order {order.orderNumber}</h1>

          <p className="text-muted-foreground">Order ID: {order.id}</p>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 text-lg">
            {order.status}
          </Badge>

          <Badge variant="secondary" className="px-3 py-1 text-lg">
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>Items included in this order</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Product</th>
                      <th className="p-3 font-medium">SKU</th>
                      <th className="p-3 font-medium">Qty</th>
                      <th className="p-3 font-medium">Price</th>
                      <th className="p-3 font-medium">Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3">{item.productName}</td>

                        <td className="p-3 font-mono text-xs">{item.sku}</td>

                        <td className="p-3">{item.quantity}</td>

                        <td className="p-3">{formatCurrency(item.unitPrice)}</td>

                        <td className="p-3">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Method:</strong> {order.shippingMethodName}
                </p>

                <p>
                  <strong>Street:</strong> {order.shippingStreet}
                </p>

                <p>
                  <strong>City:</strong> {order.shippingCity}
                </p>

                <p>
                  <strong>State:</strong> {order.shippingState || "N/A"}
                </p>

                <p>
                  <strong>Zip:</strong> {order.shippingZip || "N/A"}
                </p>

                <p>
                  <strong>Country:</strong> {order.shippingCountry}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Name:</strong> {order.customerName || "Guest"}
                </p>

                <p>
                  <strong>Email:</strong> {order.customerEmail}
                </p>

                <p>
                  <strong>Phone:</strong> {order.customerPhone || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Financials</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </p>

                <p className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </p>

                <p className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(order.shippingCost)}</span>
                </p>

                <p className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </p>

                <Separator className="my-2" />

                <p className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipment</CardTitle>
                <CardDescription>
                  {order.shipment
                    ? "Shipment already exists for this order."
                    : "No shipment has been created yet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.shipment ? (
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Status:</strong> {order.shipment.status}
                    </p>
                    <p>
                      <strong>Provider:</strong> {order.shipment.provider}
                    </p>
                    <p>
                      <strong>Tracking:</strong> {order.shipment.trackingNumber || "Not assigned"}
                    </p>
                  </div>
                ) : (
                  <CreateShipmentForm orderId={order.id} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Audit trail of order and payment changes</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {order.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history available.</p>
              ) : (
                order.history.map((entry) => {
                  const isPaymentUpdate = entry.notes?.startsWith("[PAYMENT UPDATE]") ?? false;

                  return (
                    <div
                      key={entry.id}
                      className="flex gap-4 border-l-2 border-muted py-1 pl-4 text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {isPaymentUpdate ? "Payment Update" : entry.status}
                        </p>

                        <p className="text-muted-foreground">
                          {entry.notes || "No notes provided."}
                        </p>
                      </div>

                      <div className="text-right text-muted-foreground">
                        {formatDate(new Date(entry.createdAt))}
                      </div>
                    </div>
                  );
                })
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
              <OrderStatusForm
                orderId={order.id}
                currentStatus={order.status}
                statuses={Object.values(OrderStatus)}
              />

              <Separator />

              <OrderPaymentForm
                orderId={order.id}
                currentPaymentStatus={order.paymentStatus}
                statuses={Object.values(PaymentStatus)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
