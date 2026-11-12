"use client";

import { bulkAdjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type { InventoryTransactionType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
        type: bulkAdjustType,
        reason: bulkAdjustReason || "Bulk stock operation",
      });

      if (!res.error) {
        onSuccess(
          `Successfully applied ${bulkAdjustType} of ${qty} units across ${selectedIds.size} variants.`
        );
        onClose();
      } else {
        alert(res.error || "Bulk update failed.");
      }
    } catch {
      alert("An unexpected error occurred during bulk operation.");
    } finally {
      setIsSubmittingBulkAdjust(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent variant="brand" size="default">
        <DialogHeader>
          <DialogTitle>Bulk Restock ({selectedIds.size} variants selected)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-vl-dark-900 font-semibold">Type</Label>
            <NativeSelect
              value={bulkAdjustType}
              onChange={(e) => setBulkAdjustType(e.target.value as InventoryTransactionType)}
              size="default"
            >
              <option value="RESTOCK">Restock (Add stock)</option>
              <option value="ADJUSTMENT">Audit Count Adjustment</option>
              <option value="DAMAGE">Damage write-off (Deduct stock)</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label className="text-vl-dark-900 font-semibold">
              Quantity to apply to each variant
            </Label>
            <Input
              type="number"
              step="1"
              value={bulkAdjustQuantity}
              onChange={(e) => setBulkAdjustQuantity(e.target.value)}
              placeholder="e.g. 10"
              size="default"
              className="font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-vl-dark-900 font-semibold">Reason</Label>
            <Input
              type="text"
              value={bulkAdjustReason}
              onChange={(e) => setBulkAdjustReason(e.target.value)}
              placeholder="e.g. Bulk seasonal delivery intake"
              size="default"
            />
          </div>
        </div>

        <div className="border-vl-dark-900/10 bg-vl-white-200 -mx-5 -mb-5 flex items-center justify-end gap-2 rounded-b-2xl border-t px-5 py-3.5 sm:-mx-6 sm:-mb-6">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmittingBulkAdjust || !bulkAdjustQuantity}
            onClick={handleExecuteBulkAdjust}
          >
            {isSubmittingBulkAdjust && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            <span>Apply Bulk Adjustment</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
