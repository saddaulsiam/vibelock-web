"use client";

import type { CategorySummary, ProductSummary } from "@/lib/catalog/types";
import { ImageOff, Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: CategorySummary[];
}

const DEFAULT_POPULAR_TERMS = [
  "Sneakers",
  "Slides",
  "Clothing",
  "T-Shirts",
  "Pants",
  "Shorts",
  "Hoodies",
  "Oversized",
];

function formatPrice(amount: number) {
  return `Tk ${amount.toLocaleString("en-BD")}`;
}

const emptySubscribe = () => () => {};

export function SearchModal({ isOpen, onClose, categories = [] }: SearchModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Combine default terms with active category names
  const popularTerms = Array.from(
    new Set([...DEFAULT_POPULAR_TERMS, ...categories.map((c) => c.name)])
  ).slice(0, 10);

  // Auto-focus input when opened & lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Live search effect with debouncing & aborting previous requests
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Live search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const hasText = Boolean(val.trim());
    setIsLoading(hasText);
    if (!hasText) {
      setResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      handleClose();
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSelectTerm = (term: string) => {
    setQuery(term);
    setIsLoading(true);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-start">
      {/* Dimmed backdrop overlay */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Top search panel */}
      <div className="animate-in fade-in slide-in-from-top-3 relative z-10 w-full border-b border-gray-200 bg-white shadow-2xl duration-200">
        <div className="w-full px-4 py-4 sm:px-8 sm:py-5 lg:px-12 xl:px-16">
          {/* ── Header search bar row ── */}
          <div className="flex w-full items-center gap-3 sm:gap-6">
            {/* Desktop Brand Logo */}
            <Link
              href="/"
              onClick={onClose}
              className="hidden shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 lg:flex"
              aria-label="VibeLock Home"
            >
              <div className="border-vl-cyan bg-vl-black flex size-8 items-center justify-center rounded-full border-2 shadow-xs">
                <Image
                  src="/images/vibelock-logo.png"
                  alt="VibeLock"
                  width={20}
                  height={20}
                  priority
                  className="h-auto w-auto object-contain"
                />
              </div>
              <span className="text-vl-black text-sm font-black tracking-wider uppercase">
                VIBELOCK
              </span>
            </Link>

            {/* Pill Search Input Container */}
            <form onSubmit={handleSubmit} className="relative mx-auto flex-1 max-w-2xl">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search drops..."
                aria-label="Search drops"
                className="border-vl-cyan/60 focus:border-vl-cyan focus:ring-vl-cyan/30 h-10 w-full rounded-full border bg-white pr-9 pl-9 text-sm text-gray-900 transition-all placeholder:text-gray-400 focus:ring-2 focus:outline-none"
              />

              {/* Clear button (X) */}
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </form>

            {/* CANCEL Button */}
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 cursor-pointer text-xs font-bold tracking-wider text-gray-500 uppercase transition-colors hover:text-black"
            >
              CANCEL
            </button>
          </div>

          {/* ── Content Area: Popular Search Terms OR Matches ── */}
          <div className="mt-4 w-full border-t border-gray-100 pt-3">
            {!query.trim() ? (
              /* State 1: POPULAR SEARCH TERMS */
              <div className="mx-auto max-w-2xl sm:text-center">
                <h3 className="mb-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  POPULAR SEARCH TERMS
                </h3>
                <div className="flex flex-wrap gap-2 sm:justify-center">
                  {popularTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectTerm(term)}
                      className="hover:border-vl-cyan/50 cursor-pointer rounded-full border border-gray-200 bg-gray-50/80 px-3.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-100 hover:text-black"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* State 2: MATCHES */
              <div className="mx-auto max-w-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                    MATCHES
                  </h3>
                  {isLoading && (
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Loader2 className="text-vl-cyan size-3 animate-spin" />
                      Searching...
                    </span>
                  )}
                </div>

                {isLoading && results.length === 0 ? (
                  /* Loading skeleton */
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex animate-pulse items-center gap-3">
                        <div className="size-14 shrink-0 rounded-lg bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-3/5 rounded bg-gray-200" />
                          <div className="h-3 w-1/4 rounded bg-gray-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  /* Product items list */
                  <div>
                    <div className="max-h-[340px] scrollbar-thin space-y-1.5 overflow-y-auto pr-1.5">
                      {results.map((product) => {
                        const price = product.minPrice;
                        return (
                          <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            onClick={onClose}
                            className="group flex items-center gap-3.5 rounded-xl p-2 transition-colors hover:bg-gray-50"
                          >
                            {/* Product thumbnail */}
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                              {product.primaryImage ? (
                                <Image
                                  src={product.primaryImage.url}
                                  alt={product.primaryImage.alt || product.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ImageOff className="size-5 text-gray-300" />
                                </div>
                              )}
                            </div>

                            {/* Title & Price */}
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-1 text-xs font-semibold text-gray-900 group-hover:text-black sm:text-sm">
                                {product.name}
                              </h4>
                              <p className="mt-0.5 text-xs font-bold text-[#0088A8]">
                                {formatPrice(price)}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* View all results button */}
                    <Link
                      href={`/products?q=${encodeURIComponent(query.trim())}`}
                      onClick={onClose}
                      className="border-vl-cyan/60 text-vl-cyan hover:bg-vl-cyan/10 mt-4 flex w-full items-center justify-center rounded-full border py-2.5 text-xs font-bold tracking-wider uppercase transition-colors"
                    >
                      VIEW ALL RESULTS
                    </Link>
                  </div>
                ) : (
                  /* No results found */
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-600">
                      No products found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try searching with a different keyword or browse our categories.
                    </p>
                    <Link
                      href="/products"
                      onClick={onClose}
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2 text-xs font-bold tracking-wider text-gray-700 uppercase hover:bg-gray-50"
                    >
                      BROWSE ALL PRODUCTS
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
