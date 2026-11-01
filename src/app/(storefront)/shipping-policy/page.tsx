import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";
import { Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | VibeLock",
  description:
    "Learn about VibeLock delivery timelines, courier coverage, shipping rates across Dhaka and all 64 districts of Bangladesh via Steadfast Courier.",
  alternates: { canonical: `${SITE_URL}/shipping-policy` },
  openGraph: {
    title: "Shipping & Delivery Policy | VibeLock",
    description: "Nationwide delivery times, costs, and packaging standards for VibeLock garments.",
    url: `${SITE_URL}/shipping-policy`,
  },
};

export default function ShippingPolicyPage() {
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
            <Truck className="size-4" />
            <span>Fulfillment Operations</span>
          </div>
          <h1 className="font-heading mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#F3F0E8]/70 sm:text-base">
            From our Dhaka fulfillment center to your doorstep. Transparent rates, fast couriers,
            and safe parcel tracking across all 64 districts of Bangladesh.
          </p>
          <div className="mt-6 flex items-center gap-4 text-xs text-[#F3F0E8]/50">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Nationwide Coverage</span>
          </div>
        </Container>
      </section>

      {/* ── Content ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Content */}
            <div className="space-y-10 lg:col-span-8">
              {/* Delivery Rates Comparison */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="border border-[#101114]/15 bg-white p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-wider text-[#00D9FF] uppercase">
                      Inside Dhaka
                    </span>
                    <span className="rounded-full bg-[#101114]/5 px-2.5 py-1 text-xs font-semibold text-[#101114]">
                      Fast Delivery
                    </span>
                  </div>
                  <h3 className="font-heading mt-4 text-2xl font-bold text-[#101114]">
                    24 – 48 Hours
                  </h3>
                  <p className="mt-1 text-xs text-[#101114]/70">Standard Home Delivery</p>
                  <div className="mt-6 border-t border-[#101114]/10 pt-4">
                    <p className="text-2xl font-black text-[#101114]">৳ 60.00</p>
                    <p className="mt-1 text-xs text-[#101114]/60">Flat delivery fee</p>
                  </div>
                </div>

                <div className="border border-[#101114]/15 bg-white p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-wider text-[#00D9FF] uppercase">
                      Outside Dhaka
                    </span>
                    <span className="rounded-full bg-[#101114]/5 px-2.5 py-1 text-xs font-semibold text-[#101114]">
                      All 64 Districts
                    </span>
                  </div>
                  <h3 className="font-heading mt-4 text-2xl font-bold text-[#101114]">
                    2 – 4 Days
                  </h3>
                  <p className="mt-1 text-xs text-[#101114]/70">Doorstep &amp; Thana Hubs</p>
                  <div className="mt-6 border-t border-[#101114]/10 pt-4">
                    <p className="text-2xl font-black text-[#101114]">৳ 120.00</p>
                    <p className="mt-1 text-xs text-[#101114]/60">Flat nationwide fee</p>
                  </div>
                </div>
              </div>

              {/* Section 1: Courier Partner */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  1. Official Courier Partner: Steadfast Courier
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    All domestic VibeLock parcels are dispatched through{" "}
                    <strong>Steadfast Courier</strong>, one of Bangladesh&apos;s leading logistics
                    networks.
                  </p>
                  <p>
                    Once your order is picked up from our warehouse, you will receive an SMS and
                    email with a direct <strong>Steadfast Tracking Consignment Code</strong> to
                    monitor your parcel in real time.
                  </p>
                </div>
              </div>

              {/* Section 2: Order Cutoff & Fulfillment */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  2. Order Processing &amp; Daily Cut-off
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <strong>Same-Day Dispatch:</strong> Orders placed before{" "}
                      <strong>4:00 PM</strong> (Saturday to Thursday) are verified, packed, and
                      handed to the courier the same day.
                    </li>
                    <li>
                      <strong>Friday &amp; Public Holidays:</strong> Orders placed on Fridays or
                      national holidays are processed and dispatched on the immediate next business
                      day.
                    </li>
                    <li>
                      <strong>Order Verification:</strong> For Cash on Delivery orders, our
                      automated SMS or customer care desk may verify your delivery address to ensure
                      prompt handover.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 3: Package Inspection */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  3. Parcel Handover &amp; Inspection Rules
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    For safe transit, every VibeLock garment is packaged in our custom protective
                    poly mailer with tamper-evident security sealing.
                  </p>
                  <p>
                    <strong>Inspection guidelines:</strong>
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      Inspect the exterior parcel seal in front of the delivery rider before taking
                      possession.
                    </li>
                    <li>
                      If the outer parcel is torn, opened, or heavily taped over, refuse to accept
                      and notify us immediately.
                    </li>
                    <li>
                      Per standard courier rules, you may open the parcel and try on the garment
                      after handing the COD invoice payment to the delivery rider. If the size does
                      not fit, our 7-day exchange policy guarantees a seamless swap.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 4: Delays */}
              <div className="border border-[#101114]/10 bg-white p-6 sm:p-8">
                <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                  4. Unforeseen Delays &amp; Remote Upazilas
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#101114]/80">
                  <p>
                    During periods of extreme weather (monsoon floods, cyclones), political strikes
                    (Hartal/Blockade), or peak Eid festive rushes, delivery times may be extended by
                    24 to 48 hours. Our tracking team actively follows up with local hubs to ensure
                    timely delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Track Your Parcel
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#101114]/70">
                  Already placed an order? View live fulfillment updates and courier notes:
                </p>
                <div className="mt-4">
                  <Link
                    href="/account/orders"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#101114] px-4 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85"
                  >
                    <span>Track in My Account</span>
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
                      href="/return-policy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Return &amp; Exchange Policy</span>
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
