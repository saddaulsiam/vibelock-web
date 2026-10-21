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
        <div className="mb-5 flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Link
            href="/account/addresses"
            className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Addresses</span>
          </Link>
          <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
            Edit Address
          </span>
        </div>

        <h1 className="mb-5 text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
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
