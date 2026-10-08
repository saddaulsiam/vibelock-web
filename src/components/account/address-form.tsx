"use client";

import { useState } from "react";
import { createAddressAction, updateAddressAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AddressValues = {
  id?: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
};

export function AddressForm({
  address,
  onDone,
}: {
  address?: AddressValues;
  onDone?: () => void;
}) {
  const [values, setValues] = useState<AddressValues>(
    address ?? { label: "", street: "", city: "", state: "", zip: "", country: "BD", isDefault: false }
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const update = (key: keyof AddressValues, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = values.id
      ? await updateAddressAction(values.id, values)
      : await createAddressAction(values);
    if (!result.success) setError(result.error ?? "Unable to save address.");
    else onDone?.();
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address-label">Label (optional)</Label>
          <Input id="address-label" value={values.label} onChange={(e) => update("label", e.target.value)} placeholder="Home" disabled={pending} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address-street">Street address</Label>
          <Input id="address-street" required value={values.street} onChange={(e) => update("street", e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-city">City</Label>
          <Input id="address-city" required value={values.city} onChange={(e) => update("city", e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-state">State / district</Label>
          <Input id="address-state" value={values.state} onChange={(e) => update("state", e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-zip">Postal code</Label>
          <Input id="address-zip" value={values.zip} onChange={(e) => update("zip", e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-country">Country</Label>
          <Input id="address-country" required value={values.country} onChange={(e) => update("country", e.target.value)} disabled={pending} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.isDefault} onChange={(e) => update("isDefault", e.target.checked)} disabled={pending} />
        Use as my default address
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : address ? "Save changes" : "Add address"}</Button>
    </form>
  );
}
