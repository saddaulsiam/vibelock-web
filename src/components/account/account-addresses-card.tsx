import Link from "next/link";
import { MapPin, ArrowRight, Plus, Pencil, CheckCircle2 } from "lucide-react";

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
    <div className="flex flex-col justify-between rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4.5 text-[#101114]" />
            <h3 className="text-base font-bold text-[#101114]">Shipping Addresses</h3>
          </div>
          <Link
            href="/account/addresses"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-[#0099b8] transition-colors hover:text-[#00c2e5]"
          >
            <span>Manage All</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <p>You have no saved addresses yet.</p>
            <p className="mt-1">Add an address for faster checkout.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {addresses.map((addr) => {
              const label = addr.label || (addr.isDefault ? "Home" : "Address");
              return (
                <div
                  key={addr.id}
                  className={`relative rounded-xl border p-3.5 transition-all ${
                    addr.isDefault
                      ? "border-[#00D9FF]/40 bg-[#00D9FF]/5"
                      : "border-[#101114]/10 bg-white hover:border-[#101114]/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        addr.isDefault
                          ? "bg-[#00D9FF]/20 text-[#008ba3]"
                          : "bg-[#101114]/5 text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/account/addresses/${addr.id}/edit`}
                        className="rounded p-1 text-muted-foreground hover:bg-[#101114]/5 hover:text-[#101114]"
                        aria-label={`Edit ${label} address`}
                      >
                        <Pencil className="size-3.5" />
                      </Link>

                      {addr.isDefault ? (
                        <CheckCircle2 className="size-4 text-[#0099b8]" />
                      ) : (
                        <div className="size-3.5 rounded-full border border-muted-foreground/40" />
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs">
                    <p className="font-bold text-[#101114]">{userName || "Customer"}</p>
                    <p className="text-muted-foreground mt-0.5">{addr.street}</p>
                    <p className="text-muted-foreground">
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
      <div className="mt-5 pt-2">
        <Link
          href="/account/addresses"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#101114] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1f2229] active:scale-[0.99]"
        >
          <Plus className="size-4" />
          <span>Add New Address</span>
        </Link>
      </div>
    </div>
  );
}
