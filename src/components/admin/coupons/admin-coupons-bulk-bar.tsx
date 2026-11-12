"use client";

import * as React from "react";
import { CheckCircle2, Download, Loader2, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          size="sm"
          disabled={isBulkOperating}
          onClick={onBulkActivate}
          className="gap-1.5 bg-emerald-700 font-semibold text-white shadow-2xs hover:bg-emerald-800"
        >
          {isBulkOperating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          <span>Activate Selected</span>
        </Button>

        {/* Bulk Pause */}
        <Button
          type="button"
          size="sm"
          disabled={isBulkOperating}
          onClick={onBulkPause}
          className="bg-vl-dark-900 hover:bg-vl-dark-900/85 gap-1.5 font-semibold text-white shadow-2xs"
        >
          {isBulkOperating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Power className="size-3.5" />
          )}
          <span>Pause Selected</span>
        </Button>

        {/* Export Selected to CSV */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBulkExportCsv}
          className="gap-1.5 border-purple-300 bg-white font-semibold text-purple-950 shadow-2xs hover:bg-purple-100/50"
        >
          <Download className="size-3.5" />
          <span>Export Selected CSV</span>
        </Button>

        {/* Bulk Delete */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBulkOperating}
          onClick={onBulkDelete}
          className="gap-1.5 border-rose-300 bg-white font-semibold text-rose-700 shadow-2xs hover:bg-rose-50"
        >
          <Trash2 className="size-3.5 text-rose-600" />
          <span>Delete Selected</span>
        </Button>

        {/* Clear Selection */}
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={onDeselectAll}
          className="h-auto p-0 text-xs text-neutral-600 underline-offset-2 hover:underline"
        >
          Deselect All
        </Button>
      </div>
    </div>
  );
}
