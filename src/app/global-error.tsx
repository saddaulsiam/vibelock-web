"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#F3F0E8] p-4 font-sans text-[#101114]">
        <div className="mx-auto max-w-lg border border-[#101114]/15 bg-white p-8 text-center shadow-sm sm:p-12">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#101114]/60 uppercase">
            VibeLock / System Error
          </p>
          <h1 className="text-2xl font-black tracking-tight text-[#101114] sm:text-3xl">
            Critical Application Error
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#101114]/70">
            A critical system error occurred. We apologize for the inconvenience. Please try again.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => reset()}
              type="button"
              className="inline-flex min-h-11 items-center justify-center bg-[#101114] px-6 text-sm font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#101114]/85 focus-visible:outline-2 focus-visible:outline-[#00D9FF]"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center border border-[#101114]/20 bg-white px-6 text-sm font-bold tracking-wider text-[#101114] uppercase transition-colors hover:bg-[#F3F0E8] focus-visible:outline-2 focus-visible:outline-[#00D9FF]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
