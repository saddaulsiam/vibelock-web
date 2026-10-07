"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProductImageSummary } from "@/lib/catalog/types";

interface ImageGalleryProps {
  images: ProductImageSummary[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // If no images, provide a fallback
  const displayImages = images.length > 0 
    ? images 
    : [{ url: "/placeholder.jpg", alt: productName, isPrimary: true }];

  const selectedImage = displayImages[selectedIndex];

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-6">
      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:max-h-[600px] scrollbar-hide pb-2 md:pb-0 shrink-0">
          {displayImages.map((img, idx) => (
            <button
              key={img.url + idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 border-2 transition-colors",
                selectedIndex === idx ? "border-brand-charcoal" : "border-transparent hover:border-gray-300"
              )}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={selectedIndex === idx}
            >
              <Image
                src={img.url}
                alt={img.alt || `${productName} thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96px, 96px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="relative w-full aspect-[3/4] md:aspect-auto md:h-[600px] rounded-xl overflow-hidden bg-gray-100 flex-1">
        <Image
          src={selectedImage.url}
          alt={selectedImage.alt || productName}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    </div>
  );
}
