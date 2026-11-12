import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";
import { Lock, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | VibeLock",
  description:
    "Learn how VibeLock collects, uses, safeguards, and handles your personal information across our storefront and fulfillment operations in Bangladesh.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "Privacy Policy | VibeLock",
    description: "Official customer privacy and data protection policy of VibeLock Bangladesh.",
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 1, 2026";

  return (
    <div className="bg-vl-white-300 text-vl-dark-900 flex flex-col">
      {/* ── Hero Header ── */}
      <section className="bg-vl-dark-900 text-vl-white-300 relative overflow-hidden border-b border-white/10 pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[36px_36px]"
        />
        <div
          aria-hidden="true"
          className="bg-vl-cyan-50 pointer-events-none absolute top-0 right-1/4 size-80 rounded-full blur-3xl"
        />

        <Container className="relative z-10">
          <div className="tracking-streetwear text-vl-cyan flex items-center gap-2 text-xs font-semibold uppercase">
            <Lock className="size-4" />
            <span>Customer Security</span>
          </div>
          <h1 className="font-heading mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-vl-white-300/70 mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
            Your trust is our foundation. Discover how we protect your data, handle your
            credentials, and ensure secure deliveries across Bangladesh.
          </p>
          <div className="text-vl-white-300/50 mt-6 flex items-center gap-4 text-xs">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Compliant with Digital Security Best Practices</span>
          </div>
        </Container>
      </section>

      {/* ── Content ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Content */}
            <div className="space-y-10 lg:col-span-8">
              {/* Section 1 */}
              <div className="border-vl-dark-900/10 border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
                  1. Information We Collect
                </h2>
                <div className="text-vl-dark-900/80 mt-4 space-y-3 text-sm leading-relaxed">
                  <p>When you create an account, browse, or place an order, we collect:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <strong>Contact &amp; Identification Data:</strong> Your name, phone number,
                      email address, and account credentials.
                    </li>
                    <li>
                      <strong>Delivery Information:</strong> Shipping street address, city,
                      district, and recipient contact number provided at checkout.
                    </li>
                    <li>
                      <strong>Order History &amp; Preferences:</strong> Purchased sizes, colors,
                      transaction amounts, coupon redemptions, and return requests.
                    </li>
                    <li>
                      <strong>Technical &amp; Session Data:</strong> IP address, device browser
                      type, and cookie sessions necessary for cart retention and security
                      rate-limiting.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 2 */}
              <div className="border-vl-dark-900/10 border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
                  2. How We Use Your Data
                </h2>
                <div className="text-vl-dark-900/80 mt-4 space-y-3 text-sm leading-relaxed">
                  <p>
                    We use your information strictly for legitimate commercial and security
                    purposes:
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Fulfilling and delivering your garment orders via our courier partners.</li>
                    <li>
                      Verifying your mobile number via automated SMS OTPs to prevent fraudulent
                      orders and bot spam.
                    </li>
                    <li>
                      Sending order confirmations, tracking updates, and return status
                      notifications.
                    </li>
                    <li>
                      Preventing fraud, unauthorized account access, and brute-force intrusion.
                    </li>
                    <li>
                      Optional newsletter drops and streetwear campaign previews if you have opted
                      in.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 3 */}
              <div className="border-vl-dark-900/10 border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
                  3. Third-Party Disclosures &amp; Partners
                </h2>
                <div className="text-vl-dark-900/80 mt-4 space-y-3 text-sm leading-relaxed">
                  <p>
                    <strong>We never sell or rent your personal data to advertisers.</strong> We
                    only share information with trusted operational partners strictly necessary to
                    provide our service:
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      <strong>Courier Services (Steadfast Courier):</strong> Recipient name,
                      address, phone number, and COD cash collection invoice amount.
                    </li>
                    <li>
                      <strong>Payment Gateways (SSLCOMMERZ, bKash, Nagad):</strong> Secure tokenized
                      payment references. We never receive or store your card CVVs or MFS PINs.
                    </li>
                    <li>
                      <strong>SMS &amp; Email Dispatchers (Resend):</strong> Transactional messages,
                      order receipts, and password resets.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 4 */}
              <div className="border-vl-dark-900/10 border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
                  4. Data Security &amp; Storage
                </h2>
                <div className="text-vl-dark-900/80 mt-4 space-y-3 text-sm leading-relaxed">
                  <p>
                    We employ modern cybersecurity controls including HTTPS TLS encryption,
                    cryptographic password hashing (Bcrypt), and serverless database connection
                    pooling with strict access control.
                  </p>
                  <p>
                    Our administrative panels are protected by multi-role authorization guards.
                    Regular security audits and rate limiters ensure defense against automated
                    attacks.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div className="border-vl-dark-900/10 border bg-white p-6 sm:p-8">
                <h2 className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
                  5. Your Rights &amp; Control
                </h2>
                <div className="text-vl-dark-900/80 mt-4 space-y-3 text-sm leading-relaxed">
                  <p>As a VibeLock customer, you have the right to:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      Access and edit your saved delivery addresses from your account settings.
                    </li>
                    <li>Request account deactivation or deletion of your stored profile.</li>
                    <li>Unsubscribe from promotional emails at any time with a single click.</li>
                  </ul>
                  <p className="mt-4">
                    For privacy inquiries or data requests, contact our privacy desk at{" "}
                    <a
                      href="mailto:support@vibelock.bd"
                      className="text-vl-cyan font-semibold hover:underline"
                    >
                      support@vibelock.bd
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Sidebar */}
            <div className="space-y-6 lg:col-span-4">
              <div className="border-vl-dark-900/15 border bg-white p-6">
                <h3 className="font-heading text-vl-dark-900 text-sm font-bold tracking-wider uppercase">
                  Related Policies
                </h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link
                      href="/terms"
                      className="text-vl-dark-900/70 hover:text-vl-cyan flex items-center justify-between font-medium transition-colors"
                    >
                      <span>Terms of Service</span>
                      <span className="text-vl-dark-900/40 text-xs">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/return-policy"
                      className="text-vl-dark-900/70 hover:text-vl-cyan flex items-center justify-between font-medium transition-colors"
                    >
                      <span>Return &amp; Exchange Policy</span>
                      <span className="text-vl-dark-900/40 text-xs">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/shipping-policy"
                      className="text-vl-dark-900/70 hover:text-vl-cyan flex items-center justify-between font-medium transition-colors"
                    >
                      <span>Shipping &amp; Delivery</span>
                      <span className="text-vl-dark-900/40 text-xs">→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/faq"
                      className="text-vl-dark-900/70 hover:text-vl-cyan flex items-center justify-between font-medium transition-colors"
                    >
                      <span>Frequently Asked Questions</span>
                      <span className="text-vl-dark-900/40 text-xs">→</span>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="border-vl-dark-900/10 border bg-white p-6">
                <h4 className="text-vl-dark-900 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Privacy Highlights</span>
                </h4>
                <ul className="text-vl-dark-900/70 mt-3 space-y-2 text-xs">
                  <li>• Zero advertising data brokers</li>
                  <li>• Encrypted payment gateways</li>
                  <li>• 100% Bangladesh jurisdiction</li>
                  <li>• Easy account control</li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
