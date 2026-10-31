"use client";

import * as React from "react";
import Image from "next/image";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
import type { InventoryTransactionType } from "@prisma/client";
import { quickAdjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import type { AdminInventoryItem } from "@/lib/admin/inventory/inventory-queries";

export const COMMON_REASONS: Record<InventoryTransactionType, string[]> = {
  RESTOCK: [
    "Factory batch restock",
    "New seasonal shipment",
    "Supplier delivery intake",
    "Warehouse transfer in",
  ],
  ADJUSTMENT: [
    "Physical audit count correction",
    "Discrepancy reconciliation",
    "Storefront sample return",
    "Unrecorded counter movement",
  ],
  DAMAGE: [
    "Damaged in transit / fabric defect",
    "Sewing / zipper defect",
    "Stained / spoiled unit",
    "Counter display wear and tear",
  ],
  RETURN: [
    "Customer return restocked",
    "Courier return inspection pass",
    "Exchange item restocked",
  ],
  SALE: ["POS counter direct sale", "Manual retail order"],
};

interface AdminInventoryAdjustModalProps {
  item: AdminInventoryItem | null;
  onClose: () => void;
  onSuccess: (updated: { id: string; qty: number; sku: string }) => void;
}

export function AdminInventoryAdjustModal({
  item,
  onClose,
  onSuccess,
}: AdminInventoryAdjustModalProps) {
  const [adjustType, setAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [adjustQuantity, setAdjustQuantity] = React.useState<string>("10");
  const [adjustReason, setAdjustReason] = React.useState<string>("Factory batch restock");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (item) {
      setAdjustType("RESTOCK");
      setAdjustQuantity("10");
      setAdjustReason("Factory batch restock");
      setAdjustError(null);
    }
  }, [item]);

  if (!item) return null;

  const handleExecuteAdjust = async () => {
    if (isSubmittingAdjust) return;
    setAdjustError(null);

    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      setAdjustError("Please enter a valid non-zero adjustment quantity.");
      return;
    }

    // Client-side reservation validation check
    const projectedPhysical = item.totalStock + qty;
    if (projectedPhysical < item.reserved) {
      setAdjustError(
        `Adjustment would reduce physical stock (${projectedPhysical}) below active reservations (${item.reserved}).`
      );
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await quickAdjustInventoryAction({
        variantId: item.id,
        quantity: qty,
        reason: adjustReason.trim() || "Stock adjustment",
        type: adjustType,
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        onSuccess({ id: item.id, qty, sku: item.sku });
        onClose();
      }
    } catch {
      setAdjustError("Failed to adjust inventory.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
      <div className="w-full max-w-lg rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-[#101114]" />
            <h3 className="text-sm font-semibold text-[#101114]">
              Quick Stock Adjust: {item.sku}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-5">
          {/* Product Info Snapshot */}
          <div className="flex items-center gap-3 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-3">
            {item.primaryImage ? (
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xs border border-[#101114]/15 bg-white">
                <Image
                  src={item.primaryImage}
                  alt={item.product.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#101114]">
                {item.product.name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[#101114]/60">
                {item.sku} •{" "}
                {[
                  item.size ? `Size: ${item.size}` : null,
                  item.color ? `Color: ${item.color}` : null,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Default"}
              </p>
            </div>
          </div>

          {/* Stock Snapshot Cards */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
              <p className="text-[10px] font-semibold text-[#101114]/60 uppercase">Physical</p>
              <p className="text-base font-bold text-[#101114]">{item.totalStock}</p>
            </div>
            <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
              <p className="text-[10px] font-semibold text-[#101114]/60 uppercase">Reserved</p>
              <p className="text-base font-bold text-amber-800">{item.reserved}</p>
            </div>
            <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
              <p className="text-[10px] font-semibold text-[#101114]/60 uppercase">Available</p>
              <p className="text-base font-bold text-emerald-800">{item.available}</p>
            </div>
          </div>

          {adjustError && (
            <div className="rounded-sm border border-red-300 bg-red-50 p-2.5 text-xs text-red-800">
              {adjustError}
            </div>
          )}

          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#101114]">
              Adjustment Type
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-xs">
              {(["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setAdjustType(t);
                    setAdjustReason(COMMON_REASONS[t][0]);
                    if (t === "DAMAGE") {
                      setAdjustQuantity("-1");
                    } else if (t === "RESTOCK") {
                      setAdjustQuantity("10");
                    }
                  }}
                  className={`rounded-xs px-2 py-1.5 text-center font-semibold transition-colors ${
                    adjustType === t
                      ? "bg-[#101114] text-white shadow-2xs"
                      : "border border-[#101114]/20 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                  }`}
                >
                  {t === "RESTOCK"
                    ? "Restock"
                    : t === "ADJUSTMENT"
                      ? "Audit"
                      : t === "DAMAGE"
                        ? "Damage"
                        : "Return"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input & Preset Pills */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#101114]">
                Quantity Adjustment <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[#101114]/50">
                Use (+) to add, (-) to deduct
              </span>
            </div>
            <input
              type="number"
              step="1"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder="e.g. 10 or -2"
              className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 font-mono text-sm font-bold text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            />

            {/* Quick Preset Buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-semibold text-[#101114]/50">Quick:</span>
              {(adjustType === "DAMAGE"
                ? ["-1", "-2", "-5", "-10"]
                : ["+5", "+10", "+25", "+50", "+100"]
              ).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAdjustQuantity(val.replace("+", ""))}
                  className="rounded-xs border border-[#101114]/15 bg-[#FBF9F5] px-2 py-0.5 font-mono text-xs font-medium text-[#101114] hover:bg-[#F3F0E8]"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Live Projected Stock Preview */}
          {(() => {
            const q = parseInt(adjustQuantity, 10);
            if (!isNaN(q) && q !== 0) {
              const projectedTotal = item.totalStock + q;
              const projectedAvail = projectedTotal - item.reserved;
              const isViolation = projectedTotal < item.reserved;

              return (
                <div
                  className={`flex items-center justify-between rounded-xs border px-3 py-2 text-xs ${
                    isViolation
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  <span>
                    {isViolation ? "⚠️ Exceeds Available:" : "Projected After Adjustment:"}{" "}
                    <strong>
                      {item.totalStock} → {projectedTotal}
                    </strong>
                  </span>
                  <span className="font-bold">Available: {projectedAvail}</span>
                </div>
              );
            }
            return null;
          })()}

          {/* Reason Input with suggestions */}
          <div>
            <label className="block text-xs font-semibold text-[#101114]">
              Adjustment Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Factory delivery intake"
              className="mt-1 h-9 w-full rounded-sm border border-[#101114]/20 bg-white px-3 text-xs text-[#101114] outline-none focus:border-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            />
            {/* Reason Suggestions */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {COMMON_REASONS[adjustType].map((reasonText) => (
                <button
                  key={reasonText}
                  type="button"
                  onClick={() => setAdjustReason(reasonText)}
                  className="rounded-2xs border border-[#101114]/10 bg-[#FBF9F5] px-1.5 py-0.5 text-[10px] text-[#101114]/70 hover:bg-[#F3F0E8] hover:text-[#101114]"
                >
                  {reasonText}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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
            disabled={isSubmittingAdjust || !adjustQuantity}
            onClick={handleExecuteAdjust}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#101114] px-4 py-1.5 font-semibold text-white transition-colors hover:bg-[#101114]/85 disabled:opacity-50"
          >
            {isSubmittingAdjust ? <Loader2 className="size-3.5 animate-spin" /> : null}
            <span>Record Adjustment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

