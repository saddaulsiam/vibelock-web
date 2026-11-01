"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2, Power } from "lucide-react";
import {
  saveShippingMethodAction,
  saveShippingZoneAction,
  toggleShippingMethodAction,
  type ShippingActionState,
} from "@/lib/admin/shipping/shipping-actions";

const initialState: ShippingActionState = { error: null };
const inputClass =
  "mt-1.5 flex h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-xs text-[#101114] placeholder:text-neutral-400 outline-none transition-colors hover:border-neutral-300 focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}

function State({ state }: { state: ShippingActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
      >
        <AlertCircle className="size-4 shrink-0 text-rose-600" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.message) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}

export function ShippingZoneForm({
  zone,
}: {
  zone?: { id: string; name: string; countries: string[] };
}) {
  const [state, action] = useActionState(saveShippingZoneAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {zone ? <input type="hidden" name="id" value={zone.id} /> : null}

      <div>
        <label className="block text-xs font-semibold text-neutral-800">
          Zone Name <span className="text-rose-500">*</span>
        </label>
        <input
          name="name"
          required
          defaultValue={zone?.name}
          placeholder="e.g. Inside Dhaka, Chittagong Division, Nationwide"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-neutral-400">
          Give this regional boundary a recognizable name.
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800">
          Country Codes <span className="text-rose-500">*</span>
        </label>
        <input
          name="countries"
          required
          defaultValue={zone?.countries.join(", ")}
          className={inputClass}
          placeholder="BD, IN"
        />
        <span className="mt-1 block text-[11px] text-neutral-400">
          Comma-separated 2-letter ISO country codes (e.g. BD).
        </span>
      </div>

      <State state={state} />

      <div className="pt-2">
        <Submit label={zone ? "Update Zone" : "Create Zone"} />
      </div>
    </form>
  );
}

export function ShippingMethodForm({
  method,
  zones,
}: {
  method?: { id: string; zoneId: string; name: string; cost: unknown; isActive: boolean };
  zones: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveShippingMethodAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {method ? <input type="hidden" name="id" value={method.id} /> : null}

      <div>
        <label className="block text-xs font-semibold text-neutral-800">
          Method Name <span className="text-rose-500">*</span>
        </label>
        <input
          name="name"
          required
          defaultValue={method?.name}
          placeholder="e.g. Standard Delivery (Inside Dhaka), Express Shipping"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-neutral-400">
          Displayed to customers at checkout.
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800">
          Assigned Zone <span className="text-rose-500">*</span>
        </label>
        <select name="zoneId" required defaultValue={method?.zoneId} className={inputClass}>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-neutral-400">
          Which geographical delivery zone this pricing applies to.
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-800">
          Delivery Cost (BDT) <span className="text-rose-500">*</span>
        </label>
        <input
          name="cost"
          required
          type="number"
          min="0"
          step="0.01"
          defaultValue={method?.cost?.toString()}
          placeholder="60.00"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-neutral-400">
          The flat shipping fee charged to the customer at checkout.
        </span>
      </div>

      <div className="pt-1">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-neutral-800">
          <input
            name="isActive"
            type="checkbox"
            value="on"
            defaultChecked={method?.isActive ?? true}
            className="size-4 rounded border-neutral-300 text-[#101114] focus:ring-[#00D9FF]"
          />
          <span>Active for customer checkout</span>
        </label>
      </div>

      <State state={state} />

      <div className="pt-2">
        <Submit label={method ? "Update Method" : "Create Method"} />
      </div>
    </form>
  );
}

export function ToggleShippingMethodForm({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(toggleShippingMethodAction, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          active
            ? "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
        title={active ? "Click to deactivate rate" : "Click to activate rate"}
      >
        <Power className="size-3" />
        <span>{pending ? "..." : active ? "Deactivate" : "Activate"}</span>
      </button>
      {state.error ? <span className="text-[10px] text-rose-600">{state.error}</span> : null}
    </form>
  );
}
