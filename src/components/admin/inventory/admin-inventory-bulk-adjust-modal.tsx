"use client";

import { bulkAdjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type { InventoryTransactionType } from "@prisma/client";
import { Loader2, X } from "lucide-react";
import * as React from "react";

interface AdminInventoryBulkAdjustModalProps {
  isOpen: boolean;
  selectedIds: Set<string>;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function AdminInventoryBulkAdjustModal({
  isOpen,
  selectedIds,
  onClose,
  onSuccess,
}: AdminInventoryBulkAdjustModalProps) {
  const [bulkAdjustType, setBulkAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [bulkAdjustQuantity, setBulkAdjustQuantity] = React.useState<string>("10");
  const [bulkAdjustReason, setBulkAdjustReason] = React.useState<string>("Bulk factory restock");
  const [isSubmittingBulkAdjust, setIsSubmittingBulkAdjust] = React.useState(false);

  if (!isOpen) return null;

  const handleExecuteBulkAdjust = async () => {
    if (selectedIds.size === 0 || isSubmittingBulkAdjust) return;
    const qty = parseInt(bulkAdjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      alert("Please enter a valid non-zero integer quantity.");
      return;
    }

    setIsSubmittingBulkAdjust(true);
    try {
      const res = await bulkAdjustInventoryAction({
        variantIds: Array.from(selectedIds),
        quantity: qty,
        reason: bulkAdjustReason.trim() || "Bulk inventory adjustment",
        type: bulkAdjustType,
      });

      if (res.error) {
        alert(res.error);
      } else {
        onSuccess(res.message || "Bulk adjustment completed.");
        onClose();
      }
    } catch {
      alert("Bulk adjustment failed.");
    } finally {
      setIsSubmittingBulkAdjust(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="w-full max-w-md rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#101114]">
            Bulk Restock ({selectedIds.size} variants selected)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div>
            <label className="block font-semibold text-[#101114]">Type</label>
            <select
              value={bulkAdjustType}
              onChange={(e) => setBulkAdjustType(e.target.value as InventoryTransactionType)}
              className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114]"
            >
              <option value="RESTOCK">Restock (Add stock)</option>
              <option value="ADJUSTMENT">Audit Count Adjustment</option>
              <option value="DAMAGE">Damage write-off (Deduct stock)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#101114]">
              Quantity to apply to each variant
            </label>
            <input
              type="number"
              step="1"
              value={bulkAdjustQuantity}
              onChange={(e) => setBulkAdjustQuantity(e.target.value)}
              placeholder="e.g. 10"
              className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 font-mono text-sm font-bold text-[#101114]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#101114]">Reason</label>
            <input
              type="text"
              value={bulkAdjustReason}
              onChange={(e) => setBulkAdjustReason(e.target.value)}
              placeholder="e.g. Bulk seasonal delivery intake"
              className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs text-[#101114]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#101114]/20 bg-white px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#F3F0E8]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmittingBulkAdjust || !bulkAdjustQuantity}
            onClick={handleExecuteBulkAdjust}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
          >
            {isSubmittingBulkAdjust ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>Apply Bulk Adjustment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
