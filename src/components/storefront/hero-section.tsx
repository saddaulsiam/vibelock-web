"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

interface HeroCategory {
  id: string;
  label: string;
  name: string;
  slug: string;
  imageUrl: string;
}

interface HeroSectionProps {
  categories: HeroCategory[];
  words: string[];
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
        setWordIdx((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }
  }, [displayed, wordIdx, phase, words, typingSpeed, deletingSpeed, pauseMs]);

  return displayed;
}

// Card width in px used for the animation distance calculation
const CARD_WIDTH = 450;
const CARD_GAP = 2;

function InfiniteTrack({ categories }: { categories: HeroCategory[] }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number>(0);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

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
        // 0.30 at left edge → 1.0 at right edge
        const scale = 0.3 + ratio * 0.7;
        card.style.transform = `scaleY(${scale.toFixed(3)})`;
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const items = [...categories, ...categories, ...categories];
  const singleSetWidth = categories.length * (CARD_WIDTH + CARD_GAP);

  const animDuration = Math.max(7, Math.round(categories.length * 2.2));

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
        }}
      >
        {items.map((cat, i) => (
          <Link
            key={`${cat.id}-${i}`}
            href={`/category/${cat.slug}`}
            tabIndex={-1}
            style={{
              position: "relative",
              flexShrink: 0,
              width: `${CARD_WIDTH}px`,
              height: "100%",
              display: "block",
              overflow: "visible",
            }}
          >
            {/* Inner wrapper — scaleY applied here from bottom */}
            <div
              className="vl-card-inner"
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                transformOrigin: "bottom center",
                willChange: "transform",
              }}
            >
              <Image
                src={cat.imageUrl}
                alt={cat.name}
                fill
                sizes="450px"
                className="object-cover"
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.05) 100%)",
                }}
              />
              <div style={{ position: "absolute", top: "1.25rem", left: "1.25rem", zIndex: 10 }}>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.22em",
                    color: "#00D9FF",
                    textTransform: "uppercase",
                    margin: 0,
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
                  }}
                >
                  {cat.name}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes vibelock-scroll {
          0%, 3% { transform: translateX(0); }
          97%, 100% { transform: translateX(-${singleSetWidth}px); }
        }
        .vl-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="vibelock-scroll"], .vl-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function HeroSection({
  categories,
  words,
  tagline = "VIBELOCK — PREMIUM STREETWEAR CATALOG,\nCURATING CULTURE FOR THE REAL ONES.",
  subtagline = "EXCLUSIVE. LIMITED. HIGH-END.",
}: HeroSectionProps) {
  const displayed = useTypewriter(words);

  return (
    <section
      className="relative flex h-screen overflow-hidden bg-[#080A0C]"
      aria-label="VibeLock hero — shop by category"
    >
      {categories.length > 0 && <InfiniteTrack categories={categories} />}

      {/* Left content panel */}
      <div
        className="relative z-20 flex flex-col justify-center px-7 sm:px-10 lg:px-14 xl:px-20"
        style={{ pointerEvents: "none" }}
      >
        {/* Left-side gradient scrim so text is always readable */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(8,10,12,1) 0%, rgba(8,10,12,0.96) 32%, rgba(8,10,12,0.70) 60%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        <div className="relative max-w-[440px] lg:max-w-[520px]">
          {/* Typewriter headline */}
          <h1
            className="text-[clamp(3rem,8vw,6.5rem)] leading-[0.88] font-black tracking-tight text-[#00D9FF] uppercase select-none"
            aria-label={`Shop ${words.join(", ")}`}
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

          <p className="mt-5 text-[11px] leading-relaxed font-semibold tracking-wide whitespace-pre-line text-white/60 uppercase sm:text-xs lg:text-[13px]">
            {tagline}
          </p>

          <p className="mt-2 text-[11px] font-black tracking-[0.25em] text-[#00D9FF] uppercase">
            {subtagline}
          </p>

          <div className="mt-7" style={{ pointerEvents: "auto" }}>
            <Link
              href="/products"
              className="inline-flex items-center gap-3 rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/10 px-7 py-3 text-xs font-black tracking-[0.18em] text-[#00D9FF] uppercase backdrop-blur-sm transition-all duration-300 hover:border-[#00D9FF] hover:bg-[#00D9FF] hover:text-[#080A0C] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            >
              SHOP ALL DROPS
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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

      <style>{`
        @keyframes vl-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
