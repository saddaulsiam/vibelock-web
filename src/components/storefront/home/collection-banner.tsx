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
    <section className="bg-vl-dark-900 relative overflow-hidden">
      {/* Background texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen sm:opacity-70"
        style={{ backgroundImage: "url('/images/hero/account-hero3.png')" }}
        aria-hidden="true"
      />

      {/* Cyan atmospheric glow — top-left */}
      <div
        className="bg-vl-cyan-500/20 pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full blur-3xl sm:h-96 sm:w-96"
        aria-hidden="true"
      />

      <Container>
        {/* ── Mobile-first: 1-col → 2-col at md ── */}
        <div className="relative z-10 grid grid-cols-1 gap-6 py-12 sm:gap-8 sm:py-14 md:grid-cols-[1.2fr_0.8fr] md:items-center md:gap-8 md:py-16 lg:py-20 xl:py-26">
          {/* ── 1. Left Column: Typography & CTA ── */}
          <div className="flex flex-col items-start">
            <div className="border-vl-cyan-700 bg-vl-cyan-900 inline-flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur-sm">
              <span className="bg-vl-cyan size-1.5 rounded-full" aria-hidden="true" />
              <p className="text-2xs text-vl-cyan sm:text-compact font-bold tracking-[0.22em] uppercase">
                THE VIBELOCK COLLECTION
              </p>
            </div>
            <h2 className="font-heading mt-4 text-4xl leading-[0.95] font-black tracking-tight text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl">
              BUILT FOR{" "}
              <span className="text-vl-cyan mt-1 block drop-shadow-[0_0_20px_rgba(0,217,255,0.4)]">
                REAL ONES
              </span>
            </h2>
            <p className="text-vl-white-300 mt-4 max-w-sm text-sm leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:max-w-md sm:text-base">
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
                    <span className="text-2xs sm:text-compact font-bold tracking-widest text-zinc-300 uppercase">
                      {label}
                    </span>
                  </div>
                  {idx < 2 && <div className="h-8 w-px bg-white/10" aria-hidden="true" />}
                </div>
              ))}
            </div>

            <Link
              href="/shop"
              className="group hover:border-vl-cyan-700 hover:bg-vl-cyan-900 hover:text-vl-cyan border-vl-cyan bg-vl-cyan text-vl-dark-900 mt-6 inline-flex items-center gap-2.5 rounded-full border px-5.5 py-2.5 text-xs font-extrabold tracking-[0.18em] uppercase transition-all duration-300 hover:scale-[1.03] focus-visible:ring-2 active:scale-[0.98] sm:gap-3 sm:px-7 sm:py-3"
            >
              <span>SHOP ALL DROPS</span>
              <ArrowRight
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:size-4"
                aria-hidden="true"
              />
            </Link>
          </div>

          {/* ── 2. Right Column: Accessory detail cards ── */}
          <div className="flex items-center justify-center gap-3 self-start md:justify-end md:self-auto">
            {ACCESSORIES.map(({ src, alt, label }) => (
              <Link
                key={label}
                href="/shop"
                className="group hover:border-vl-cyan-500 relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(0,217,255,0.12)]"
              >
                {/* Image */}
                <div className="relative aspect-3/4 w-18 sm:w-20 md:w-22">
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
                  <span className="text-vl-white-300/60 group-hover:text-vl-cyan text-[9px] font-bold tracking-[0.18em] uppercase transition-colors duration-300">
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
        className="via-vl-cyan-100 pointer-events-none absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
