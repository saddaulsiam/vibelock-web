"use client";

import { Printer } from "lucide-react";

export function OrderPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-vl-dark-900/20 bg-white px-4 text-xs font-semibold text-vl-dark-900 shadow-2xs transition-colors hover:bg-vl-white-300 focus-visible:ring-2 focus-visible:ring-vl-cyan focus-visible:outline-none print:hidden"
    >
      <Printer className="size-4" />
      Print Invoice / Packing Slip
    </button>
  );
}
