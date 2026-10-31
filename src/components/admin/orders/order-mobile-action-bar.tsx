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
import { generateWhatsAppUrl } from "@/components/admin/orders/admin-order-badges";
import { OrderCancelModal } from "@/components/admin/orders/order-cancel-modal";

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

interface MobileSubmitButtonProps {
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary";
}

function MobileSubmitButton({
  label,
  shortLabel,
  icon: Icon,
  variant = "primary",
}: MobileSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 sm:h-11 flex-1 min-w-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-4 text-xs font-bold shadow-xs transition active:scale-[0.98] disabled:opacity-50 ${
        variant === "primary"
          ? "bg-neutral-900 text-white hover:bg-neutral-800"
          : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">Processing...</span>
        </>
      ) : (
        <>
          <Icon className="size-4 shrink-0" />
          <span className="truncate hidden min-[360px]:inline">{label}</span>
          <span className="truncate min-[360px]:hidden">{shortLabel || label}</span>
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
    <div className="fixed inset-x-2 bottom-2 z-40 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:bottom-3 rounded-2xl border border-neutral-200/90 bg-white/95 p-1.5 sm:p-2 shadow-2xl backdrop-blur-md print:hidden lg:hidden">
      <div className="flex w-full items-center gap-1.5 sm:gap-2">
        {/* Contact Group (Call & WhatsApp Segmented Pill) */}
        {order.customerPhone ? (
          <div className="flex h-10 sm:h-11 items-center rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-0.5 shadow-2xs shrink-0">
            <a
              href={`tel:${order.customerPhone}`}
              className="flex size-9 sm:size-10 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-white hover:text-neutral-900 hover:shadow-2xs active:scale-95"
              title="Call Customer directly"
              aria-label="Call Customer"
            >
              <Phone className="size-4" />
            </a>
            <div className="h-4 w-px bg-neutral-200" />
            <a
              href={generateWhatsAppUrl(order.customerPhone, order.orderNumber, order.customerName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 sm:size-10 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 hover:shadow-2xs active:scale-95"
              title="Open WhatsApp chat with customer"
              aria-label="WhatsApp Customer"
            >
              <MessageSquare className="size-4" />
            </a>
          </div>
        ) : null}

        {/* Dynamic Primary Smart Action */}
        {order.status === "PENDING" && (
          <form action={formAction} className="flex-1 min-w-0">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="CONFIRMED" />
            <input
              type="hidden"
              name="notes"
              value="Confirmed via mobile floating action bar."
            />
            <MobileSubmitButton
              label="Confirm Order"
              shortLabel="Confirm"
              icon={CheckCircle2}
            />
          </form>
        )}

        {order.status === "CONFIRMED" && (
          <form action={formAction} className="flex-1 min-w-0">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="PROCESSING" />
            <input
              type="hidden"
              name="notes"
              value="Moved to packaging via mobile floating action bar."
            />
            <MobileSubmitButton
              label="Move to Packing"
              shortLabel="Packing"
              icon={Package}
            />
          </form>
        )}

        {order.status === "PROCESSING" && (
          <>
            {order.shipment ? (
              <form action={formAction} className="flex-1 min-w-0">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value="DELIVERED" />
                <input
                  type="hidden"
                  name="notes"
                  value="Marked delivered via mobile floating action bar."
                />
                <MobileSubmitButton
                  label="Mark Delivered"
                  shortLabel="Delivered"
                  icon={Check}
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={scrollToFulfillment}
                className="inline-flex h-10 sm:h-11 flex-1 min-w-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-purple-600 px-2.5 sm:px-4 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 active:scale-[0.98]"
              >
                <Truck className="size-4 shrink-0" />
                <span className="truncate hidden min-[360px]:inline">Dispatch Courier</span>
                <span className="truncate min-[360px]:hidden">Dispatch</span>
              </button>
            )}
          </>
        )}

        {order.status === "SHIPPED" && (
          <form action={formAction} className="flex-1 min-w-0">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="DELIVERED" />
            <input
              type="hidden"
              name="notes"
              value="Marked delivered via mobile floating action bar."
            />
            <MobileSubmitButton
              label="Mark Delivered"
              shortLabel="Delivered"
              icon={CheckCircle2}
            />
          </form>
        )}

        {order.status === "DELIVERED" && (
          <div className="flex h-10 sm:h-11 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 sm:px-4 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span className="truncate hidden min-[360px]:inline">Order Completed</span>
            <span className="truncate min-[360px]:hidden">Completed</span>
          </div>
        )}

        {order.status === "CANCELLED" && (
          <div className="flex h-10 sm:h-11 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-2.5 sm:px-4 text-xs font-bold text-rose-800">
            <span className="truncate hidden min-[360px]:inline">Order Cancelled</span>
            <span className="truncate min-[360px]:hidden">Cancelled</span>
          </div>
        )}

        {/* Structured Cancel button on mobile if order is pending/confirmed */}
        {canCancel && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs transition hover:bg-rose-100 active:scale-95"
            title="Cancel order and restock inventory"
            aria-label="Cancel order and restock inventory"
          >
            <XCircle className="size-4" />
          </button>
        )}

        {/* Jump to actions button */}
        <button
          type="button"
          onClick={scrollToFulfillment}
          className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-2xs transition hover:bg-neutral-50 active:scale-95"
          title="Scroll to full fulfillment details"
          aria-label="Scroll to fulfillment details"
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
