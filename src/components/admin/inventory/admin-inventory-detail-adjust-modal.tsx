"use client";

import * as React from "react";
import { Minus, Plus, X } from "lucide-react";
import type { InventoryTransactionType } from "@prisma/client";
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
      <div className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-lg rounded-md border border-[#101114]/15 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-4">
          <div>
            <h3 className="font-bold text-[#101114]">Record Stock Movement / Adjustment</h3>
            <p className="text-xs text-[#101114]/60">
              {variant.product.name} ({variant.sku})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleQuickAdjustSubmit} className="space-y-4 p-5">
          {/* Type Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#101114]">
              Adjustment Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`rounded-xs border p-2 text-center text-xs font-bold transition-colors ${
                    adjustType === type
                      ? "border-[#101114] bg-[#101114] text-white"
                      : "border-[#101114]/20 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-xs border border-[#101114]/10 bg-[#FBF9F5] p-1.5 text-xs">
            <button
              type="button"
              onClick={() => setAdjustMode("delta")}
              className={`flex-1 rounded-xs py-1 font-semibold transition-colors ${
                adjustMode === "delta"
                  ? "bg-white text-[#101114] shadow-2xs"
                  : "text-[#101114]/60 hover:text-[#101114]"
              }`}
            >
              Add / Remove Delta
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustMode("target");
                setTargetQuantity(totalStock);
              }}
              className={`flex-1 rounded-xs py-1 font-semibold transition-colors ${
                adjustMode === "target"
                  ? "bg-white text-[#101114] shadow-2xs"
                  : "text-[#101114]/60 hover:text-[#101114]"
              }`}
            >
              Set Total Target Stock
            </button>
          </div>

          {/* Delta Stepper or Target Input */}
          {adjustMode === "delta" ? (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#101114]">Quantity to Adjust</label>
                <span className="text-[11px] text-[#101114]/60">
                  {adjustType === "DAMAGE"
                    ? "Negative delta will reduce stock"
                    : "Positive delta will increase stock"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustQuantity((prev) => prev - 1)}
                  className="flex size-9 items-center justify-center rounded-xs border border-[#101114]/20 bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/10"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseInt(e.target.value, 10) || 0)}
                  className="h-9 flex-1 rounded-xs border border-[#101114]/20 text-center font-mono text-base font-bold text-[#101114] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAdjustQuantity((prev) => prev + 1)}
                  className="flex size-9 items-center justify-center rounded-xs border border-[#101114]/20 bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/10"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {/* Preset Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[5, 10, 25, 50, 100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setAdjustQuantity(adjustType === "DAMAGE" ? -step : step)}
                    className="rounded-xs bg-[#F3F0E8] px-2 py-0.5 text-[11px] font-semibold text-[#101114] hover:bg-[#101114]/15"
                  >
                    {adjustType === "DAMAGE" ? `-${step}` : `+${step}`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#101114]">
                Target Physical Stock (Currently: {totalStock})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(parseInt(e.target.value, 10) || 0)}
                className="mt-1.5 h-9 w-full rounded-xs border border-[#101114]/20 px-3 font-mono text-base font-bold text-[#101114] outline-none"
              />
              <p className="mt-1 text-[11px] text-[#101114]/60">
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
                : "border-[#101114]/10 bg-[#FBF9F5] text-[#101114]"
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
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#101114]/70">
              <span>Reserved: {reservedStock}</span>
              <span>
                New Available to Sell: <strong>{previewAvailable}</strong>
              </span>
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#101114]">
              Reason / Audit Note
            </label>
            <input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Explain why this adjustment is being made"
              className="h-9 w-full rounded-xs border border-[#101114]/20 px-3 text-xs text-[#101114] outline-none"
            />

            {/* Quick Reason Chips */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(COMMON_REASONS[adjustType] || []).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setAdjustReason(reason)}
                  className={`rounded-xs px-2 py-0.5 text-[10px] transition-colors ${
                    adjustReason === reason
                      ? "bg-[#101114] text-white"
                      : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/15"
                  }`}
                >
                  {reason}
                </button>
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
          <div className="flex items-center justify-end gap-2 border-t border-[#101114]/10 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingAdjust}
              className="h-9 rounded-xs border border-[#101114]/20 bg-white px-4 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdjust}
              className="inline-flex h-9 items-center gap-1.5 rounded-xs bg-[#101114] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#101114]/85 disabled:opacity-50"
            >
              {isSubmittingAdjust ? "Saving Ledger Entry..." : "Confirm & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
