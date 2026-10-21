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

export default function VibeLockLoaderDark({
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
        "bg-[#05080A] text-[#F3F0E8]",
        fullScreen
          ? "fixed inset-0 z-[9999] min-h-dvh w-full"
          : "min-h-[360px] w-full rounded-2xl border border-white/5",
      ].join(" ")}
    >
      {/* ── 1. Cyberpunk Grid & Ambient Glows ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#00D9FF]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl"
      />

      {/* ── 2. Streetwear Corner HUD Telemetry ── */}
      {fullScreen && (
        <>
          <div className="pointer-events-none absolute top-6 left-6 hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/35 sm:flex">
            <span className="size-1.5 animate-ping rounded-full bg-[#00D9FF]" />
            <span>VL-SYS // LIVE_FEED</span>
          </div>

          <div className="pointer-events-none absolute top-6 right-6 hidden font-mono text-[10px] tracking-[0.2em] text-white/35 sm:block">
            DHAKA [23.8103° N] • {latency}MS
          </div>

          <div className="pointer-events-none absolute bottom-6 left-6 hidden font-mono text-[10px] tracking-[0.2em] text-white/35 sm:block">
            HEAVYWEIGHT STREETWEAR
          </div>

          <div className="pointer-events-none absolute right-6 bottom-6 hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/35 sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span>STATUS: OPTIMAL</span>
          </div>
        </>
      )}

      {/* ── 3. Central Brand Unit ── */}
      <div className="relative z-10 flex w-[min(380px,calc(100%-48px))] flex-col items-center">
        {/* Emblem with Outer Cyber Ring */}
        <div className="relative flex items-center justify-center">
          {/* Animated Cyan Glow Halo */}
          <div
            aria-hidden="true"
            className="vl-glow absolute -inset-3 rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/10 shadow-[0_0_35px_rgba(0,217,255,0.3)]"
          />

          {/* Precision Badge Container */}
          <div className="relative flex size-16 items-center justify-center rounded-full border-2 border-[#00D9FF]/60 bg-[#090E13] shadow-[0_0_25px_rgba(0,217,255,0.35)]">
            <Image
              src="/images/vibelock-logo.png"
              alt="VibeLock"
              width={60}
              height={60}
              priority
              className="vl-breathe object-contain"
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="mt-5 flex flex-col items-center text-center">
          <h2 className="text-2xl font-black tracking-[0.22em] text-white uppercase sm:text-[26px]">
            VIBELOCK
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-px w-3 bg-[#00D9FF]" />
            <span className="text-[10px] font-extrabold tracking-[0.28em] text-[#00D9FF] uppercase">
              {subLabel}
            </span>
            <span className="h-px w-3 bg-[#00D9FF]" />
          </div>
        </div>

        {/* ── 4. Dynamic Live Progress Unit ── */}
        <div className="mt-8 flex w-full max-w-[320px] flex-col items-center">
          {/* Stage Info & Dynamic Counter Bar */}
          <div className="mb-2.5 flex w-full items-end justify-between font-mono text-[10px] tracking-wider">
            {/* Left: Active Stage Name */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#00D9FF]">[STAGE {activeStage.id}]</span>
              <span className="font-semibold text-[#F3F0E8]/70">{activeStage.name}</span>
            </div>

            {/* Right: Live Percentage Counter */}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-white">{progress}</span>
              <span className="text-[9px] font-bold text-[#00D9FF]">%</span>
            </div>
          </div>

          {/* ── Main Dynamic Progress Bar ── */}
          <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-white/10 shadow-inner">
            {/* Smooth Dynamic Fill */}
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-[#00D9FF]/40 via-[#00D9FF] to-white shadow-[0_0_15px_#00D9FF] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            >
              {/* Leading Sparkle Head */}
              <div className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#00D9FF]" />
            </div>

            {/* Continuous Sweeping Laser Beam */}
            <div className="vl-laser-beam absolute inset-y-0 w-1/4 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>

          {/* Segmented Cyber Matrix Ticks */}
          {/* <div className="mt-2.5 flex w-full items-center justify-between gap-1">
            {Array.from({ length: 16 }).map((_, i) => {
              const active = (i + 1) * (100 / 16) <= progress;
              return (
                <div
                  key={i}
                  className={[
                    "h-1 flex-1 rounded-[1px] transition-all duration-150",
                    active ? "bg-[#00D9FF] shadow-[0_0_6px_rgba(0,217,255,0.7)]" : "bg-white/10",
                  ].join(" ")}
                />
              );
            })}
          </div> */}

          {/* Live Data Waveform + Sub-Description */}
          <div className="mt-3.5 flex w-full items-center justify-between font-mono text-[9px] tracking-wider text-[#F3F0E8]/50">
            {/* Live Frequency Equalizer Bars */}
            <div className="flex items-center gap-[3px]">
              {[8, 14, 6, 12, 16, 9, 13, 7].map((h, i) => (
                <span
                  key={i}
                  className="vl-equalizer w-[2px] rounded-full bg-[#00D9FF]"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            {/* Sub-label Description */}
            <div className="flex items-center gap-1.5 text-right uppercase">
              <span className="size-1 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-medium text-[#F3F0E8]/70">{label || activeStage.desc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Standard Universal CSS (Always Runs, Zero Runtime Friction) ── */}
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
            opacity: 0.5;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.95;
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
