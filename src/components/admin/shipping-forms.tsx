"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ShipmentStatus } from "@prisma/client";
import {
  saveShippingMethodAction,
  saveShippingZoneAction,
  toggleShippingMethodAction,
  refreshShipmentStatusAction,
  updateShipmentStatusAction,
  type ShippingActionState,
} from "@/lib/admin/shipping-actions";

const initialState: ShippingActionState = { error: null };
const inputClass = "mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving..." : label}</button>;
}

function State({ state }: { state: ShippingActionState }) {
  return <>{state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}{state.message ? <p role="status" className="text-sm text-green-700">{state.message}</p> : null}</>;
}

export function ShippingZoneForm({ zone }: { zone?: { id: string; name: string; countries: string[] } }) {
  const [state, action] = useActionState(saveShippingZoneAction, initialState);
  return <form action={action} className="space-y-5">{zone ? <input type="hidden" name="id" value={zone.id} /> : null}<label className="block text-sm font-medium">Zone name<input name="name" required defaultValue={zone?.name} className={inputClass} /></label><label className="block text-sm font-medium">Country codes<input name="countries" required defaultValue={zone?.countries.join(", ")} className={inputClass} placeholder="BD, IN" /><span className="mt-1 block text-xs text-muted-foreground">Comma-separated ISO-style country codes.</span></label><State state={state} /><Submit label="Save zone" /></form>;
}

export function ShippingMethodForm({ method, zones }: { method?: { id: string; zoneId: string; name: string; cost: unknown; isActive: boolean }; zones: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveShippingMethodAction, initialState);
  return <form action={action} className="space-y-5">{method ? <input type="hidden" name="id" value={method.id} /> : null}<label className="block text-sm font-medium">Method name<input name="name" required defaultValue={method?.name} className={inputClass} /></label><label className="block text-sm font-medium">Zone<select name="zoneId" required defaultValue={method?.zoneId} className={inputClass}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label className="block text-sm font-medium">Cost<input name="cost" required type="number" min="0" step="0.01" defaultValue={method?.cost?.toString()} className={inputClass} /></label><label className="flex items-center gap-2 text-sm font-medium"><input name="isActive" type="checkbox" value="on" defaultChecked={method?.isActive ?? true} /> Active</label><State state={state} /><Submit label="Save method" /></form>;
}

export function ToggleShippingMethodForm({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(toggleShippingMethodAction, initialState);
  return <form action={action} className="flex items-center gap-2"><input type="hidden" name="id" value={id} /><button type="submit" disabled={useFormStatus().pending} className="text-sm font-medium text-primary hover:underline">{active ? "Disable" : "Enable"}</button>{state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}</form>;
}

export function ShipmentStatusForm({ id, current, statuses }: { id: string; current: ShipmentStatus; statuses: ShipmentStatus[] }) {
  const [state, action] = useActionState(updateShipmentStatusAction, initialState);
  return <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end"><input type="hidden" name="id" value={id} /><label className="text-sm font-medium">Update status<select name="status" defaultValue={current} className={inputClass}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><Submit label="Update status" /><State state={state} /></form>;
}

export function RefreshShipmentStatusForm({ id }: { id: string }) {
  const [state, action] = useActionState(refreshShipmentStatusAction, initialState);
  const { pending } = useFormStatus();
  return <form action={action} className="space-y-2"><input type="hidden" name="id" value={id} /><button type="submit" disabled={pending} className="border px-4 py-2 text-sm font-semibold disabled:opacity-60">{pending ? "Refreshing..." : "Refresh from Steadfast"}</button><State state={state} /></form>;
}
