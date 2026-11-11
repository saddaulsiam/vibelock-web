"use client";

import * as React from "react";
import { Minus, Plus, X } from "lucide-react";
import type { InventoryTransactionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quickAdjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type { AdminInventoryDetailResult } from "@/lib/admin/inventory/inventory-queries";
import { COMMON_REASONS } from "./admin-inventory-adjust-modal";

export interface AdminInventoryDetailAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: AdminInventoryDetailResult["variant"];
  totalStock: number;
  reservedStock: number;
  onSuccess: (message: string) => void;
}

export function AdminInventoryDetailAdjustModal({
  isOpen,
  onClose,
  variant,
  totalStock,
  reservedStock,
  onSuccess,
}: AdminInventoryDetailAdjustModalProps) {
  const [adjustType, setAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [adjustMode, setAdjustMode] = React.useState<"delta" | "target">("delta");
  const [adjustQuantity, setAdjustQuantity] = React.useState<number>(10);
  const [targetQuantity, setTargetQuantity] = React.useState<number>(totalStock);
  const [adjustReason, setAdjustReason] = React.useState<string>("Factory batch restock");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = React.useState<string | null>(null);

  // Sync initial target stock on open / totalStock change during render
  const [prevStock, setPrevStock] = React.useState(totalStock);
  if (prevStock !== totalStock) {
    setPrevStock(totalStock);
    setTargetQuantity(totalStock);
  }

  if (!isOpen) return null;

  const handleTypeChange = (newType: InventoryTransactionType) => {
    setAdjustType(newType);
    setAdjustReason(COMMON_REASONS[newType]?.[0] || "");
    if (newType === "DAMAGE" && adjustQuantity > 0) {
      setAdjustQuantity(-Math.abs(adjustQuantity));
    } else if (newType === "RESTOCK" && adjustQuantity < 0) {
      setAdjustQuantity(Math.abs(adjustQuantity));
    }
  };

  const computedDelta = adjustMode === "target" ? targetQuantity - totalStock : adjustQuantity;
  const previewStock = totalStock + computedDelta;
  const previewAvailable = previewStock - reservedStock;

  const handleQuickAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedDelta === 0) {
      setAdjustError("Quantity delta cannot be zero.");
      return;
    }
    if (previewStock < 0) {
      setAdjustError("Resulting physical stock cannot be negative.");
      return;
    }
    if (previewStock < reservedStock) {
      setAdjustError(
        `Cannot reduce physical stock below reserved units (${reservedStock}). Please wait for reservations to expire or fulfill orders.`
      );
      return;
    }

    setAdjustError(null);
    setIsSubmittingAdjust(true);
    try {
      const res = await quickAdjustInventoryAction({
        variantId: variant.id,
        quantity: computedDelta,
        reason: adjustReason.trim() || `${adjustType} adjustment`,
        type: adjustType,
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        const msg = `Successfully recorded ${adjustType} of ${computedDelta > 0 ? `+${computedDelta}` : computedDelta} units for ${variant.sku}.`;
        setAdjustSuccess(msg);
        setTimeout(() => {
          onSuccess(msg);
          onClose();
        }, 600);
      }
    } catch {
      setAdjustError("Failed to apply adjustment. Network or server error.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-lg rounded-md border border-vl-dark-900/15 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-vl-dark-900/10 px-5 py-4">
          <div>
            <h3 className="font-bold text-vl-dark-900">Record Stock Movement / Adjustment</h3>
            <p className="text-xs text-vl-dark-900/60">
              {variant.product.name} ({variant.sku})
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 text-vl-dark-900/60 hover:text-vl-dark-900"
          >
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleQuickAdjustSubmit} className="space-y-4 p-5">
          {/* Type Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-vl-dark-900">
              Adjustment Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={adjustType === type ? "primary" : "outline"}
                  size="xs"
                  onClick={() => handleTypeChange(type)}
                  className="font-bold"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-xs border border-vl-dark-900/10 bg-vl-white-200 p-1.5 text-xs">
            <Button
              type="button"
              variant={adjustMode === "delta" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setAdjustMode("delta")}
              className={`flex-1 font-semibold ${
                adjustMode === "delta" ? "bg-white text-vl-dark-900 shadow-2xs" : "text-vl-dark-900/60"
              }`}
            >
              Add / Remove Delta
            </Button>
            <Button
              type="button"
              variant={adjustMode === "target" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => {
                setAdjustMode("target");
                setTargetQuantity(totalStock);
              }}
              className={`flex-1 font-semibold ${
                adjustMode === "target" ? "bg-white text-vl-dark-900 shadow-2xs" : "text-vl-dark-900/60"
              }`}
            >
              Set Total Target Stock
            </Button>
          </div>

          {/* Delta Stepper or Target Input */}
          {adjustMode === "delta" ? (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-vl-dark-900">Quantity to Adjust</label>
                <span className="text-[11px] text-vl-dark-900/60">
                  {adjustType === "DAMAGE"
                    ? "Negative delta will reduce stock"
                    : "Positive delta will increase stock"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setAdjustQuantity((prev) => prev - 1)}
                  className="size-9 rounded-xs"
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  type="number"
                  step="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
                  size="default"
                  className="flex-1 text-center font-mono text-base font-bold"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setAdjustQuantity((prev) => prev + 1)}
                  className="size-9 rounded-xs"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* Preset Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[5, 10, 25, 50, 100].map((step) => (
                  <Button
                    key={step}
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => setAdjustQuantity(adjustType === "DAMAGE" ? -step : step)}
                    className="h-6 px-2 text-[11px] font-semibold"
                  >
                    {adjustType === "DAMAGE" ? `-${step}` : `+${step}`}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-vl-dark-900">
                Target Physical Stock (Currently: {totalStock})
              </label>
              <div className="mt-1.5">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(parseInt(e.target.value, 10) || 0)}
                  size="default"
                  className="font-mono text-base font-bold"
                />
              </div>
              <p className="mt-1 text-[11px] text-vl-dark-900/60">
                Delta to record:{" "}
                <strong>{computedDelta > 0 ? `+${computedDelta}` : computedDelta}</strong>
              </p>
            </div>
          )}

          {/* Stock Preview Alert */}
          <div
            className={`rounded-xs border p-2.5 text-xs ${
              previewStock < reservedStock
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>
                Current Physical: <strong>{totalStock}</strong>
              </span>
              <span>→</span>
              <span>
                New Physical: <strong>{previewStock}</strong>
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-vl-dark-900/70">
              <span>Reserved: {reservedStock}</span>
              <span>
                New Available to Sell: <strong>{previewAvailable}</strong>
              </span>
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-vl-dark-900">
              Reason / Audit Note
            </label>
            <Input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Explain why this adjustment is being made"
              size="default"
            />

            {/* Quick Reason Chips */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(COMMON_REASONS[adjustType] || []).map((reason) => (
                <Button
                  key={reason}
                  type="button"
                  variant={adjustReason === reason ? "primary" : "secondary"}
                  size="xs"
                  onClick={() => setAdjustReason(reason)}
                  className="h-5 px-2 text-[10px]"
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          {/* Error / Success Messages */}
          {adjustError && (
            <div className="rounded-xs border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {adjustError}
            </div>
          )}
          {adjustSuccess && (
            <div className="rounded-xs border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
              {adjustSuccess}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-vl-dark-900/10 pt-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
              disabled={isSubmittingAdjust}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="default"
              disabled={isSubmittingAdjust}
            >
              {isSubmittingAdjust ? "Saving Ledger Entry..." : "Confirm & Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
