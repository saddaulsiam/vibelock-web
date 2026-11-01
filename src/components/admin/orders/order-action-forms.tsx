"use client";

import { Label } from "@/components/ui/label";
import type { AdminActionState } from "@/lib/admin/orders/order-actions";
import {
  updateOrderPaymentStatusAction,
  updateOrderStatusAction,
} from "@/lib/admin/orders/order-actions";
import {
  createShipmentAction,
  refreshShipmentStatusAction,
} from "@/lib/admin/shipping/shipping-actions";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { AlertCircle, CheckCircle2, Loader2, RotateCw, Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: AdminActionState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-4 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none disabled:opacity-50 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <Send className="size-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function OrderStatusForm({
  orderId,
  currentStatus,
  statuses,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  statuses: OrderStatus[];
}) {
  const [state, formAction] = useActionState(updateOrderStatusAction, initialState);

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="id" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="status" className="text-xs font-semibold text-neutral-700">
          Order Status
        </Label>

        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order-notes" className="text-xs font-semibold text-neutral-700">
          Audit Log Notes
        </Label>

        <textarea
          id="order-notes"
          name="notes"
          rows={2}
          placeholder="Reason or dispatch notes for this status update..."
          className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 shadow-2xs transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        />
      </div>

      {state.error ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-800">
          <AlertCircle className="size-3.5 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state.message ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <SubmitButton label="Update Status" />
    </form>
  );
}

export function OrderPaymentForm({
  orderId,
  currentPaymentStatus,
  statuses,
}: {
  orderId: string;
  currentPaymentStatus: PaymentStatus;
  statuses: PaymentStatus[];
}) {
  const [state, formAction] = useActionState(updateOrderPaymentStatusAction, initialState);

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="id" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="payment-status" className="text-xs font-semibold text-neutral-700">
          Payment Status
        </Label>

        <select
          id="payment-status"
          name="paymentStatus"
          defaultValue={currentPaymentStatus}
          className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment-notes" className="text-xs font-semibold text-neutral-700">
          Payment Reference / Notes
        </Label>

        <textarea
          id="payment-notes"
          name="notes"
          rows={2}
          placeholder="Bank voucher, COD remittance note, or transaction ID..."
          className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 shadow-2xs transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        />
      </div>

      {state.error ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-800">
          <AlertCircle className="size-3.5 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state.message ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <SubmitButton label="Update Payment" />
    </form>
  );
}

export function CreateShipmentForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(createShipmentAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <p className="text-xs leading-relaxed text-neutral-600">
        Dispatch parcel to integrated courier partner once packaging and physical inspection is
        complete.
      </p>
      {state.error ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-medium text-red-800">
          <AlertCircle className="size-3.5 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      ) : null}
      {state.message ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
          <span>{state.message}</span>
        </div>
      ) : null}
      <SubmitButton label="Create Courier Shipment" />
    </form>
  );
}

function SyncButtonInner() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 disabled:opacity-50"
      title="Sync latest delivery status from Steadfast Courier"
    >
      <RotateCw className={`size-3 text-purple-600 ${pending ? "animate-spin" : ""}`} />
      <span>{pending ? "Syncing..." : "Sync Live Courier Status"}</span>
    </button>
  );
}

export function RefreshShipmentStatusButton({ shipmentId }: { shipmentId: string }) {
  const [state, formAction] = useActionState(refreshShipmentStatusAction, initialState);

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="id" value={shipmentId} />
      <SyncButtonInner />
      {state.error ? <p className="mt-1 text-[11px] text-red-600">{state.error}</p> : null}
      {state.message ? <p className="mt-1 text-[11px] text-emerald-600">{state.message}</p> : null}
    </form>
  );
}
