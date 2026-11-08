import Link from "next/link";
import { ArrowRight, Plus, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AddressItem {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  country: string;
  isDefault: boolean;
}

interface AccountAddressesCardProps {
  addresses: AddressItem[];
  userName: string | null;
}

export function AccountAddressesCard({ addresses, userName }: AccountAddressesCardProps) {
  return (
    <Card variant="brand" className="flex flex-col justify-between p-4 sm:p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-vl-black/8 pb-3.5 sm:pb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-vl-dark-900 uppercase sm:text-base">
              Saved Addresses
            </h3>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
              Primary and alternative shipping destinations
            </p>
          </div>
          <Link
            href="/account/profile#addresses"
            className="group inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-600 transition-colors hover:text-vl-dark-900"
          >
            <span>Manage</span>
            <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-vl-dark-900" />
          </Link>
        </div>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            <p>You have no saved addresses yet.</p>
            <p className="mt-1">Save a delivery location for expedited checkout.</p>
          </div>
        ) : (
          <div className="divide-y divide-vl-black/6">
            {addresses.slice(0, 2).map((addr) => {
              const label =
                addr.label || (addr.isDefault ? "Primary Address" : "Alternate Address");
              return (
                <div key={addr.id} className="py-3.5 first:pt-4 last:pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-vl-dark-900">{label}</span>
                      {addr.isDefault && (
                        <Badge variant="secondary" size="sm" className="gap-1 font-semibold">
                          <Check className="size-2.5" />
                          Default
                        </Badge>
                      )}
                    </div>

                    <Link
                      href={`/account/addresses/${addr.id}/edit`}
                      className="inline-flex min-h-9 items-center gap-1 text-xs font-normal text-neutral-500 hover:text-vl-dark-900"
                      aria-label={`Edit ${label}`}
                    >
                      <Pencil className="size-3" />
                      <span>Edit</span>
                    </Link>
                  </div>

                  <div className="mt-1 text-xs leading-relaxed text-neutral-600">
                    <p className="font-normal text-vl-dark-900">{userName || "Recipient"}</p>
                    <p className="mt-0.5">{addr.street}</p>
                    <p>
                      {addr.city} {addr.zip ? `- ${addr.zip}` : ""}, {addr.country}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Address Button */}
      <div className="mt-5 border-t border-vl-black/8 pt-4">
        <Link
          href="/account/profile#addresses"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-vl-black/15 bg-white py-2.5 text-xs font-semibold text-vl-dark-900 transition-colors hover:bg-neutral-100 active:scale-99"
        >
          <Plus className="size-3.5" />
          <span>Add New Address</span>
        </Link>
      </div>
    </Card>
  );
}
