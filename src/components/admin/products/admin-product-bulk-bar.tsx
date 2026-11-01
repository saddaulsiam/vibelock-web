"use client";

import {
  bulkAssignProductCategoryAction,
  bulkDeleteProductsAction,
  bulkUpdateProductStatusAction,
} from "@/lib/admin/catalog/catalog-actions";
import type { AdminProductItem } from "@/lib/admin/catalog/catalog-queries";
import { ChevronDown, Eye, EyeOff, Printer, Tag, Trash2 } from "lucide-react";
import * as React from "react";

export interface AdminProductBulkBarProps {
  selectedIds: Set<string>;
  loadedProducts: AdminProductItem[];
  allCategories: { id: string; name: string }[];
  onClearSelection: () => void;
  onOpenBarcodeModal: (selected: AdminProductItem[]) => void;
  onSuccess: (message: string) => void;
}

export function AdminProductBulkBar({
  selectedIds,
  loadedProducts,
  allCategories,
  onClearSelection,
  onOpenBarcodeModal,
  onSuccess,
}: AdminProductBulkBarProps) {
  const [isBulkOperating, setIsBulkOperating] = React.useState(false);
  const [showBulkCategoryMenu, setShowBulkCategoryMenu] = React.useState(false);
  const [selectedBulkCategoryId, setSelectedBulkCategoryId] = React.useState<string>("");
  const [bulkCategoryMode, setBulkCategoryMode] = React.useState<"add" | "replace">("add");
  const [isBulkCategoryApplying, setIsBulkCategoryApplying] = React.useState(false);

  if (selectedIds.size === 0) return null;

  const handleBulkStatus = async (status: "PUBLISHED" | "DRAFT") => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateProductStatusAction(Array.from(selectedIds), status);
      if (res.error) {
        alert(res.error);
      } else {
        onSuccess(res.message || "Updated successfully.");
        onClearSelection();
      }
    } catch {
      alert("Bulk status update failed.");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkOperating) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected product(s)? Products with existing orders, reservations, or reviews will be skipped.`
    );
    if (!confirmed) return;

    setIsBulkOperating(true);
    try {
      const res = await bulkDeleteProductsAction(Array.from(selectedIds));
      if (res.error) {
        alert(res.error);
      } else {
        onSuccess(res.message || "Deleted successfully.");
        onClearSelection();
      }
    } catch {
      alert("Bulk delete failed.");
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAssignCategory = async () => {
    if (selectedIds.size === 0 || !selectedBulkCategoryId || isBulkCategoryApplying) return;
    setIsBulkCategoryApplying(true);
    try {
      const res = await bulkAssignProductCategoryAction(
        Array.from(selectedIds),
        selectedBulkCategoryId,
        bulkCategoryMode
      );
      if (res.error) {
        alert(res.error);
      } else {
        onSuccess(res.message || "Categories updated.");
        setShowBulkCategoryMenu(false);
        setSelectedBulkCategoryId("");
        onClearSelection();
      }
    } catch {
      alert("Failed to assign category.");
    } finally {
      setIsBulkCategoryApplying(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-sm border border-white/15 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md duration-200 sm:gap-4">
      <div className="flex items-center gap-2 font-medium">
        <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
          {selectedIds.size}
        </span>
        <span className="hidden sm:inline">selected</span>
      </div>

      <div className="h-4 w-px bg-white/20" />

      {/* Bulk Publish */}
      <button
        type="button"
        disabled={isBulkOperating}
        onClick={() => handleBulkStatus("PUBLISHED")}
        className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        title="Publish all selected products"
      >
        <Eye className="size-3.5" />
        <span>Publish</span>
      </button>

      {/* Bulk Unpublish (Draft) */}
      <button
        type="button"
        disabled={isBulkOperating}
        onClick={() => handleBulkStatus("DRAFT")}
        className="inline-flex items-center gap-1.5 rounded-xs bg-amber-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
        title="Set all selected products to Draft"
      >
        <EyeOff className="size-3.5" />
        <span>Draft</span>
      </button>

      {/* Bulk Assign Category */}
      <div className="relative">
        <button
          type="button"
          disabled={isBulkOperating}
          onClick={() => setShowBulkCategoryMenu(!showBulkCategoryMenu)}
          className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          title="Assign category to selected products"
        >
          <Tag className="size-3.5" />
          <span>Category</span>
          <ChevronDown className="size-3" />
        </button>

        {showBulkCategoryMenu && (
          <div className="animate-in fade-in zoom-in-95 absolute bottom-full left-0 mb-2 w-64 rounded-sm border border-white/20 bg-[#101114] p-3 text-white shadow-2xl">
            <p className="text-[11px] font-semibold text-white/90">Bulk Assign Category</p>
            <select
              value={selectedBulkCategoryId}
              onChange={(e) => setSelectedBulkCategoryId(e.target.value)}
              className="mt-1.5 h-8 w-full rounded-sm border border-white/20 bg-[#1e2024] px-2 text-xs text-white"
            >
              <option value="">Select category...</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-white/70">
              <label className="flex cursor-pointer items-center gap-1">
                <input
                  type="radio"
                  name="bulkCatMode"
                  checked={bulkCategoryMode === "add"}
                  onChange={() => setBulkCategoryMode("add")}
                  className="accent-[#00D9FF]"
                />
                Add
              </label>
              <label className="flex cursor-pointer items-center gap-1">
                <input
                  type="radio"
                  name="bulkCatMode"
                  checked={bulkCategoryMode === "replace"}
                  onChange={() => setBulkCategoryMode("replace")}
                  className="accent-[#00D9FF]"
                />
                Replace All
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkCategoryMenu(false)}
                className="px-2 py-1 text-[11px] text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBulkCategoryId || isBulkCategoryApplying}
                onClick={handleBulkAssignCategory}
                className="rounded-xs bg-[#00D9FF] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#00D9FF]/90 disabled:opacity-50"
              >
                {isBulkCategoryApplying ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Print Barcode Tags */}
      <button
        type="button"
        disabled={isBulkOperating}
        onClick={() => {
          const selected = loadedProducts.filter((p) => selectedIds.has(p.id));
          onOpenBarcodeModal(selected);
        }}
        className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        title="Print price tag barcode labels for selected products"
      >
        <Printer className="size-3.5" />
        <span>Print Tags</span>
      </button>

      {/* Bulk Delete */}
      <button
        type="button"
        disabled={isBulkOperating}
        onClick={handleBulkDelete}
        className="inline-flex items-center gap-1.5 rounded-xs bg-red-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        title="Delete all selected products"
      >
        <Trash2 className="size-3.5" />
        <span>Delete</span>
      </button>

      <div className="h-4 w-px bg-white/20" />

      {/* Deselect All */}
      <button
        type="button"
        disabled={isBulkOperating}
        onClick={onClearSelection}
        className="text-white/60 transition-colors hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}
