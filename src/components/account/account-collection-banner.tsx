import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function AccountCollectionBanner() {
  return (
    <section className="relative mt-8 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#101114] text-white shadow-lg sm:mt-10">
      {/* Background Campaign Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/collection/collection-banner2.png"
          alt="Explore VibeLock Streetwear Collection"
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover object-center opacity-40 sm:opacity-60"
        />
        {/* Dark Gradient Overlay for optimal contrast */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#101114] via-[#101114]/85 to-transparent sm:via-[#101114]/75"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 flex flex-col items-start justify-between gap-6 p-6 sm:p-10 md:flex-row md:items-center lg:p-12">
        {/* Left Content */}
        <div className="max-w-xl">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#00D9FF] uppercase">
            Your Style Matters
          </p>

          <h3 className="font-heading mt-2 text-2xl font-black tracking-tight text-white uppercase sm:text-3xl lg:text-4xl">
            Explore New Collections
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-white/75 sm:text-sm">
            Be the first to get updates on new arrivals, exclusive drops and special offers.
          </p>

          <div className="mt-5 sm:mt-6">
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 rounded-full bg-[#00D9FF] px-6 py-2.5 text-xs font-black tracking-wider text-[#101114] uppercase transition-all hover:bg-[#00c4e6] hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] active:scale-95"
            >
              <span>Shop Now</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Right Stencil Tag on Desktop */}
        <div className="hidden text-right select-none md:block">
          <p className="text-sm font-black tracking-widest text-white/40 uppercase">Streetwear</p>
          <p className="text-sm font-black tracking-widest text-[#00D9FF]/70 uppercase">Culture</p>
          <p className="text-sm font-black tracking-widest text-white/40 uppercase">Community</p>
        </div>
      </div>
    </section>
  );
}
