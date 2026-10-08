import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCustomerReturnById } from "@/lib/account/queries";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Price } from "@/components/storefront/price";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const request = await getCustomerReturnById(id);
  return { title: request ? `Return for Order ${request.order.orderNumber} | VibeLock` : "Return | VibeLock", robots: { index: false, follow: false } };
}

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getCustomerReturnById(id);
  if (!request) notFound();

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-4xl">
        <Link href="/account/returns" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#101114]"><ArrowLeft className="size-4" /> Back to returns</Link>
        <header className="mb-8 border-b border-[#101114]/15 pb-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Customer area / Returns</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Return request</h1><p className="mt-2 text-sm text-muted-foreground">Order <Link className="underline-offset-4 hover:underline" href={`/account/orders/${request.order.orderNumber}`}>{request.order.orderNumber}</Link></p></header>
        <div className="space-y-6">
          <section className="border border-[#101114]/10 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Status</h2><span className="border border-[#101114]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{request.status}</span></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Requested</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(request.createdAt)}</dd></div><div><dt className="text-muted-foreground">Reason</dt><dd className="mt-1 font-medium">{request.reason || "Not provided"}</dd></div><div><dt className="text-muted-foreground">Requested refund</dt><dd className="mt-1"><Price amount={request.requestedAmount} className="font-semibold" /></dd></div></dl></section>
          <section className="border border-[#101114]/10 bg-white"><h2 className="border-b border-[#101114]/10 px-5 py-4 text-xl font-semibold">Returned items</h2><ul className="divide-y divide-[#101114]/10 px-5">{request.items.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div><p className="font-semibold">{item.orderItem.productName}</p><p className="mt-1 text-muted-foreground">{item.orderItem.sku}{item.orderItem.size ? ` · ${item.orderItem.size}` : ""}{item.orderItem.color ? ` · ${item.orderItem.color}` : ""}</p></div><span>{item.quantity} × <Price amount={item.orderItem.unitPrice} /></span></li>)}</ul></section>
          {request.refunds.length ? <section className="border border-[#101114]/10 bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Refunds</h2><ul className="mt-4 space-y-3 text-sm">{request.refunds.map((refund) => <li key={refund.id} className="flex justify-between gap-4 border-b border-[#101114]/10 pb-3"><span className="text-muted-foreground">{refund.status}</span><Price amount={refund.amount} className="font-semibold" /></li>)}</ul></section> : null}
        </div>
      </Container>
    </Section>
  );
}
