"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { ProductImageSummary } from "@/lib/catalog/types";

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

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const activeIndex = selectedIndex < sortedImages.length ? selectedIndex : 0;
  const selectedImage = sortedImages[activeIndex];

  const markImageFailed = (url: string) => {
    setFailedImages((current) => new Set(current).add(url));
  };

  if (!selectedImage) {
    return (
      <div className="text-muted-foreground xs:max-w-[270px] bg-vl-white-300 mx-auto flex aspect-3/4 w-full max-w-60 items-center justify-center sm:max-w-90 lg:mx-0 lg:max-w-110">
        <div className="flex flex-col items-center gap-3 text-center">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="text-sm">No product images available</span>
        </div>
      </div>
    );
  }

  const selectedImageFailed = failedImages.has(selectedImage.url);

  return (
    <div className="flex min-w-0 flex-col gap-2.5 sm:gap-4 lg:flex-row">
      {/* ── Thumbnails Row / Column ── */}
      {sortedImages.length > 1 && (
        <div
          className="order-2 flex justify-center gap-2.5 overflow-x-auto pb-1 sm:gap-2 lg:order-1 lg:max-h-165 lg:flex-col lg:justify-start lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0"
          aria-label="Product image thumbnails"
        >
          {sortedImages.map((image, index) => {
            const imageFailed = failedImages.has(image.url);
            const selected = index === activeIndex;

            return (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
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

      {/* ── Main Big Image ── */}
      <div className="xs:max-w-[270px] bg-vl-white-300 relative order-1 mx-auto aspect-3/4 w-full overflow-hidden sm:max-w-90 lg:order-2 lg:mx-0 lg:max-w-110">
        {!selectedImageFailed ? (
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt || productName}
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 639px) 270px, (max-width: 1023px) 360px, 440px"
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
  );
}
