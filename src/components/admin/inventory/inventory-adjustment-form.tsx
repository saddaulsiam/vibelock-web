"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adjustInventoryAction,
  type InventoryActionState,
} from "@/lib/admin/inventory/inventory-actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="1"
          required
          size="default"
          placeholder="Positive to add, negative to remove"
        />
      </div>
      <div>
        <label htmlFor="reason" className="mb-1 block text-sm font-medium">
          Reason
        </label>
        <Textarea
          id="reason"
          name="reason"
          required
          maxLength={1000}
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
