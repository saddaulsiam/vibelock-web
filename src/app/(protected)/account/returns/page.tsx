import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { getCustomerReturns } from "@/lib/account/queries";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Price } from "@/components/storefront/price";

export const metadata: Metadata = { title: "Returns | VibeLock", robots: { index: false, follow: false } };

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getCustomerReturns(page);

  return (
    <Section className="min-h-screen bg-[#F3F0E8] py-8 sm:py-12">
      <Container className="max-w-5xl">
        <Link href="/account" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#101114]"><ArrowLeft className="size-4" /> Back to account</Link>
        <header className="mb-8 border-b border-[#101114]/15 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Customer area</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">Returns</h1><p className="mt-2 text-sm text-muted-foreground">Track return requests and refund information.</p></div><span className="text-sm text-muted-foreground">{result.total} total</span></div>
        </header>
        {result.returns.length === 0 ? (
          <div className="border border-dashed border-[#101114]/20 bg-white/65 px-5 py-16 text-center"><RotateCcw className="mx-auto mb-4 size-8 text-muted-foreground" /><h2 className="text-xl font-semibold">No returns yet</h2><p className="mt-2 text-sm text-muted-foreground">Eligible return requests will appear here.</p></div>
        ) : (
          <div className="space-y-4">
            {result.returns.map((request) => (
              <article key={request.id} className="border border-[#101114]/10 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div><Link href={`/account/returns/${request.id}`} className="font-semibold underline-offset-4 hover:underline">Return request</Link><p className="mt-1 text-sm text-muted-foreground">Order <Link href={`/account/orders/${request.order.orderNumber}`} className="underline-offset-4 hover:underline">{request.order.orderNumber}</Link></p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(request.createdAt)}</p></div>
                  <span className="border border-[#101114]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{request.status}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#101114]/10 bg-[#F3F0E8]/55 px-5 py-4 text-sm"><span className="text-muted-foreground">{request.itemCount} {request.itemCount === 1 ? "item" : "items"}</span><span>Requested refund <Price amount={request.requestedAmount} className="font-semibold" /></span><Link href={`/account/returns/${request.id}`} className="inline-flex items-center gap-1 font-semibold">Details <ArrowRight className="size-4" /></Link></div>
              </article>
            ))}
            {result.totalPages > 1 ? <nav className="flex justify-center gap-4 pt-4 text-sm"><Link aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none text-muted-foreground/50" : "font-medium"} href={`/account/returns?page=${page - 1}`}>Previous</Link><span>Page {page} of {result.totalPages}</span><Link aria-disabled={page >= result.totalPages} className={page >= result.totalPages ? "pointer-events-none text-muted-foreground/50" : "font-medium"} href={`/account/returns?page=${page + 1}`}>Next</Link></nav> : null}
          </div>
        )}
      </Container>
    </Section>
  );
}
