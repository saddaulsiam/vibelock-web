import type { Metadata } from "next";
import { Plus, MapPin } from "lucide-react";
import { getCustomerAddresses } from "@/lib/account/queries";
import { AddressList } from "@/components/account/address-list";
import { AddressForm } from "@/components/account/address-form";

export const metadata: Metadata = {
  title: "Saved Addresses | VibeLock",
  description: "Manage your saved delivery addresses for fast streetwear checkout.",
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  const addresses = await getCustomerAddresses();

  return (
    <div className="flex flex-col gap-6">
      {/* Saved Addresses List Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#101114]/10 pb-5">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
              Shipping Addresses
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Manage saved delivery locations for future drops and orders.
            </p>
          </div>
          <span className="rounded-full bg-[#101114]/5 px-3 py-1 text-xs font-bold text-[#101114]">
            {addresses.length} {addresses.length === 1 ? "Saved Address" : "Saved Addresses"}
          </span>
        </div>

        {addresses.length ? (
          <AddressList addresses={addresses} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F0E8]">
              <MapPin className="size-6" />
            </div>
            <h2 className="mt-3 text-sm font-bold text-[#101114]">No saved addresses yet</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Add your delivery address below for quick checkout on new seasonal drops.
            </p>
          </div>
        )}
      </div>

      {/* Add New Address Form Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
          <Plus className="size-4.5 text-[#0099b8]" />
          <span>Add New Address</span>
        </h2>
        <AddressForm />
      </div>
    </div>
  );
}
