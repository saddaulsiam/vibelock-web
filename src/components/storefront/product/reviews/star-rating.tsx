"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  className = "",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4.5",
    lg: "size-6",
  };

  const currentVal = hoverValue !== null ? hoverValue : value;

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= currentVal;

        if (!interactive) {
          return (
            <Star
              key={starNumber}
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "fill-[#00D9FF] text-[#00D9FF]"
                  : "fill-[#101114]/10 text-[#101114]/20"
              } transition-colors`}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={starNumber}
            type="button"
            role="radio"
            aria-checked={starNumber === value}
            aria-label={`${starNumber} star${starNumber > 1 ? "s" : ""}`}
            className="cursor-pointer p-0.5 transition-transform hover:scale-115 focus-visible:outline-2 focus-visible:outline-[#00D9FF]"
            onClick={() => onChange?.(starNumber)}
            onMouseEnter={() => setHoverValue(starNumber)}
            onMouseLeave={() => setHoverValue(null)}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "fill-[#00D9FF] text-[#00D9FF]"
                  : "fill-[#101114]/10 text-[#101114]/25"
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
}

