"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { HeroBanner } from "@/lib/catalog/hero-banners";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  banners: HeroBanner[];
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const activeBanners = React.useMemo(() => {
    return banners && banners.length > 0 ? banners : [];
  }, [banners]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const prefersReducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Swipe gesture coordinates
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);

  const totalBanners = activeBanners.length;
  const isMultiBanner = totalBanners > 1;

  const goToNext = React.useCallback(() => {
    if (totalBanners <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
  }, [totalBanners]);

  const goToPrev = React.useCallback(() => {
    if (totalBanners <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
  }, [totalBanners]);

  const goToSlide = React.useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-rotation timer (6 seconds)
  React.useEffect(() => {
    if (!isMultiBanner || isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      goToNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [isMultiBanner, isPaused, prefersReducedMotion, goToNext, currentIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isMultiBanner) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
    }
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrev();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  if (totalBanners === 0) return null;

  const currentBanner = activeBanners[currentIndex];

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Homepage Hero Streetwear Drops"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden bg-[#EDE9E0] text-[#101114] focus:outline-none"
    >
      <div className="mx-auto max-w-360 px-4 sm:px-6 lg:pr-0 lg:pl-10 xl:pl-16">
        <div className="grid min-h-[460px] items-center lg:min-h-[500px] lg:grid-cols-[1.05fr_0.95fr] xl:min-h-[540px] xl:grid-cols-[1.10fr_0.90fr]">
          {/* Left Column: Eyebrow, Headline, Description, CTA, Controls */}
          <div className="z-10 flex flex-col justify-center py-10 sm:py-14 lg:py-16 lg:pr-8">
            {/* Slide content container with transition */}
            <div
              key={currentBanner.id}
              className={cn(
                "transition-opacity duration-500 ease-in-out",
                prefersReducedMotion ? "transition-none" : "animate-in fade-in"
              )}
            >
              {/* Eyebrow */}
              <p className="text-xs font-bold tracking-[0.28em] text-[#101114]/60 uppercase sm:text-[13px]">
                {currentBanner.eyebrow}
              </p>

              {/* Headline */}
              <h1 className="mt-4 text-4xl leading-[0.92] font-black tracking-tight text-[#101114] uppercase sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem]">
                {currentBanner.headline}
                <br />
                {currentBanner.highlightText ? (
                  <span className="text-[#00D9FF]">{currentBanner.highlightText} </span>
                ) : null}
                {currentBanner.headlineSuffix ?? ""}
              </h1>

              {/* Description */}
              <p className="mt-5 max-w-md text-sm leading-relaxed font-medium text-[#101114]/70 sm:mt-6 sm:text-base lg:text-lg">
                {currentBanner.description}
              </p>

              {/* CTA Button */}
              <div className="mt-7 sm:mt-8">
                <Link
                  href={currentBanner.ctaUrl}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#101114] px-8 py-3.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg transition-all hover:bg-black/85 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <span>{currentBanner.ctaLabel}</span>
                  <ArrowRight
                    className="size-4 text-[#00D9FF] transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>

            {/* Interactive Slide Indicators & Controls */}
            {isMultiBanner ? (
              <div className="mt-10 flex items-center gap-3 sm:mt-12 lg:mt-14">
                {/* Autoplay status toggle icon */}
                <button
                  type="button"
                  aria-label={isPaused ? "Play hero carousel" : "Pause hero carousel"}
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="inline-flex size-6 items-center justify-center rounded-full bg-[#101114]/15 text-[#101114] transition-colors hover:bg-[#101114] hover:text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <span className="text-xs leading-none font-bold">{isPaused ? "▶" : "+"}</span>
                </button>

                {/* Clickable Indicators */}
                <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
                  {activeBanners.map((banner, index) => {
                    const isActive = index === currentIndex;
                    return (
                      <button
                        key={banner.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Go to slide ${index + 1}: ${banner.eyebrow}`}
                        onClick={() => goToSlide(index)}
                        className={cn(
                          "h-1.5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none",
                          isActive
                            ? "w-7 rounded-full bg-[#00D9FF]"
                            : "w-4 rounded-full bg-[#101114]/25 hover:bg-[#101114]/50"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Model Graphic Image & Vertical Watermark */}
          <div className="relative flex items-end justify-center self-end lg:justify-end">
            <div className="relative w-full max-w-[560px] lg:max-w-none">
              {activeBanners.map((banner, index) => {
                const isActive = index === currentIndex;
                const isInitial = index === 0;

                return (
                  <div
                    key={banner.id}
                    className={cn(
                      "transition-opacity duration-700 ease-in-out",
                      isActive ? "relative block opacity-100" : "absolute inset-0 hidden opacity-0"
                    )}
                    aria-hidden={!isActive}
                  >
                    <Image
                      src={banner.imageUrl}
                      alt={`${banner.headline} - VibeLock Streetwear`}
                      width={550}
                      height={440}
                      priority={isInitial}
                      loading={isInitial ? undefined : "lazy"}
                      style={{
                        maskImage:
                          "radial-gradient(ellipse 92% 90% at 50% 50%, black 65%, transparent 100%)",
                        WebkitMaskImage:
                          "radial-gradient(ellipse 92% 90% at 50% 50%, black 65%, transparent 100%)",
                      }}
                      className="h-auto w-full object-contain lg:max-h-[540px] xl:max-h-[580px]"
                    />
                  </div>
                );
              })}
            </div>

            {/* Vertical Streetwear Culture Watermark (Far Right Edge) */}
            <div
              className="pointer-events-none absolute top-1/2 -right-6 hidden -translate-y-1/2 rotate-90 text-[10px] font-bold tracking-[0.32em] text-[#101114]/35 uppercase select-none xl:block"
              aria-hidden="true"
            >
              Streetwear &nbsp;|&nbsp; Culture &nbsp;|&nbsp; Community
            </div>
          </div>
        </div>
      </div>

      {/* Flanking Circular Navigation Arrows */}
      {isMultiBanner ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={goToPrev}
            className="absolute top-1/2 left-3 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:scale-105 hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:inline-flex lg:left-5"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={goToNext}
            className="absolute top-1/2 right-3 z-20 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:scale-105 hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:inline-flex lg:right-5"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </section>
  );
}
