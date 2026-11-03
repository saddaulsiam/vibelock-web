"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteAddressAction } from "@/lib/account/actions";
import { Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export type Address = {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  country: string;
  isDefault: boolean;
};

interface AddressListProps {
  addresses: Address[];
  onEdit?: (address: Address) => void;
  editingId?: string | null;
}

export function AddressList({ addresses, onEdit, editingId }: AddressListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Are you sure you want to delete this saved address?")) return;
    setDeletingId(id);
    const result = await deleteAddressAction(id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete address.");
      setDeletingId(null);
    } else {
      toast.success("Address deleted successfully.");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {addresses.map((address) => {
        const label = address.label || (address.isDefault ? "Home" : "Saved Address");
        const isDeleting = deletingId === address.id;
        const isEditingThis = editingId === address.id;

        return (
          <article
            key={address.id}
            className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all sm:p-5 ${
              isEditingThis
                ? "border-[#101114] bg-white ring-2 ring-[#00D9FF] shadow-sm"
                : address.isDefault
                  ? "border-[#101114]/20 bg-[#FAF9F5] shadow-xs"
                  : "border-[#101114]/10 bg-white hover:border-[#101114]/20"
            }`}
          >
            <div>
              {/* Top Row: Label badge & default check */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-[#101114] uppercase">
                  {label}
                </span>

                {address.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#101114] px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                    <Check className="size-2.5" />
                    Default
                  </span>
                )}
              </div>

              {/* Address details */}
              <address className="mt-3 text-xs leading-relaxed text-[#101114] not-italic">
                <p className="font-bold">{address.street}</p>
                <p className="mt-0.5 text-neutral-500">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="text-neutral-500">{address.country}</p>
              </address>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#101114]/8 pt-3.5">
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(address)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors active:scale-95 ${
                    isEditingThis
                      ? "border-[#101114] bg-[#101114] text-white"
                      : "border-[#101114]/15 bg-white text-[#101114] hover:bg-neutral-50"
                  }`}
                >
                  <Pencil className="size-3" />
                  <span>{isEditingThis ? "Editing..." : "Edit"}</span>
                </button>
              ) : (
                <Link
                  href={`/account/addresses/${address.id}/edit`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-neutral-50 active:scale-95"
                >
                  <Pencil className="size-3 text-neutral-500" />
                  <span>Edit</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => remove(address.id)}
                disabled={isDeleting}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:opacity-50"
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
