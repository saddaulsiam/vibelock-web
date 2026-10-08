import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { AddressForm } from "@/components/account/address-form";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = { title: "Edit Address | VibeLock", robots: { index: false, follow: false } };

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-2xl">
        <Link href="/account/addresses" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#101114]"><ArrowLeft className="size-4" /> Back to addresses</Link>
        <header className="mb-8 border-b border-[#101114]/15 pb-6"><h1 className="text-3xl font-semibold tracking-tight">Edit address</h1></header>
        <div className="border border-[#101114]/10 bg-white p-5 sm:p-6">
          <AddressForm address={{ ...address, label: address.label ?? "", state: address.state ?? "", zip: address.zip ?? "" }} />
        </div>
      </Container>
    </Section>
  );
}
