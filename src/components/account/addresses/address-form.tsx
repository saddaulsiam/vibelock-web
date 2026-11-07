"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAddressAction, updateAddressAction } from "@/lib/account/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
            className="text-[11px] font-semibold tracking-wider text-[#101114] uppercase"
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
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-xs font-medium text-[#101114]">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => update("isDefault", e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-[#101114]/20 text-[#101114] focus:ring-[#101114]"
          />
          <span>Set as default shipping address</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101114] px-6 py-2.5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800 active:scale-95 disabled:opacity-50"
        >
          {pending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Saving Address...</span>
            </span>
          ) : address ? (
            "Save Changes"
          ) : (
            "Save Address"
          )}
        </button>

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#101114]/15 bg-white px-5 py-2.5 text-xs font-semibold tracking-wider text-neutral-600 uppercase transition-colors hover:bg-neutral-50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
