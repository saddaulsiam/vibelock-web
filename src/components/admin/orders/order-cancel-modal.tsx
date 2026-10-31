"use client";

import { updateOrderStatusAction } from "@/lib/admin/orders/order-actions";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export interface CancellationReasonOption {
  id: string;
  label: string;
  shortLabel: string;
  category: "customer" | "inventory" | "logistics" | "operational";
  description: string;
}

export const CANCELLATION_REASONS: CancellationReasonOption[] = [
  {
    id: "CUSTOMER_UNREACHABLE",
    label: "Customer Unreachable / Fake Order",
    shortLabel: "📵 Unreachable / Fake",
    category: "customer",
    description: "Multiple call attempts unanswered, phone switched off, or suspected fake order.",
  },
  {
    id: "STOCK_OUT",
    label: "Size / Color Out of Stock",
    shortLabel: "📦 Out of Stock",
    category: "inventory",
    description: "Requested size, color, or variant is physically unavailable in the warehouse.",
  },
  {
    id: "CUSTOMER_CHANGED_MIND",
    label: "Customer Changed Mind",
    shortLabel: "👤 Changed Mind",
    category: "customer",
    description: "Customer requested cancellation or decided not to proceed with the purchase.",
  },
  {
    id: "DUPLICATE_ORDER",
    label: "Duplicate Order Placed",
    shortLabel: "📑 Duplicate Order",
    category: "customer",
    description: "Customer accidentally placed multiple identical orders.",
  },
  {
    id: "DELIVERY_DELAY",
    label: "Delivery Delay / Urgent Cancellation",
    shortLabel: "⏳ Delivery Delay",
    category: "logistics",
    description: "Unable to meet customer's required delivery timeline.",
  },
  {
    id: "NON_DELIVERABLE_AREA",
    label: "Incorrect Address / Non-Serviceable Area",
    shortLabel: "📍 Address / Area Issue",
    category: "logistics",
    description: "Incomplete address or destination is outside courier home delivery coverage.",
  },
  {
    id: "PRICE_DISCOUNT_DISPUTE",
    label: "Pricing / Discount Dispute",
    shortLabel: "🏷️ Price / Discount",
    category: "operational",
    description: "Customer disputed voucher code, courier charges, or pricing terms.",
  },
  {
    id: "OTHER",
    label: "Other Custom Reason",
    shortLabel: "✏️ Other Reason",
    category: "operational",
    description: "Custom cancellation reason documented in internal staff notes.",
  },
];

interface OrderCancelModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

function CancelSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Cancelling &amp; Restocking...</span>
        </>
      ) : (
        <>
          <ShieldAlert className="size-4" />
          <span>Confirm Cancellation</span>
        </>
      )}
    </button>
  );
}

function OrderCancelModalContent({
  orderId,
  orderNumber,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}) {
  const [selectedReasonId, setSelectedReasonId] = React.useState<string>(
    CANCELLATION_REASONS[0].id
  );
  const [customNote, setCustomNote] = React.useState<string>("");
  const [state, formAction] = useActionState(updateOrderStatusAction, { error: null });

  // Auto-close on successful server cancellation
  React.useEffect(() => {
    if (state.message && !state.error) {
      const timer = setTimeout(() => {
        onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.message, state.error, onClose]);

  const currentReason =
    CANCELLATION_REASONS.find((r) => r.id === selectedReasonId) || CANCELLATION_REASONS[0];

  // Combined formatted note for audit logging
  const combinedNotes = customNote.trim()
    ? `[CANCELLATION: ${currentReason.label}] ${customNote.trim()}`
    : `[CANCELLATION: ${currentReason.label}]`;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        {/* ── Modal Header ── */}
        <div className="mb-4 flex items-start justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 id="cancel-modal-title" className="text-sm font-bold text-neutral-900">
                Cancel Order &amp; Restock Inventory
              </h3>
              <p className="text-xs text-neutral-500">
                Order #{orderNumber} &middot; Structured Cancellation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Auto-Restock Guarantee Banner ── */}
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-900">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div className="text-xs">
            <p className="font-bold text-emerald-950">Automatic Inventory Restock Guaranteed</p>
            <p className="mt-0.5 leading-relaxed text-emerald-800">
              Cancelling this order immediately releases all reserved units back to available stock
              in the store catalog.
            </p>
          </div>
        </div>

        {/* ── Feedback Messages ── */}
        {state.error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-900">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{state.error}</span>
          </div>
        ) : null}

        {state.message ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>Order cancelled successfully and inventory restocked.</span>
          </div>
        ) : null}

        {/* ── Cancellation Form ── */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="status" value="CANCELLED" />
          <input type="hidden" name="notes" value={combinedNotes} />

          {/* Quick Reason Selection Chips */}
          <div>
            <label className="block text-xs font-bold text-neutral-800">Quick Select:</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CANCELLATION_REASONS.slice(0, 4).map((reason) => {
                const isSelected = selectedReasonId === reason.id;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReasonId(reason.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {reason.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Structured Reason Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason-select"
              className="block text-xs font-bold text-neutral-800"
            >
              Cancellation Reason *
            </label>
            <select
              id="cancel-reason-select"
              value={selectedReasonId}
              onChange={(e) => setSelectedReasonId(e.target.value)}
              className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-900 shadow-2xs focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
            >
              {CANCELLATION_REASONS.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 italic">{currentReason.description}</p>
          </div>

          {/* Optional Additional Internal Details */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-custom-note"
              className="block text-xs font-bold text-neutral-800"
            >
              Additional Staff Notes (Optional)
            </label>
            <textarea
              id="cancel-custom-note"
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g., Called customer 3 times with no response, customer requested size exchange..."
              className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 shadow-2xs placeholder:text-neutral-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
            />
          </div>

          {/* Warning Note */}
          <div className="rounded-lg bg-neutral-50 p-2.5 text-[11px] text-neutral-600">
            <p>
              ⚠️ <span className="font-semibold text-neutral-800">Please note:</span> Cancelling
              this order changes the status to{" "}
              <span className="font-mono font-bold text-rose-600">CANCELLED</span> and permanently
              logs this reason in the order history and audit trail.
            </p>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Keep Order
            </button>
            <CancelSubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrderCancelModal({ orderId, orderNumber, isOpen, onClose }: OrderCancelModalProps) {
  if (!isOpen) return null;

  return <OrderCancelModalContent orderId={orderId} orderNumber={orderNumber} onClose={onClose} />;
}
