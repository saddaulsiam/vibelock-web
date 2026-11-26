"use client";

import { Download } from "lucide-react";

export function ReportExportMenu({ query }: { query: string }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="bg-vl-dark-900 hover:bg-vl-dark-800 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
        aria-label="Export reports"
      >
        <Download className="size-3.5" />
        <span>Export CSV</span>
      </button>

      <div className="invisible absolute right-0 z-20 mt-1.5 w-56 rounded-lg border border-neutral-200 bg-white p-1 opacity-0 shadow-xl transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <span className="block px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
          Available Datasets
        </span>
        {[
          { type: "sales", label: "Sales Summary CSV" },
          { type: "products", label: "Product & SKU Report CSV" },
          { type: "orders", label: "Order Profitability CSV" },
        ].map(({ type, label }) => (
          <a
            key={type}
            href={`/api/admin/reports/export?type=${type}&${query}`}
            download
            className="hover:bg-neutral-100 hover:text-neutral-900 text-neutral-700 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
