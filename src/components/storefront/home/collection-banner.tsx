import { Container } from "@/components/shared/container";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ACCESSORIES = [
  { src: "/images/collection/acc-chain.png", alt: "VibeLock Signature Chain", label: "WEAR" },
  { src: "/images/collection/acc-cap.png", alt: "VibeLock Snapback Cap", label: "YOUR" },
  { src: "/images/collection/acc-tag.png", alt: "VibeLock Editorial Hangtag", label: "VIBE" },
];

export function CollectionBanner() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#080C0F] text-white">
      {/* Background texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen sm:opacity-70"
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
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D9FF]/30 bg-[#00D9FF]/10 px-3 py-1 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[#00D9FF]" aria-hidden="true" />
              <p className="text-[10px] font-extrabold tracking-[0.22em] text-[#00D9FF] uppercase sm:text-[11px]">
                THE VIBELOCK COLLECTION
              </p>
            </div>

            <h2 className="mt-4 text-4xl leading-[0.95] font-black tracking-tight text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl">
              BUILT FOR{" "}
              <span className="mt-1 block text-[#00D9FF] drop-shadow-[0_0_20px_rgba(0,217,255,0.4)]">
                REAL ONES
              </span>
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-relaxed font-medium text-[#F3F0E8] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:max-w-md sm:text-base">
              Streetwear that moves with your story. Crafted for comfort, silhouette, and the
              streets of Dhaka.
            </p>

            {/* Stats row */}
            <div className="mt-6 flex items-center gap-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md sm:gap-8 sm:px-5 sm:py-3.5">
              {[
                { value: "200+", label: "Styles" },
                { value: "12K+", label: "Orders" },
                { value: "100%", label: "Authentic" },
              ].map(({ value, label }, idx) => (
                <div key={label} className="flex items-center gap-6 sm:gap-8">
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tight text-white drop-shadow-sm sm:text-2xl">
                      {value}
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-zinc-300 uppercase sm:text-[11px]">
                      {label}
                    </span>
                  </div>
                  {idx < 2 && <div className="h-8 w-px bg-white/10" aria-hidden="true" />}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/products"
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-[#00D9FF] py-2 pr-2 pl-4.5 text-[10px] font-black tracking-[0.16em] text-[#080C0F] uppercase shadow-[0_0_18px_rgba(0,217,255,0.3)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#2ae0ff] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none active:scale-95 sm:py-2.5 sm:pr-2.5 sm:pl-5 sm:text-[11px]"
              >
                {/* Subtle sheen highlight on hover */}
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  aria-hidden="true"
                />
                <span className="relative z-10">SHOP COLLECTION</span>
                <span
                  className="relative z-10 flex size-5 items-center justify-center rounded-full bg-[#080C0F] text-[#00D9FF] transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-[#080C0F] sm:size-5.5"
                  aria-hidden="true"
                >
                  <ArrowRight className="size-2.5 transition-transform duration-300 group-hover:translate-x-0.5 sm:size-3" />
                </span>
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
