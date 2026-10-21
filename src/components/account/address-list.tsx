"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteAddressAction } from "@/lib/account/actions";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Are you sure you want to delete this saved address?")) return;
    setDeletingId(id);
    const result = await deleteAddressAction(id);
    if (!result.success) {
      window.alert(result.error);
      setDeletingId(null);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {addresses.map((address) => {
        const label = address.label || (address.isDefault ? "Home" : "Saved Address");
        const isDeleting = deletingId === address.id;

        return (
          <article
            key={address.id}
            className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
              address.isDefault
                ? "border-[#00D9FF]/40 bg-[#00D9FF]/5 shadow-xs"
                : "border-[#101114]/10 bg-white shadow-xs hover:border-[#101114]/25"
            }`}
          >
            <div>
              {/* Top Row: Label badge & default check */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${
                    address.isDefault
                      ? "bg-[#00D9FF]/20 text-[#008ba3]"
                      : "text-muted-foreground bg-[#101114]/5"
                  }`}
                >
                  {label}
                </span>

                {address.isDefault && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#008ba3]">
                    <CheckCircle2 className="size-3.5" />
                    Default
                  </span>
                )}
              </div>

              {/* Address details */}
              <address className="mt-3.5 text-xs leading-relaxed text-[#101114] not-italic">
                <p className="font-semibold">{address.street}</p>
                <p className="text-muted-foreground mt-0.5">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="text-muted-foreground">{address.country}</p>
              </address>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#101114]/10 pt-3.5">
              <Link
                href={`/account/addresses/${address.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
              >
                <Pencil className="size-3" />
                <span>Edit</span>
              </Link>
              <button
                type="button"
                onClick={() => remove(address.id)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="size-3" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
