"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Package,
  Truck,
  Check,
  Loader2,
  ChevronUp,
  XCircle,
} from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/lib/admin/order-actions";
import { generateWhatsAppUrl } from "@/components/admin/admin-order-badges";
import { OrderCancelModal } from "@/components/admin/order-cancel-modal";

interface OrderMobileActionBarProps {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    customerName?: string | null;
    customerPhone?: string | null;
    shipment?: {
      id: string;
      provider: string;
      trackingNumber?: string | null;
      status: string;
    } | null;
  };
}

function MobileSubmitButton({
  label,
  icon: Icon,
  variant = "primary",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 ${
        variant === "primary"
          ? "bg-neutral-900 text-white hover:bg-neutral-800"
          : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </>
      )}
    </button>
  );
}

export function OrderMobileActionBar({ order }: OrderMobileActionBarProps) {
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [, formAction] = useActionState(updateOrderStatusAction, { error: null });

  const canCancel =
    (order.status === "PENDING" || order.status === "CONFIRMED") && !order.shipment;

  const scrollToFulfillment = () => {
    const el =
      document.getElementById("smart-fulfillment-hub") ||
      document.getElementById("courier-dispatch-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/90 bg-white/95 p-2.5 shadow-2xl backdrop-blur-md print:hidden lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {/* Direct Call Customer Button */}
        {order.customerPhone ? (
          <a
            href={`tel:${order.customerPhone}`}
            className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800 shadow-2xs transition hover:bg-neutral-50 active:scale-95"
            title="Call Customer directly"
          >
            <Phone className="size-4 text-neutral-800" />
            <span className="text-[10px] font-bold">Call</span>
          </a>
        ) : null}

        {/* Direct WhatsApp Customer Button */}
        {order.customerPhone ? (
          <a
            href={generateWhatsAppUrl(order.customerPhone, order.orderNumber, order.customerName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs transition hover:bg-emerald-100 active:scale-95"
            title="Open WhatsApp chat with customer"
          >
            <MessageSquare className="size-4 text-emerald-600" />
            <span className="text-[10px] font-bold">WhatsApp</span>
          </a>
        ) : null}

        {/* Dynamic Primary Smart Action */}
        {order.status === "PENDING" && (
          <form action={formAction} className="flex-1">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="CONFIRMED" />
            <input
              type="hidden"
              name="notes"
              value="Confirmed via mobile floating action bar."
            />
            <MobileSubmitButton label="Confirm Order" icon={CheckCircle2} />
          </form>
        )}

        {order.status === "CONFIRMED" && (
          <form action={formAction} className="flex-1">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="PROCESSING" />
            <input
              type="hidden"
              name="notes"
              value="Moved to packaging via mobile floating action bar."
            />
            <MobileSubmitButton label="Move to Packing" icon={Package} />
          </form>
        )}

        {order.status === "PROCESSING" && (
          <>
            {order.shipment ? (
              <form action={formAction} className="flex-1">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="DELIVERED" />
                <input
                  type="hidden"
                  name="notes"
                  value="Marked delivered via mobile floating action bar."
                />
                <MobileSubmitButton label="Mark Delivered" icon={Check} />
              </form>
            ) : (
              <button
                type="button"
                onClick={scrollToFulfillment}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
              >
                <Truck className="size-4 shrink-0" />
                <span className="truncate">Dispatch Courier</span>
              </button>
            )}
          </>
        )}

        {order.status === "SHIPPED" && (
          <form action={formAction} className="flex-1">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="DELIVERED" />
            <input
              type="hidden"
              name="notes"
              value="Marked delivered via mobile floating action bar."
            />
            <MobileSubmitButton label="Mark Delivered" icon={CheckCircle2} />
          </form>
        )}

        {order.status === "DELIVERED" && (
          <div className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span className="truncate">Order Completed</span>
          </div>
        )}

        {order.status === "CANCELLED" && (
          <div className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-800">
            <span className="truncate">Order Cancelled</span>
          </div>
        )}

        {/* Structured Cancel button on mobile if order is pending/confirmed */}
        {canCancel && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs transition hover:bg-rose-100 active:scale-95"
            title="Cancel order and restock inventory"
          >
            <XCircle className="size-4" />
          </button>
        )}

        {/* Jump to actions button */}
        <button
          type="button"
          onClick={scrollToFulfillment}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-2xs transition hover:bg-neutral-50 active:scale-95"
          title="Scroll to full fulfillment details"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>

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
