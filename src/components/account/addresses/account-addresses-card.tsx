import Link from "next/link";
import { ArrowRight, Plus, Pencil, Check } from "lucide-react";

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
    <div className="flex flex-col justify-between rounded-xl border border-[#101114]/8 bg-white p-4 sm:p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/8 pb-3.5 sm:pb-4">
          <div>
            <h3 className="text-sm font-black tracking-tight text-[#101114] uppercase sm:text-base">
              Saved Addresses
            </h3>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
              Primary and alternative shipping destinations
            </p>
          </div>
          <Link
            href="/account/profile#addresses"
            className="group inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-neutral-600 transition-colors hover:text-[#101114]"
          >
            <span>Manage</span>
            <ArrowRight className="size-3 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#101114]" />
          </Link>
        </div>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            <p>You have no saved addresses yet.</p>
            <p className="mt-1">Save a delivery location for expedited checkout.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#101114]/6">
            {addresses.slice(0, 2).map((addr) => {
              const label = addr.label || (addr.isDefault ? "Primary Address" : "Alternate Address");
              return (
                <div key={addr.id} className="py-3.5 first:pt-4 last:pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#101114]">{label}</span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                          <Check className="size-2.5" />
                          Default
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/account/addresses/${addr.id}/edit`}
                      className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-[#101114]"
                      aria-label={`Edit ${label}`}
                    >
                      <Pencil className="size-3" />
                      <span>Edit</span>
                    </Link>
                  </div>

                  <div className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    <p className="font-semibold text-[#101114]">{userName || "Recipient"}</p>
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
      <div className="mt-5 border-t border-[#101114]/8 pt-4">
        <Link
          href="/account/profile#addresses"
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#101114]/15 bg-white py-2.5 text-xs font-bold text-[#101114] transition-colors hover:bg-neutral-100 active:scale-99"
        >
          <Plus className="size-3.5" />
          <span>Add New Address</span>
        </Link>
      </div>
    </div>
  );
}
