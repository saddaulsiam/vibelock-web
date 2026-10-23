import type { PublicPromoBanner } from "@/lib/catalog/banners";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function PromoBanner({
  banner,
  className,
}: {
  banner: PublicPromoBanner;
  className?: string;
}) {
  const hasMobileImage = Boolean(banner.mobileImageUrl);
  const isClickable = Boolean(banner.linkUrl);

  // Proportions:
  // When a separate mobile image is provided, use an intentional editorial mobile ratio (3:2)
  // When only the desktop landscape image is provided, use a wider mobile ratio (16/7) to preserve horizontal artwork and text
  const aspectClasses = hasMobileImage
    ? "aspect-[3/2] sm:aspect-[16/5] lg:aspect-[21/6] 2xl:aspect-[24/7]"
    : "aspect-[16/7] sm:aspect-[16/5] lg:aspect-[21/6] 2xl:aspect-[24/7]";

  const visualContent = (
    <>
      {hasMobileImage ? (
        <>
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
            className={cn(
              "hidden object-cover object-center sm:block",
              isClickable && "transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            )}
          />
          <Image
            src={banner.mobileImageUrl!}
            alt={banner.title}
            fill
            priority
            sizes="100vw"
            className={cn(
              "object-cover object-center sm:hidden",
              isClickable && "transition-transform duration-700 ease-out group-hover:scale-[1.015]"
            )}
          />
        </>
      ) : (
        <Image
          src={banner.imageUrl}
          alt={banner.title}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
          className={cn(
            "object-cover object-center",
            isClickable && "transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          )}
        />
      )}

      {/* Subtle editorial streetwear tint & inner border to harmonize colorful promo graphics with #101114 / #F3F0E8 */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#101114]/30 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-[#101114]/10 ring-inset"
        aria-hidden="true"
      />

      {/* Editorial Category Tag */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 sm:top-4 sm:left-4">
        <span className="inline-flex items-center gap-1.5 border border-[#101114]/20 bg-[#101114]/85 px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-[#F3F0E8] uppercase backdrop-blur-xs sm:px-2.5 sm:py-1 sm:text-[10px]">
          <span className="size-1 rounded-full bg-[#00D9FF]" aria-hidden="true" />
          <span>Featured Drop</span>
        </span>
      </div>

      {isClickable ? (
        <div className="pointer-events-none absolute right-3 bottom-3 z-10 sm:right-4 sm:bottom-4">
          <span className="inline-flex items-center gap-1.5 border border-[#101114]/20 bg-[#101114]/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#F3F0E8] uppercase backdrop-blur-xs transition-colors group-hover:bg-[#101114] group-hover:text-white sm:px-3 sm:py-1.5 sm:text-[11px]">
            <span>Explore</span>
            <ArrowUpRight
              className="size-3 text-[#00D9FF] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      ) : null}
    </>
  );

  const containerClasses = cn(
    "relative isolate mx-auto w-full max-h-[220px] sm:max-h-[240px] lg:max-h-[260px] overflow-hidden border border-y border-[#101114]/15 bg-[#F3F0E8]",
    aspectClasses,
    className
  );

  if (banner.linkUrl) {
    return (
      <Link
        href={banner.linkUrl}
        aria-label={banner.title}
        className={cn(
          "group block focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none focus-visible:ring-inset",
          containerClasses
        )}
      >
        {visualContent}
      </Link>
    );
  }

  return (
    <aside aria-label={banner.title} className={containerClasses}>
      {visualContent}
    </aside>
  );
}
