import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  PackageSearch,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { Container } from "@/components/shared/container";
import { ContactForm } from "@/components/storefront/contact/contact-form";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Contact Us | VibeLock HQ & Flagship",
  description:
    "Get in touch with the VibeLock crew. Order inquiries, size guidance, store visits, and customer support across Bangladesh.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "Contact VibeLock | Direct Support & Flagship Outlet",
    description:
      "Get in touch with our team for orders, sizing assistance, and retail outlet details.",
    url: `${SITE_URL}/contact`,
  },
};

const FAQS = [
  {
    q: "How does VibeLock sizing work?",
    a: "Our garments feature a true boxy, drop-shoulder streetwear cut. If you prefer a relaxed, oversized drape, take your normal size. If you prefer a standard fitted look, we recommend sizing down one size.",
  },
  {
    q: "How long does delivery take inside and outside Dhaka?",
    a: "Orders inside Dhaka are delivered within 24 to 48 hours. Orders across all other districts in Bangladesh typically arrive within 2 to 4 business days via Steadfast Courier.",
  },
  {
    q: "Can I return or exchange an item if the size is incorrect?",
    a: "Yes! We offer a straightforward 7-day exchange window for any unwashed, unworn item with original tags attached. You can also request an exchange directly from your account dashboard.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support Cash on Delivery (COD) nationwide, alongside instant digital payments via bKash, Nagad, Visa, Mastercard, and SSLCOMMERZ.",
  },
];

export default function ContactPage() {
  return (
    <div className="flex flex-col bg-[#F3F0E8] text-[#101114]">
      {/* ── 1. Hero Header Banner ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#090D11] py-16 text-[#F3F0E8] sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-1/4 size-80 rounded-full bg-[#00D9FF]/10 blur-3xl"
        />

        <Container className="relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-[#00D9FF] uppercase">
              <span className="size-1.5 rounded-full bg-[#00D9FF]" />
              <span>DIRECT LINE // 24/7 ASSISTANCE</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white uppercase sm:text-5xl">
              CONNECT WITH VIBELOCK
            </h1>

            <p className="mt-4 text-xs leading-relaxed text-[#F3F0E8]/70 sm:text-sm">
              Have questions about recent drops, parcel tracking, or fabric specifications? Reach
              out directly to our Dhaka HQ crew or visit our physical flagship outlet.
            </p>
          </div>
        </Container>
      </section>

      {/* ── 2. Split Contact Interface ── */}
      <section className="py-14 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Direct Touchpoints & Store Location (Col 5) */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Card 1: Direct Hotline & Channels */}
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#0088A8] uppercase">
                  CUSTOMER SUPPORT
                </span>
                <h3 className="mt-1 text-base font-black text-[#101114] uppercase">DIRECT COMMS</h3>

                <div className="mt-5 flex flex-col gap-4 text-xs">
                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F0E8] text-[#101114]">
                      <Phone className="size-4 text-[#0088A8]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101114]">01311-333277</p>
                      <p className="text-[11px] text-[#101114]/60">Everyday: 10:00 AM – 10:00 PM</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F0E8] text-[#101114]">
                      <Mail className="size-4 text-[#0088A8]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101114]">support@vibelock.com</p>
                      <p className="text-[11px] text-[#101114]/60">
                        Average response time: 2–4 hours
                      </p>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F0E8] text-[#101114]">
                      <Clock className="size-4 text-[#0088A8]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#101114]">Online Dispatch Operations</p>
                      <p className="text-[11px] text-[#101114]/60">
                        7 Days a week (excluding national holidays)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Flagship Retail Outlet */}
              <div className="rounded-2xl border border-black/10 bg-[#101114] p-6 text-[#F3F0E8] shadow-md">
                <div className="flex items-center gap-1.5 text-[#00D9FF]">
                  <MapPin className="size-3.5" />
                  <span className="text-[10px] font-black tracking-wider uppercase">
                    FLAGSHIP OUTLET
                  </span>
                </div>
                <h3 className="mt-2 text-base font-black text-white uppercase">CHATMOHAR STORE</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#F3F0E8]/75">
                  Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh
                </p>
                <p className="mt-2 text-xs font-medium text-[#00D9FF]">
                  Direct Store Contact: 01311-333277
                </p>

                <a
                  href="https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#00D9FF] hover:text-[#101114]"
                >
                  <span>GET DIRECTIONS</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {/* Card 3: Quick Self-Service Links */}
              <div className="rounded-2xl border border-black/10 bg-[#EAE6DD] p-6">
                <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#0088A8] uppercase">
                  SELF-SERVICE
                </span>
                <h3 className="mt-1 text-sm font-black text-[#101114] uppercase">
                  FAST TRACK ACTIONS
                </h3>

                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href="/account/orders"
                    className="flex items-center justify-between rounded-lg bg-white p-3 text-xs font-bold text-[#101114] transition-colors hover:bg-black hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <PackageSearch className="size-4 text-[#0088A8]" />
                      <span>Track Order Status</span>
                    </div>
                    <span>→</span>
                  </Link>

                  <Link
                    href="/account/returns"
                    className="flex items-center justify-between rounded-lg bg-white p-3 text-xs font-bold text-[#101114] transition-colors hover:bg-black hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="size-4 text-[#0088A8]" />
                      <span>Start Return or Exchange</span>
                    </div>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Contact Form (Col 7) */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 3. Frequently Asked Questions Section ── */}
      <section className="border-t border-black/10 bg-[#EFECE3] py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-extrabold tracking-[0.25em] text-[#0088A8] uppercase">
              QUICK ANSWERS
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl">
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-[#0088A8]" />
                  <h4 className="text-xs font-black text-[#101114] uppercase">{faq.q}</h4>
                </div>
                <p className="mt-3 pl-6.5 text-xs leading-relaxed text-[#101114]/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
