import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";
import { HelpCircle, ChevronDown, MessageSquare, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | VibeLock",
  description:
    "Find answers to common questions about VibeLock streetwear sizing, orders, shipping timelines, COD, exchanges, and fabric care in Bangladesh.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: "Frequently Asked Questions | VibeLock",
    description: "Everything you need to know about shopping with VibeLock in Bangladesh.",
    url: `${SITE_URL}/faq`,
  },
};

const FAQ_CATEGORIES = [
  {
    category: "Sizing & Garment Fit",
    items: [
      {
        q: "How does VibeLock oversized streetwear sizing fit?",
        a: "Our tees, shirts, and hoodies feature an authentic boxy, drop-shoulder streetwear cut crafted with high-GSM heavyweight fabrics. If you love the modern relaxed streetwear silhouette, choose your normal size. If you prefer a closer, traditional regular fit, order one size down.",
      },
      {
        q: "Where can I view the exact size measurements?",
        a: "Every product page includes an interactive Size Guide tab displaying precise chest circumference, body length, shoulder width, and sleeve measurements in inches.",
      },
      {
        q: "How should I wash and care for heavyweight cotton garments?",
        a: "To preserve the rich garment dye, premium drape, and silkscreen prints, we recommend machine washing in cold water inside out with like colors. Hang to dry in the shade; avoid high-heat tumble dryers and do not iron directly on graphics.",
      },
    ],
  },
  {
    category: "Ordering & Delivery",
    items: [
      {
        q: "How long will my delivery take?",
        a: "Inside Dhaka City: 24 to 48 hours. Across all other 63 districts in Bangladesh: 2 to 4 business days via Steadfast Courier.",
      },
      {
        q: "What are the shipping charges?",
        a: "Delivery inside Dhaka is ৳ 60.00. Delivery outside Dhaka across all districts is ৳ 120.00 flat fee.",
      },
      {
        q: "How do I track my active order?",
        a: "Once dispatched, you will receive an SMS and email with your Steadfast tracking code. You can also view live status anytime under your Account > Orders dashboard.",
      },
      {
        q: "Can I place an order without creating an account?",
        a: "Yes! We support fast guest checkout. However, creating an account lets you track order history, save addresses for 1-click checkout, and submit returns seamlessly.",
      },
    ],
  },
  {
    category: "Payments & Security",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We support nationwide Cash on Delivery (COD), alongside instant digital payments via bKash, Nagad, Visa, Mastercard, and SSLCOMMERZ.",
      },
      {
        q: "Is it safe to pay online on VibeLock?",
        a: "Absolutely. All online card and mobile banking transactions are processed through SSL-encrypted, PCI-DSS compliant financial gateways. VibeLock never sees or stores your banking PIN or CVV.",
      },
    ],
  },
  {
    category: "Returns & Exchanges",
    items: [
      {
        q: "What is your return and size exchange policy?",
        a: "We offer a 7-day hassle-free exchange window from the delivery date for any unworn, unwashed item with tags attached. You can submit an exchange request directly from your Account Orders page.",
      },
      {
        q: "How long does a refund take if I return an item?",
        a: "Once inspected at our hub (within 24 hours of arrival), store credits are issued instantly. Mobile financial refunds (bKash/Nagad) take 3 to 5 business days, and card refunds take 5 to 10 business days depending on your bank.",
      },
    ],
  },
  {
    category: "Outlets & Physical Stores",
    items: [
      {
        q: "Does VibeLock have a physical retail outlet?",
        a: "Yes! You can visit our retail outlet at Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh to try on drops in person.",
      },
      {
        q: "Can I buy online and pick up at the outlet?",
        a: "Yes! If you are local, you can contact our team to reserve an item for in-store pickup and try-on.",
      },
    ],
  },
];

export default function FAQPage() {
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
            <HelpCircle className="size-4" />
            <span>Help Desk</span>
          </div>
          <h1 className="font-heading mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#F3F0E8]/70 sm:text-base">
            Everything you need to know about VibeLock drops, oversized cuts, shipping across
            Bangladesh, and hassle-free exchanges.
          </p>
        </Container>
      </section>

      {/* ── Content ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main FAQ Accordion Lists */}
            <div className="space-y-12 lg:col-span-8">
              {FAQ_CATEGORIES.map((cat) => (
                <div key={cat.category} className="space-y-4">
                  <h2 className="font-heading text-lg font-bold tracking-tight text-[#101114] sm:text-xl">
                    {cat.category}
                  </h2>
                  <div className="space-y-3">
                    {cat.items.map((item) => (
                      <details
                        key={item.q}
                        className="group border border-[#101114]/15 bg-white transition-all [&_summary::-webkit-details-marker]:hidden"
                      >
                        <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-bold text-[#101114] select-none hover:text-[#00D9FF]">
                          <span>{item.q}</span>
                          <span className="ml-4 shrink-0 transition-transform duration-200 group-open:rotate-180">
                            <ChevronDown className="size-4 text-[#101114]/60" />
                          </span>
                        </summary>
                        <div className="border-t border-[#101114]/10 p-5 pt-3 text-xs leading-relaxed text-[#101114]/75 sm:text-sm">
                          <p>{item.a}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Support Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Still have questions?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#101114]/70">
                  Can&apos;t find the answer you&apos;re looking for? Reach out to our customer crew
                  directly:
                </p>
                <div className="mt-4 space-y-3">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#101114] px-4 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85"
                  >
                    <MessageSquare className="size-4" />
                    <span>Send a Message</span>
                  </Link>

                  <a
                    href="https://wa.me/+8801311333277"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[#101114]/20 bg-white px-4 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-[#F3F0E8]"
                  >
                    <span>WhatsApp Support</span>
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </div>

              <div className="border border-[#101114]/15 bg-white p-6">
                <h3 className="font-heading text-sm font-bold tracking-wider text-[#101114] uppercase">
                  Policies &amp; Legal
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
                      href="/return-policy"
                      className="flex items-center justify-between font-medium text-[#101114]/70 transition-colors hover:text-[#00D9FF]"
                    >
                      <span>Return &amp; Exchange</span>
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
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
