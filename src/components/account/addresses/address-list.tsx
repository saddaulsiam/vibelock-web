"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteAddressAction } from "@/lib/account/actions";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
            className={cn(
              "relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 sm:p-5",
              "focus-within:border-vl-cyan/60 focus-within:ring-vl-cyan/20 focus-within:ring-2",
              isEditingThis
                ? "border-vl-cyan ring-vl-cyan/35 shadow-vl-cyan/10 bg-white shadow-md ring-2"
                : address.isDefault
                  ? "border-vl-dark-900/20 bg-vl-white-100/60 hover:border-vl-dark-900/35 shadow-2xs hover:shadow-xs"
                  : "border-vl-dark-900/10 hover:border-vl-dark-900/25 bg-white hover:shadow-2xs"
            )}
          >
            <div className="min-w-0">
              {/* Top Row: Label badge & default check */}
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={isEditingThis ? "brand" : "drop"}
                  dot={isEditingThis ? "pulse" : undefined}
                >
                  {label}
                </Badge>

                {address.isDefault && (
                  <Badge variant="default" size="sm" className="gap-1 font-semibold uppercase">
                    <Check className="size-2.5" />
                    Default
                  </Badge>
                )}
              </div>

              {/* Address details */}
              <address className="text-vl-dark-900 mt-3 text-xs leading-relaxed wrap-break-word not-italic">
                <p className="font-normal wrap-break-word">{address.street}</p>
                <p className="text-muted-foreground mt-0.5 wrap-break-word">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="text-muted-foreground wrap-break-word">{address.country}</p>
              </address>
            </div>

            {/* Bottom Actions */}
            <div className="border-border/60 mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3.5">
              <Button
                type="button"
                variant={isEditingThis ? "ghost" : "outline"}
                size="sm"
                onClick={() => onEdit?.(address)}
              >
                <Pencil className="size-3" />
                <span>{isEditingThis ? "Editing..." : "Edit"}</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(address.id)}
                disabled={isDeleting}
              >
                <Trash2 className="size-3" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
