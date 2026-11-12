import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface VibeLockLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  subLabel?: string;
  fullScreen?: boolean;
}

export default function VibeLockLoaderDark({
  label = "Loading VibeLock...",
  subLabel = "STREETWEAR CULTURE",
  fullScreen = true,
  className,
  ...props
}: VibeLockLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "bg-vl-black text-vl-white relative isolate flex flex-col items-center justify-center overflow-hidden select-none",
        fullScreen
          ? "fixed inset-0 z-9999 min-h-dvh w-full"
          : "border-vl-border min-h-60 w-full rounded-xl border",
        className
      )}
      {...props}
    >
      {/* Restrained atmospheric Electric Cyan glow */}
      <div
        aria-hidden="true"
        className="bg-vl-cyan-900/40 pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl motion-reduce:hidden"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Circular Logo Emblem reveal */}
        <div className="border-vl-cyan bg-vl-black relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_0_24px_rgba(0,217,255,0.3)] transition-all sm:size-16">
          <Image
            src="/logo/icon/vl_icon_white_transparent.svg"
            alt="VibeLock"
            width={34}
            height={34}
            priority
            className="size-8 object-contain transition-transform duration-500 hover:scale-105 sm:size-9"
          />
          {/* Subtle cyan accent pulse on the rim */}
          <span
            aria-hidden="true"
            className="border-vl-cyan-200 pointer-events-none absolute inset-0 animate-pulse rounded-full border-2 motion-reduce:animate-none"
          />
        </div>

        {/* Wordmark */}
        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <Image
            src="/logo/workmark/vibelock_wordmark_white_transparent.svg"
            alt="VibeLock"
            width={160}
            height={64}
            priority
            className="h-10 w-auto object-contain sm:h-11"
          />
          {subLabel && (
            <span className="text-vl-cyan tracking-streetwear text-[10px] font-bold uppercase sm:text-[11px]">
              {subLabel}
            </span>
          )}
        </div>

        {/* Thin Indeterminate Progress Line */}
        <div
          aria-hidden="true"
          className="bg-vl-border relative mt-5 h-0.5 w-36 overflow-hidden rounded-full sm:w-44"
        >
          <div className="bg-vl-cyan animate-[vl-indeterminate_1.5s_ease-in-out_infinite]rounded-full absolute inset-y-0 h-full w-1/2 shadow-[0_0_8px_#00d9ff] motion-reduce:w-full motion-reduce:animate-none" />
        </div>
      </div>

      {/* Screen-reader only status update */}
      <span className="sr-only">{label}</span>
    </div>
  );
}
