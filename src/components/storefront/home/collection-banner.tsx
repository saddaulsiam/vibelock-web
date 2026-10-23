import { Container } from "@/components/shared/container";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ACCESSORIES = [
  { src: "/images/collection/acc-chain.png", alt: "VibeLock Signature Chain", label: "CHAIN" },
  { src: "/images/collection/acc-cap.png", alt: "VibeLock Snapback Cap", label: "CAP" },
  { src: "/images/collection/acc-tag.png", alt: "VibeLock Editorial Hangtag", label: "TAG" },
];

export function CollectionBanner() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#080C0F] text-white">
      {/* Background texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen"
        style={{ backgroundImage: "url('/images/hero/account-hero3.png')" }}
        aria-hidden="true"
      />

      {/* Cyan atmospheric glow — top-left */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#00D9FF]/10 blur-3xl sm:h-96 sm:w-96"
        aria-hidden="true"
      />
      {/* Cyan atmospheric glow — bottom-right */}
      <div
        className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[#00D9FF]/8 blur-2xl sm:h-64 sm:w-64"
        aria-hidden="true"
      />

      <Container>
        {/* ── Mobile-first: 1-col → 2-col at md ── */}
        <div className="relative z-10 grid grid-cols-1 gap-6 py-12 sm:gap-8 sm:py-14 md:grid-cols-[1.2fr_0.8fr] md:items-center md:gap-8 md:py-16 lg:py-20 xl:py-30">
          {/* ── 1. Left Column: Typography & CTA ── */}
          <div className="flex flex-col items-start">
            <p className="text-[10px] font-extrabold tracking-[0.22em] text-[#00D9FF] uppercase sm:text-[11px]">
              THE VIBELOCK COLLECTION
            </p>

            <h2 className="mt-3 text-4xl leading-none font-black tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
              BUILT FOR{" "}
              <span className="mt-1 block text-[#00D9FF] drop-shadow-[0_0_20px_rgba(0,217,255,0.4)]">
                REAL ONES
              </span>
            </h2>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#F3F0E8]/65 sm:max-w-sm sm:text-sm">
              Streetwear that moves with your story. Crafted for comfort, silhouette, and the
              streets of Dhaka.
            </p>

            {/* Stats row — mobile */}
            <div className="mt-6 flex items-center gap-6 sm:gap-8">
              {[
                { value: "200+", label: "Styles" },
                { value: "12K+", label: "Orders" },
                { value: "100%", label: "Authentic" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xl font-black text-white sm:text-2xl">{value}</span>
                  <span className="text-[10px] font-semibold tracking-widest text-[#F3F0E8]/50 uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <Link
                href="/products"
                className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-transparent px-7 py-3.5 text-xs font-bold tracking-wider text-white uppercase transition-all duration-300 hover:border-[#00D9FF] hover:bg-[#00D9FF]/10 hover:text-[#00D9FF] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              >
                <span>SHOP COLLECTION</span>
                <ArrowRight
                  className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {/* ── 2. Right Column: Accessory detail cards ── */}
          <div className="flex items-center justify-center gap-3 self-start md:justify-end md:self-auto">
            {ACCESSORIES.map(({ src, alt, label }) => (
              <Link
                key={label}
                href="/products"
                className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00D9FF]/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(0,217,255,0.12)]"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] w-[72px] sm:w-20 md:w-[88px]">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {/* Label */}
                <div className="border-t border-white/8 px-2 py-1.5 text-center">
                  <span className="text-[9px] font-bold tracking-[0.18em] text-[#F3F0E8]/60 uppercase transition-colors duration-300 group-hover:text-[#00D9FF]">
                    {label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>

      {/* Bottom edge accent line */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-[#00D9FF]/30 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
