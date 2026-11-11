"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
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

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={destructive ? "destructive" : variant === "outline" ? "outline" : "primary"}
      size={size}
    >
      {pending ? (pendingLabel ?? "Saving…") : label}
    </Button>
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
