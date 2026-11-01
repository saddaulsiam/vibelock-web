"use client";

import * as React from "react";
import { CheckCircle2, Download, Loader2, Power, Trash2 } from "lucide-react";

export interface AdminCouponsBulkBarProps {
  selectedCount: number;
  isBulkOperating: boolean;
  onBulkActivate: () => void;
  onBulkPause: () => void;
  onBulkExportCsv: () => void;
  onBulkDelete: () => void;
  onDeselectAll: () => void;
}

export function AdminCouponsBulkBar({
  selectedCount,
  isBulkOperating,
  onBulkActivate,
  onBulkPause,
  onBulkExportCsv,
  onBulkDelete,
  onDeselectAll,
}: AdminCouponsBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-300 bg-purple-50/95 px-4 py-2.5 text-xs font-medium text-purple-950 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="font-bold text-purple-900">
          {selectedCount} {selectedCount === 1 ? "coupon" : "coupons"} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Bulk Activate */}
        <button
          type="button"
          disabled={isBulkOperating}
          onClick={onBulkActivate}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {isBulkOperating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          <span>Activate Selected</span>
        </button>

        {/* Bulk Pause */}
        <button
          type="button"
          disabled={isBulkOperating}
          onClick={onBulkPause}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#101114] px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#101114]/85 disabled:opacity-50"
        >
          {isBulkOperating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Power className="size-3.5" />
          )}
          <span>Pause Selected</span>
        </button>

        {/* Export Selected to CSV */}
        <button
          type="button"
          onClick={onBulkExportCsv}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 text-xs font-semibold text-purple-950 shadow-2xs hover:bg-purple-100/50"
        >
          <Download className="size-3.5" />
          <span>Export Selected CSV</span>
        </button>

        {/* Bulk Delete */}
        <button
          type="button"
          disabled={isBulkOperating}
          onClick={onBulkDelete}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="size-3.5 text-rose-600" />
          <span>Delete Selected</span>
        </button>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onDeselectAll}
          className="cursor-pointer text-xs text-neutral-600 underline-offset-2 hover:underline"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}

