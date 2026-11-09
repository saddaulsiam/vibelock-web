"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import type { CategorySummary } from "@/lib/catalog/types";
import { Badge } from "@/components/ui/badge";

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
        // =========================================================================
        // [HEIGHT ADJUSTMENT 1: ANIMATION SLOPE / INSET]
        // Controls how much the top of the card sinks down as it slides right → left:
        // - ratio 1 (right edge): full card height (top 0%, bottom 0%)
        // - ratio 0 (left edge): top sinks down by maxInset%
        // Values:
        //   * Mobile (<640px): 35 (increase e.g. 50-60 for steeper slope; decrease e.g. 20-25 for straighter cards)
        //   * Desktop: 60 (sinks down 60% on left to clear space for typewriter text)
        // =========================================================================
        const maxInset = containerW < 640 ? 35 : 60;
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
    // =========================================================================
    // [HEIGHT ADJUSTMENT 2: OVERALL SLIDER HEIGHT]
    // - Mobile (<640px): `h-[75vh]` (change this to adjust mobile image height,
    //   e.g. h-[48vh], h-[55vh], h-[70vh], or fixed like h-[420px])
    // - Desktop (sm+): `sm:inset-0 sm:h-full` (always stays full-height 100vh)
    // =========================================================================
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[75vh] overflow-hidden sm:inset-0 sm:h-full"
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
          <div
            key={`${cat.id}-${i}`}
            tabIndex={-1}
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
            <Link
              href={`/category/${cat.slug}`}
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
              <div className="pointer-events-none absolute top-5 left-5 z-10 max-w-[calc(100%-2.5rem)]">
                <p className="text-vl-cyan text-[10px] font-extrabold tracking-[0.22em] uppercase">
                  {cat.label}
                </p>
                <p className="mt-0.5 text-[15px] font-black tracking-wider text-white uppercase">
                  {cat.name}
                </p>
              </div>
            </Link>
          </div>
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
        const cleanName = cat.name
          .replace(/^\d+[.\s-]+/, "")
          .trim()
          .toUpperCase();
        return {
          id: cat.id,
          label:
            "label" in cat && cat.label ? cat.label : `CAT. ${String(index + 1).padStart(2, "0")}`,
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
      className="bg-vl-dark-900 relative flex h-screen overflow-hidden"
      aria-label="VibeLock hero — shop by category"
    >
      {formattedCategories.length > 0 && <InfiniteTrack categories={formattedCategories} />}

      {/* Left content panel */}
      <div
        className="relative z-20 flex flex-col justify-start px-6 pt-20 sm:px-10 sm:pt-24 lg:px-14 lg:pt-28 xl:px-20 xl:pt-32"
        style={{ pointerEvents: "none" }}
      >
        <div className="relative w-full">
          {/* Typewriter headline */}
          <h1
            className="font-heading text-vl-cyan text-[clamp(3rem,10vw,8rem)] leading-[0.88] font-black tracking-[-0.02em] uppercase drop-shadow-[0_0_28px_rgba(0,217,255,0.22)] select-none"
            aria-label={`Shop ${activeWords.join(", ")}`}
          >
            {displayed}
            <span
              aria-hidden="true"
              className="bg-vl-cyan ml-0.5 inline-block"
              style={{
                width: "clamp(3px, 0.08em, 7px)",
                height: "0.82em",
                verticalAlign: "-0.05em",
                animation: "vl-blink 1s step-end infinite",
              }}
            />
          </h1>

          {/* Divider */}
          <div className="bg-vl-cyan-900 mt-3 h-px w-20 sm:w-30 lg:w-40 xl:w-xs" />

          {/* Tagline */}
          <p className="mt-3 max-w-xl text-[10px] leading-[1.6] font-medium tracking-[0.08em] whitespace-pre-line text-white/55 uppercase sm:mt-3.5 sm:text-[11px] lg:text-[12px]">
            VIBELOCK — PREMIUM STREETWEAR CATALOG,
            <br />
            CURATING CULTURE FOR THE REAL ONES.
          </p>

          {/* Subtagline */}
          <p className="text-vl-cyan/80 mt-2 text-[10px] font-semibold tracking-widest capitalize sm:mt-2.5">
            {subtagline}
          </p>

          {/* CTA */}
          <div className="mt-5 sm:mt-6" style={{ pointerEvents: "auto" }}>
            <Link
              href="/shop"
              className="group border-vl-cyan/50 bg-vl-cyan/10 text-vl-cyan hover:border-vl-cyan hover:bg-vl-cyan hover:text-vl-dark-900 focus-visible:ring-vl-cyan inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[9px] font-extrabold tracking-[0.2em] uppercase backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[10px] lg:gap-2.5 lg:px-6 lg:py-3 lg:text-[11px] xl:px-7 xl:text-xs"
            >
              <span>SHOP ALL DROPS</span>
              <ArrowRight
                className="size-2.5 transition-transform duration-300 group-hover:translate-x-0.5 sm:size-3 lg:size-3.5"
                aria-hidden="true"
              />
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
        className="group focus-visible:ring-vl-cyan absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1.5 transition-transform duration-300 select-none hover:scale-110 focus:outline-none focus-visible:ring-2"
        aria-label="Scroll down"
      >
        <div className="group-hover:border-vl-cyan flex h-8 w-5 justify-center rounded-full border-2 border-white/40 bg-black/60 pt-1.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-colors">
          <div className="animate-vl-scroll-wheel bg-vl-cyan h-1.5 w-1 rounded-full shadow-[0_0_8px_rgba(0,217,255,0.9)]" />
        </div>
      </button>
    </section>
  );
}
