"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  togglePaymentMethodAction,
  type PaymentSettingActionState,
} from "@/lib/admin/payments/payment-settings-actions";

const initialState: PaymentSettingActionState = { error: null };

function SubmitButton({ isEnabled }: { isEnabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      size="sm"
      variant={isEnabled ? "destructive" : "primary"}
      className="min-h-8"
    >
      {pending ? "Saving..." : isEnabled ? "Disable" : "Enable"}
    </Button>
  );
}

export function TogglePaymentMethodForm({
  code,
  isEnabled,
  isConfigured = true,
}: {
  code: "COD" | "SSLCOMMERZ" | "BKASH" | "NAGAD";
  isEnabled: boolean;
  isConfigured?: boolean;
}) {
  const [state, action] = useActionState(togglePaymentMethodAction, initialState);

  if (
    !isConfigured &&
    !isEnabled &&
    (code === "SSLCOMMERZ" || code === "BKASH" || code === "NAGAD")
  ) {
    return (
      <div className="text-xs font-medium text-amber-700">
        {code === "BKASH"
          ? "Configure bKash credentials in .env to enable"
          : code === "NAGAD"
            ? "Configure Nagad credentials in .env to enable"
            : "Configure store credentials in .env to enable"}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="enabled" value={(!isEnabled).toString()} />

      <SubmitButton isEnabled={isEnabled} />

      {state.error ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {state.error}
        </span>
      ) : null}

      {state.message ? (
        <span role="status" className="text-xs font-medium text-emerald-700">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
