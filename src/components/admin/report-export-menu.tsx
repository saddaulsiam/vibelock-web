"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

export function ReportExportMenu({ query }: { query: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const download = (type: string) => {
    setLoading(type);
    window.location.assign(`/api/admin/reports/export?type=${type}&${query}`);
    window.setTimeout(() => setLoading(null), 1500);
  };
  return <div className="relative group">
    <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85" aria-label="Export reports"><Download className="size-4" /> Export</button>
    <div className="invisible absolute right-0 z-20 mt-2 w-52 rounded-xl border bg-white p-1 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      {["sales", "products", "orders"].map((type) => <button key={type} type="button" disabled={loading !== null} onClick={() => download(type)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60">{type === "sales" ? "Sales summary CSV" : type === "products" ? "Product report CSV" : "Order report CSV"}{loading === type ? <Loader2 className="size-4 animate-spin" /> : null}</button>)}
    </div>
  </div>;
}
