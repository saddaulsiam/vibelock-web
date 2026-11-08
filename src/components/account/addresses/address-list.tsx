"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
            className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all sm:p-5 ${
              isEditingThis
                ? "border-vl-dark-900 ring-vl-cyan bg-white shadow-sm ring-2"
                : address.isDefault
                  ? "border-vl-dark-900/20 bg-vl-white-100 shadow-xs"
                  : "border-vl-dark-900/10 hover:border-vl-dark-900/20 bg-white"
            }`}
          >
            <div className="min-w-0">
              {/* Top Row: Label badge & default check */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-vl-dark-900 min-w-0 flex-1 truncate text-xs font-bold tracking-wider uppercase">
                  {label}
                </span>

                {address.isDefault && (
                  <span className="bg-vl-dark-900 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-normal tracking-wider text-white uppercase">
                    <Check className="size-2.5" />
                    Default
                  </span>
                )}
              </div>

              {/* Address details */}
              <address className="text-vl-dark-900 mt-3 text-xs leading-relaxed break-words not-italic">
                <p className="font-normal break-words">{address.street}</p>
                <p className="mt-0.5 break-words text-neutral-500">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="break-words text-neutral-500">{address.country}</p>
              </address>
            </div>

            {/* Bottom Actions */}
            <div className="border-vl-dark-900/8 mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3.5">
              {onEdit ? (
                <Button
                  type="button"
                  variant={isEditingThis ? "brand" : "outline"}
                  size="sm"
                  onClick={() => onEdit(address)}
                >
                  <Pencil className="size-3" />
                  <span>{isEditingThis ? "Editing..." : "Edit"}</span>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/account/addresses/${address.id}/edit`}>
                    <Pencil className="size-3 text-neutral-500" />
                    <span>Edit</span>
                  </Link>
                </Button>
              )}

              {/* <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(address.id)}
                disabled={isDeleting}
                className="text-neutral-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="size-3" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </Button> */}
            </div>
          </article>
        );
      })}
    </div>
  );
}
