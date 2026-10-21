"use client";

import { useState } from "react";
import { createAddressAction, updateAddressAction } from "@/lib/account/actions";
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

export function AddressForm({ address, onDone }: { address?: AddressValues; onDone?: () => void }) {
  const [values, setValues] = useState<AddressValues>(
    address ?? {
      label: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "BD",
      isDefault: false,
    }
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
      {error && (
        <div
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border p-3 text-xs font-semibold"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address-label" className="text-xs font-bold text-[#101114]">
            Label (optional)
          </Label>
          <Input
            id="address-label"
            value={values.label}
            onChange={(e) => update("label", e.target.value)}
            placeholder="e.g. Home, Office, Studio"
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address-street" className="text-xs font-bold text-[#101114]">
            Street Address
          </Label>
          <Input
            id="address-street"
            required
            value={values.street}
            onChange={(e) => update("street", e.target.value)}
            placeholder="House, Road, Area"
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address-city" className="text-xs font-bold text-[#101114]">
            City
          </Label>
          <Input
            id="address-city"
            required
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Dhaka"
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address-state" className="text-xs font-bold text-[#101114]">
            State / Division
          </Label>
          <Input
            id="address-state"
            value={values.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="Dhaka"
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address-zip" className="text-xs font-bold text-[#101114]">
            Postal Code
          </Label>
          <Input
            id="address-zip"
            value={values.zip}
            onChange={(e) => update("zip", e.target.value)}
            placeholder="1230"
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address-country" className="text-xs font-bold text-[#101114]">
            Country
          </Label>
          <Input
            id="address-country"
            required
            value={values.country}
            onChange={(e) => update("country", e.target.value)}
            disabled={pending}
            className="rounded-xl border-[#101114]/15 bg-white text-xs focus-visible:ring-[#00D9FF]"
          />
        </div>
      </div>

      <div className="pt-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-[#101114]">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => update("isDefault", e.target.checked)}
            disabled={pending}
            className="rounded border-[#101114]/20 text-[#00D9FF] focus:ring-[#00D9FF]"
          />
          <span>Set as default shipping address</span>
        </label>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-[#101114] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#1f2229] active:scale-95 disabled:opacity-50"
        >
          {pending ? "Saving Address..." : address ? "Save Changes" : "Add Address"}
        </button>
      </div>
    </form>
  );
}
