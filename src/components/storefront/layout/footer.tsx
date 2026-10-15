import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/shared/container";

const shopLinks = [
  { label: "All Products", href: "/products" },
  { label: "T-Shirts", href: "/category/t-shirts" },
  { label: "Shirts", href: "/category/shirts" },
  { label: "Pants", href: "/category/pants" },
  { label: "Shorts", href: "/category/shorts" },
] as const;

const customerLinks = [
  { label: "My Account", href: "/account" },
  { label: "Order History", href: "/account/orders" },
  { label: "Return Requests", href: "/account/returns" },
  { label: "Saved Wishlist", href: "/wishlist" },
] as const;

const supportLinks = [
  { label: "Shopping Bag", href: "/cart" },
  { label: "Sign In", href: "/login" },
  { label: "Create Account", href: "/register" },
] as const;

const linkClassName =
  "inline-flex items-center text-xs text-[#F3F0E8]/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D9FF]";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0A0D10] text-[#F3F0E8]">
      <Container>
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12 lg:py-14">
          {/* Col 1: Brand & Socials */}
          <div className="col-span-2 flex flex-col items-start gap-4 sm:col-span-1 lg:col-span-1">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
              aria-label="VibeLock Home"
            >
              <Image
                src="/images/vibelock-logo-white.png"
                alt="VibeLock"
                width={110}
                height={32}
                className="h-6 w-auto object-contain sm:h-7"
              />
            </Link>
            <p className="text-xs text-[#F3F0E8]/60">
              Streetwear. Culture. Community.
            </p>
            {/* Social Icons */}
            <div className="mt-1 flex items-center gap-3 text-[#F3F0E8]/70">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="VibeLock Facebook"
                className="transition-colors hover:text-[#00D9FF]"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="VibeLock Instagram"
                className="transition-colors hover:text-[#00D9FF]"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="VibeLock YouTube"
                className="transition-colors hover:text-[#00D9FF]"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="VibeLock X"
                className="transition-colors hover:text-[#00D9FF]"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                aria-label="VibeLock TikTok"
                className="transition-colors hover:text-[#00D9FF]"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.525.02c1.31 0 2.6.43 3.65 1.22.1.08.18.17.26.26.85.86 1.4 1.98 1.54 3.2.02.13.03.26.03.39v.03c.8-.18 1.63-.16 2.42.06.8.22 1.53.64 2.13 1.23.05.05.1.1.15.15v3.4c-.78-.23-1.6-.33-2.42-.29-.82.04-1.62.24-2.36.6-.74.35-1.39.86-1.92 1.48-.52.62-.9 1.34-1.11 2.13-.05.18-.08.36-.1.54v6.86c0 1.25-.33 2.47-.96 3.54-.62 1.07-1.52 1.95-2.59 2.53-1.07.58-2.28.87-3.51.84-1.23-.03-2.43-.38-3.47-1.02-1.04-.64-1.89-1.54-2.46-2.61-.57-1.08-.83-2.29-.75-3.51.08-1.22.48-2.4 1.17-3.41.69-1.01 1.63-1.81 2.73-2.32 1.1-.51 2.32-.72 3.53-.61.18.02.36.05.54.09v3.47c-.6-.2-1.24-.26-1.87-.18-.63.08-1.22.31-1.73.68-.51.37-.91.86-1.16 1.44-.25.57-.34 1.21-.26 1.84.08.63.33 1.22.72 1.72.39.49.91.87 1.51 1.09.6.22 1.25.26 1.87.12.62-.14 1.18-.46 1.62-.93.44-.46.73-1.04.84-1.67.04-.21.06-.42.06-.63V.02h3.31z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: SHOP */}
          <div className="flex flex-col items-start gap-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              Shop
            </h2>
            <div className="flex flex-col gap-2">
              {shopLinks.map((link) => (
                <Link key={link.href} href={link.href} className={linkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: CUSTOMER */}
          <div className="flex flex-col items-start gap-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              Customer
            </h2>
            <div className="flex flex-col gap-2">
              {customerLinks.map((link) => (
                <Link key={link.href} href={link.href} className={linkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: SUPPORT */}
          <div className="flex flex-col items-start gap-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              Support
            </h2>
            <div className="flex flex-col gap-2">
              {supportLinks.map((link) => (
                <Link key={link.href} href={link.href} className={linkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>


        </div>

        {/* Sub-Footer */}
        <div className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-[#F3F0E8]/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} VibeLock. All rights reserved.</p>
          <p>Made for the streets of Dhaka.</p>
        </div>
      </Container>
    </footer>
  );
}
