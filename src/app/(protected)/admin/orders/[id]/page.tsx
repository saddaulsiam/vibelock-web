import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
  User,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreateShipmentForm,
  RefreshShipmentStatusButton,
} from "@/components/admin/order-action-forms";
import { OrderPrintButton } from "@/components/admin/order-print-button";
import { getAdminOrderById } from "@/lib/admin/order-queries";
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
  getSalesChannelBadge,
  generateWhatsAppUrl,
} from "@/components/admin/admin-order-badges";
import { OrderLifecycleStepper } from "@/components/admin/order-lifecycle-stepper";
import { OrderPickPackChecklist } from "@/components/admin/order-pick-pack-checklist";
import { OrderSmartActions } from "@/components/admin/order-smart-actions";

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

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Printable Invoice Header (Hidden on screen, visible only when printing) ── */}
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

      {/* ── Screen Header & Status Action Bar ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Orders</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
                Order #{order.orderNumber}
              </h1>
              {getSalesChannelBadge(order.salesChannel)}
            </div>

            <p className="mt-1.5 text-xs text-neutral-500">
              Placed on {formatDate(new Date(order.createdAt))} &middot; Internal ID:{" "}
              <span className="font-mono text-neutral-600">{order.id}</span>
            </p>
          </div>

          {/* Status Badges & Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-800">
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

            <div className="h-4 w-px bg-neutral-200 hidden sm:block" />

            {/* Direct WhatsApp Customer Contact Button */}
            {order.customerPhone ? (
              <a
                href={generateWhatsAppUrl(
                  order.customerPhone,
                  order.orderNumber,
                  order.customerName
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                title="Open WhatsApp chat with customer"
              >
                <MessageSquare className="size-3.5 text-emerald-600" />
                <span className="hidden md:inline">WhatsApp</span>
              </a>
            ) : null}

            {/* Print Invoice Button */}
            <OrderPrintButton />
          </div>
        </div>

        {/* Quick KPI Overview Strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-4">
          <div className="rounded-lg bg-neutral-50/80 p-2.5">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Total Payable
            </span>
            <p className="mt-0.5 text-lg font-black text-neutral-900">{formatBdt(order.total)}</p>
          </div>

          <div className="rounded-lg bg-neutral-50/80 p-2.5">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Items Ordered
            </span>
            <p className="mt-0.5 text-lg font-black text-neutral-900">
              {totalQuantity} <span className="text-xs font-medium text-neutral-500">({order.items.length} lines)</span>
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50/80 p-2.5">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Payment Gateway
            </span>
            <p className="mt-0.5 text-sm font-bold text-neutral-900">
              {order.payments[0]?.gateway || (order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Gateway")}
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50/80 p-2.5">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
              Courier Dispatch
            </span>
            <p className="mt-0.5 text-sm font-bold text-neutral-900">
              {order.shipment ? (
                <span className="text-emerald-700">{order.shipment.provider} ({order.shipment.status})</span>
              ) : (
                <span className="text-amber-700">Not Dispatched</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Visual Order Fulfillment Lifecycle Stepper (Placed -> Confirmed -> Packing -> Shipped -> Delivered) ── */}
      <div className="print:hidden">
        <OrderLifecycleStepper
          currentStatus={order.status}
          createdAt={order.createdAt}
          orderHistory={order.history}
          shipmentDate={order.shipment?.shippedAt}
        />
      </div>

      {/* ── Main Order Grid Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Items & Packing Audit, Delivery Destination, Customer, Audit Trail) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Interactive Pick & Pack Order Items Verification */}
          <OrderPickPackChecklist orderId={order.id} items={order.items} />

          {/* Delivery & Customer Profile Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Delivery Destination */}
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MapPin className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                    Delivery Destination
                  </h3>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Recipient Name
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-neutral-900">
                    {order.customerName || "Guest Customer"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Street Address
                  </span>
                  <p className="mt-0.5 text-neutral-700 leading-relaxed">
                    {order.shippingStreet}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    City &amp; Region
                  </span>
                  <p className="mt-0.5 text-neutral-700">
                    {order.shippingCity}
                    {order.shippingState ? `, ${order.shippingState}` : ""}
                    {order.shippingZip ? ` - ${order.shippingZip}` : ""}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Country
                  </span>
                  <p className="mt-0.5 text-neutral-700">{order.shippingCountry}</p>
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Truck className="size-3.5 text-neutral-500" />
                    <span><strong>Method:</strong> {order.shippingMethodName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Contact & Profile */}
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <User className="size-4" />
                  </div>
                  <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                    Customer Contact
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-medium">
                  {order.userId ? (
                    <span className="text-emerald-700 font-semibold">Registered User</span>
                  ) : (
                    <span className="text-neutral-500">Guest Checkout</span>
                  )}
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Email Address
                  </span>
                  <div className="mt-0.5 flex items-center gap-2 font-medium text-neutral-900">
                    <Mail className="size-3.5 text-neutral-400" />
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {order.customerEmail}
                    </a>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Phone Number
                  </span>
                  <div className="mt-0.5 flex items-center gap-2 font-medium text-neutral-900">
                    <Phone className="size-3.5 text-neutral-400" />
                    {order.customerPhone ? (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {order.customerPhone}
                      </a>
                    ) : (
                      <span className="text-neutral-400">Not provided</span>
                    )}
                  </div>
                </div>

                {order.customerPhone ? (
                  <div className="pt-2 border-t border-neutral-100">
                    <a
                      href={generateWhatsAppUrl(
                        order.customerPhone,
                        order.orderNumber,
                        order.customerName
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <MessageSquare className="size-3.5 text-emerald-600" />
                      <span>Message on WhatsApp</span>
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Return Requests (if any) */}
          {order.returns && order.returns.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-4 text-amber-700" />
                  <h3 className="text-sm font-bold text-amber-950">
                    Return Request ({order.returns.length})
                  </h3>
                </div>
                <Link
                  href="/admin/returns"
                  className="text-xs font-semibold text-amber-800 hover:underline"
                >
                  Manage Returns &rarr;
                </Link>
              </div>

              <div className="mt-3 space-y-3">
                {order.returns.map((ret) => (
                  <div
                    key={ret.id}
                    className="rounded-lg border border-amber-200 bg-white p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900">
                        Status: <span className="text-amber-800">{ret.status}</span>
                      </span>
                      <span className="text-neutral-500">
                        {formatDate(new Date(ret.createdAt))}
                      </span>
                    </div>
                    {ret.reason ? (
                      <p className="mt-1 text-neutral-700">Reason: {ret.reason}</p>
                    ) : null}
                    <div className="mt-2 text-[11px] text-neutral-600">
                      {ret.items.length} item(s) flagged for return inspection
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Audit History Timeline */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs print:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Order Audit History</h3>
                <p className="text-xs text-neutral-500">
                  Chronological record of status transitions and updates
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                {order.history.length} {order.history.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {order.history.length === 0 ? (
              <p className="text-xs text-neutral-400">No audit history recorded yet.</p>
            ) : (
              <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-neutral-200">
                {order.history.map((entry) => {
                  const isPayment = entry.notes?.startsWith("[PAYMENT UPDATE]");
                  return (
                    <div key={entry.id} className="relative flex items-start gap-3.5 pl-1 text-xs">
                      <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-2xs">
                        {isPayment ? (
                          <CreditCard className="size-3 text-blue-600" />
                        ) : (
                          <Clock className="size-3 text-neutral-600" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 rounded-lg border border-neutral-100 bg-neutral-50/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-neutral-900">
                            {isPayment ? "Payment Status Updated" : `Fulfillment Status: ${entry.status}`}
                          </p>
                          <span className="text-[11px] font-medium text-neutral-500">
                            {formatDate(new Date(entry.createdAt))}
                          </span>
                        </div>
                        <p className="mt-1 text-neutral-600 leading-relaxed">
                          {entry.notes || "No details provided."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Order Management, Financials, Shipment Dispatch) */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          {/* Shopify-Grade 1-Click Smart Action Hub (Sticky Top) */}
          <div className="print:hidden">
            <OrderSmartActions
              order={{
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                total: Number(order.total),
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                shippingStreet: order.shippingStreet,
                shippingCity: order.shippingCity,
                shippingState: order.shippingState,
                shippingZip: order.shippingZip,
                itemCount: totalQuantity,
                shipment: order.shipment,
              }}
            />
          </div>

          {/* Order Financials Breakdown Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                Order Financials
              </h3>
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-neutral-900">{formatBdt(order.subtotal)}</span>
              </div>

              <div className="flex justify-between text-neutral-600">
                <span>Delivery Charge</span>
                <span className="font-semibold text-neutral-900">{formatBdt(order.shippingCost)}</span>
              </div>

              {Number(order.discount) > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount</span>
                  <span className="font-bold">&minus;{formatBdt(order.discount)}</span>
                </div>
              ) : null}

              {Number(order.taxAmount) > 0 ? (
                <div className="flex justify-between text-neutral-600">
                  <span>Tax ({Number(order.taxRate)}%)</span>
                  <span className="font-semibold text-neutral-900">{formatBdt(order.taxAmount)}</span>
                </div>
              ) : null}

              <Separator className="my-2" />

              <div className="flex justify-between items-baseline text-sm font-black text-neutral-900">
                <span>Total Payable</span>
                <span className="text-lg text-neutral-900">{formatBdt(order.total)}</span>
              </div>
            </div>

            {/* Payment Transactions Details (if recorded) */}
            {order.payments && order.payments.length > 0 ? (
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Gateway Transaction
                </span>
                <div className="mt-1 space-y-1.5 rounded-lg bg-neutral-50 p-2.5 text-[11px]">
                  {order.payments.map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between font-semibold text-neutral-800">
                        <span>{p.gateway}</span>
                        <span className={p.status === "SUCCESS" ? "text-emerald-700" : "text-amber-700"}>
                          {p.status}
                        </span>
                      </div>
                      {p.gatewayTransactionId ? (
                        <p className="font-mono text-[10px] text-neutral-500 truncate">
                          TrxID: {p.gatewayTransactionId}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Shipment Dispatch Status Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
            <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Truck className="size-4" />
                </div>
                <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                  Shipment &amp; Courier
                </h3>
              </div>
            </div>

            {order.shipment ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Courier Partner</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-neutral-900 capitalize">
                      {order.shipment.provider === "steadfast"
                        ? "Steadfast Courier"
                        : order.shipment.provider}
                    </span>
                    {order.shipment.provider === "steadfast" ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        API Connected
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Shipment Status</span>
                  <Badge variant="outline" className="border-purple-300 bg-purple-50 font-semibold text-purple-800">
                    {order.shipment.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Tracking Code</span>
                  {order.shipment.trackingNumber ? (
                    order.shipment.provider === "steadfast" ? (
                      <a
                        href={`https://steadfast.com.bd/t/${order.shipment.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-600 hover:underline"
                        title="Open Steadfast live tracking portal"
                      >
                        <span>{order.shipment.trackingNumber}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs font-bold text-neutral-900">
                        {order.shipment.trackingNumber}
                      </span>
                    )
                  ) : (
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      Pending Assignment
                    </span>
                  )}
                </div>

                {order.shipment.providerShipmentId ? (
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Steadfast CID</span>
                    <span className="font-mono font-medium text-neutral-700">
                      #{order.shipment.providerShipmentId}
                    </span>
                  </div>
                ) : null}

                {order.shipment.shippedAt ? (
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Dispatched on</span>
                    <span>{formatDate(new Date(order.shipment.shippedAt))}</span>
                  </div>
                ) : null}

                {order.shipment.provider === "steadfast" && order.shipment.providerShipmentId ? (
                  <div className="pt-2">
                    <a
                      href={`https://steadfast.com.bd/user/consignment/print-label/${order.shipment.providerShipmentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      title="Open official Steadfast thermal sticker print page"
                    >
                      <Printer className="size-3.5" />
                      <span>Print Steadfast Official Sticker</span>
                      <ExternalLink className="size-3 opacity-75" />
                    </a>
                  </div>
                ) : null}

                <div className="border-t border-neutral-100 pt-3">
                  <RefreshShipmentStatusButton shipmentId={order.shipment.id} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <CreateShipmentForm orderId={order.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
