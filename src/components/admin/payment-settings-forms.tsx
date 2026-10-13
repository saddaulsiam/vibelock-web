"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  togglePaymentMethodAction,
  type PaymentSettingActionState,
} from "@/lib/admin/payment-settings-actions";

const initialState: PaymentSettingActionState = { error: null };

function SubmitButton({ isEnabled }: { isEnabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-8 items-center justify-center rounded px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${
        isEnabled
          ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
          : "border border-[#101114] bg-[#101114] text-white hover:bg-[#101114]/80"
      }`}
    >
      {pending ? "Saving..." : isEnabled ? "Disable" : "Enable"}
    </button>
  );
}

export function TogglePaymentMethodForm({
  code,
  isEnabled,
  isConfigured = true,
}: {
  code: "COD" | "SSLCOMMERZ";
  isEnabled: boolean;
  isConfigured?: boolean;
}) {
  const [state, action] = useActionState(togglePaymentMethodAction, initialState);

  if (!isConfigured && code === "SSLCOMMERZ") {
    return (
      <div className="text-xs text-amber-700 font-medium">
        Configure store credentials in .env to enable
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="enabled" value={(!isEnabled).toString()} />

      <SubmitButton isEnabled={isEnabled} />

      {state.error ? (
        <span role="alert" className="text-xs text-red-600 font-medium">
          {state.error}
        </span>
      ) : null}

      {state.message ? (
        <span role="status" className="text-xs text-emerald-700 font-medium">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
