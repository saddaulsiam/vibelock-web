"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { ProductImageSummary } from "@/lib/catalog/types";

interface ImageGalleryProps {
  images: ProductImageSummary[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const primaryIndex = Math.max(
    0,
    images.findIndex((image) => image.isPrimary)
  );
  const [selectedIndex, setSelectedIndex] = useState(primaryIndex);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const selectedImage = images[selectedIndex];

  const markImageFailed = (url: string) => {
    setFailedImages((current) => new Set(current).add(url));
  };

  if (!selectedImage) {
    return (
      <div
        className="text-muted-foreground flex max-h-[75vh] max-w-[calc(75vh*2/3)] items-center justify-center bg-[#f2f2f2] lg:max-h-165 lg:max-w-110"
        style={{ aspectRatio: "2 / 3" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="text-sm">No product images available</span>
        </div>
      </div>
    );
  }

  const selectedImageFailed = failedImages.has(selectedImage.url);

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:flex-row">
      {images.length > 1 && (
        <div
          className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-165 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0"
          aria-label="Product image thumbnails"
        >
          {images.map((image, index) => {
            const imageFailed = failedImages.has(image.url);
            const selected = index === selectedIndex;

            return (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`relative w-16 shrink-0 overflow-hidden border bg-[#f2f2f2] transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:w-20 ${
                  selected ? "border-[#101114]" : "border-transparent hover:border-[#101114]/35"
                }`}
                style={{ aspectRatio: "2 / 3" }}
                aria-label={`View image ${index + 1} of ${images.length}`}
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

      <div
        className="relative order-1 max-h-[75vh] max-w-[calc(75vh*2/3)] min-w-0 flex-1 overflow-hidden bg-[#f2f2f2] lg:order-2 lg:max-h-165 lg:max-w-110"
        style={{ aspectRatio: "2 / 3" }}
      >
        {!selectedImageFailed ? (
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt || productName}
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1023px) 100vw, 55vw"
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
