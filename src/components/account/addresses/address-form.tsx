"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddressAction, updateAddressAction } from "@/lib/account/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const router = useRouter();
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

    if (!result.success) {
      const err = result.error ?? "Unable to save address.";
      setError(err);
      toast.error(err);
    } else {
      toast.success(values.id ? "Address updated successfully!" : "Address saved successfully!");
      router.refresh();
      onDone?.();
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-normal text-rose-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label
            htmlFor="address-label"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            Label (optional)
          </Label>
          <Input
            id="address-label"
            variant="brand"
            size="lg"
            value={values.label}
            onChange={(e) => update("label", e.target.value)}
            placeholder="e.g. Home, Studio, Office"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label
            htmlFor="address-street"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            Street Address
          </Label>
          <Input
            id="address-street"
            variant="brand"
            size="lg"
            required
            value={values.street}
            onChange={(e) => update("street", e.target.value)}
            placeholder="House, Road, Area, Sector"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="address-city"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            City
          </Label>
          <Input
            id="address-city"
            variant="brand"
            size="lg"
            required
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Dhaka"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="address-state"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            State / Division
          </Label>
          <Input
            id="address-state"
            variant="brand"
            size="lg"
            value={values.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="Dhaka"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="address-zip"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            Postal Code
          </Label>
          <Input
            id="address-zip"
            variant="brand"
            size="lg"
            value={values.zip}
            onChange={(e) => update("zip", e.target.value)}
            placeholder="1230"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="address-country"
            className="text-vl-dark-900 text-[11px] font-semibold tracking-wider uppercase"
          >
            Country
          </Label>
          <Input
            id="address-country"
            variant="brand"
            size="lg"
            required
            value={values.country}
            onChange={(e) => update("country", e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      <div className="pt-2">
        <label className="text-vl-dark-900 flex min-h-10 cursor-pointer items-center gap-2.5 text-xs font-medium">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => update("isDefault", e.target.checked)}
            disabled={pending}
            className="border-vl-dark-900/20 text-vl-dark-900 focus:ring-vl-dark-900 h-4 w-4 rounded"
          />
          <span>Set as default shipping address</span>
        </label>
      </div>

      <Button type="submit" variant="primary" loading={pending}>
        {address ? "Save Changes" : "Save Address"}
      </Button>
    </form>
  );
}
