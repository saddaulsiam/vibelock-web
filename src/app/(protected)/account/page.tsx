import Link from "next/link";
import { ArrowRight, Package, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export default function AccountPage() {
  return (
    <Section className="min-h-[60vh] bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-5xl">
        <header className="mb-8 border-b border-[#101114]/15 pb-6 sm:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Customer area
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
            Your account
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage your orders and account security.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <Link
            href="/account/orders"
            className="group flex min-h-44 flex-col justify-between border border-[#101114]/10 bg-white p-5 transition-colors hover:border-[#101114]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-6"
          >
            <Package className="size-6 text-[#101114]" aria-hidden="true" />
            <span className="flex items-end justify-between gap-4">
              <span>
                <span className="block text-lg font-semibold tracking-tight text-[#101114]">Your orders</span>
                <span className="mt-1 block text-sm text-muted-foreground">Review order status and details.</span>
              </span>
              <ArrowRight className="mb-1 size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>

          <Link
            href="/account/security"
            className="group flex min-h-44 flex-col justify-between border border-[#101114]/10 bg-white p-5 transition-colors hover:border-[#101114]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-6"
          >
            <ShieldCheck className="size-6 text-[#101114]" aria-hidden="true" />
            <span className="flex items-end justify-between gap-4">
              <span>
                <span className="block text-lg font-semibold tracking-tight text-[#101114]">Account security</span>
                <span className="mt-1 block text-sm text-muted-foreground">Manage password and active sessions.</span>
              </span>
              <ArrowRight className="mb-1 size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
