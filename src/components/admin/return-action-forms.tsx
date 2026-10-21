"use client";

import { useActionState } from "react";
import type { AdminReturnActionState } from "@/lib/admin/return-actions";

const initialState: AdminReturnActionState = { error: null };

type Action = (
  state: AdminReturnActionState,
  formData: FormData
) => Promise<AdminReturnActionState>;

function ActionResult({ state }: { state: AdminReturnActionState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  ) : state.message ? (
    <p role="status" className="text-sm text-emerald-700">
      {state.message}
    </p>
  ) : null;
}

export function ReturnStatusForm({
  id,
  statuses,
  action,
}: {
  id: string;
  statuses: string[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <textarea
        name="notes"
        placeholder="Optional internal note"
        className="border-input flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Updating..." : "Update return"}
      </button>
      <ActionResult state={state} />
    </form>
  );
}

export function RefundForm({ returnId, action }: { returnId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="returnId" value={returnId} />
      <input
        name="amount"
        type="number"
        min="0.01"
        step="0.01"
        required
        placeholder="Amount (৳)"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      />
      <input
        name="reason"
        maxLength={500}
        placeholder="Refund reason"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create pending refund"}
      </button>
      <p className="text-muted-foreground text-xs">
        This creates a pending refund; it does not claim provider success.
      </p>
      <ActionResult state={state} />
    </form>
  );
}

export function ProcessRefundForm({
  returnId,
  refundId,
  action,
}: {
  returnId: string;
  refundId: string;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="returnId" value={returnId} />
      <input type="hidden" name="refundId" value={refundId} />
      <button
        type="submit"
        disabled={pending}
        className="text-primary text-sm font-medium hover:underline disabled:opacity-60"
      >
        {pending ? "Processing..." : "Process with provider"}
      </button>
      <ActionResult state={state} />
    </form>
  );
}
