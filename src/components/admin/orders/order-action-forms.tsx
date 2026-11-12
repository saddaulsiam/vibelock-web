"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertCircle, CheckCircle2, RotateCw, Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: AdminActionState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      size="default"
      loading={pending}
      className="w-full sm:w-auto"
    >
      <Send className="size-3" />
      <span>{label}</span>
    </Button>
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

        <NativeSelect id="status" name="status" defaultValue={currentStatus} size="default">
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order-notes" className="text-xs font-semibold text-neutral-700">
          Audit Log Notes
        </Label>

        <Textarea
          id="order-notes"
          name="notes"
          rows={2}
          placeholder="Reason or dispatch notes for this status update..."
          className="text-xs"
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

        <NativeSelect
          id="payment-status"
          name="paymentStatus"
          defaultValue={currentPaymentStatus}
          size="default"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment-notes" className="text-xs font-semibold text-neutral-700">
          Payment Reference / Notes
        </Label>

        <Textarea
          id="payment-notes"
          name="notes"
          rows={2}
          placeholder="Bank voucher, COD remittance note, or transaction ID..."
          className="text-xs"
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
    <Button
      type="submit"
      variant="outline"
      size="xs"
      loading={pending}
      className="border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 hover:text-purple-900"
      title="Sync latest delivery status from Steadfast Courier"
    >
      <RotateCw className="size-3 text-purple-600" />
      <span>{pending ? "Syncing..." : "Sync Live Courier Status"}</span>
    </Button>
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
