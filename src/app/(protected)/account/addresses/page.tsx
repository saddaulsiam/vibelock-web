import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getCustomerAddresses } from "@/lib/account/queries";
import { AddressList } from "@/components/account/address-list";
import { AddressForm } from "@/components/account/address-form";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = { title: "Addresses | VibeLock", robots: { index: false, follow: false } };

export default async function AddressesPage() {
  const addresses = await getCustomerAddresses();
  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-5xl">
        <Link href="/account" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#101114]"><ArrowLeft className="size-4" /> Back to account</Link>
        <header className="mb-8 border-b border-[#101114]/15 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Customer area</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div><h1 className="text-3xl font-semibold tracking-tight">Addresses</h1><p className="mt-2 text-sm text-muted-foreground">Manage addresses available for future checkout.</p></div>
            <span className="text-sm text-muted-foreground">{addresses.length} saved</span>
          </div>
        </header>
        {addresses.length ? <AddressList addresses={addresses} /> : <p className="border border-dashed border-[#101114]/20 bg-white/65 px-5 py-10 text-sm text-muted-foreground">You have no saved addresses yet.</p>}
        <section className="mt-8 border border-[#101114]/10 bg-white p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><Plus className="size-5" /> Add address</h2>
          <AddressForm />
        </section>
      </Container>
    </Section>
  );
}
