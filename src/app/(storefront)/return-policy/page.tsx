import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";
import { RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Return & Exchange Policy | VibeLock",
  description:
    "Review VibeLock's 7-day hassle-free return and exchange policy. Sizing swaps, return eligibility, inspection standards, and refund timelines across Bangladesh.",
  alternates: { canonical: `${SITE_URL}/return-policy` },
  openGraph: {
    title: "Return & Exchange Policy | VibeLock",
    description: "7-day seamless return & size exchange policy for VibeLock streetwear garments.",
    url: `${SITE_URL}/return-policy`,
  },
};

export default function ReturnPolicyPage() {
  const lastUpdated = "November 1, 2026";

  return (
    <div className="flex flex-col bg-[#F3F0E8] text-[#101114]">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#090D11] pt-24 pb-16 text-[#F3F0E8] sm:pt-28 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[36px_36px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-1/4 size-80 rounded-full bg-[#00D9FF]/10 blur-3xl"
        />

        <Container className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#00D9FF] uppercase">
            <RotateCcw className="size-4" />
            <span>Customer First</span>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-black tracking-tight text-white sm:text-5xl">
            Return &amp; Exchange Policy
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#F3F0E8]/70 sm:text-base">
            Streetwear should fit right. If the fit isn&apos;t what you envisioned, our 7-day exchange
            policy has you covered nationwide.
          </p>
          <div className="mt-6 flex items-center gap-4 text-xs text-[#F3F0E8]/50">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>7-Day Hassle-Free Window</span>
          </div>
        </Container>
      </section>

      {/* ── Content ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Content */}
            <div className="space-y-10 lg:col-span-8">
              {/* Highlight Box */}
              <div className="border border-emerald-300 bg-emerald-50/70 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="font-heading text-base font-bold text-emerald-900 sm:text-lg">
                      7-Day Exchange Guarantee
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                      You have <strong>7 calendar days</strong> from the delivery timestamp to initiate
                      a return or size exchange for any unworn, unwashed VibeLock garment with its
                      original tags intact.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Conditions */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  1. Return &amp; Exchange Eligibility
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>To qualify for an exchange or refund, the garment must satisfy these standards:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>The item must be in brand-new condition: unworn, unwashed, and unaltered.</li>
                    <li>Original brand tags, barcode labels, and poly packaging must be intact.</li>
                    <li>
                      Free from perfume, deodorant stains, body odor, smoke, or pet hair.
                    </li>
                    <li>
                      Accompanied by the original order invoice or packing slip.
                    </li>
                  </ul>
                  <div className="mt-4 rounded-xs border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                    <p className="font-semibold">⚠️ Non-Returnable Items:</p>
                    <p className="mt-1">
                      For hygiene reasons, innerwear, socks, and discounted clearance / &quot;Final Sale&quot;
                      items cannot be returned unless a manufacturing defect is proven upon unboxing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: How to Initiate */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  2. How to Initiate a Return or Size Swap
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#101114]/80">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101114] text-xs font-bold text-white">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-[#101114]">Submit Request Online</p>
                        <p className="text-xs text-[#101114]/70">
                          Visit your{" "}
                          <Link href="/account/orders" className="text-[#00D9FF] underline font-medium">
                            Account Orders page
                          </Link>{" "}
                          and click &quot;Request Return / Exchange&quot; next to the delivered item.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101114] text-xs font-bold text-white">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-[#101114]">Inspection &amp; Courier Handover</p>
                        <p className="text-xs text-[#101114]/70">
                          Pack the garment safely. In Dhaka, our courier will pick it up or swap it at
                          your doorstep. Outside Dhaka, you can drop it off via Steadfast / Sundarban
                          to our central hub.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101114] text-xs font-bold text-white">
                        3
                      </span>
                      <div>
                        <p className="font-semibold text-[#101114]">Resolution (Swap or Refund)</p>
                        <p className="text-xs text-[#101114]/70">
                          Once inspected (typically within 24 hours of arrival), your replacement size
                          is dispatched immediately or your refund is issued.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Shipping Costs */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  3. Exchange Shipping Charges
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    <strong>If VibeLock made an error:</strong> (e.g. wrong size sent, defective
                    stitching, damaged parcel) — we cover 100% of the return and redelivery shipping
                    costs.
                  </p>
                  <p>
                    <strong>If you want a size/style preference change:</strong> The customer covers
                    the nominal return courier fee (৳ 60 inside Dhaka, ৳ 120 outside Dhaka).
                  </p>
                </div>
              </div>

              {/* Section 4: Refund Timelines */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  4. Refund Methods &amp; Timelines
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>When a refund is approved, you may choose:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <strong>VibeLock Store Credit:</strong> Issued instantly to your account with no
                      expiry date.
                    </li>
                    <li>
                      <strong>Mobile Financial Service (bKash / Nagad):</strong> Credited back to your
                      account within <strong>3 to 5 business days</strong>.
                    </li>
                    <li>
                      <strong>Card / Net Banking:</strong> Dispatched through SSLCOMMERZ gateway within{" "}
                      <strong>5 to 10 business days</strong> depending on your issuing bank.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Links Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Self-Service Returns
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#101114]/70">
                  Have an existing order? Start your return or exchange online in under 2 minutes:
                </p>
                <div className="mt-4">
                  <Link
                    href="/account/orders"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#101114] px-4 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85"
                  >
                    <span>Go to My Orders</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Related Policies
                </h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link
                      href="/shipping-policy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Shipping Policy</span>
                      <span className="text-xs text-[#101114]/40">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Terms of Service</span>
                      <span className="text-xs text-[#101114]/40">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Privacy Policy</span>
                      <span className="text-xs text-[#101114]/40">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Frequently Asked Questions</span>
                      <span className="text-xs text-[#101114]/40">→</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
