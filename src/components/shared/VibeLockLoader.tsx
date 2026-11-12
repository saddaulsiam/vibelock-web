"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface VibeLockLoaderProps {
  label?: string;
  subLabel?: string;
  fullScreen?: boolean;
}

const STAGES = [
  { id: "01", name: "INITIALIZING CORE", desc: "CONNECTING TO DHAKA CDN" },
  { id: "02", name: "SYNCING CATALOG", desc: "DECRYPTING STREETWEAR MANIFEST" },
  { id: "03", name: "LOADING ASSETS", desc: "STREAMING HIGH-RES DROP MEDIA" },
  { id: "04", name: "FINALIZING DROP", desc: "VERIFYING INVENTORY LEDGER" },
];

export default function VibeLockLoader({
  label,
  subLabel = "BUILT FOR THE STREETS",
  fullScreen = true,
}: VibeLockLoaderProps) {
  const [progress, setProgress] = useState(8);
  const [stageIdx, setStageIdx] = useState(0);
  const [latency, setLatency] = useState(19);

  // Smooth continuous dynamic progress
  useEffect(() => {
    let current = 8;
    const interval = setInterval(() => {
      // Accelerate initially, decelerate near 99%
      const step = current < 40 ? 3 : current < 75 ? 2 : current < 95 ? 1 : 0.4;
      current = Math.min(99, current + step);
      setProgress(Math.floor(current));

      // Calculate stage based on percentage
      const nextStage = Math.min(STAGES.length - 1, Math.floor((current / 100) * STAGES.length));
      setStageIdx(nextStage);

      // Fluctuate latency slightly for live telemetry realism
      if (Math.random() > 0.6) {
        setLatency(16 + Math.floor(Math.random() * 8));
      }

      // If page takes long, loop smoothly back after a pause
      if (current >= 99) {
        setTimeout(() => {
          current = 15;
          setProgress(15);
        }, 1200);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const activeStage = STAGES[stageIdx];

  return (
    <div
      role="status"
      aria-label={label || activeStage.name}
      aria-busy="true"
      aria-live="polite"
      className={[
        "relative isolate flex flex-col items-center justify-center overflow-hidden select-none",
        "bg-vl-white-300 text-vl-dark-900", // Matches website warm off-white theme
        fullScreen
          ? "fixed inset-0 z-9999 min-h-dvh w-full"
          : "border-vl-dark-900/10 min-h-90 w-full rounded-2xl border",
      ].join(" ")}
    >
      {/* ── 1. Cyberpunk Subtle Grid & Ambient Glows ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(16,17,20,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,17,20,0.04)_1px,transparent_1px)] bg-size-[32px_32px]"
      />
      <div
        aria-hidden="true"
        className="bg-vl-cyan-50 pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-3xl"
      />

      {/* ── 2. Streetwear Corner HUD Telemetry (Light Theme) ── */}
      {fullScreen && (
        <>
          <div className="tracking-streetwear text-vl-dark-900/40 pointer-events-none absolute top-6 left-6 hidden items-center gap-2 font-mono text-[10px] sm:flex">
            <span className="bg-vl-cyan-600 size-1.5 animate-ping rounded-full" />
            <span>VL-SYS // LIVE_FEED</span>
          </div>

          <div className="tracking-streetwear text-vl-dark-900/40 pointer-events-none absolute top-6 right-6 hidden font-mono text-[10px] sm:block">
            DHAKA [23.8103° N] • {latency}MS
          </div>

          <div className="tracking-streetwear text-vl-dark-900/40 pointer-events-none absolute bottom-6 left-6 hidden font-mono text-[10px] sm:block">
            HEAVYWEIGHT STREETWEAR
          </div>

          <div className="tracking-streetwear text-vl-dark-900/40 pointer-events-none absolute right-6 bottom-6 hidden items-center gap-2 font-mono text-[10px] sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
            <span>STATUS: OPTIMAL</span>
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
            className="vl-glow border-vl-cyan-200 bg-vl-cyan-50 absolute -inset-2.5 rounded-full border shadow-[0_0_25px_rgba(0,217,255,0.2)]"
          />

          {/* Precision Badge Container (Dark background with cyan border so white logo pops cleanly) */}
          <div className="border-vl-cyan bg-vl-black relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_0_24px_rgba(0,217,255,0.3)]">
            <Image
              src="/logo/icon/vl_icon_white_transparent.svg"
              alt="VibeLock"
              width={36}
              height={36}
              priority
              className="vl-breathe size-9 object-contain"
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="mt-5 flex flex-col items-center text-center">
          <Image
            src="/logo/workmark/vibelock_wordmark_black_transparent.svg"
            alt="VibeLock"
            width={160}
            height={64}
            priority
            className="h-11 w-auto object-contain sm:h-12"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="bg-vl-dark-900/30 h-px w-3" />
            <span className="text-vl-cyan-700 text-[10px] font-extrabold tracking-[0.28em] uppercase">
              {subLabel}
            </span>
            <span className="bg-vl-dark-900/30 h-px w-3" />
          </div>
        </div>

        {/* ── 4. Dynamic Live Progress Unit ── */}
        <div className="mt-8 flex w-full max-w-[320px] flex-col items-center">
          {/* Stage Info & Dynamic Counter Bar */}
          <div className="mb-2.5 flex w-full items-end justify-between font-mono text-[10px] tracking-wider">
            {/* Left: Active Stage Name */}
            <div className="flex items-center gap-1.5">
              <span className="text-vl-cyan-700 font-bold">[STAGE {activeStage.id}]</span>
              <span className="text-vl-dark-900 font-bold">{activeStage.name}</span>
            </div>

            {/* Right: Live Percentage Counter */}
            <div className="flex items-baseline gap-1">
              <span className="text-vl-dark-900 text-xs font-black">{progress}</span>
              <span className="text-vl-cyan-700 text-[9px] font-bold">%</span>
            </div>
          </div>

          {/* ── Main Dynamic Progress Bar ── */}
          <div className="bg-vl-dark-900/12 relative h-1 w-full overflow-hidden rounded-full shadow-inner">
            {/* Smooth Dynamic Fill */}
            <div
              className="from-vl-dark-900 via-vl-dark-900 to-vl-cyan-600 relative h-full rounded-full bg-linear-to-r shadow-[0_0_12px_rgba(0,163,196,0.6)] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            >
              {/* Leading Sparkle Head */}
              <div className="bg-vl-cyan absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_8px_#00D9FF] ring-2 ring-white" />
            </div>

            {/* Continuous Sweeping Laser Beam */}
            <div className="vl-laser-beam absolute inset-y-0 w-1/4 rounded-full bg-linear-to-r from-transparent via-white/80 to-transparent" />
          </div>

          {/* Live Data Waveform + Sub-Description */}
          <div className="text-vl-dark-900/60 mt-3.5 flex w-full items-center justify-between font-mono text-[9px] tracking-wider">
            {/* Live Frequency Equalizer Bars */}
            <div className="flex items-center gap-0.75">
              {[8, 14, 6, 12, 16, 9, 13, 7].map((h, i) => (
                <span
                  key={i}
                  className="vl-equalizer bg-vl-dark-900 w-0.5 rounded-full"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            {/* Sub-label Description */}
            <div className="flex items-center gap-1.5 text-right uppercase">
              <span className="size-1 animate-pulse rounded-full bg-emerald-600" />
              <span className="text-vl-dark-900/80 font-semibold">{label || activeStage.desc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Standard Universal CSS ── */}
      <style>{`
        @keyframes vl-laser {
          0% {
            transform: translateX(-150%);
          }
          100% {
            transform: translateX(450%);
          }
        }

        @keyframes vl-glow-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(0.96);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes vl-logo-breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes vl-eq {
          0%, 100% {
            transform: scaleY(0.4);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1.3);
            opacity: 1;
          }
        }

        .vl-laser-beam {
          animation: vl-laser 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .vl-glow {
          animation: vl-glow-pulse 2.2s ease-in-out infinite;
        }

        .vl-breathe {
          animation: vl-logo-breathe 2.2s ease-in-out infinite;
        }

        .vl-equalizer {
          animation: vl-eq 0.9s ease-in-out infinite;
          transform-origin: bottom;
        }

        @media (prefers-reduced-motion: reduce) {
          .vl-laser-beam,
          .vl-glow,
          .vl-breathe,
          .vl-equalizer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
