import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { AddressForm } from "@/components/account/address-form";

export const metadata: Metadata = {
  title: "Edit Address | VibeLock",
  robots: { index: false, follow: false },
};

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4 mb-5">
          <Link
            href="/account/addresses"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Addresses</span>
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Edit Address
          </span>
        </div>

        <h1 className="text-xl font-black uppercase tracking-tight text-[#101114] sm:text-2xl mb-5">
          Edit Shipping Address
        </h1>

        <AddressForm
          address={{
            ...address,
            label: address.label ?? "",
            state: address.state ?? "",
            zip: address.zip ?? "",
          }}
        />
      </div>
    </div>
  );
}
