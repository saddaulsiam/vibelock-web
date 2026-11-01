"use client";

import { Download } from "lucide-react";

export function ReportExportMenu({ query }: { query: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85"
        aria-label="Export reports"
      >
        <Download className="size-4" /> Export
      </button>
      <div className="invisible absolute right-0 z-20 mt-2 w-52 rounded-xl border bg-white p-1 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {[
          { type: "sales", label: "Sales summary CSV" },
          { type: "products", label: "Product report CSV" },
          { type: "orders", label: "Order report CSV" },
        ].map(({ type, label }) => (
          <a
            key={type}
            href={`/api/admin/reports/export?type=${type}&${query}`}
            download
            className="hover:bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
