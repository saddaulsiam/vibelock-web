"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AdminActionState } from "@/lib/admin/catalog/catalog-actions";

const initialState: AdminActionState = { error: null };

function SubmitButton({
  label,
  pendingLabel,
  destructive = false,
  size = "default",
  variant = "solid",
}: {
  label: string;
  pendingLabel?: string;
  destructive?: boolean;
  size?: "default" | "sm";
  variant?: "solid" | "outline";
}) {
  const { pending } = useFormStatus();
  const sizeClasses =
    size === "sm" ? "min-h-8 px-2.5 text-xs font-medium" : "min-h-10 px-4 text-sm font-semibold";

  let colorClasses = "";
  if (destructive) {
    colorClasses = "border-red-300 text-red-700 hover:bg-red-50";
  } else {
    colorClasses =
      variant === "outline"
        ? "border-vl-dark-900/20 bg-white text-vl-dark-900 hover:bg-vl-white-300"
        : "border-vl-dark-900 bg-vl-dark-900 text-white hover:bg-vl-dark-900/85";
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${sizeClasses} ${colorClasses}`}
    >
      {pending ? (pendingLabel ?? "Saving…") : label}
    </button>
  );
}

export function AdminSaveForm({
  action,
  children,
  submitLabel,
  secondaryAction,
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: React.ReactNode;
  submitLabel: string;
  secondaryAction?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-5">
      {children}
      {state.error ? (
        <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-vl-dark-900/10 pt-4">
        {secondaryAction ?? <div />}
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

export function AdminMutationForm({
  action,
  id,
  label,
  destructive = false,
  confirmMessage,
  size = "default",
  variant = "solid",
  className,
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  id: string;
  label: string;
  destructive?: boolean;
  confirmMessage?: string;
  size?: "default" | "sm";
  variant?: "solid" | "outline";
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={className ?? "flex flex-col items-start gap-2"}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton label={label} destructive={destructive} size={size} variant={variant} />
      {state.error ? (
        <p role="alert" className="max-w-56 text-xs leading-5 text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="max-w-56 text-xs leading-5 text-emerald-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
