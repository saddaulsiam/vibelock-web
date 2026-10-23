"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import type { CategorySummary } from "@/lib/catalog/types";

export interface HeroCategory {
  id: string;
  label: string;
  name: string;
  slug: string;
  imageUrl: string;
}

interface HeroSectionProps {
  categories: (HeroCategory | CategorySummary)[];
  words?: string[];
  tagline?: string;
  subtagline?: string;
}

function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 45, pauseMs = 1600) {
  const [displayed, setDisplayed] = React.useState("");
  const [wordIdx, setWordIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<"typing" | "pausing" | "deleting">("typing");

  React.useEffect(() => {
    if (words.length === 0) return;
    const currentWord = words[wordIdx % words.length];

    if (phase === "typing") {
      if (displayed.length < currentWord.length) {
        const t = setTimeout(
          () => setDisplayed(currentWord.slice(0, displayed.length + 1)),
          typingSpeed
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("pausing"), pauseMs);
        return () => clearTimeout(t);
      }
    }
    if (phase === "pausing") {
      const t = setTimeout(() => setPhase("deleting"), 200);
      return () => clearTimeout(t);
    }
    if (phase === "deleting") {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed((d) => d.slice(0, -1)), deletingSpeed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          setWordIdx((i) => (i + 1) % words.length);
          setPhase("typing");
        }, 120);
        return () => clearTimeout(t);
      }
    }
  }, [displayed, wordIdx, phase, words, typingSpeed, deletingSpeed, pauseMs]);

  return displayed;
}

const CARD_GAP = 2;

function InfiniteTrack({ categories }: { categories: HeroCategory[] }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number>(0);

  React.useEffect(() => {
    function tick() {
      const wrapper = wrapperRef.current;
      const track = trackRef.current;
      if (!wrapper || !track) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const containerW = wrapper.offsetWidth;
      const innerCards = track.querySelectorAll<HTMLElement>(".vl-card-inner");
      innerCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const ratio = Math.max(0, Math.min(1, centerX / containerW));
        // ratio 1 (right edge) → full height (top 0%, bottom 0%)
        // ratio 0 (left edge) → top sinks down to 55-60%, bottom remains glued to 0
        const maxInset = containerW < 640 ? 55 : 60;
        const insetTop = (1 - ratio) * maxInset;
        card.style.top = `${insetTop.toFixed(2)}%`;
        card.style.bottom = "0px";
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const items = [...categories, ...categories, ...categories];
  const animDuration = Math.max(7, Math.round(categories.length * 2.2));
  const scrollDistance = `calc(-1 * (var(--vl-card-width, 480px) + ${CARD_GAP}px) * ${categories.length})`;

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <div
        ref={trackRef}
        className="vl-track"
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: "100%",
          gap: `${CARD_GAP}px`,
          width: "max-content",
          animation: `vibelock-scroll ${animDuration}s ease-in-out infinite alternate`,
          ["--vl-cat-count" as string]: categories.length,
          ["--vl-scroll-dist" as string]: scrollDistance,
        }}
      >
        {items.map((cat, i) => (
          <Link
            key={`${cat.id}-${i}`}
            href={`/category/${cat.slug}`}
            tabIndex={-1}
            className="vl-card-link"
            style={{
              position: "relative",
              flexShrink: 0,
              width: "var(--vl-card-width, 480px)",
              height: "100%",
              display: "block",
              overflow: "visible",
            }}
          >
            {/* Inner wrapper — glued to bottom, height scales down from the top */}
            <div
              className="vl-card-inner"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                overflow: "hidden",
                willChange: "top",
              }}
            >
              <Image
                src={cat.imageUrl}
                alt={cat.name}
                fill
                sizes="(max-width: 640px) 290px, (max-width: 1024px) 380px, 480px"
                className="object-cover"
                priority={i < 4}
                style={{ objectPosition: "center bottom" }}
              />
              {/* Dual scrim: top shadow for legible text, bottom shadow for depth */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 30%, transparent 60%, rgba(0,0,0,0.6) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  left: "1.25rem",
                  zIndex: 10,
                  maxWidth: "calc(100% - 2.5rem)",
                  pointerEvents: "none",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    color: "#00D9FF",
                    textTransform: "uppercase",
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </p>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    color: "#ffffff",
                    textTransform: "uppercase",
                    margin: 0,
                    marginTop: "2px",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.name}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HeroSection({
  categories = [],
  words,
  tagline = "VIBELOCK — PREMIUM STREETWEAR CATALOG,\nCURATING CULTURE FOR THE REAL ONES.",
  subtagline = "EXCLUSIVE. LIMITED. HIGH-END.",
}: HeroSectionProps) {
  const formattedCategories: HeroCategory[] = React.useMemo(() => {
    return categories
      .filter((c) => Boolean(c && c.name))
      .map((cat, index) => {
        const cleanName = cat.name.replace(/^\d+[.\s-]+/, "").trim().toUpperCase();
        return {
          id: cat.id,
          label: "label" in cat && cat.label ? cat.label : `CAT. ${String(index + 1).padStart(2, "0")}`,
          name: cleanName,
          slug: cat.slug,
          imageUrl: cat.imageUrl || "/images/categories/cat-t-shirts.jpg",
        };
      });
  }, [categories]);

  const activeWords = React.useMemo(() => {
    if (words && words.length > 0) return words;
    if (formattedCategories.length > 0) return formattedCategories.map((c) => c.name);
    return ["STREETWEAR", "COLLECTION", "DROPS"];
  }, [words, formattedCategories]);

  const displayed = useTypewriter(activeWords);

  return (
    <section
      className="relative flex h-screen overflow-hidden bg-[#080A0C]"
      aria-label="VibeLock hero — shop by category"
    >
      {formattedCategories.length > 0 && <InfiniteTrack categories={formattedCategories} />}

      {/* Left content panel positioned at the top left empty space */}
      <div
        className="relative z-20 flex flex-col justify-start px-7 pt-24 sm:px-10 sm:pt-28 lg:px-14 lg:pt-32 xl:px-20"
        style={{ pointerEvents: "none" }}
      >
        <div className="relative max-w-[340px] sm:max-w-[440px] lg:max-w-full">
          {/* Typewriter headline */}
          <h1
            className="font-heading text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.88] font-black tracking-tight text-[#00D9FF] uppercase select-none"
            aria-label={`Shop ${activeWords.join(", ")}`}
          >
            {displayed}
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block bg-[#00D9FF] align-middle"
              style={{
                width: "4px",
                height: "0.8em",
                animation: "vl-blink 1s step-end infinite",
              }}
            />
          </h1>

          <p className="mt-3 text-[10px] leading-relaxed font-semibold tracking-wide whitespace-pre-line text-white/60 uppercase sm:mt-5 sm:text-xs lg:text-[13px]">
            {tagline}
          </p>

          <p className="mt-1.5 text-[10px] font-black tracking-[0.22em] text-[#00D9FF] uppercase sm:mt-2 sm:text-[11px] sm:tracking-[0.25em]">
            {subtagline}
          </p>

          <div className="mt-4 sm:mt-7" style={{ pointerEvents: "auto" }}>
            <Link
              href="/products"
              className="inline-flex items-center gap-2.5 rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-5 py-2.5 text-[11px] font-black tracking-[0.16em] text-[#00D9FF] uppercase backdrop-blur-sm transition-all duration-300 hover:border-[#00D9FF] hover:bg-[#00D9FF] hover:text-[#080A0C] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:gap-3 sm:px-7 sm:py-3 sm:text-xs sm:tracking-[0.18em]"
            >
              SHOP ALL DROPS
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="sm:size-3.5"
              >
                <path
                  d="M1 7h12M8 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Down Mouse Indicator */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
          }
        }}
        className="group absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1.5 transition-transform duration-300 select-none hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
        aria-label="Scroll down"
      >
        <div className="flex h-8 w-5 justify-center rounded-full border-2 border-white/40 bg-black/50 pt-1.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-colors group-hover:border-[#00D9FF]">
          <div className="animate-vl-scroll-wheel h-1.5 w-1 rounded-full bg-[#00D9FF] shadow-[0_0_6px_#00D9FF]" />
        </div>
      </button>
    </section>
  );
}
