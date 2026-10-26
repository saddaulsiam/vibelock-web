import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
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
import { OrderPrintButton } from "@/components/admin/order-print-button";
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "@/components/admin/admin-orders-table";

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Printable Invoice Header (Visible only when printed) */}
      <div className="hidden border-b-2 border-black pb-4 print:block">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">VIBELOCK APPAREL</h1>
            <p className="text-xs text-neutral-600">Official Packing Slip &amp; Order Invoice</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
            <p className="text-xs">{formatDate(new Date(order.createdAt))}</p>
          </div>
        </div>
      </div>

      {/* Screen Navigation & Action Header */}
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="text-muted-foreground hover:text-foreground text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              &larr; Back to Orders
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
              Order {order.orderNumber}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#F3F0E8] px-2 py-0.5 text-xs font-semibold text-[#101114]">
              {order.salesChannel}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Placed on {formatDate(new Date(order.createdAt))} &middot; Internal ID: {order.id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-sm bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-800">
              {order.paymentMethod === "COD" ? (
                <>
                  <Banknote className="size-3.5 text-emerald-700" /> COD
                </>
              ) : (
                <>
                  <CreditCard className="size-3.5 text-blue-700" /> ONLINE
                </>
              )}
            </span>
            {getPaymentStatusBadge(order.paymentStatus)}
            {getOrderStatusBadge(order.status)}
          </div>
          <OrderPrintButton />
        </div>
      </header>

      {/* Main Order Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Items & Shipping & History) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items Table */}
          <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
            <CardHeader className="border-b border-[#101114]/10 p-4 sm:p-5">
              <CardTitle className="text-base text-[#101114]">Order Items</CardTitle>
              <CardDescription>
                {order.items.length} {order.items.length === 1 ? "line item" : "line items"} in
                this order
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50">
                    <tr className="text-left text-xs font-semibold tracking-wider text-[#101114]/80 uppercase">
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101114]/5">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50">
                        <td className="p-3">
                          <div className="font-medium text-[#101114]">{item.productName}</div>
                          {(item.size || item.color) && (
                            <div className="text-muted-foreground text-xs">
                              {[item.size, item.color].filter(Boolean).join(" / ")}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs text-neutral-600">{item.sku}</td>
                        <td className="p-3 text-center font-semibold">{item.quantity}</td>
                        <td className="p-3 text-right">{formatBdt(item.unitPrice)}</td>
                        <td className="p-3 text-right font-semibold text-[#101114]">
                          {formatBdt(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Customer Details Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Delivery Address */}
            <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-[#101114] uppercase tracking-wider">
                  Delivery Destination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-4 sm:p-5 pt-0 text-sm">
                <p className="font-semibold text-[#101114]">{order.customerName || "Guest"}</p>
                <p className="text-neutral-700">{order.shippingStreet}</p>
                <p className="text-neutral-700">
                  {order.shippingCity}
                  {order.shippingState ? `, ${order.shippingState}` : ""}
                  {order.shippingZip ? ` - ${order.shippingZip}` : ""}
                </p>
                <p className="text-neutral-700">{order.shippingCountry}</p>
                <div className="pt-2 text-xs text-neutral-500">
                  <strong>Courier Method:</strong> {order.shippingMethodName}
                </div>
              </CardContent>
            </Card>

            {/* Customer Contact */}
            <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-semibold text-[#101114] uppercase tracking-wider">
                  Customer Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:p-5 pt-0 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Email Address</span>
                  <span className="font-medium text-[#101114]">{order.customerEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Phone Number</span>
                  <span className="font-medium text-[#101114]">
                    {order.customerPhone || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Account Status</span>
                  <span className="text-xs text-neutral-600">
                    {order.userId ? "Registered Account" : "Guest Checkout"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit History Timeline (Hidden when printing) */}
          <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none print:hidden">
            <CardHeader className="border-b border-[#101114]/10 p-4 sm:p-5">
              <CardTitle className="text-base text-[#101114]">Order Audit History</CardTitle>
              <CardDescription>Chronological log of status transitions and changes</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {order.history.length === 0 ? (
                <p className="text-muted-foreground text-xs">No audit history recorded.</p>
              ) : (
                <div className="space-y-4">
                  {order.history.map((entry) => {
                    const isPayment = entry.notes?.startsWith("[PAYMENT UPDATE]");
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between border-l-2 border-[#101114]/20 pl-4 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#101114]">
                            {isPayment ? "Payment Updated" : `Status: ${entry.status}`}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {entry.notes || "No notes attached."}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatDate(new Date(entry.createdAt))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Financials & Order Management) */}
        <div className="space-y-6">
          {/* Financial Breakdown Card */}
          <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
            <CardHeader className="border-b border-[#101114]/10 p-4 sm:p-5">
              <CardTitle className="text-base text-[#101114]">Order Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Subtotal:</span>
                <span className="font-medium text-[#101114]">{formatBdt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charge:</span>
                <span className="font-medium text-[#101114]">{formatBdt(order.shippingCost)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount:</span>
                  <span>&minus;{formatBdt(order.discount)}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({Number(order.taxRate)}%):</span>
                  <span className="font-medium text-[#101114]">{formatBdt(order.taxAmount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-bold text-[#101114]">
                <span>Total Payable:</span>
                <span>{formatBdt(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Management */}
          <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
            <CardHeader className="border-b border-[#101114]/10 p-4 sm:p-5">
              <CardTitle className="text-base text-[#101114]">Shipment Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 text-sm">
              {order.shipment ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-semibold text-[#101114]">{order.shipment.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipment Status:</span>
                    <Badge variant="outline" className="font-semibold">
                      {order.shipment.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consignment / Tracking:</span>
                    <span className="font-mono text-xs font-bold text-[#101114]">
                      {order.shipment.trackingNumber || "Pending Assignment"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs">
                    No courier shipment has been dispatched for this order.
                  </p>
                  <CreateShipmentForm orderId={order.id} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manage Status & Payment (Hidden when printing) */}
          <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none print:hidden">
            <CardHeader className="border-b border-[#101114]/10 p-4 sm:p-5">
              <CardTitle className="text-base text-[#101114]">Update Order Status</CardTitle>
              <CardDescription>Transition order or adjust payment record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-5">
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
