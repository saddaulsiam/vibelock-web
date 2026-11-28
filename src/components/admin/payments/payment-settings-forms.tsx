"use client";

import {
  togglePaymentMethodAction,
  type PaymentSettingActionState,
} from "@/lib/admin/payments/payment-settings-actions";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, Power } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: PaymentSettingActionState = { error: null };

function ToggleSwitch({ isEnabled, code }: { isEnabled: boolean; code: string }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        aria-label={`${isEnabled ? "Disable" : "Enable"} ${code} payment channel`}
        className={cn(
          "group focus-visible:ring-vl-cyan-500 relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isEnabled
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700",
          pending && "cursor-wait opacity-60"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-flex size-5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            isEnabled ? "translate-x-5 text-emerald-600" : "translate-x-0 text-neutral-400"
          )}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin text-neutral-600" />
          ) : isEnabled ? (
            <Check className="size-3 stroke-[3]" />
          ) : (
            <Power className="size-3 stroke-[2.5]" />
          )}
        </span>
      </button>

      <span
        className={cn(
          "text-xs font-bold tracking-wider uppercase transition-colors select-none",
          isEnabled ? "text-emerald-700" : "text-neutral-500",
          pending && "opacity-60"
        )}
      >
        {pending ? "Updating..." : isEnabled ? "Active" : "Disabled"}
      </span>
    </div>
  );
}

export function TogglePaymentMethodForm({
  code,
  isEnabled,
  isConfigured = true,
}: {
  code: "COD" | "BKASH" | "PAYSTATION";
  isEnabled: boolean;
  isConfigured?: boolean;
}) {
  const [state, action] = useActionState(togglePaymentMethodAction, initialState);

  if (!isConfigured && !isEnabled && (code === "BKASH" || code === "PAYSTATION")) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-800 shadow-2xs">
        <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
        <span className="font-semibold">
          {code === "BKASH"
            ? "Configure bKash credentials in .env to activate"
            : "Configure PayStation credentials in .env to activate"}
        </span>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="enabled" value={(!isEnabled).toString()} />

      <ToggleSwitch isEnabled={isEnabled} code={code} />

      {state.error ? (
        <span role="alert" className="animate-in fade-in text-xs font-semibold text-rose-600">
          {state.error}
        </span>
      ) : null}

      {state.message ? (
        <span role="status" className="animate-in fade-in text-xs font-semibold text-emerald-700">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
