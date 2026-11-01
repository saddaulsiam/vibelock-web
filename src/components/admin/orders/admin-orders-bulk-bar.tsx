"use client";

import * as React from "react";
import { CheckCircle2, Download, Package } from "lucide-react";

export interface AdminOrdersBulkBarProps {
  selectedCount: number;
  isBulkUpdating: boolean;
  onBulkConfirm: () => void;
  onBulkPack: () => void;
  onExportCsv: () => void;
  onDeselectAll: () => void;
}

export function AdminOrdersBulkBar({
  selectedCount,
  isBulkUpdating,
  onBulkConfirm,
  onBulkPack,
  onExportCsv,
  onDeselectAll,
}: AdminOrdersBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs font-medium text-amber-950 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="font-bold text-amber-900">
          {selectedCount} {selectedCount === 1 ? "order" : "orders"} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Bulk Confirm */}
        <button
          type="button"
          disabled={isBulkUpdating}
          onClick={onBulkConfirm}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-emerald-700 px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-800 disabled:opacity-50"
        >
          <CheckCircle2 className="size-3.5" />
          <span>Confirm Selected</span>
        </button>

        {/* Bulk Mark as Processing / Pack */}
        <button
          type="button"
          disabled={isBulkUpdating}
          onClick={onBulkPack}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[#101114] px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#101114]/85 disabled:opacity-50"
        >
          <Package className="size-3.5" />
          <span>Pack Selected</span>
        </button>

        {/* Export Selected to CSV */}
        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 shadow-2xs hover:bg-amber-100/50"
        >
          <Download className="size-3.5" />
          <span>Export Selected CSV</span>
        </button>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onDeselectAll}
          className="text-xs text-neutral-600 underline-offset-2 hover:underline"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}

