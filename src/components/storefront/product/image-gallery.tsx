"use client";

import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { ProductImageSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: ProductImageSummary[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  // Guarantee that the primary image is always placed first (index 0) in the gallery
  const sortedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  const markImageFailed = (url: string) => {
    setFailedImages((current) => new Set(current).add(url));
  };

  const handleMobileScroll = () => {
    if (!mobileCarouselRef.current) return;
    const { scrollLeft, clientWidth } = mobileCarouselRef.current;
    if (clientWidth === 0) return;
    const newIndex = Math.round(scrollLeft / clientWidth);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < sortedImages.length) {
      setActiveIndex(newIndex);
    }
  };

  const scrollToSlide = (index: number) => {
    setActiveIndex(index);
    if (mobileCarouselRef.current) {
      const width = mobileCarouselRef.current.clientWidth;
      mobileCarouselRef.current.scrollTo({
        left: index * width,
        behavior: "smooth",
      });
    }
  };

  if (!sortedImages.length) {
    return (
      <div className="text-muted-foreground bg-vl-white-300 mx-auto flex aspect-3/4 w-full max-w-60 items-center justify-center sm:max-w-90 lg:mx-0 lg:max-w-110">
        <div className="flex flex-col items-center gap-3 text-center">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="text-sm">No product images available</span>
        </div>
      </div>
    );
  }

  const selectedImage = sortedImages[activeIndex] ?? sortedImages[0];
  const selectedImageFailed = failedImages.has(selectedImage.url);

  return (
    <div className="min-w-0">
      {/* ───────────────────────────────────────────────────────────
          1. MOBILE / TABLET VIEW (< lg):
             Swipeable Snap Carousel with Floating Dots & Counter.
             No separate thumbnail row eating up vertical screen height!
          ─────────────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="xs:max-w-[300px] relative mx-auto w-full max-w-90 sm:max-w-110">
          <div
            ref={mobileCarouselRef}
            onScroll={handleMobileScroll}
            className="flex w-full snap-x snap-mandatory scrollbar-none overflow-x-auto rounded-xs [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Product image carousel"
          >
            {sortedImages.map((image, index) => {
              const imageFailed = failedImages.has(image.url);

              return (
                <div
                  key={`${image.url}-${index}`}
                  className="bg-vl-white-300 relative aspect-3/4 w-full shrink-0 snap-center overflow-hidden"
                >
                  {!imageFailed ? (
                    <Image
                      src={image.url}
                      alt={image.alt || `${productName} image ${index + 1}`}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 639px) 300px, 360px"
                      className="object-cover object-center"
                      onError={() => markImageFailed(image.url)}
                    />
                  ) : (
                    <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <ImageOff className="size-8" aria-hidden="true" />
                      <span className="text-xs">Image unavailable</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Indicators for Mobile (Dots + Counter Pill) */}
          {sortedImages.length > 1 && (
            <>
              {/* Pagination Dots */}
              <div className="bg-vl-dark-900/40 pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2 py-1 backdrop-blur-xs">
                {sortedImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={cn(
                      "pointer-events-auto cursor-pointer rounded-full transition-all duration-200",
                      activeIndex === idx
                        ? "bg-vl-cyan h-1.5 w-4"
                        : "size-1.5 bg-white/60 hover:bg-white"
                    )}
                  />
                ))}
              </div>

              {/* Slide Counter (e.g. 1 / 2) */}
              <span className="bg-vl-dark-900/75 pointer-events-none absolute right-2.5 bottom-2.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-2xs backdrop-blur-xs">
                {activeIndex + 1} / {sortedImages.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. DESKTOP VIEW (lg: 1024px+):
             High-End Lookbook Gallery (Vertical Thumbnails on left,
             Large High-Res Viewer on right).
          ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-row lg:gap-4">
        {/* Left Vertical Thumbnails */}
        {sortedImages.length > 1 && (
          <div
            className="flex max-h-165 flex-col gap-2.5 overflow-y-auto pb-0"
            aria-label="Product image thumbnails"
          >
            {sortedImages.map((image, index) => {
              const imageFailed = failedImages.has(image.url);
              const selected = index === activeIndex;

              return (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => scrollToSlide(index)}
                  className={`bg-vl-white-300 focus-visible:ring-vl-cyan relative aspect-3/4 w-20 shrink-0 cursor-pointer overflow-hidden border transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    selected
                      ? "border-vl-dark-900 ring-vl-cyan/70 shadow-xs ring-2"
                      : "hover:border-vl-dark-900/35 border-transparent"
                  }`}
                  aria-label={`View image ${index + 1} of ${sortedImages.length}`}
                  aria-pressed={selected}
                >
                  {!imageFailed ? (
                    <Image
                      src={image.url}
                      alt={image.alt || `${productName} thumbnail ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover object-center"
                      onError={() => markImageFailed(image.url)}
                    />
                  ) : (
                    <span className="text-muted-foreground absolute inset-0 flex items-center justify-center">
                      <ImageOff className="size-4" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Large Main Viewer */}
        <div className="bg-vl-white-300 relative aspect-3/4 max-h-165 w-full max-w-110 overflow-hidden">
          {!selectedImageFailed ? (
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt || productName}
              fill
              priority
              className="object-cover object-center"
              sizes="440px"
              onError={() => markImageFailed(selectedImage.url)}
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ImageOff className="size-9" aria-hidden="true" />
              <span className="text-sm">Image unavailable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
