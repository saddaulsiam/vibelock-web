"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AdminActionState } from "@/lib/admin/order-actions";
import { updateOrderPaymentStatusAction, updateOrderStatusAction } from "@/lib/admin/order-actions";
import { createShipmentAction } from "@/lib/admin/shipping-actions";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

const initialState: AdminActionState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating..." : label}
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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="status">Order Status</Label>

        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-notes">Change Notes</Label>

        <textarea
          id="order-notes"
          name="notes"
          placeholder="Reason for status change..."
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-600">{state.message}</p> : null}
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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={orderId} />

      <div className="space-y-2">
        <Label htmlFor="payment-status">Payment Status</Label>

        <select
          id="payment-status"
          name="paymentStatus"
          defaultValue={currentPaymentStatus}
          className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment-notes">Payment Notes</Label>

        <textarea
          id="payment-notes"
          name="notes"
          placeholder="Payment reference or notes..."
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-600">{state.message}</p> : null}
      <SubmitButton label="Update Payment" />
    </form>
  );
}

export function CreateShipmentForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useActionState(createShipmentAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <p className="text-muted-foreground text-sm">
        Create a shipment after the order is ready and, for online orders, payment is successful.
      </p>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-green-600">{state.message}</p> : null}
      <SubmitButton label="Create Shipment" />
    </form>
  );
}
