"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MobileSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="lg:hidden">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close search" : "Open search"}
        className="flex size-9 items-center justify-center rounded-full text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
      >
        {isOpen ? <X className="size-4.5 text-[#0088A8]" /> : <Search className="size-4.5" />}
      </button>

      {/* Full-Width Mobile Search Bar & Overlay */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-xs sm:top-[72px]"
          />

          {/* Search Bar Container - Perfectly Aligned Edge-to-Edge */}
          <div className="fixed inset-x-0 top-16 z-50 border-b border-white/10 bg-[#0C0D0E] px-4 py-3 shadow-2xl sm:top-[72px]">
            <div className="mx-auto max-w-lg">
              <form
                action="/products"
                method="get"
                onSubmit={() => setIsOpen(false)}
                className="relative flex items-center"
              >
                <Search
                  className="pointer-events-none absolute left-3.5 size-4 text-[#00D9FF]"
                  aria-hidden="true"
                />

                <Input
                  ref={inputRef}
                  type="search"
                  name="q"
                  placeholder="Search for products, categories..."
                  aria-label="Search products"
                  className="h-10 w-full rounded-full border border-white/15 bg-[#181B1F] pr-10 pl-10 text-xs text-[#F3F0E8] placeholder:text-[#F3F0E8]/40 focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF]"
                />

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-3 flex size-5 items-center justify-center rounded-full text-white/40 hover:text-white"
                  aria-label="Dismiss search"
                >
                  <X className="size-3.5" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
