import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function AccountCollectionBanner() {
  return (
    <section className="bg-vl-dark-900 relative mt-6 w-full overflow-hidden rounded-xl border border-white/10 text-white">
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
          className="from-vl-dark-900 via-vl-dark-900/85 sm:via-vl-dark-900/75 absolute inset-0 bg-linear-to-r to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start justify-between gap-5 p-5 sm:p-8 md:flex-row md:items-center lg:p-10">
        {/* Left Content */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-vl-cyan h-1.5 w-1.5 rounded-full" />
            <span className="text-2xs tracking-streetwear text-vl-white-300/70 sm:text-compact font-semibold uppercase">
              Limited Releases
            </span>
          </div>

          <h3 className="mt-1.5 text-lg font-bold tracking-tight text-white uppercase sm:mt-2 sm:text-2xl lg:text-3xl">
            Explore New Drop Essentials
          </h3>

          <p className="text-vl-white-300/80 mt-1.5 text-xs leading-relaxed sm:mt-2 sm:text-sm">
            Curated heavyweights, relaxed silhouettes, and cultural streetwear crafted for Dhaka
            youth.
          </p>

          <div className="mt-4 sm:mt-5">
            <Link
              href="/shop"
              className="group text-vl-dark-900 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-neutral-100 sm:w-auto"
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
