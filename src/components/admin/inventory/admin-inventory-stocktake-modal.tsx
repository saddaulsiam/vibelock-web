"use client";

import * as React from "react";
import {
  Barcode,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Check,
  Loader2,
} from "lucide-react";
import {
  reconcileStocktakeAction,
  type StocktakeReconcileItem,
} from "@/lib/admin/inventory/inventory-actions";
import type { AdminInventoryItem } from "@/lib/admin/inventory/inventory-queries";

function playStocktakeBeep(type: "success" | "warning" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === "warning") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio context not allowed or unsupported
  }
}

interface AdminInventoryStocktakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: AdminInventoryItem[];
  onReconciled: (scanMap: Map<string, number>, feedbackMessage: string) => void;
}

export function AdminInventoryStocktakeModal({
  isOpen,
  onClose,
  variants,
  onReconciled,
}: AdminInventoryStocktakeModalProps) {
  const [stocktakeScans, setStocktakeScans] = React.useState<
    Map<string, { item: AdminInventoryItem; count: number; notes: string }>
  >(new Map());
  const [stocktakeInput, setStocktakeInput] = React.useState("");
  const [stocktakeSound, setStocktakeSound] = React.useState(true);
  const [stocktakeFeedback, setStocktakeFeedback] = React.useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [showReconcileConfirm, setShowReconcileConfirm] = React.useState(false);
  const [isReconciling, setIsReconciling] = React.useState(false);
  const [auditNote, setAuditNote] = React.useState("Physical stocktake audit reconciliation");
  const stocktakeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Scanner buffer for hardware USB/Bluetooth barcode scanner auto-detection inside modal
  const scannerBufferRef = React.useRef<{ text: string; times: number[] }>({
    text: "",
    times: [],
  });

  const handleScanVariant = React.useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return;

      const found = variants.find(
        (v) =>
          v.sku.toLowerCase() === q ||
          v.product.name.toLowerCase() === q ||
          v.sku.toLowerCase().includes(q)
      );

      if (found) {
        setStocktakeScans((prev) => {
          const next = new Map(prev);
          const existing = next.get(found.id);
          const newCount = existing ? existing.count + 1 : 1;
          next.set(found.id, {
            item: found,
            count: newCount,
            notes: existing ? existing.notes : "",
          });
          return next;
        });

        if (stocktakeSound) playStocktakeBeep("success");
        setStocktakeFeedback({
          type: "success",
          text: `Scanned: ${found.sku} (${found.product.name})`,
        });
      } else {
        if (stocktakeSound) playStocktakeBeep("error");
        setStocktakeFeedback({
          type: "error",
          text: `Barcode / SKU "${query}" not found in current inventory catalog.`,
        });
      }
      setStocktakeInput("");
    },
    [variants, stocktakeSound]
  );

  // Focus input and set up hardware scanner detector when modal opens
  React.useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      stocktakeInputRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const buf = scannerBufferRef.current;

      if (buf.times.length > 0 && now - buf.times[buf.times.length - 1] > 70) {
        buf.text = "";
        buf.times = [];
      }

      if (e.key === "Enter") {
        if (buf.text.length >= 3) {
          const deltas = buf.times.slice(1).map((t, idx) => t - buf.times[idx]);
          const avgDelta =
            deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 100;
          if (avgDelta < 50) {
            e.preventDefault();
            const scanned = buf.text.trim();
            buf.text = "";
            buf.times = [];
            handleScanVariant(scanned);
            return;
          }
        }
        buf.text = "";
        buf.times = [];
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.text += e.key;
        buf.times.push(now);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleScanVariant]);

  if (!isOpen) return null;

  // Execute Stocktake Reconciliation
  const handleExecuteReconcile = async () => {
    if (isReconciling || stocktakeScans.size === 0) return;

    const items: StocktakeReconcileItem[] = Array.from(stocktakeScans.values()).map(
      ({ item, count, notes }) => ({
        variantId: item.id,
        scannedQuantity: count,
        expectedQuantity: item.totalStock,
        notes,
      })
    );

    const discrepancies = items.filter((i) => i.scannedQuantity !== i.expectedQuantity);
    if (discrepancies.length === 0) {
      alert("All audited items match system stock perfectly! No adjustments required.");
      setShowReconcileConfirm(false);
      onClose();
      return;
    }

    setIsReconciling(true);
    try {
      const res = await reconcileStocktakeAction({
        items,
        auditNote: auditNote.trim() || "Physical stocktake audit reconciliation",
      });

      if (res.error) {
        alert(res.error);
      } else {
        const scanMap = new Map(
          Array.from(stocktakeScans.values()).map((s) => [s.item.id, s.count])
        );

        if (stocktakeSound) playStocktakeBeep("success");
        onReconciled(scanMap, res.message || "Stocktake reconciliation completed.");
        setShowReconcileConfirm(false);
        setStocktakeScans(new Map());
        onClose();
      }
    } catch {
      alert("Failed to reconcile stocktake. Please try again.");
    } finally {
      setIsReconciling(false);
    }
  };

  // Export Stocktake Audit CSV
  const handleExportStocktakeCsv = () => {
    if (stocktakeScans.size === 0) {
      alert("No scanned items to export.");
      return;
    }

    const rows = [
      [
        "Product Name",
        "SKU",
        "Size",
        "Color",
        "System Physical Stock",
        "Audited Physical Count",
        "Variance (Delta)",
        "Audit Status",
        "Notes",
      ],
    ];

    Array.from(stocktakeScans.values()).forEach(({ item, count, notes }) => {
      const delta = count - item.totalStock;
      const status = delta === 0 ? "Matched" : delta < 0 ? "Missing / Shrinkage" : "Surplus";
      rows.push([
        item.product.name,
        item.sku,
        item.size ?? "—",
        item.color ?? "—",
        String(item.totalStock),
        String(count),
        delta > 0 ? `+${delta}` : String(delta),
        status,
        notes || "",
      ]);
    });

    const csvContent =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map((cell) => {
              const text = String(cell);
              const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
              return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
            })
            .join(",")
        )
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vibelock-stocktake-audit-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#101114] px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-emerald-500/20 p-1 text-emerald-400">
              <Barcode className="size-4.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Rapid Stocktake & Physical Audit Station
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                  Live Audit
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Scan garments with barcode scanner or manual count to detect discrepancies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setStocktakeSound(!stocktakeSound)}
              className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                stocktakeSound
                  ? "bg-white/10 text-emerald-300 hover:bg-white/20"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
              title={stocktakeSound ? "Mute scan sound" : "Enable scan sound"}
            >
              {stocktakeSound ? (
                <Volume2 className="size-3.5" />
              ) : (
                <VolumeX className="size-3.5" />
              )}
              <span>{stocktakeSound ? "Beep On" : "Muted"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-white/60 transition-colors hover:text-white"
              title="Close audit station"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scanner Input Station & Manual Adder Bar */}
        <div className="border-b border-[#101114]/10 bg-[#FBF9F5] p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Rapid Scanner Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (stocktakeInput.trim()) {
                  handleScanVariant(stocktakeInput);
                }
              }}
              className="relative flex-1"
            >
              <Barcode className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-700" />
              <input
                ref={stocktakeInputRef}
                type="text"
                autoFocus
                value={stocktakeInput}
                onChange={(e) => setStocktakeInput(e.target.value)}
                placeholder="Scan barcode tag or type SKU (press Enter)..."
                className="h-10 w-full rounded-sm border border-[#101114]/20 bg-white pr-20 pl-9 font-mono text-xs text-[#101114] shadow-xs outline-none focus:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-xs bg-[#101114] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#101114]/85"
              >
                Scan / Add
              </button>
            </form>

            {/* Dropdown manual selector for items without readable barcodes */}
            <div className="sm:w-72">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleScanVariant(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="h-10 w-full rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] shadow-xs outline-none focus:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="">Or pick variant manually...</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.sku}>
                    {v.sku} - {v.product.name} ({[v.size, v.color].filter(Boolean).join("/")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scan Feedback Banner */}
          {stocktakeFeedback && (
            <div
              className={`animate-in fade-in mt-2.5 flex items-center justify-between rounded-sm px-3 py-1.5 text-xs font-medium duration-150 ${
                stocktakeFeedback.type === "success"
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-900"
                  : "border border-rose-300 bg-rose-100 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {stocktakeFeedback.type === "success" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-700" />
                ) : (
                  <AlertTriangle className="size-3.5 text-rose-700" />
                )}
                <span>{stocktakeFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStocktakeFeedback(null)}
                className="text-current opacity-70 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>

        {/* Audit KPI Overview Bar */}
        <div className="grid grid-cols-2 gap-2 border-b border-[#101114]/10 bg-white p-3 sm:grid-cols-4 sm:gap-4 sm:px-5">
          <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Scanned</span>
            <div className="mt-0.5 text-xl font-black text-[#101114]">
              {Array.from(stocktakeScans.values()).reduce((acc, s) => acc + s.count, 0)} units
            </div>
            <span className="text-[10px] text-zinc-400">
              Across {stocktakeScans.size} unique variants
            </span>
          </div>

          <div className="rounded-sm border border-emerald-200 bg-emerald-50/60 p-2.5">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Matched (0 Delta)
            </span>
            <div className="mt-0.5 text-xl font-black text-emerald-800">
              {
                Array.from(stocktakeScans.values()).filter((s) => s.count === s.item.totalStock)
                  .length
              }
            </div>
            <span className="text-[10px] text-emerald-600">Stock matches physical count</span>
          </div>

          <div className="rounded-sm border border-rose-200 bg-rose-50/60 p-2.5">
            <span className="text-[10px] font-bold text-rose-700 uppercase">
              Missing / Shrinkage
            </span>
            <div className="mt-0.5 text-xl font-black text-rose-800">
              {
                Array.from(stocktakeScans.values()).filter((s) => s.count < s.item.totalStock)
                  .length
              }
            </div>
            <span className="text-[10px] text-rose-600">
              {Array.from(stocktakeScans.values()).reduce(
                (acc, s) =>
                  acc + (s.count < s.item.totalStock ? s.item.totalStock - s.count : 0),
                0
              )}{" "}
              units missing
            </span>
          </div>

          <div className="rounded-sm border border-blue-200 bg-blue-50/60 p-2.5">
            <span className="text-[10px] font-bold text-blue-700 uppercase">
              Surplus / Unrecorded
            </span>
            <div className="mt-0.5 text-xl font-black text-blue-800">
              {
                Array.from(stocktakeScans.values()).filter((s) => s.count > s.item.totalStock)
                  .length
              }
            </div>
            <span className="text-[10px] text-blue-600">
              +
              {Array.from(stocktakeScans.values()).reduce(
                (acc, s) =>
                  acc + (s.count > s.item.totalStock ? s.count - s.item.totalStock : 0),
                0
              )}{" "}
              units extra
            </span>
          </div>
        </div>

        {/* Scanned Items Audit Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {stocktakeScans.size === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2.5 rounded-sm border border-dashed border-[#101114]/20 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Barcode className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-[#101114]">No items scanned yet</h4>
              <p className="max-w-md text-xs text-[#101114]/60">
                Aim your wireless/USB barcode scanner at clothing price tags, or pick items from
                the dropdown to start auditing store inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-[#101114]/10 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F0E8]/70 text-[11px] font-semibold text-[#101114]/70 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Product & Variant</th>
                    <th className="px-3 py-2.5 font-mono">SKU</th>
                    <th className="px-3 py-2.5 text-center font-mono">System Stock</th>
                    <th className="px-3 py-2.5 text-center font-mono">Audited Count</th>
                    <th className="px-3 py-2.5 text-center font-mono">Variance</th>
                    <th className="px-3 py-2.5">Audit Note</th>
                    <th className="px-3 py-2.5 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101114]/5">
                  {Array.from(stocktakeScans.values()).map(({ item, count, notes }) => {
                    const delta = count - item.totalStock;
                    const isMatch = delta === 0;
                    const isMissing = delta < 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isMissing ? "bg-rose-50/30" : isMatch ? "bg-white" : "bg-blue-50/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#101114]">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {[
                              item.size ? `Size: ${item.size}` : null,
                              item.color ? `Color: ${item.color}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Default variant"}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-[#101114]">
                          {item.sku}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-zinc-600">
                          {item.totalStock}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex items-center gap-1 rounded-sm border border-[#101114]/15 bg-white p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                setStocktakeScans((prev) => {
                                  const next = new Map(prev);
                                  const existing = next.get(item.id);
                                  if (existing && existing.count > 0) {
                                    next.set(item.id, {
                                      ...existing,
                                      count: existing.count - 1,
                                    });
                                  }
                                  return next;
                                })
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                              title="Decrease count"
                            >
                              <Minus className="size-2.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="5000"
                              value={count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) {
                                  setStocktakeScans((prev) => {
                                    const next = new Map(prev);
                                    const existing = next.get(item.id);
                                    if (existing) {
                                      next.set(item.id, {
                                        ...existing,
                                        count: val,
                                      });
                                    }
                                    return next;
                                  });
                                }
                              }}
                              className="h-5 w-12 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setStocktakeScans((prev) => {
                                  const next = new Map(prev);
                                  const existing = next.get(item.id);
                                  if (existing) {
                                    next.set(item.id, {
                                      ...existing,
                                      count: existing.count + 1,
                                    });
                                  }
                                  return next;
                                })
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                              title="Increase count"
                            >
                              <Plus className="size-2.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Matched
                            </span>
                          ) : isMissing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              {delta} (Missing)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              +{delta} (Surplus)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            placeholder="Audit note..."
                            value={notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStocktakeScans((prev) => {
                                const next = new Map(prev);
                                const existing = next.get(item.id);
                                if (existing) {
                                  next.set(item.id, {
                                    ...existing,
                                    notes: val,
                                  });
                                }
                                return next;
                              });
                            }}
                            className="h-7 w-full min-w-28 rounded-xs border border-[#101114]/15 bg-white px-2 text-[11px] outline-none focus:border-[#101114]"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setStocktakeScans((prev) => {
                                const next = new Map(prev);
                                next.delete(item.id);
                                return next;
                              })
                            }
                            className="rounded p-1 text-[#101114]/40 hover:bg-rose-50 hover:text-rose-600"
                            title="Remove from current stocktake"
                          >
                            <X className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reconciliation Confirmation Drawer */}
        {showReconcileConfirm && (
          <div className="animate-in slide-in-from-bottom-2 border-t border-amber-300 bg-amber-50/90 p-4 duration-150">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Confirm Stock Ledger Adjustments</span>
                </div>
                <p className="mt-0.5 text-xs text-amber-800">
                  Reconciling will atomically adjust{" "}
                  <strong>
                    {
                      Array.from(stocktakeScans.values()).filter(
                        (s) => s.count !== s.item.totalStock
                      ).length
                    }
                  </strong>{" "}
                  variance variants in the inventory ledger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Audit reason / ledger note..."
                  className="h-8 rounded-sm border border-amber-300 bg-white px-2.5 text-xs text-[#101114] outline-none"
                />
                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={() => setShowReconcileConfirm(false)}
                  className="inline-flex h-8 items-center rounded-sm border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReconciling}
                  onClick={handleExecuteReconcile}
                  className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-emerald-700 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isReconciling ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>Reconciling...</span>
                    </>
                  ) : (
                    <span>Confirm & Apply Ledger Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#101114]/10 bg-white px-5 py-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  stocktakeScans.size > 0 &&
                  !confirm("Clear all scanned items in this stocktake session?")
                ) {
                  return;
                }
                setStocktakeScans(new Map());
                setStocktakeFeedback(null);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <RefreshCw className="size-3.5" />
              <span>Clear Session</span>
            </button>

            <button
              type="button"
              onClick={handleExportStocktakeCsv}
              disabled={stocktakeScans.size === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-50"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-700" />
              <span>Export Audit CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-sm border border-[#101114]/20 bg-white px-4 font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8]"
            >
              Close
            </button>

            <button
              type="button"
              disabled={
                stocktakeScans.size === 0 ||
                Array.from(stocktakeScans.values()).filter((s) => s.count !== s.item.totalStock)
                  .length === 0
              }
              onClick={() => setShowReconcileConfirm(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-emerald-700 px-4 font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="size-3.5" />
              <span>
                Reconcile Discrepancies (
                {
                  Array.from(stocktakeScans.values()).filter(
                    (s) => s.count !== s.item.totalStock
                  ).length
                }
                )
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

