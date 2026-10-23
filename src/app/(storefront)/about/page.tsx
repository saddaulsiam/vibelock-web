import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Zap, MapPin } from "lucide-react";
import { Container } from "@/components/shared/container";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "About Us | The VibeLock Manifesto",
  description:
    "Discover the story behind VibeLock — Bangladesh's premier heavyweight streetwear label. Designed in Dhaka, engineered for authentic urban movement.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "About VibeLock | Modern Dhaka Streetwear",
    description:
      "We don't follow trends. We engineer heavyweight streetwear for modern Dhaka youth.",
    url: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col bg-[#F3F0E8] text-[#101114]">
      {/* ── 1. Brutalist Hero Manifesto Section ── */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#090D11] py-16 text-[#F3F0E8] sm:py-24">
        {/* Subtle Cyberpunk Grid Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[36px_36px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 size-96 rounded-full bg-[#00D9FF]/10 blur-3xl"
        />

        <Container className="relative z-10">
          <div className="max-w-3xl">
            {/* Breadcrumb / Category Tag */}
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-[#00D9FF] uppercase">
              <span className="size-1.5 rounded-full bg-[#00D9FF]" />
              <span>MANIFESTO // 001 • DHAKA ORIGIN</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading mt-4 text-3xl font-black tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
              WE DON’T DO FLIMSY.
              <br />
              <span className="text-[#00D9FF]">WE ENGINEER CULTURE.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-sm leading-relaxed text-[#F3F0E8]/75 sm:text-base">
              VibeLock was born out of Dhaka’s concrete sprawl. Frustrated by lightweight,
              ill-fitting fast fashion that collapsed after two washes, we set out to build
              heavyweight streetwear engineered for South Asian bodies and modern urban movement.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4 sm:gap-6">
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">280+ GSM</p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-[#00D9FF] uppercase">
                HEAVYWEIGHT COTTON
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">100%</p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-[#00D9FF] uppercase">
                PRE-SHRUNK BIO-WASH
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">64 DISTS</p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-[#00D9FF] uppercase">
                NATIONWIDE DELIVERY
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-white sm:text-3xl">DHAKA HQ</p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-[#00D9FF] uppercase">
                URBAN STREETWEAR
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2. The Origin Story & Philosophy ── */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Visual Showcase (Col 5) */}
            <div className="relative lg:col-span-5">
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-black/10 bg-[#0C1014] shadow-2xl">
                <Image
                  src="/images/hero/hero-clean.png"
                  alt="VibeLock Dhaka Streetwear"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute right-6 bottom-6 left-6">
                  <span className="inline-block rounded bg-[#00D9FF] px-2.5 py-1 text-[10px] font-black tracking-widest text-[#101114] uppercase">
                    PROTOTYPE // 026
                  </span>
                  <p className="mt-2 text-sm font-black text-white uppercase">
                    BUILT FOR THE STREETS. SHAPED FOR DHAKA.
                  </p>
                </div>
              </div>
            </div>

            {/* Narrative Editorial (Col 7) */}
            <div className="flex flex-col lg:col-span-7">
              <span className="text-xs font-black tracking-[0.2em] text-[#0088A8] uppercase">
                THE PHILOSOPHY
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-4xl">
                WHY HEAVYWEIGHT STREETWEAR MATTERS
              </h2>

              <p className="mt-5 text-sm leading-relaxed text-[#101114]/80">
                Most casualwear produced locally cuts corners: paper-thin fabrics, sagging
                necklines, and generic silhouettes that look worn-out after a week. At VibeLock, we
                do the exact opposite.
              </p>

              <p className="mt-4 text-sm leading-relaxed text-[#101114]/80">
                Every drop starts with custom-milled 280+ GSM French Terry and dense combed
                ring-spun cotton. We tailor the boxy cut with dropped shoulders, elongated chest
                widths, and reinforced 1.25-inch high-density ribbed collars that never deform.
              </p>

              {/* Checklist */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Zero bacon-collar guarantee",
                  "High-density archival screenprints",
                  "Preshrunk double-washed fabric",
                  "Ethically produced in Bangladesh",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs font-bold text-[#101114]"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-[#0088A8]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="mt-9">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#101114] px-6 py-3.5 text-xs font-extrabold tracking-wider text-white uppercase transition-all hover:bg-[#1E262C] hover:shadow-lg"
                >
                  <span>EXPLORE CURRENT DROPS</span>
                  <ArrowRight className="size-4 text-[#00D9FF]" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 3. Three Core Pillars ── */}
      <section className="border-y border-black/10 bg-[#EFECE3] py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[11px] font-extrabold tracking-[0.25em] text-[#0088A8] uppercase">
              ENGINEERING STANDARDS
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl">
              THE THREE PILLARS OF VIBELOCK
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-[#101114]/70 sm:text-sm">
              We focus on substance over hype. Every product passes rigorous stress testing before
              release.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-7 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#101114] text-[#00D9FF]">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="mt-5 text-base font-black text-[#101114] uppercase">
                  01 // HEAVYWEIGHT ARCHITECTURE
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-[#101114]/70">
                  Custom-milled 280+ GSM French terry & ring-spun cotton that holds its clean drape
                  all day, without sticking or wrinkling easily.
                </p>
              </div>
              <div className="mt-6 border-t border-black/5 pt-3 font-mono text-[10px] tracking-wider text-[#0088A8] uppercase">
                TEXTURE // 280+ GSM
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-7 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#101114] text-[#00D9FF]">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="mt-5 text-base font-black text-[#101114] uppercase">
                  02 // DHAKA URBAN SILHOUETTE
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-[#101114]/70">
                  Tailored boxy proportions, drop-shoulder armholes, and relaxed hems specifically
                  drafted for contemporary South Asian streetwear culture.
                </p>
              </div>
              <div className="mt-6 border-t border-black/5 pt-3 font-mono text-[10px] tracking-wider text-[#0088A8] uppercase">
                FIT // BOXY & OVERSIZED
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-7 shadow-sm transition-all hover:shadow-md">
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#101114] text-[#00D9FF]">
                  <Zap className="size-5" />
                </div>
                <h3 className="mt-5 text-base font-black text-[#101114] uppercase">
                  03 // ARCHIVAL PRINT DURABILITY
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-[#101114]/70">
                  Premium screenprinting pigments cured under exact thermal regulation to eliminate
                  cracking, flaking, or fading through 50+ wash cycles.
                </p>
              </div>
              <div className="mt-6 border-t border-black/5 pt-3 font-mono text-[10px] tracking-wider text-[#0088A8] uppercase">
                GRAPHICS // NON-CRACK
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── 4. Flagship Storefront Section ── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="rounded-2xl border border-black/10 bg-[#101114] p-8 text-[#F3F0E8] shadow-xl sm:p-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#00D9FF] uppercase">
                  <MapPin className="size-3.5" />
                  <span>PHYSICAL OUTLET & TOUCHPOINT</span>
                </div>
                <h3 className="mt-3 text-2xl font-black text-white uppercase sm:text-3xl">
                  EXPERIENCE VIBELOCK IN PERSON
                </h3>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#F3F0E8]/70 sm:text-sm">
                  Feel the fabric weight, test the boxy drape, and explore exclusive drops at our
                  Chatmohar flagship retail outlet.
                </p>
                <div className="mt-5 flex flex-col gap-1 text-xs font-medium text-[#F3F0E8]/90">
                  <p>Khondokar Market, Star More, Chatmohar, Pabna, Bangladesh</p>
                  <p className="text-[#00D9FF]">Direct Hotline: 01311-333277</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
                <a
                  href="https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00D9FF] px-6 py-3 text-xs font-black tracking-wider text-[#101114] uppercase transition-all hover:bg-white"
                >
                  <span>VIEW ON GOOGLE MAPS</span>
                  <ArrowRight className="size-3.5" />
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white/10"
                >
                  <span>CONTACT STORE CREW</span>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
