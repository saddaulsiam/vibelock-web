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
        "bg-[#F3F0E8] text-[#101114]", // Matches website warm off-white theme
        fullScreen
          ? "fixed inset-0 z-9999 min-h-dvh w-full"
          : "min-h-90 w-full rounded-2xl border border-[#101114]/10",
      ].join(" ")}
    >
      {/* ── 1. Cyberpunk Subtle Grid & Ambient Glows ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(16,17,20,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,17,20,0.04)_1px,transparent_1px)] bg-size-[32px_32px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D9FF]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-3xl"
      />

      {/* ── 2. Streetwear Corner HUD Telemetry (Light Theme) ── */}
      {fullScreen && (
        <>
          <div className="pointer-events-none absolute top-6 left-6 hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#101114]/40 sm:flex">
            <span className="size-1.5 animate-ping rounded-full bg-[#00A3C4]" />
            <span>VL-SYS // LIVE_FEED</span>
          </div>

          <div className="pointer-events-none absolute top-6 right-6 hidden font-mono text-[10px] tracking-[0.2em] text-[#101114]/40 sm:block">
            DHAKA [23.8103° N] • {latency}MS
          </div>

          <div className="pointer-events-none absolute bottom-6 left-6 hidden font-mono text-[10px] tracking-[0.2em] text-[#101114]/40 sm:block">
            HEAVYWEIGHT STREETWEAR
          </div>

          <div className="pointer-events-none absolute right-6 bottom-6 hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-[#101114]/40 sm:flex">
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
            className="vl-glow absolute -inset-2.5 rounded-full border border-[#00D9FF]/40 bg-[#00D9FF]/10 shadow-[0_0_25px_rgba(0,217,255,0.2)]"
          />

          {/* Precision Badge Container (Dark background so white logo pops cleanly) */}
          <div className="relative flex size-16 items-center justify-center rounded-full border-2 border-[#101114] bg-[#101114] shadow-[0_10px_30px_rgba(16,17,20,0.2)]">
            <Image
              src="/images/vibelock-logo.png"
              alt="VibeLock"
              width={60}
              height={60}
              priority
              className="vl-breathe h-auto w-auto object-contain"
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="mt-5 flex flex-col items-center text-center">
          <h2 className="text-2xl font-black tracking-[0.22em] text-[#101114] uppercase sm:text-[26px]">
            VIBELOCK
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-px w-3 bg-[#101114]/30" />
            <span className="text-[10px] font-extrabold tracking-[0.28em] text-[#0088A8] uppercase">
              {subLabel}
            </span>
            <span className="h-px w-3 bg-[#101114]/30" />
          </div>
        </div>

        {/* ── 4. Dynamic Live Progress Unit ── */}
        <div className="mt-8 flex w-full max-w-[320px] flex-col items-center">
          {/* Stage Info & Dynamic Counter Bar */}
          <div className="mb-2.5 flex w-full items-end justify-between font-mono text-[10px] tracking-wider">
            {/* Left: Active Stage Name */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#0088A8]">[STAGE {activeStage.id}]</span>
              <span className="font-bold text-[#101114]">{activeStage.name}</span>
            </div>

            {/* Right: Live Percentage Counter */}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-[#101114]">{progress}</span>
              <span className="text-[9px] font-bold text-[#0088A8]">%</span>
            </div>
          </div>

          {/* ── Main Dynamic Progress Bar ── */}
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-[#101114]/12 shadow-inner">
            {/* Smooth Dynamic Fill */}
            <div
              className="relative h-full rounded-full bg-linear-to-r from-[#101114] via-[#101114] to-[#00A3C4] shadow-[0_0_12px_rgba(0,163,196,0.6)] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            >
              {/* Leading Sparkle Head */}
              <div className="absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF] ring-2 ring-white" />
            </div>

            {/* Continuous Sweeping Laser Beam */}
            <div className="vl-laser-beam absolute inset-y-0 w-1/4 rounded-full bg-linear-to-r from-transparent via-white/80 to-transparent" />
          </div>

          {/* Live Data Waveform + Sub-Description */}
          <div className="mt-3.5 flex w-full items-center justify-between font-mono text-[9px] tracking-wider text-[#101114]/60">
            {/* Live Frequency Equalizer Bars */}
            <div className="flex items-center gap-0.75">
              {[8, 14, 6, 12, 16, 9, 13, 7].map((h, i) => (
                <span
                  key={i}
                  className="vl-equalizer w-0.5 rounded-full bg-[#101114]"
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
              <span className="font-semibold text-[#101114]/80">{label || activeStage.desc}</span>
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
