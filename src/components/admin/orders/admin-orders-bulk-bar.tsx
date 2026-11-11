"use client";

import * as React from "react";
import { CheckCircle2, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          size="sm"
          disabled={isBulkUpdating}
          onClick={onBulkConfirm}
          className="gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
        >
          <CheckCircle2 className="size-3.5" />
          <span>Confirm Selected</span>
        </Button>

        {/* Bulk Mark as Processing / Pack */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isBulkUpdating}
          onClick={onBulkPack}
          className="gap-1.5"
        >
          <Package className="size-3.5" />
          <span>Pack Selected</span>
        </Button>

        {/* Export Selected to CSV */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          className="gap-1.5 border-amber-300 bg-white text-amber-950 hover:bg-amber-100/50"
        >
          <Download className="size-3.5" />
          <span>Export Selected CSV</span>
        </Button>

        {/* Clear Selection */}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onDeselectAll}
          className="text-neutral-600 hover:text-neutral-900"
        >
          Deselect All
        </Button>
      </div>
    </div>
  );
}
