"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  Package,
  Truck,
  Check,
  AlertCircle,
  XCircle,
  MessageSquare,
  Tag,
  ChevronDown,
  Settings2,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/lib/admin/order-actions";
import {
  OrderStatusForm,
  OrderPaymentForm,
  CreateShipmentForm,
} from "@/components/admin/order-action-forms";
import { OrderThermalLabelModal } from "@/components/admin/order-thermal-label-modal";
import { OrderCancelModal } from "@/components/admin/order-cancel-modal";

interface SmartActionOrderProps {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  total: unknown;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string | null;
  shippingZip?: string | null;
  itemCount: number;
  shipment?: {
    id: string;
    provider: string;
    trackingNumber?: string | null;
    providerShipmentId?: string | null;
    status: string;
  } | null;
}

function SmartActionButton({
  label,
  icon: Icon,
  variant = "primary",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();

  const colorStyles =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
      : variant === "secondary"
        ? "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 shadow-2xs"
        : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-300 ring-2 ring-neutral-900/10";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all disabled:opacity-50 ${colorStyles}`}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Processing Action...</span>
        </>
      ) : (
        <>
          <Icon className="size-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function OrderSmartActions({ order }: { order: SmartActionOrderProps }) {
  const [showThermalModal, setShowThermalModal] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showWhatsAppMenu, setShowWhatsAppMenu] = React.useState(false);
  const [showManualOverride, setShowManualOverride] = React.useState(false);
  const [state, formAction] = useActionState(updateOrderStatusAction, { error: null });

  // Close WhatsApp menu on Escape key
  React.useEffect(() => {
    if (!showWhatsAppMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowWhatsAppMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showWhatsAppMenu]);

  // Format phone for WhatsApp
  const cleanPhone = (order.customerPhone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("880")
    ? cleanPhone
    : cleanPhone.startsWith("0")
      ? "88" + cleanPhone
      : cleanPhone.length === 10
        ? "880" + cleanPhone
        : cleanPhone;

  const totalFormatted = `৳${Number(order.total || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
  })}`;

  const greeting = order.customerName ? `আসসালামু আলাইকুম ${order.customerName}` : "আসসালামু আলাইকুম";

  // Pre-formatted Bengali e-commerce CRM templates
  const whatsappTemplates = [
    {
      title: "অর্ডার নিশ্চিতকরণ (Confirmation Memo)",
      text: `${greeting}! VibeLock Apparel-এ আপনার অর্ডার #${order.orderNumber} আমরা পেয়েছি।\nমোট মূল্য: ${totalFormatted} (${order.paymentMethod})।\nপার্সেলটি কি আমরা আজই পাঠিয়ে দেবো? অনুগ্রহ করে কনফার্ম করুন। ধন্যবাদ!`,
    },
    {
      title: "কুরিয়ার ডিসপ্যাচ ও ট্র্যাকিং (Dispatch Update)",
      text: `হ্যালো ${order.customerName || "Customer"}! আপনার VibeLock অর্ডার #${order.orderNumber}-টি কুরিয়ারে (${
        order.shipment?.provider || "Steadfast Courier"
      }) ডিসপ্যাচ করা হয়েছে।\nট্র্যাকিং কোড: ${
        order.shipment?.trackingNumber || "Pending"
      }। ২-৩ দিনের মধ্যে ডেলিভারি পাবেন ইনশাআল্লাহ। ধন্যবাদ!`,
    },
    {
      title: "ঠিকানা যাচাইকরণ (Address Check)",
      text: `হ্যালো ${order.customerName || "Customer"}, VibeLock থেকে যোগাযোগ করছি।\nআপনার অর্ডার #${order.orderNumber}-এর ডেলিভারি ঠিকানা:\n${order.shippingStreet}, ${order.shippingCity}।\nঠিকানা ও ফোন নম্বর ঠিক আছে কি না একটু কনফার্ম করবেন? ধন্যবাদ!`,
    },
    {
      title: "অর্ডার বাতিল ও রিফান্ড নোটিশ (Cancellation Notice)",
      text: `${greeting}! অত্যন্ত দুঃখের সাথে জানাচ্ছি যে আপনার VibeLock অর্ডার #${order.orderNumber}-টি বাতিল করা হয়েছে। যদি কোনো অগ্রিম পেমেন্ট করে থাকেন, তবে দ্রুত রিফান্ড সমন্বয় করা হবে। যেকোনো তথ্যের জন্য আমাদের সাথে যোগাযোগ করতে পারেন। ধন্যবাদ!`,
    },
  ];

  const openWhatsApp = (msg: string) => {
    if (!formattedPhone) return;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setShowWhatsAppMenu(false);
  };

  return (
    <div className="space-y-4">
      {/* ── Main Smart Action Card ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        {/* Card Header */}
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Fulfillment Hub</h3>
              <p className="text-xs text-neutral-500">1-Click Next Logical Action</p>
            </div>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-800">
            {order.status}
          </span>
        </div>

        {/* Feedback Message */}
        {state.error ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-800">
            <AlertCircle className="size-4 shrink-0 text-red-600" />
            <span>{state.error}</span>
          </div>
        ) : null}
        {state.message ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{state.message}</span>
          </div>
        ) : null}

        {/* ── Primary Smart Next Action Button ── */}
        <div className="space-y-3">
          {order.status === "PENDING" && (
            <div className="space-y-2">
              <form action={formAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="CONFIRMED" />
                <input
                  type="hidden"
                  name="notes"
                  value="1-Click confirmed by merchant via Smart Fulfillment Hub."
                />
                <SmartActionButton label="✓ Confirm Order" icon={CheckCircle2} variant="primary" />
              </form>
              <p className="text-center text-[11px] text-neutral-500">
                Customer call or WhatsApp check done &rarr; moves order to Confirmed
              </p>
            </div>
          )}

          {order.status === "CONFIRMED" && (
            <div className="space-y-2">
              <form action={formAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="PROCESSING" />
                <input
                  type="hidden"
                  name="notes"
                  value="Moved to warehouse packaging & picking."
                />
                <SmartActionButton
                  label="📦 Move to Packaging (Processing)"
                  icon={Package}
                  variant="primary"
                />
              </form>
              <p className="text-center text-[11px] text-neutral-500">
                Notifies warehouse team to pick &amp; bag items
              </p>
            </div>
          )}

          {order.status === "PROCESSING" && (
            <div className="space-y-2.5">
              {!order.shipment ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <span className="block text-[11px] font-bold text-neutral-700">
                    Step 1: Dispatch to Courier Partner
                  </span>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Hand parcel over to courier and generate tracking number
                  </p>
                  <div className="mt-2.5">
                    <CreateShipmentForm orderId={order.id} />
                  </div>
                </div>
              ) : null}

              <form action={formAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="SHIPPED" />
                <input
                  type="hidden"
                  name="notes"
                  value="Dispatched and handed over to courier delivery rider."
                />
                <SmartActionButton
                  label="🚚 Mark as Shipped / Dispatched"
                  icon={Truck}
                  variant="primary"
                />
              </form>
            </div>
          )}

          {order.status === "SHIPPED" && (
            <div className="space-y-2">
              <form action={formAction}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="DELIVERED" />
                <input
                  type="hidden"
                  name="notes"
                  value="Delivered to customer & COD reconciliation confirmed."
                />
                <SmartActionButton
                  label="🎉 Mark as Delivered (Cash Collected)"
                  icon={Check}
                  variant="primary"
                />
              </form>
              <p className="text-center text-[11px] text-neutral-500">
                Customer received the package &amp; fulfillment completed
              </p>
            </div>
          )}

          {order.status === "DELIVERED" && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-center">
              <CheckCircle2 className="mx-auto size-6 text-emerald-600" />
              <h4 className="mt-1 text-xs font-bold text-emerald-950">Fulfillment Complete</h4>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                This order has reached its final delivery destination.
              </p>
            </div>
          )}

          {order.status === "CANCELLED" && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3.5 text-center">
              <XCircle className="mx-auto size-6 text-rose-600" />
              <h4 className="mt-1 text-xs font-bold text-rose-950">Order is Cancelled</h4>
              <p className="mt-0.5 text-[11px] text-rose-700">
                Stock has been returned to available catalog.
              </p>
            </div>
          )}
        </div>

        {/* ── Secondary Quick Action Bar (Sticker & WhatsApp) ── */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
          {/* Thermal Label Trigger */}
          <button
            type="button"
            onClick={() => setShowThermalModal(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50"
            title="Print 4x6 courier polybag sticker"
          >
            <Tag className="size-3.5 text-neutral-600" />
            <span>Courier Sticker</span>
          </button>

          {/* Smart WhatsApp Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
              disabled={!formattedPhone}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 disabled:opacity-50"
            >
              <MessageSquare className="size-3.5 text-emerald-600" />
              <span>WhatsApp CRM</span>
              <ChevronDown className="size-3 text-emerald-700" />
            </button>

            {/* WhatsApp Templates Dropdown */}
            {showWhatsAppMenu && (
              <>
                {/* Click-outside backdrop to dismiss */}
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowWhatsAppMenu(false)}
                  aria-hidden="true"
                />

                <div className="animate-in fade-in zoom-in-95 duration-150 absolute right-0 bottom-full z-30 mb-1.5 w-72 sm:w-80 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-xl">
                  {/* Header with Title and Close (X) button */}
                  <div className="mb-2 flex items-center justify-between border-b border-neutral-100 px-1 pb-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                      1-Click Bengali CRM Templates
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWhatsAppMenu(false)}
                      className="flex size-5 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                      title="Close menu (Esc)"
                      aria-label="Close WhatsApp templates menu"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {whatsappTemplates.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openWhatsApp(tmpl.text)}
                        className="w-full rounded-lg p-2 text-left transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      >
                        <p className="text-xs font-bold text-neutral-900">{tmpl.title}</p>
                        <p className="line-clamp-2 mt-0.5 text-[10px] text-neutral-500">
                          {tmpl.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Structured Cancellation & Inventory Restock trigger */}
        {(order.status === "PENDING" || order.status === "CONFIRMED") && !order.shipment ? (
          <div className="mt-3 border-t border-neutral-100 pt-2.5 text-center">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 transition hover:text-rose-800 hover:underline"
            >
              <XCircle className="size-3.5" />
              <span>Cancel &amp; Restock Order</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Manual Override & Payment Accordion ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
        <button
          type="button"
          onClick={() => setShowManualOverride(!showManualOverride)}
          className="flex w-full items-center justify-between text-xs font-bold text-neutral-700 hover:text-neutral-900"
        >
          <div className="flex items-center gap-1.5">
            <Settings2 className="size-3.5 text-neutral-500" />
            <span>Manual Status &amp; Payment Override</span>
          </div>
          <ChevronDown
            className={`size-3.5 text-neutral-400 transition-transform ${
              showManualOverride ? "rotate-180" : ""
            }`}
          />
        </button>

        {showManualOverride && (
          <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              statuses={Object.values(OrderStatus)}
            />

            <div className="border-t border-neutral-100 pt-3">
              <OrderPaymentForm
                orderId={order.id}
                currentPaymentStatus={order.paymentStatus}
                statuses={Object.values(PaymentStatus)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Thermal Shipping Label Modal ── */}
      <OrderThermalLabelModal
        order={{
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          shippingStreet: order.shippingStreet,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          shippingZip: order.shippingZip,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          total: order.total,
          itemCount: order.itemCount,
          courierProvider: order.shipment?.provider,
          trackingNumber: order.shipment?.trackingNumber,
          providerShipmentId: order.shipment?.providerShipmentId,
        }}
        isOpen={showThermalModal}
        onClose={() => setShowThermalModal(false)}
      />

      {/* ── Structured Cancellation & Inventory Restock Modal ── */}
      <OrderCancelModal
        orderId={order.id}
        orderNumber={order.orderNumber}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
      />
    </div>
  );
}
