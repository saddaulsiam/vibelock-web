import Link from "next/link";
import { ArrowRight, MapPin, Package, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { getAccountOverview } from "@/lib/account/queries";
import { Price } from "@/components/storefront/price";
import { OrderStatusBadge } from "@/components/storefront/orders/order-status-badge";

export default async function AccountPage() {
  const account = await getAccountOverview();
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
            Welcome back, {account.profile.name || "there"}. Manage your VibeLock account and orders.
          </p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="border border-[#101114]/10 bg-white p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Orders</p><p className="mt-2 text-3xl font-semibold">{account.orderCount}</p></div>
          <div className="border border-[#101114]/10 bg-white p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Returns</p><p className="mt-2 text-3xl font-semibold">{account.returnCount}</p></div>
          <div className="border border-[#101114]/10 bg-white p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Member since</p><p className="mt-2 text-sm font-semibold">{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(account.profile.createdAt)}</p></div>
        </div>

        <div className="mb-8 border border-[#101114]/10 bg-white p-5 sm:p-6"><p className="text-sm font-semibold">{account.profile.name || "VibeLock customer"}</p><p className="mt-1 text-sm text-muted-foreground">{account.profile.email}</p></div>

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

          <Link href="/account/returns" className="group flex min-h-44 flex-col justify-between border border-[#101114]/10 bg-white p-5 transition-colors hover:border-[#101114]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-6">
            <RotateCcw className="size-6 text-[#101114]" aria-hidden="true" /><span className="flex items-end justify-between gap-4"><span><span className="block text-lg font-semibold tracking-tight">Returns</span><span className="mt-1 block text-sm text-muted-foreground">Track your return requests.</span></span><ArrowRight className="mb-1 size-5" aria-hidden="true" /></span>
          </Link>
          <Link href="/account/addresses" className="group flex min-h-44 flex-col justify-between border border-[#101114]/10 bg-white p-5 transition-colors hover:border-[#101114]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-6">
            <MapPin className="size-6 text-[#101114]" aria-hidden="true" /><span className="flex items-end justify-between gap-4"><span><span className="block text-lg font-semibold tracking-tight">Addresses</span><span className="mt-1 block text-sm text-muted-foreground">Manage saved delivery addresses.</span></span><ArrowRight className="mb-1 size-5" aria-hidden="true" /></span>
          </Link>
          <Link href="/account/profile" className="group flex min-h-44 flex-col justify-between border border-[#101114]/10 bg-white p-5 transition-colors hover:border-[#101114]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:p-6">
            <UserRound className="size-6 text-[#101114]" aria-hidden="true" /><span className="flex items-end justify-between gap-4"><span><span className="block text-lg font-semibold tracking-tight">Profile</span><span className="mt-1 block text-sm text-muted-foreground">Keep your name up to date.</span></span><ArrowRight className="mb-1 size-5" aria-hidden="true" /></span>
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

        <section className="mt-8 border border-[#101114]/10 bg-white">
          <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-4"><h2 className="text-xl font-semibold">Recent orders</h2><Link href="/account/orders" className="text-sm font-semibold hover:underline">View all</Link></div>
          {account.recentOrders.length ? <ul className="divide-y divide-[#101114]/10">{account.recentOrders.map((order) => <li key={order.orderNumber} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><Link href={`/account/orders/${order.orderNumber}`} className="font-semibold hover:underline">{order.orderNumber}</Link><div className="flex items-center gap-3"><OrderStatusBadge status={order.status} /><Price amount={order.total} className="font-semibold" /></div></li>)}</ul> : <p className="px-5 py-8 text-sm text-muted-foreground">Your recent orders will appear here.</p>}
        </section>
      </Container>
    </Section>
  );
}
