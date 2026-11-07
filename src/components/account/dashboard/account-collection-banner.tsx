import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function AccountCollectionBanner() {
  return (
    <section className="relative mt-6 w-full overflow-hidden rounded-xl border border-white/10 bg-[#101114] text-white sm:mt-10">
      {/* Background Campaign Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/collection/collection-banner2.png"
          alt="Explore VibeLock Streetwear Collection"
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover object-center opacity-40"
        />
        {/* Dark Gradient Overlay for optimal contrast */}
        <div
          className="absolute inset-0 bg-linear-to-r from-[#101114] via-[#101114]/85 to-transparent sm:via-[#101114]/75"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start justify-between gap-5 p-5 sm:p-8 md:flex-row md:items-center lg:p-10">
        {/* Left Content */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D9FF]" />
            <span className="text-2xs font-semibold tracking-streetwear text-[#F3F0E8]/70 uppercase sm:text-compact">
              Limited Releases
            </span>
          </div>

          <h3 className="mt-1.5 text-lg font-bold tracking-tight text-white uppercase sm:mt-2 sm:text-2xl lg:text-3xl">
            Explore New Drop Essentials
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed text-[#F3F0E8]/80 sm:mt-2 sm:text-sm">
            Curated heavyweights, relaxed silhouettes, and cultural streetwear crafted for Dhaka
            youth.
          </p>

          <div className="mt-4 sm:mt-5">
            <Link
              href="/shop"
              className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-neutral-100 sm:w-auto"
            >
              <span>Shop All Products</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Right Label on Desktop */}
        <div className="hidden text-right select-none md:block">
          <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            Curated Drop
          </span>
        </div>
      </div>
    </section>
  );
}
