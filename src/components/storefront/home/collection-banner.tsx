import { Container } from "@/components/shared/container";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CollectionBanner() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#0B0F11] py-12 text-white sm:py-14 lg:py-16">
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1.3fr_0.8fr] lg:gap-6">
          {/* Left Column: Typography & Action */}
          <div className="z-10 flex flex-col items-start">
            <p className="text-[11px] font-extrabold tracking-[0.20em] text-[#00D9FF] uppercase">
              THE VIBELOCK COLLECTION
            </p>
            <h2 className="mt-2 text-3xl leading-[1.0] font-black tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
              BUILT FOR <br />
              <span className="text-[#00D9FF]">REAL ONES</span>
            </h2>
            <p className="mt-4 max-w-sm text-xs leading-relaxed font-medium text-[#F3F0E8]/70 sm:text-sm">
              Streetwear that moves with your story. Crafted for comfort, silhouette, and the
              streets of Dhaka.
            </p>
            <div className="mt-6 sm:mt-7">
              <Link
                href="/products"
                className="group inline-flex items-center gap-3 rounded-full border border-white/80 bg-transparent px-7 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              >
                <span>SHOP COLLECTION</span>
                <ArrowRight
                  className="size-3.5 text-[#00D9FF] transition-transform group-hover:translate-x-1 group-hover:text-[#101114]"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {/* Center Column: Streetwear Cutout Graphic */}
          <div className="relative flex items-center justify-center">
            <div className="relative h-44 w-full max-w-sm sm:h-52 lg:h-60">
              <Image
                src="/images/collection/collection-hoodie.png"
                alt="VibeLock Collection Feature"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 384px, 400px"
                className="object-contain object-center"
              />
            </div>
          </div>

          {/* Right Column: 3 Accessory Detail Cards */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 lg:justify-end">
            <Link
              href="/products"
              className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
            >
              <Image
                src="/images/collection/acc-chain.png"
                alt="VibeLock Signature Chain"
                fill
                sizes="96px"
                className="object-cover"
              />
            </Link>
            <Link
              href="/products"
              className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
            >
              <Image
                src="/images/collection/acc-cap.png"
                alt="VibeLock Snapback Cap"
                fill
                sizes="96px"
                className="object-cover"
              />
            </Link>
            <Link
              href="/products"
              className="group relative aspect-[3/4] w-20 overflow-hidden rounded-xs border border-white/15 bg-white/5 transition-transform hover:scale-105 sm:w-24"
            >
              <Image
                src="/images/collection/acc-tag.png"
                alt="VibeLock Editorial Hangtag"
                fill
                sizes="96px"
                className="object-cover"
              />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
