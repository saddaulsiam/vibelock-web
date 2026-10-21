"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { adjustInventoryAction, type InventoryActionState } from "@/lib/admin/inventory-actions";

const initialState: InventoryActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save adjustment"}
    </Button>
  );
}

export function InventoryAdjustmentForm({ variantId }: { variantId: string }) {
  const [state, formAction] = useActionState(adjustInventoryAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="variantId" value={variantId} />
      <div>
        <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
          Quantity adjustment
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="1"
          required
          className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          placeholder="Positive to add, negative to remove"
        />
      </div>
      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          maxLength={1000}
          className="border-input flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          placeholder="Explain this adjustment"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-green-600">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
