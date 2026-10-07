import Link from "next/link";
import { Container } from "@/components/shared/container";
import { storefrontShopLinks } from "./navigation";

const customerLinks = [
  { label: "Account", href: "/account" },
  { label: "Order history", href: "/account/orders" },
  { label: "Sign in", href: "/login" },
] as const;

const linkClassName =
  "inline-flex min-h-10 items-center rounded-sm text-sm text-brand-offwhite/70 transition-colors hover:text-brand-offwhite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-brand-charcoal";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-brand-charcoal text-brand-offwhite">
      <Container>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 sm:grid-cols-4 sm:gap-8 sm:py-14">
          <div className="col-span-2 flex flex-col items-start gap-4 sm:col-span-1">
            <Link
              href="/"
              className="rounded-sm text-2xl font-extrabold tracking-[-0.06em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-brand-charcoal"
            >
              VibeLock<span className="text-brand-cyan">.</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-brand-offwhite/65">
              Modern Dhaka streetwear. Minimal, confident, and made for everyday movement.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-offwhite">
              Shop
            </h2>
            {storefrontShopLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-start gap-2">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-offwhite">
              Customer
            </h2>
            {customerLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="col-span-2 flex flex-col items-start gap-2 sm:col-span-1">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-offwhite">
              Contact
            </h2>
            <a href="https://vibelock.com.bd" className={linkClassName}>
              vibelock.com.bd
            </a>
            <a href="tel:01311333277" className={linkClassName}>
              01311333277
            </a>
            <p className="max-w-48 py-2 text-sm leading-6 text-brand-offwhite/70">
              Thana More, Chatmohar, Pabna
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-brand-offwhite/55 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} VibeLock. All rights reserved.</p>
          <p>Made for the streets of Dhaka.</p>
        </div>
      </Container>
    </footer>
  );
}
