import { Container } from "@/components/shared/container";
import { ChevronRight, ExternalLink, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Newsletter } from "../home/newsletter";

interface RetailLocation {
  city: string;
  badge: string;
  address: string;
  phone: string;
  mapUrl: string;
}

const RETAIL_LOCATION: RetailLocation = {
  city: "PABNA",
  badge: "CHATMOHAR",
  address: "Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh",
  phone: "01311-333277",
  mapUrl: "https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6",
};

const shopLinks = [
  { label: "All Products", href: "/products" },
  { label: "Oversized T-Shirts", href: "/category/t-shirts" },
  { label: "Streetwear Shirts", href: "/category/shirts" },
  { label: "Cargo Pants & Denims", href: "/category/pants" },
  { label: "Everyday Shorts", href: "/category/shorts" },
] as const;

const customerLinks = [
  { label: "Customer Dashboard", href: "/account" },
  { label: "Track My Orders", href: "/account/orders" },
  { label: "Return & Exchange", href: "/account/returns" },
  { label: "Saved Wishlist", href: "/wishlist" },
  { label: "Shopping Bag", href: "/cart" },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-vl-border bg-vl-black text-vl-white relative overflow-hidden border-t">
      {/* Subtle atmospheric ambient glow */}
      <div
        aria-hidden="true"
        className="bg-vl-cyan/5 pointer-events-none absolute right-0 -bottom-40 h-96 w-96 rounded-full blur-3xl"
      />

      <Container className="relative z-10 pt-14 pb-8 sm:pt-16 sm:pb-10">
        {/* ── 1. Top Section: Brand Info & Retail Outlets + Quick Links ── */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Brand & About (Col-span 4) */}
          <div className="flex flex-col items-start lg:col-span-4">
            {/* Circular Logo Badge + Brand Name */}
            <div className="relative flex items-center gap-3">
              <div className="border-vl-border relative z-10 flex size-10 items-center justify-center rounded-full border bg-[#16171b] shadow-[0_0_16px_rgba(0,217,255,0.2)]">
                <Image
                  src="/images/vibelock-logo.png"
                  alt="VibeLock Emblem"
                  width={28}
                  height={28}
                  className="h-auto w-auto object-contain"
                />
              </div>

              {/* Brand Name in Space Grotesk */}
              <span className="font-heading text-vl-white text-xl font-black tracking-wider uppercase">
                VIBELOCK
              </span>
            </div>

            {/* Slogan */}
            <p className="text-vl-white/90 mt-3.5 text-xs font-bold tracking-wider uppercase">
              BEST STREETWEAR BRAND IN BANGLADESH.
            </p>

            {/* About Label & Paragraph */}
            <div className="mt-6">
              <span className="text-vl-cyan text-[10px] font-extrabold tracking-widest uppercase">
                ABOUT VIBELOCK
              </span>
              <p className="text-vl-grey mt-2 max-w-sm text-xs leading-relaxed">
                Curating premium drops, heavyweight streetwear garments, and cultural artifacts for
                the fashion-forward in Bangladesh. Built for Dhaka youth.
              </p>
            </div>

            {/* Newsletter */}
            <Newsletter />
          </div>

          {/* Right Column: 3 Columns (Shop Links, Customer Links, Retail Location) */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {/* Column 1: Shop Categories (Clean Links List - No Box) */}
              <div className="flex flex-col">
                <span className="text-vl-cyan text-[10px] font-extrabold tracking-[0.2em] uppercase">
                  COLLECTIONS
                </span>
                <h4 className="text-vl-white mt-1 text-sm font-black tracking-wider uppercase">
                  SHOP CATEGORIES
                </h4>
                <div className="bg-vl-cyan/80 mt-2 h-0.5 w-6" />

                <ul className="mt-4.5 flex flex-col gap-2.5">
                  {shopLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group text-vl-white/75 hover:text-vl-white inline-flex items-center gap-2 text-xs font-medium transition-all duration-200"
                      >
                        <ChevronRight className="text-vl-cyan/60 group-hover:text-vl-cyan size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                        <span className="group-hover:text-vl-cyan group-hover:decoration-vl-cyan/50 transition-colors duration-200 group-hover:underline group-hover:underline-offset-4">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 2: Customer & Support (Clean Links List - No Box) */}
              <div className="flex flex-col">
                <span className="text-vl-cyan text-[10px] font-extrabold tracking-[0.2em] uppercase">
                  HELP &amp; ACCOUNT
                </span>
                <h4 className="text-vl-white mt-1 text-sm font-black tracking-wider uppercase">
                  CUSTOMER &amp; SUPPORT
                </h4>
                <div className="bg-vl-cyan/80 mt-2 h-0.5 w-6" />

                <ul className="mt-4.5 flex flex-col gap-2.5">
                  {customerLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group text-vl-white/75 hover:text-vl-white inline-flex items-center gap-2 text-xs font-medium transition-all duration-200"
                      >
                        <ChevronRight className="text-vl-cyan/60 group-hover:text-vl-cyan size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                        <span className="group-hover:text-vl-cyan group-hover:decoration-vl-cyan/50 transition-colors duration-200 group-hover:underline group-hover:underline-offset-4">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Our Retail Location (Preserved Box Card Design) */}
              <div className="col-span-2 flex flex-col sm:col-span-1">
                <span className="text-vl-cyan text-[10px] font-extrabold tracking-[0.2em] uppercase">
                  FLAGSHIP OUTLET
                </span>
                <h4 className="text-vl-white mt-1 text-sm font-black tracking-wider uppercase">
                  OUR RETAIL LOCATION
                </h4>
                <div className="bg-vl-cyan/80 mt-2 h-0.5 w-6" />

                <div className="group border-vl-border hover:border-vl-cyan/40 relative mt-4.5 flex flex-1 flex-col justify-between rounded-xl border bg-[#0B0F13]/90 p-4.5 transition-all hover:bg-[#0D1318]">
                  <div>
                    {/* Badge */}
                    <div className="text-vl-cyan flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="text-[11px] font-black tracking-wider uppercase">
                        {RETAIL_LOCATION.badge}
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-vl-white/75 mt-2.5 text-xs leading-relaxed">
                      {RETAIL_LOCATION.address}
                    </p>

                    {/* Phone */}
                    <div className="text-vl-white/90 mt-3 flex items-center gap-2 text-xs font-medium">
                      <Phone className="text-vl-cyan size-3" />
                      <span>{RETAIL_LOCATION.phone}</span>
                    </div>
                  </div>

                  {/* Open in Google Maps Link */}
                  <a
                    href={RETAIL_LOCATION.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-vl-border text-vl-white/60 group-hover:text-vl-cyan mt-4 flex items-center justify-between border-t pt-2.5 text-[11px] font-bold tracking-wider uppercase transition-colors"
                  >
                    <span>OPEN IN GOOGLE MAPS</span>
                    <ExternalLink className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Middle Section: Social Networks Row ── */}
        <div className="border-vl-border flex flex-col items-center border-b py-10">
          <span className="text-vl-white/50 text-[10px] font-extrabold tracking-[0.25em] uppercase">
            SOCIAL NETWORKS
          </span>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {/* Facebook 1: VIBELOCK BD */}
            <a
              href="https://facebook.com/vibelock.bd"
              target="_blank"
              rel="noreferrer"
              className="border-vl-border text-vl-white/90 inline-flex items-center gap-2 rounded-full border bg-[#0C1014] px-3.5 py-1.5 text-xs font-semibold transition-all hover:border-[#1877F2]/60 hover:bg-[#1877F2]/10"
            >
              <Image src="/icons/facebook.svg" alt="Facebook" width={20} height={20} />
              <span>Facebook</span>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/vibelock.bd"
              target="_blank"
              rel="noreferrer"
              className="border-vl-border text-vl-white/90 inline-flex items-center gap-2 rounded-full border bg-[#0C1014] px-3.5 py-1.5 text-xs font-semibold transition-all hover:border-pink-500/60 hover:bg-pink-500/10"
            >
              <Image src="/icons/instagram.svg" alt="Instagram" width={20} height={20} />
              <span>Instagram</span>
            </a>
            {/* Whatsapp */}
            <a
              href="https://wa.me/+8801311333277"
              target="_blank"
              rel="noreferrer"
              className="border-vl-border text-vl-white/90 inline-flex items-center gap-2 rounded-full border bg-[#0C1014] px-3.5 py-1.5 text-xs font-semibold transition-all hover:border-green-500/60 hover:bg-green-500/10"
            >
              <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={20} height={20} />
              <span>WhatsApp</span>
            </a>
            {/* TikTok */}
            <a
              href="https://tiktok.com/@vibelock.bd"
              target="_blank"
              rel="noreferrer"
              className="border-vl-border text-vl-white/90 hover:border-vl-cyan/60 hover:bg-vl-cyan/10 inline-flex items-center gap-2 rounded-full border bg-[#0C1014] px-3.5 py-1.5 text-xs font-semibold transition-all"
            >
              <Image src="/icons/tiktok.svg" alt="TikTok" width={20} height={20} />
              <span>TikTok</span>
            </a>
            {/* YouTube */}
            <a
              href="https://youtube.com/@vibelock.bd"
              target="_blank"
              rel="noreferrer"
              className="border-vl-border text-vl-white/90 inline-flex items-center gap-2 rounded-full border bg-[#0C1014] px-3.5 py-1.5 text-xs font-semibold transition-all hover:border-red-500/60 hover:bg-red-500/10"
            >
              <Image src="/icons/youtube.svg" alt="YouTube" width={20} height={20} />
              <span>YouTube</span>
            </a>
          </div>
        </div>

        {/* ── 3 + 4. Brutalist Watermark with Bottom-Cut Effect */}
        {/* The copyright bar overlaps the bottom half of the huge text, creating the slice/cut effect */}
        <div className="pointer-events-none relative mt-3 overflow-hidden select-none">
          {/* Giant watermark text — full-width, anchored to bottom */}
          <div
            className="flex w-full items-end justify-center"
            style={{ height: "clamp(60px, 12vw, 160px)" }}
          >
            <span
              className="block leading-none font-black tracking-tight whitespace-nowrap text-[#1a2329] uppercase"
              style={{
                fontSize: "clamp(72px, 14vw, 200px)",
                lineHeight: 1,
                /* push the text down so only the top ~55% is visible */
                transform: "translateY(20%)",
              }}
            >
              VIBELOCK
            </span>
          </div>
        </div>

        {/* ── Bottom Footer Bar — sits on top of the watermark ── */}
        <div className="border-vl-border text-vl-white/50 pointer-events-auto relative z-10 flex flex-col items-center gap-3 border-t pt-3.5 pb-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} VIBELOCKBD. All rights reserved.</p>

          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="group text-vl-white/65 hover:text-vl-white relative inline-flex items-center py-1 text-xs font-medium transition-colors duration-200"
            >
              <span className="group-hover:text-vl-cyan transition-colors duration-200">
                Privacy Policy
              </span>
              <span className="bg-vl-cyan absolute bottom-0.5 left-0 h-px w-0 transition-all duration-200 group-hover:w-full" />
            </Link>

            <span className="bg-vl-white/20 size-1 rounded-full" aria-hidden="true" />

            <Link
              href="/terms"
              className="group text-vl-white/65 hover:text-vl-white relative inline-flex items-center py-1 text-xs font-medium transition-colors duration-200"
            >
              <span className="group-hover:text-vl-cyan transition-colors duration-200">
                Terms of Service
              </span>
              <span className="bg-vl-cyan absolute bottom-0.5 left-0 h-px w-0 transition-all duration-200 group-hover:w-full" />
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
