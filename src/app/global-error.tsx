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
      <body className="bg-vl-white-300 text-vl-dark-900 flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="border-vl-dark-900/15 mx-auto max-w-lg border bg-white p-8 text-center shadow-sm sm:p-12">
          <p className="tracking-streetwear text-vl-dark-900/60 mb-2 text-xs font-semibold uppercase">
            VibeLock / System Error
          </p>
          <h1 className="text-vl-dark-900 text-2xl font-black tracking-tight sm:text-3xl">
            Critical Application Error
          </h1>
          <p className="text-vl-dark-900/70 mx-auto mt-3 max-w-sm text-sm leading-relaxed">
            A critical system error occurred. We apologize for the inconvenience. Please try again.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => reset()}
              type="button"
              className="bg-vl-dark-900 hover:bg-vl-dark-900/85 focus-visible:outline-vl-cyan inline-flex min-h-11 items-center justify-center px-6 text-sm font-bold tracking-wider text-white uppercase transition-colors focus-visible:outline-2"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="border-vl-dark-900/20 text-vl-dark-900 hover:bg-vl-white-300 focus-visible:outline-vl-cyan inline-flex min-h-11 items-center justify-center border bg-white px-6 text-sm font-bold tracking-wider uppercase transition-colors focus-visible:outline-2"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
