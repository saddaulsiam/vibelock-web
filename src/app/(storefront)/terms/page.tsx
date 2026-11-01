import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";
import { ShieldCheck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | VibeLock",
  description:
    "Review the terms, conditions, and legal policies governing purchases, services, and operations at VibeLock Bangladesh.",
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: "Terms of Service | VibeLock",
    description: "Official customer agreement and terms of service for VibeLock.",
    url: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
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
            <Scale className="size-4" />
            <span>Legal Framework</span>
          </div>
          <h1 className="font-heading mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#F3F0E8]/70 sm:text-base">
            Please read these terms and conditions carefully before using VibeLock services or
            placing orders on our platform.
          </p>
          <div className="mt-6 flex items-center gap-4 text-xs text-[#F3F0E8]/50">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Applicable across Bangladesh</span>
          </div>
        </Container>
      </section>

      {/* ── Content ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Legal Content */}
            <div className="space-y-10 lg:col-span-8">
              {/* Section 1 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  1. Acceptance of Terms
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    By accessing or using the VibeLock website (vibelock.bd), mobile web interfaces,
                    or purchasing products through any of our channels, you agree to be bound by
                    these Terms of Service, our Privacy Policy, and all applicable laws and
                    regulations in the People&apos;s Republic of Bangladesh.
                  </p>
                  <p>
                    If you do not agree with any part of these terms, you must discontinue your use
                    of our services immediately.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  2. Products, Sizing &amp; Pricing
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    All products displayed on VibeLock are subject to real-time inventory
                    availability. While we make every effort to display accurate sizing charts,
                    fabric weights, and colors, slight variations may occur due to monitor color
                    calibration and garment dye processes.
                  </p>
                  <p>
                    Prices for our products are stated in Bangladeshi Taka (BDT) and are subject to
                    change without notice. We reserve the right at any time to modify or discontinue
                    any item or drop without liability.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  3. Orders, Checkout &amp; Cancellation
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    Upon placing an order on our platform, you will receive an automated order
                    confirmation. Receipt of an order number does not signify our final acceptance
                    of your order; we reserve the right to decline or cancel any order in instances
                    of suspected fraudulent activity, pricing errors, or stock unavailability.
                  </p>
                  <p>
                    You may cancel an order before it has been dispatched from our fulfillment
                    center by visiting your account dashboard or contacting customer support. Once
                    an order is handed over to our courier partner (Steadfast), it cannot be
                    cancelled but can be exchanged following our Return Policy.
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  4. Payments &amp; Security
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    We offer Cash on Delivery (COD) across Bangladesh, as well as secure online
                    payments via bKash, Nagad, Visa, Mastercard, and SSLCOMMERZ. Online transactions
                    are processed through encrypted gateways; VibeLock does not store raw credit
                    card numbers or banking PINs.
                  </p>
                  <p>
                    For Cash on Delivery orders, you agree to inspect the parcel exterior and pay
                    the exact invoice amount to the delivery rider upon handover.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  5. Intellectual Property
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    All content on this website, including but not limited to brand logos, graphic
                    artworks, product photos, campaign videos, typography, and website designs, is
                    the exclusive intellectual property of VibeLock Bangladesh.
                  </p>
                  <p>
                    Any unauthorized reproduction, modification, distribution, or commercial
                    exploitation of our assets is strictly prohibited and subject to legal action.
                  </p>
                </div>
              </div>

              {/* Section 6 */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  6. Governing Law &amp; Dispute Resolution
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    These Terms of Service and any separate agreements whereby we provide you
                    services shall be governed by and construed in accordance with the laws of the
                    People&apos;s Republic of Bangladesh.
                  </p>
                  <p>
                    Any disputes arising from your use of VibeLock shall be subject to the exclusive
                    jurisdiction of the courts of Dhaka, Bangladesh.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Related Policies
                </h3>
                <ul className="mt-4 space-y-3 text-sm">
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
                      href="/return-policy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Return &amp; Exchange Policy</span>
                      <span className="text-xs text-[#101114]/40">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/shipping-policy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Shipping &amp; Delivery</span>
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

              <div className="border border-[#101114]/10 bg-[#090D11] p-6 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00D9FF] uppercase">
                  <ShieldCheck className="size-4" />
                  <span>Support Desk</span>
                </div>
                <h4 className="mt-2 text-base font-bold">Have a legal inquiry?</h4>
                <p className="mt-2 text-xs leading-relaxed text-white/70">
                  Our operations team is available Saturday to Thursday, 10:00 AM – 8:00 PM.
                </p>
                <div className="mt-4">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-10 items-center justify-center border border-white/20 bg-white/10 px-4 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-white hover:text-black"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
