"use client";

import * as React from "react";
import {
  Check,
  Copy,
  FileSpreadsheet,
  PackageMinus,
  PackagePlus,
  PackageX,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import type { AdminInventoryDetailResult } from "@/lib/admin/inventory/inventory-queries";

function formatDate(dateInput: Date | string) {
  const d = new Date(dateInput);
  return d.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateInput: Date | string) {
  const d = new Date(dateInput).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateInput).toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}

export interface AdminInventoryDetailLedgerProps {
  sku: string;
  transactions: AdminInventoryDetailResult["transactions"];
  totalPages: number;
  page: number;
  typeFilter: string;
  onFilterChange: (type: string) => void;
  onPageChange: (newPage: number) => void;
}

export function AdminInventoryDetailLedger({
  sku,
  transactions,
  totalPages,
  page,
  typeFilter,
  onFilterChange,
  onPageChange,
}: AdminInventoryDetailLedgerProps) {
  const [copiedRef, setCopiedRef] = React.useState<string | null>(null);
  const handleCopyRef = (refId: string) => {
    navigator.clipboard.writeText(refId);
    setCopiedRef(refId);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleExportLedgerCsv = () => {
    const headers = ["Date", "Type", "Sales Channel", "Quantity Delta", "Reference ID", "Notes"];
    const rows = transactions.map((t) => [
      formatDate(t.createdAt),
      t.type,
      t.salesChannel || "DIRECT",
      t.quantity > 0 ? `+${t.quantity}` : `${t.quantity}`,
      t.referenceId || "",
      // Defend against CSV formula injection
      (t.notes || "").replace(/^[=+\-@\t\r]/, "'$&"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ledger-${sku}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-[#101114]/10 bg-white shadow-xs">
      {/* Table Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-[#101114]/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#101114]">Stock Movement Timeline & Ledger</h2>
          <p className="text-xs text-[#101114]/60">
            Immutable ledger of all inbound, outbound, and adjustment events for this variant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportLedgerCsv}
            disabled={transactions.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-50"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-700" />
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-2.5 text-xs">
        <span className="mr-1 font-semibold text-[#101114]/70">Filter Event:</span>
        {[
          { id: "ALL", label: "All Movements" },
          { id: "RESTOCK", label: "Restock (+)" },
          { id: "SALE", label: "Sales (-)" },
          { id: "ADJUSTMENT", label: "Adjustment (±)" },
          { id: "DAMAGE", label: "Damaged (-)" },
          { id: "RETURN", label: "Return (+)" },
        ].map((pill) => {
          const isActive = typeFilter === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onFilterChange(pill.id)}
              className={`rounded-xs px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#101114] text-white"
                  : "border border-[#101114]/15 bg-white text-[#101114]/70 hover:bg-[#101114]/10 hover:text-[#101114]"
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Ledger Table */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <RotateCcw className="size-8 text-[#101114]/30" />
          <p className="mt-3 text-sm font-semibold text-[#101114]">No transactions recorded</p>
          <p className="text-xs text-[#101114]/60">
            {typeFilter !== "ALL"
              ? `No transactions found matching filter "${typeFilter}".`
              : "No inventory events have occurred for this variant yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50 text-[11px] font-semibold text-[#101114]/70">
              <tr>
                <th className="py-3 pr-3 pl-5">Event Type</th>
                <th className="px-3 py-3">Channel</th>
                <th className="px-3 py-3 text-right">Quantity Delta</th>
                <th className="px-3 py-3">Reference ID</th>
                <th className="px-3 py-3">Notes & Reason</th>
                <th className="py-3 pr-5 pl-3 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#101114]/5">
              {transactions.map((tx) => {
                const isPositive = tx.quantity > 0;
                return (
                  <tr key={tx.id} className="transition-colors hover:bg-[#F3F0E8]/30">
                    {/* Type Badge */}
                    <td className="py-3 pr-3 pl-5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-bold ${
                          tx.type === "RESTOCK"
                            ? "bg-emerald-100 text-emerald-800"
                            : tx.type === "SALE"
                              ? "bg-blue-100 text-blue-800"
                              : tx.type === "DAMAGE"
                                ? "bg-rose-100 text-rose-800"
                                : tx.type === "RETURN"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {tx.type === "RESTOCK" && <PackagePlus className="size-3" />}
                        {tx.type === "SALE" && <PackageMinus className="size-3" />}
                        {tx.type === "DAMAGE" && <PackageX className="size-3" />}
                        {tx.type === "RETURN" && <RotateCcw className="size-3" />}
                        {tx.type === "ADJUSTMENT" && <SlidersHorizontal className="size-3" />}
                        <span>{tx.type}</span>
                      </span>
                    </td>

                    {/* Sales Channel */}
                    <td className="px-3 py-3">
                      <span className="font-mono text-[10px] font-medium text-[#101114]/60">
                        {tx.salesChannel || "SYSTEM"}
                      </span>
                    </td>

                    {/* Quantity Delta */}
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`inline-flex items-center font-mono text-xs font-extrabold ${
                          isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {isPositive ? `+${tx.quantity}` : tx.quantity}
                      </span>
                    </td>

                    {/* Reference ID */}
                    <td className="px-3 py-3 font-mono text-[11px] text-[#101114]/70">
                      {tx.referenceId ? (
                        <div className="flex items-center gap-1">
                          <span className="max-w-[140px] truncate" title={tx.referenceId}>
                            {tx.referenceId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(tx.referenceId!)}
                            className="text-[#101114]/40 hover:text-[#101114]"
                            title="Copy Reference"
                          >
                            {copiedRef === tx.referenceId ? (
                              <Check className="size-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-2.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Notes / Reason */}
                    <td className="max-w-xs truncate px-3 py-3 text-[#101114]/80">
                      {tx.notes || <span className="text-zinc-400 italic">No notes</span>}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 pr-5 pl-3 text-right">
                      <span className="block font-medium text-[#101114]">
                        {formatRelativeTime(tx.createdAt)}
                      </span>
                      <span className="block text-[10px] text-[#101114]/50">
                        {formatDate(tx.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
          <span className="text-[#101114]/60">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="h-8 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="h-8 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

