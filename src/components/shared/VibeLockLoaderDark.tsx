"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LoaderStage {
  id: string;
  name: string;
  desc: string;
}

export interface VibeLockLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional custom title / status label. Overrides active stage description */
  label?: string;
  /** Subtitle pill text (default: "STREETWEAR CULTURE") */
  subLabel?: string;
  /** Fullscreen fixed overlay mode (default: true) or inline card mode */
  fullScreen?: boolean;
  /**
   * Functional real progress value (0 to 100).
   * When provided, the loader is fully controlled by the caller.
   * When omitted (undefined), uses intelligent autonomous trickle.
   */
  progress?: number;
  /** Alias for progress (0 to 100) */
  value?: number;
  /** Optional stage override: 0-based index or custom stage title */
  currentStage?: number | string;
  /** Custom list of loading milestones / stages */
  stages?: readonly LoaderStage[];
  /** Callback fired once when progress reaches 100% */
  onComplete?: () => void;
  /** If true, completes progress to 100% automatically when window/document finishes loading */
  trackDocumentLoad?: boolean;
}

const DEFAULT_STAGES: readonly LoaderStage[] = [
  { id: "01", name: "INITIALIZING CORE", desc: "CONNECTING TO DHAKA CDN" },
  { id: "02", name: "SYNCING CATALOG", desc: "DECRYPTING STREETWEAR MANIFEST" },
  { id: "03", name: "LOADING ASSETS", desc: "STREAMING HIGH-RES DROP MEDIA" },
  { id: "04", name: "FINALIZING DROP", desc: "VERIFYING INVENTORY LEDGER" },
] as const;

export default function VibeLockLoaderDark({
  label,
  subLabel = "STREETWEAR CULTURE",
  fullScreen = true,
  progress: externalProgress,
  value,
  currentStage,
  stages = DEFAULT_STAGES,
  onComplete,
  trackDocumentLoad = true,
  className,
  ...props
}: VibeLockLoaderProps) {
  const isControlled = typeof externalProgress === "number" || typeof value === "number";
  const controlledValue = externalProgress ?? value;

  const [internalProgress, setInternalProgress] = React.useState(
    isControlled ? Math.min(100, Math.max(0, Math.round(controlledValue!))) : 12
  );
  const [internalStageIdx, setInternalStageIdx] = React.useState(0);
  const [latency, setLatency] = React.useState(22);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const onCompleteCalled = React.useRef(false);

  // ── 1. Measure Actual Real Telemetry (RTT & Online State) ──
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Measure real network RTT if available
    const nav = navigator as Navigator & {
      connection?: { rtt?: number };
    };

    if (nav.connection?.rtt && nav.connection.rtt > 0) {
      setLatency(nav.connection.rtt);
    } else {
      const navEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (navEntry && navEntry.responseStart > 0 && navEntry.requestStart > 0) {
        const measured = Math.round(navEntry.responseStart - navEntry.requestStart);
        if (measured > 0 && measured < 400) {
          setLatency(measured);
        }
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── 2. Controlled Mode: Update directly when progress/value prop changes ──
  React.useEffect(() => {
    if (isControlled && typeof controlledValue === "number") {
      const clamped = Math.min(100, Math.max(0, Math.round(controlledValue)));
      setInternalProgress(clamped);

      if (typeof currentStage === "number") {
        setInternalStageIdx(Math.min(stages.length - 1, Math.max(0, currentStage)));
      } else {
        const calculatedIdx = Math.min(
          stages.length - 1,
          Math.floor((clamped / 100) * stages.length)
        );
        setInternalStageIdx(calculatedIdx);
      }

      if (clamped >= 100 && !onCompleteCalled.current) {
        onCompleteCalled.current = true;
        setIsCompleted(true);
        onComplete?.();
      }
    }
  }, [isControlled, controlledValue, currentStage, stages.length, onComplete]);

  // ── 3. Autonomous Mode: Realistic asymptotic trickle curve (never loops back) ──
  React.useEffect(() => {
    if (isControlled) return;

    let current = 12;
    let timer: NodeJS.Timeout | null = null;

    const step = () => {
      // Fast responsive start (0-35%), steady middle, holds smoothly at 94%
      const delta =
        current < 35 ? 3.4 : current < 65 ? 1.8 : current < 85 ? 0.9 : current < 94 ? 0.25 : 0.05;
      current = Math.min(95, current + delta);
      const rounded = Math.floor(current);

      setInternalProgress(rounded);

      if (typeof currentStage === "number") {
        setInternalStageIdx(Math.min(stages.length - 1, Math.max(0, currentStage)));
      } else {
        setInternalStageIdx(
          Math.min(stages.length - 1, Math.floor((rounded / 100) * stages.length))
        );
      }

      if (current < 95) {
        timer = setTimeout(step, current < 40 ? 45 : 85);
      }
    };

    timer = setTimeout(step, 50);

    const handleWindowLoad = () => {
      setInternalProgress(100);
      setInternalStageIdx(stages.length - 1);
      setIsCompleted(true);
      if (!onCompleteCalled.current) {
        onCompleteCalled.current = true;
        onComplete?.();
      }
    };

    if (trackDocumentLoad && typeof document !== "undefined") {
      if (document.readyState === "complete") {
        const t = setTimeout(handleWindowLoad, 350);
        return () => {
          clearTimeout(t);
          if (timer) clearTimeout(timer);
        };
      } else {
        window.addEventListener("load", handleWindowLoad, { once: true });
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (trackDocumentLoad && typeof window !== "undefined") {
        window.removeEventListener("load", handleWindowLoad);
      }
    };
  }, [isControlled, trackDocumentLoad, currentStage, stages.length, onComplete]);

  const activeStage = stages[internalStageIdx] || stages[0];
  const stageTitle =
    typeof currentStage === "string" ? currentStage : activeStage.name;
  const stageDesc =
    isCompleted || internalProgress >= 100
      ? "SYSTEM READY // DROP LOADED"
      : label || activeStage.desc;

  return (
    <div
      role="status"
      aria-label={label || stageTitle}
      aria-busy={!isCompleted && internalProgress < 100}
      aria-live="polite"
      className={cn(
        "relative isolate flex flex-col items-center justify-center overflow-hidden select-none",
        "bg-vl-dark-900 text-vl-white-300", // Obsidian Charcoal Black canvas
        fullScreen
          ? "fixed inset-0 z-9999 min-h-dvh w-full"
          : "border-vl-dark-600 min-h-90 w-full rounded-2xl border",
        className
      )}
      {...props}
    >
      {/* ── 1. Cyberpunk Coordinate Grid & Ambient Cyan Glow (Dark Canvas) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,217,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,217,255,0.04)_1px,transparent_1px)] bg-size-[32px_32px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.14),transparent_70%)] blur-3xl motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="bg-vl-dark-800/80 pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl motion-reduce:hidden"
      />

      {/* ── 2. Streetwear Corner HUD Telemetry (Real Telemetry) ── */}
      {fullScreen && (
        <>
          <div className="tracking-streetwear text-vl-dark-400 pointer-events-none absolute top-6 left-6 hidden items-center gap-2 font-mono text-2xs sm:flex">
            <span className="bg-vl-cyan-400 size-1.5 animate-ping rounded-full motion-reduce:animate-none" />
            <span>VL-SYS // {isControlled ? "SYNC_STREAM" : "SECURE_FEED"}</span>
          </div>

          <div className="tracking-streetwear text-vl-dark-400 pointer-events-none absolute top-6 right-6 hidden font-mono text-2xs sm:block">
            DHAKA [23.8103° N] • {latency}MS
          </div>

          <div className="tracking-streetwear text-vl-dark-400 pointer-events-none absolute bottom-6 left-6 hidden font-mono text-2xs sm:block">
            HEAVYWEIGHT STREETWEAR
          </div>

          <div className="tracking-streetwear text-vl-dark-400 pointer-events-none absolute right-6 bottom-6 hidden items-center gap-2 font-mono text-2xs sm:flex">
            <span
              className={cn(
                "size-1.5 rounded-full motion-reduce:animate-none",
                isOnline ? "animate-pulse bg-emerald-400" : "bg-red-500"
              )}
            />
            <span>{isOnline ? "STATUS: OPTIMAL" : "STATUS: OFFLINE"}</span>
          </div>
        </>
      )}

      {/* ── 3. Central Brand Unit ── */}
      <div className="relative z-10 flex w-[min(380px,calc(100%-48px))] flex-col items-center">
        {/* Emblem with Outer Cyber Ring */}
        <div className="relative flex items-center justify-center">
          {/* Animated Glow Halo */}
          <div
            aria-hidden="true"
            className="vl-glow-dark border-vl-cyan-500/40 bg-vl-cyan-950/30 absolute -inset-2.5 rounded-full border shadow-[0_0_24px_rgba(0,217,255,0.2)]"
          />

          {/* Precision Badge Container */}
          <div className="border-vl-cyan-500 bg-vl-dark-800 relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_0_28px_rgba(0,217,255,0.4)]">
            <Image
              src="/logo/icon/vl_icon_white_transparent.svg"
              alt="VibeLock"
              width={36}
              height={36}
              priority
              className="vl-breathe-dark size-9 object-contain"
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="mt-5 flex flex-col items-center text-center">
          <Image
            src="/logo/workmark/vibelock_wordmark_white_transparent.svg"
            alt="VibeLock"
            width={160}
            height={64}
            priority
            className="h-11 w-auto object-contain sm:h-12"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="bg-vl-white-500/20 h-px w-3" />
            <span className="text-vl-cyan-400 tracking-streetwear text-2xs font-extrabold uppercase">
              {subLabel}
            </span>
            <span className="bg-vl-white-500/20 h-px w-3" />
          </div>
        </div>

        {/* ── 4. Dynamic Live Functional Progress Unit ── */}
        <div className="mt-8 flex w-full max-w-80 flex-col items-center">
          {/* Stage Info & Dynamic Counter Bar */}
          <div className="mb-2.5 flex w-full items-end justify-between font-mono text-2xs tracking-wider">
            {/* Left: Active Stage Name */}
            <div className="flex items-center gap-1.5">
              <span className="text-vl-cyan-400 font-bold">
                [STAGE {activeStage.id}/{String(stages.length).padStart(2, "0")}]
              </span>
              <span className="text-vl-white-300 max-w-44 truncate font-bold">
                {stageTitle}
              </span>
            </div>

            {/* Right: Live Percentage Counter */}
            <div className="flex items-baseline gap-0.5">
              <span className="text-vl-white-50 text-xs font-black">
                {internalProgress}
              </span>
              <span className="text-vl-cyan-400 text-3xs font-bold">%</span>
            </div>
          </div>

          {/* ── Main Functional Progress Bar (Accessible & Smooth) ── */}
          <div
            role="progressbar"
            aria-valuenow={internalProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Loading: ${stageTitle} (${internalProgress}%)`}
            className="bg-vl-dark-800 border-vl-dark-600 relative h-1 w-full overflow-hidden rounded-full border shadow-inner"
          >
            {/* Smooth Dynamic Fill with Hardware Accelerated Easing */}
            <div
              className={cn(
                "relative h-full rounded-full bg-linear-to-r shadow-[0_0_12px_rgba(0,217,255,0.7)]",
                "transition-[width] duration-300 ease-out will-change-[width]",
                internalProgress >= 100
                  ? "from-emerald-500 via-teal-400 to-vl-cyan-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                  : "from-vl-cyan-700 via-vl-cyan-500 to-vl-cyan-400"
              )}
              style={{ width: `${internalProgress}%` }}
            >
              {/* Leading Sparkle Head */}
              <div
                className={cn(
                  "absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-vl-dark-900 transition-colors duration-300",
                  internalProgress >= 100
                    ? "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,1)]"
                    : "bg-vl-cyan-300 shadow-[0_0_10px_rgba(0,217,255,0.9)]"
                )}
              />
            </div>

            {/* Continuous Sweeping Laser Beam (hides when complete) */}
            {internalProgress < 100 && (
              <div className="vl-laser-beam-dark absolute inset-y-0 w-1/4 rounded-full bg-linear-to-r from-transparent via-vl-cyan-200/90 to-transparent" />
            )}
          </div>

          {/* Live Data Waveform + Sub-Description */}
          <div className="text-vl-dark-400 mt-3.5 flex w-full items-center justify-between font-mono text-2xs tracking-wider">
            {/* Live Frequency Equalizer Bars */}
            <div className="flex items-center gap-0.75" aria-hidden="true">
              {[8, 14, 6, 12, 16, 9, 13, 7].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-0.5 rounded-full transition-colors duration-300",
                    internalProgress >= 100
                      ? "bg-emerald-400"
                      : "vl-equalizer-dark bg-vl-cyan-400"
                  )}
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            {/* Sub-label Description */}
            <div className="flex items-center gap-1.5 text-right uppercase">
              <span
                className={cn(
                  "size-1 rounded-full motion-reduce:animate-none",
                  internalProgress >= 100
                    ? "bg-emerald-400"
                    : "bg-vl-cyan-400 animate-pulse"
                )}
              />
              <span className="text-vl-white-400 max-w-48 truncate font-semibold">
                {stageDesc}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen-reader live announcement */}
      <span className="sr-only">
        {`Loading VibeLock: ${stageTitle} (${internalProgress}%)`}
      </span>

      {/* ── 5. Scoped Animations with Reduced-Motion Support ── */}
      <style>{`
        @keyframes vl-laser-dark {
          0% {
            transform: translateX(-150%);
          }
          100% {
            transform: translateX(450%);
          }
        }

        @keyframes vl-glow-pulse-dark {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.04);
          }
        }

        @keyframes vl-logo-breathe-dark {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes vl-eq-dark {
          0%, 100% {
            transform: scaleY(0.4);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1.3);
            opacity: 1;
          }
        }

        .vl-laser-beam-dark {
          animation: vl-laser-dark 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .vl-glow-dark {
          animation: vl-glow-pulse-dark 2.2s ease-in-out infinite;
        }

        .vl-breathe-dark {
          animation: vl-logo-breathe-dark 2.2s ease-in-out infinite;
        }

        .vl-equalizer-dark {
          animation: vl-eq-dark 0.9s ease-in-out infinite;
          transform-origin: bottom;
        }

        @media (prefers-reduced-motion: reduce) {
          .vl-laser-beam-dark,
          .vl-glow-dark,
          .vl-breathe-dark,
          .vl-equalizer-dark {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
