"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteAddressAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

type Address = {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  country: string;
  isDefault: boolean;
};

export function AddressList({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  async function remove(id: string) {
    if (!window.confirm("Delete this saved address?")) return;
    const result = await deleteAddressAction(id);
    if (!result.success) window.alert(result.error);
    else router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {addresses.map((address) => (
        <article key={address.id} className="border border-[#101114]/10 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">{address.label || "Saved address"}</h2>
            {address.isDefault ? <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Default</span> : null}
          </div>
          <address className="mt-3 text-sm not-italic leading-6 text-muted-foreground">
            {address.street}<br />{address.city}{address.state ? `, ${address.state}` : ""}<br />{address.zip ? `${address.zip}, ` : ""}{address.country}
          </address>
          <div className="mt-4 flex gap-2">
            <Link href={`/account/addresses/${address.id}/edit`} className="inline-flex min-h-9 items-center border border-input bg-background px-3 text-sm font-medium hover:bg-accent">Edit</Link>
            <Button variant="ghost" size="sm" onClick={() => remove(address.id)}>Delete</Button>
          </div>
        </article>
      ))}
    </div>
  );
}
