"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicPromoBanner } from "@/lib/catalog/banners";
import { cn } from "@/lib/utils";

export interface PromoBannerProps {
  banner?: PublicPromoBanner | null;
  banners?: PublicPromoBanner[];
  className?: string;
  autoPlayInterval?: number;
}

function SingleBannerContent({
  banner,
  isPriority = false,
}: {
  banner: PublicPromoBanner;
  isPriority?: boolean;
}) {
  const hasMobileImage = Boolean(banner.mobileImageUrl);
  const isClickable = Boolean(banner.linkUrl);

  return (
    <>
      {hasMobileImage ? (
        <>
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            priority={isPriority}
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
            priority={isPriority}
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
          priority={isPriority}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
          className={cn(
            "object-cover object-center",
            isClickable && "transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          )}
        />
      )}

      {/* Subtle editorial streetwear tint to harmonize colorful promo graphics with #101114 / #F3F0E8 */}
      <div
        className="from-vl-dark-900/30 pointer-events-none absolute inset-0 bg-linear-to-t via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Editorial Category Tag */}
      <div className="pointer-events-none absolute top-3.5 left-4 z-10 sm:top-4 sm:left-5">
        <span className="border-vl-dark-900/20 bg-vl-dark-900/85 text-vl-white-300 inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xs sm:px-2.5 sm:py-1 sm:text-[10px]">
          <span className="bg-vl-cyan size-1 rounded-full" aria-hidden="true" />
          <span>Featured Drop</span>
        </span>
      </div>

      {isClickable ? (
        <div className="pointer-events-none absolute right-3.5 bottom-3.5 z-10 sm:right-5 sm:bottom-4">
          <span className="border-vl-dark-900/20 bg-vl-dark-900/90 text-vl-white-300 group-hover:bg-vl-dark-900 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xs transition-colors group-hover:text-white sm:px-3 sm:py-1.5 sm:text-[11px]">
            <span>Explore</span>
            <ArrowUpRight
              className="text-vl-cyan size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      ) : null}
    </>
  );
}

export function PromoBannerCarousel({
  bannerList,
  containerClasses,
  autoPlayInterval = 5000,
}: {
  bannerList: PublicPromoBanner[];
  containerClasses: string;
  autoPlayInterval?: number;
}) {
  const totalBanners = bannerList.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-play timer for multiple banners
  useEffect(() => {
    if (totalBanners <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalBanners);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [totalBanners, isPaused, autoPlayInterval]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (deltaX > 40) {
      goToPrev();
    } else if (deltaX < -40) {
      goToNext();
    }
    touchStartXRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      goToPrev();
    } else if (e.key === "ArrowRight") {
      goToNext();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional Banners"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn("group/carousel focus-visible:ring-vl-cyan relative focus-visible:ring-2 focus-visible:outline-none", containerClasses)}
    >
      {/* ── Slide Track ── */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {bannerList.map((item, idx) => (
          <div
            key={item.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${totalBanners}: ${item.title}`}
            aria-hidden={idx !== currentIndex}
            className="relative h-full w-full min-w-full shrink-0"
          >
            {item.linkUrl ? (
              <Link
                href={item.linkUrl}
                aria-label={item.title}
                tabIndex={idx === currentIndex ? 0 : -1}
                className="group relative block h-full w-full focus-visible:outline-none"
              >
                <SingleBannerContent banner={item} isPriority={idx === 0} />
              </Link>
            ) : (
              <div className="relative h-full w-full">
                <SingleBannerContent banner={item} isPriority={idx === 0} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Left Navigation Arrow Button ── */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          goToPrev();
        }}
        aria-label="Previous banner"
        className="text-vl-dark-900 focus-visible:ring-vl-cyan absolute top-1/2 left-2 z-20 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-white active:scale-95 focus-visible:ring-2 focus-visible:outline-none sm:left-4 sm:size-9"
      >
        <ChevronLeft className="size-4.5 sm:size-5" aria-hidden="true" />
      </button>

      {/* ── Right Navigation Arrow Button ── */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          goToNext();
        }}
        aria-label="Next banner"
        className="text-vl-dark-900 focus-visible:ring-vl-cyan absolute top-1/2 right-2 z-20 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-white active:scale-95 focus-visible:ring-2 focus-visible:outline-none sm:right-4 sm:size-9"
      >
        <ChevronRight className="size-4.5 sm:size-5" aria-hidden="true" />
      </button>

      {/* ── Bottom Indicator Pill Capsule (Matching Reference Image) ── */}
      <div
        className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-md"
        role="tablist"
        aria-label="Banner slides"
      >
        {bannerList.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Go to slide ${i + 1} of ${totalBanners}`}
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex(i);
            }}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-none",
              i === currentIndex
                ? "bg-vl-cyan w-5 shadow-[0_0_8px_rgba(0,217,255,0.7)]"
                : "w-1.5 bg-white/50 hover:bg-white/80"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PromoBanner({
  banner,
  banners,
  className,
  autoPlayInterval = 5000,
}: PromoBannerProps) {
  // Normalize input: supports single banner or array of banners
  const bannerList = banners?.length ? banners : banner ? [banner] : [];
  const totalBanners = bannerList.length;

  if (totalBanners === 0) {
    return null;
  }

  // Determine aspect ratio classes based on mobile image presence
  const hasAnyMobileImage = bannerList.some((b) => Boolean(b.mobileImageUrl));
  const aspectClasses = hasAnyMobileImage
    ? "aspect-[3/2] sm:aspect-[16/5] lg:aspect-[21/6] 2xl:aspect-[24/7]"
    : "aspect-[16/7] sm:aspect-[16/5] lg:aspect-[21/6] 2xl:aspect-[24/7]";

  const containerClasses = cn(
    "relative isolate mx-auto w-full max-h-[220px] sm:max-h-[240px] lg:max-h-[326px] overflow-hidden rounded-2xl bg-vl-white-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]",
    aspectClasses,
    className
  );

  // ── Single Banner Mode (Clean & Fast, Zero Hook Overhead) ──
  if (totalBanners === 1) {
    const singleBanner = bannerList[0];

    if (singleBanner.linkUrl) {
      return (
        <Link
          href={singleBanner.linkUrl}
          aria-label={singleBanner.title}
          className={cn(
            "group focus-visible:ring-vl-cyan block focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
            containerClasses
          )}
        >
          <SingleBannerContent banner={singleBanner} isPriority={true} />
        </Link>
      );
    }

    return (
      <aside aria-label={singleBanner.title} className={containerClasses}>
        <SingleBannerContent banner={singleBanner} isPriority={true} />
      </aside>
    );
  }

  // ── Multi-Banner Carousel Mode (Handled by client carousel component) ──
  return (
    <PromoBannerCarousel
      bannerList={bannerList}
      containerClasses={containerClasses}
      autoPlayInterval={autoPlayInterval}
    />
  );
}
