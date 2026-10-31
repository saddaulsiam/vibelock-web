"use client";

import {
  bulkAdjustInventoryAction,
  loadMoreAdminInventoryAction,
  quickAdjustInventoryAction,
  reconcileStocktakeAction,
  type StocktakeReconcileItem,
} from "@/lib/admin/inventory-actions";
import type {
  AdminInventoryItem,
  AdminInventoryResult,
  InventoryFilter,
} from "@/lib/admin/inventory-queries";
import type { InventoryTransactionType } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Factory,
  FileSpreadsheet,
  ImageOff,
  Loader2,
  Lock,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { AdminInventoryPoModal } from "@/components/admin/inventory/admin-inventory-po-modal";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
} from "@/components/admin/shared";
import { AdminTableSearchInput } from "@/components/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined) return "৳0";
  return `৳${Number(val).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function BarcodeSvg({ value, height = 28 }: { value: string; height?: number }) {
  const chars = value.split("");
  const bars: number[] = [2, 1, 1, 2];
  chars.forEach((char) => {
    const code = char.charCodeAt(0);
    bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
  });
  bars.push(2, 3, 1, 1, 2);

  const totalWidth = bars.reduce((acc, b) => acc + b, 0);
  let currentX = 0;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="mx-auto block h-auto w-full max-w-[130px]"
      aria-label={`Barcode: ${value}`}
    >
      {bars.map((barWidth, index) => {
        const isBlack = index % 2 === 0;
        const x = currentX;
        currentX += barWidth;
        if (!isBlack) return null;
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth}
            height={height}
            fill="#101114"
            shapeRendering="crispEdges"
          />
        );
      })}
    </svg>
  );
}

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

const COMMON_REASONS: Record<InventoryTransactionType, string[]> = {
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

export function AdminInventoryTable({
  initialData,
  currentFilters,
}: {
  initialData: AdminInventoryResult;
  currentFilters: {
    q: string;
    filter: InventoryFilter;
    page: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search input state & debounce
  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Loaded items & infinite scroll state
  const [loadedVariants, setLoadedVariants] = React.useState<AdminInventoryItem[]>(
    initialData.variants
  );
  const [currentPage, setCurrentPage] = React.useState(initialData.page || 1);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState((initialData.page || 1) < initialData.totalPages);

  // Column visibility hook
  const inventoryColumnOptions = React.useMemo(
    () => [
      { key: "sku" as const, label: "SKU" },
      { key: "physical" as const, label: "Physical Stock" },
      { key: "reserved" as const, label: "Reserved Stock" },
      { key: "available" as const, label: "Available Stock" },
      { key: "pricing" as const, label: "Pricing (Cost / Sell)" },
      { key: "health" as const, label: "Stock Health" },
    ],
    []
  );

  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(inventoryColumnOptions);

  const visibleColumnCount = 3 + totalVisibleCols;

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Quick Stock Adjust Modal state
  const [adjustingItem, setAdjustingItem] = React.useState<AdminInventoryItem | null>(null);
  const [adjustType, setAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [adjustQuantity, setAdjustQuantity] = React.useState<string>("10");
  const [adjustReason, setAdjustReason] = React.useState<string>("Factory batch restock");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = React.useState(false);
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  // Bulk Adjust Modal state
  const [showBulkAdjustModal, setShowBulkAdjustModal] = React.useState(false);
  const [bulkAdjustType, setBulkAdjustType] = React.useState<InventoryTransactionType>("RESTOCK");
  const [bulkAdjustQuantity, setBulkAdjustQuantity] = React.useState<string>("10");
  const [bulkAdjustReason, setBulkAdjustReason] = React.useState<string>("Bulk factory restock");
  const [isSubmittingBulkAdjust, setIsSubmittingBulkAdjust] = React.useState(false);

  // Barcode / Price Tag Printing Modal state
  const [barcodeModalItems, setBarcodeModalItems] = React.useState<AdminInventoryItem[] | null>(
    null
  );
  const [barcodeLabelSize, setBarcodeLabelSize] = React.useState<"standard" | "compact" | "sheet">(
    "standard"
  );
  const [barcodeQuantityMode, setBarcodeQuantityMode] = React.useState<
    "one-per-variant" | "by-stock" | "custom"
  >("one-per-variant");
  const [barcodeCustomQuantity, setBarcodeCustomQuantity] = React.useState<number>(5);
  const [barcodeItemOverrides, setBarcodeItemOverrides] = React.useState<Record<string, number>>(
    {}
  );
  const [showVariantTuning, setShowVariantTuning] = React.useState<boolean>(false);

  // Rapid Stocktake / Physical Audit Mode state
  const [showStocktakeModal, setShowStocktakeModal] = React.useState(false);
  const [stocktakeScans, setStocktakeScans] = React.useState<
    Map<string, { item: AdminInventoryItem; count: number; notes: string }>
  >(new Map());
  const [stocktakeInput, setStocktakeInput] = React.useState("");
  const [stocktakeSound, setStocktakeSound] = React.useState(true);
  const [stocktakeFeedback, setStocktakeFeedback] = React.useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [isReconciling, setIsReconciling] = React.useState(false);
  const [showReconcileConfirm, setShowReconcileConfirm] = React.useState(false);
  const [auditNote, setAuditNote] = React.useState("Physical stocktake audit reconciliation");
  const stocktakeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Supplier Purchase Order (PO) & Reorder Sheet Modal state
  const [showPoModal, setShowPoModal] = React.useState(false);
  const [poInitialItems, setPoInitialItems] = React.useState<AdminInventoryItem[]>([]);

  // Hardware Barcode Scanner Detection buffer & indicator
  const [scannedIndicator, setScannedIndicator] = React.useState<string | null>(null);
  const scannerBufferRef = React.useRef<{ text: string; times: number[] }>({
    text: "",
    times: [],
  });

  // Copied SKU feedback
  const [copiedSku, setCopiedSku] = React.useState<string | null>(null);

  // Adjust state during render when initialData changes
  const [prevInitialData, setPrevInitialData] = React.useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setLoadedVariants(initialData.variants);
    setCurrentPage(initialData.page || 1);
    setHasMore((initialData.page || 1) < initialData.totalPages);
    setIsLoadingMore(false);
    setSelectedIds(new Set());
  }

  const [prevFilterQ, setPrevFilterQ] = React.useState(currentFilters.q);
  if (prevFilterQ !== currentFilters.q) {
    setPrevFilterQ(currentFilters.q);
    setSearchTerm(currentFilters.q);
  }

  // Helper to update URL search params
  const updateQuery = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (!val || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Handler for scanning an item in stocktake mode
  const handleScanVariant = React.useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return;

      const found = loadedVariants.find(
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
    [loadedVariants, stocktakeSound]
  );

  // Keyboard shortcut '/' to focus search input, 'Escape' to blur, and hardware barcode scanner auto-detect
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      const now = Date.now();
      const buf = scannerBufferRef.current;

      // Reset buffer if more than 70ms passed since last keystroke
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

            if (showStocktakeModal) {
              handleScanVariant(scanned);
            } else {
              setSearchTerm(scanned);
              updateQuery({ q: scanned });
              setScannedIndicator(`Scanned SKU: ${scanned}`);
              setTimeout(() => setScannedIndicator(null), 4000);
            }
            return;
          }
        }
        buf.text = "";
        buf.times = [];
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf.text += e.key;
        buf.times.push(now);
      }

      if (e.key === "/" && !isInput && !showStocktakeModal) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleScanVariant, showStocktakeModal, updateQuery]);

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
      setShowStocktakeModal(false);
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
        // Optimistically update loadedVariants
        const scanMap = new Map(
          Array.from(stocktakeScans.values()).map((s) => [s.item.id, s.count])
        );
        setLoadedVariants((prev) =>
          prev.map((v) => {
            if (!scanMap.has(v.id)) return v;
            const newPhysical = scanMap.get(v.id)!;
            return {
              ...v,
              totalStock: newPhysical,
              available: newPhysical - v.reserved,
            };
          })
        );

        if (stocktakeSound) playStocktakeBeep("success");
        setFeedbackMessage(res.message || "Stocktake reconciliation completed.");
        setShowReconcileConfirm(false);
        setShowStocktakeModal(false);
        setStocktakeScans(new Map());
        router.refresh();
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

  // Infinite Scroll Handler
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await loadMoreAdminInventoryAction({
        search: currentFilters.q,
        filter: currentFilters.filter,
        page: nextPage,
      });
      setLoadedVariants((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = res.variants.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      setCurrentPage(nextPage);
      setHasMore(nextPage < res.totalPages);
    } catch (err) {
      console.error("Failed to load more inventory items:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, currentFilters, hasMore, isLoadingMore]);

  // Debounced search handler
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateQuery({ q: val.trim() || null });
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateQuery({ q: null });
    searchInputRef.current?.focus();
  };

  // Copy SKU helper
  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Multi-select helpers
  const isAllSelected =
    loadedVariants.length > 0 && loadedVariants.every((v) => selectedIds.has(v.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(loadedVariants.map((v) => v.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Quick Stock Adjust Submit
  const handleExecuteAdjust = async () => {
    if (!adjustingItem || isSubmittingAdjust) return;
    setAdjustError(null);

    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      setAdjustError("Please enter a valid non-zero adjustment quantity.");
      return;
    }

    // Client-side reservation validation check
    const projectedPhysical = adjustingItem.totalStock + qty;
    if (projectedPhysical < adjustingItem.reserved) {
      setAdjustError(
        `Adjustment would reduce physical stock (${projectedPhysical}) below active reservations (${adjustingItem.reserved}).`
      );
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await quickAdjustInventoryAction({
        variantId: adjustingItem.id,
        quantity: qty,
        reason: adjustReason.trim() || "Stock adjustment",
        type: adjustType,
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        // Optimistic update of loadedVariants
        setLoadedVariants((prev) =>
          prev.map((item) => {
            if (item.id !== adjustingItem.id) return item;
            const updatedStock = item.totalStock + qty;
            return {
              ...item,
              totalStock: updatedStock,
              available: updatedStock - item.reserved,
            };
          })
        );
        setFeedbackMessage(`Adjusted ${adjustingItem.sku} by ${qty > 0 ? `+${qty}` : qty} units.`);
        setAdjustingItem(null);
        router.refresh();
      }
    } catch {
      setAdjustError("Failed to adjust inventory. Please try again.");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Bulk Stock Adjust Submit
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
        setFeedbackMessage(res.message || "Bulk adjustment completed.");
        setShowBulkAdjustModal(false);
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
      alert("Bulk adjustment failed.");
    } finally {
      setIsSubmittingBulkAdjust(false);
    }
  };

  // Open Quick Adjust for single item
  const handleOpenAdjustModal = (item: AdminInventoryItem) => {
    setAdjustingItem(item);
    setAdjustType("RESTOCK");
    setAdjustQuantity("10");
    setAdjustReason("Factory batch restock");
    setAdjustError(null);
  };

  const hasNegativeAnomaly = loadedVariants.some((v) => v.totalStock < 0 || v.available < 0);

  return (
    <div className="space-y-4">
      {/* ── 1. Quick Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => updateQuery({ filter: "all" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "all"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <Boxes className="size-3.5" />
          <span>All Items</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "in-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "in-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>In Stock (&gt;0)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "low-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "low-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <AlertTriangle className="size-3 text-amber-500" />
          <span>Low Stock (1–5)</span>
        </button>

        <button
          type="button"
          onClick={() => updateQuery({ filter: "out-of-stock" })}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
            currentFilters.filter === "out-of-stock"
              ? "bg-[#101114] font-semibold text-white shadow-2xs"
              : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <span className="size-1.5 rounded-full bg-rose-500" />
          <span>Out of Stock (0)</span>
        </button>

        {hasNegativeAnomaly && (
          <button
            type="button"
            onClick={() => updateQuery({ filter: "negative" })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
              currentFilters.filter === "negative"
                ? "bg-red-900 text-white shadow-2xs"
                : "border border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
            }`}
          >
            <AlertTriangle className="size-3.5 animate-pulse text-red-600" />
            <span>Negative Anomaly</span>
          </button>
        )}
      </div>

      {/* ── Optional Feedback Notice ── */}
      {feedbackMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. Search & Toolbar Controls ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar with '/' shortcut */}
        <AdminTableSearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          placeholder="Search by SKU, product name, size, or color..."
          inputRef={searchInputRef}
        />

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Purchase Order (PO) / Reorder Sheet Button */}
          <button
            type="button"
            onClick={() => {
              setPoInitialItems([]);
              setShowPoModal(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            title="Generate Supplier Purchase Order / Factory Reorder Sheet"
          >
            <Factory className="size-4 text-neutral-500" />
            <span>Purchase Order (PO)</span>
          </button>

          {/* Rapid Stocktake / Audit Mode Button */}
          <button
            type="button"
            onClick={() => {
              setShowStocktakeModal(true);
              setStocktakeFeedback(null);
            }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 shadow-2xs transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Open Rapid Barcode Stocktaking & Physical Audit Station"
          >
            <Barcode className="size-4 text-emerald-700" />
            <span>Stocktake Audit</span>
          </button>

          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={inventoryColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />

          {/* Export to CSV Button */}
          <a
            href={`/api/admin/inventory/export?q=${encodeURIComponent(currentFilters.q)}&filter=${currentFilters.filter}`}
            download
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
            title="Export filtered inventory to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          {/* Intelligence Dashboard Link */}
          <Link
            href="/admin/inventory-intelligence"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-3.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            <span>Intelligence</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Active Filters Summary ── */}
      {(currentFilters.q || currentFilters.filter !== "all") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active filters:</span>
          {currentFilters.q && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-[#101114]/15 bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]">
              Search: “{currentFilters.q}”
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[#101114]/60 hover:text-[#101114]"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {currentFilters.filter !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-xs border border-[#101114]/15 bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]">
              Filter: {currentFilters.filter}
              <button
                type="button"
                onClick={() => updateQuery({ filter: "all" })}
                className="text-[#101114]/60 hover:text-[#101114]"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => updateQuery({ q: null, filter: "all" })}
            className="text-xs font-semibold text-[#101114] underline hover:text-[#101114]/70"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Meta Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <p>
          Showing <strong className="text-neutral-900">{loadedVariants.length}</strong> of{" "}
          <strong className="text-neutral-900">{initialData.total}</strong>{" "}
          {initialData.total === 1 ? "variant" : "variants"}
        </p>
      </div>

      {/* ── 3. Inventory Table ── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-4 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select all inventory items"
                className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
              />
            </TableHead>
            <TableHead>Product & Variant</TableHead>
            {visibleColumns.sku && <TableHead>SKU</TableHead>}
            {visibleColumns.physical && <TableHead className="text-center">Physical</TableHead>}
            {visibleColumns.reserved && <TableHead className="text-center">Reserved</TableHead>}
            {visibleColumns.available && <TableHead className="text-center">Available</TableHead>}
            {visibleColumns.pricing && <TableHead>Pricing (Cost / Sell)</TableHead>}
            {visibleColumns.health && <TableHead>Stock Health</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadedVariants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumnCount} className="px-5 py-12 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                  <Boxes className="size-8 text-[#101114]/30" />
                  <p className="text-sm font-semibold text-[#101114]">
                    No inventory items match your search
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Try searching for a different SKU, variant attribute, or clear active filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => updateQuery({ q: null, filter: "all" })}
                    className="mt-2 inline-flex h-8 items-center rounded-sm bg-[#101114] px-3 font-semibold text-white hover:bg-[#101114]/85"
                  >
                    Clear all filters
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            loadedVariants.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isNegative = item.totalStock < 0 || item.available < 0;
              const isOutOfStock = item.available <= 0 && !isNegative;
              const isLowStock = item.available > 0 && item.available <= 5;

              return (
                <TableRow
                  key={item.id}
                  className={
                    isSelected
                      ? "bg-[#F3F0E8]/70"
                      : isNegative
                        ? "bg-red-50/50 hover:bg-red-50"
                        : undefined
                  }
                >
                  {/* Checkbox */}
                  <TableCell className="w-10 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      aria-label={`Select ${item.sku}`}
                      className="size-4 cursor-pointer rounded-xs border-[#101114]/30 accent-[#101114]"
                    />
                  </TableCell>

                  {/* Product & Variant Attributes */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Thumbnail with Hover Zoom */}
                      <div className="group/thumb relative size-11 shrink-0">
                        <div className="relative size-11 overflow-hidden rounded-sm border border-[#101114]/15 bg-[#F2F2F2]">
                          {item.primaryImage ? (
                            <Image
                              src={item.primaryImage}
                              alt={item.product.name}
                              fill
                              sizes="44px"
                              loading="lazy"
                              className="object-cover object-center"
                              unoptimized={item.primaryImage.startsWith("blob:")}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-[#101114]/25">
                              <ImageOff className="size-4" />
                            </div>
                          )}
                        </div>

                        {/* Hover preview card */}
                        {item.primaryImage && (
                          <div className="pointer-events-none absolute top-0 left-13 z-50 hidden w-48 rounded-sm border border-[#101114]/20 bg-white p-2 shadow-2xl group-hover/thumb:block">
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xs bg-[#F2F2F2]">
                              <Image
                                src={item.primaryImage}
                                alt={item.product.name}
                                fill
                                sizes="192px"
                                loading="lazy"
                                className="object-cover object-center"
                              />
                            </div>
                            <p className="mt-1.5 truncate text-xs font-semibold text-[#101114]">
                              {item.product.name}
                            </p>
                            <p className="font-mono text-[10px] text-[#101114]/60">{item.sku}</p>
                          </div>
                        )}
                      </div>

                      {/* Product Title & Variant Badge */}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/inventory/${item.id}`}
                          className="font-semibold text-[#101114] hover:underline"
                        >
                          {item.product.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-2xs py-0.2 inline-flex items-center border border-[#101114]/15 bg-[#FBF9F5] px-1.5 text-[10px] font-semibold text-[#101114]">
                            {[
                              item.size ? `Size: ${item.size}` : null,
                              item.color ? `Color: ${item.color}` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "Default"}
                          </span>
                          {item.product.slug && (
                            <span className="font-mono text-[10px] text-[#101114]/50">
                              /{item.product.slug}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* SKU with 1-click copy */}
                  {visibleColumns.sku && (
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[#101114]">
                        <span>{item.sku}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySku(item.sku)}
                          className="rounded p-1 text-[#101114]/40 hover:bg-[#101114]/10 hover:text-[#101114]"
                          title="Copy SKU to clipboard"
                        >
                          {copiedSku === item.sku ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  )}

                  {/* Physical Stock */}
                  {visibleColumns.physical && (
                    <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                      <span className={item.totalStock < 0 ? "text-red-700" : "text-[#101114]"}>
                        {item.totalStock}
                      </span>
                    </TableCell>
                  )}

                  {/* Reserved Stock */}
                  {visibleColumns.reserved && (
                    <TableCell className="text-center font-mono text-xs tabular-nums">
                      {item.reserved > 0 ? (
                        <span className="rounded-2xs inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                          <Lock className="size-2.5" />
                          {item.reserved}
                        </span>
                      ) : (
                        <span className="text-[#101114]/40">0</span>
                      )}
                    </TableCell>
                  )}

                  {/* Available Stock */}
                  {visibleColumns.available && (
                    <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                      <span
                        className={
                          isNegative
                            ? "font-extrabold text-red-700"
                            : isOutOfStock
                              ? "text-red-600"
                              : isLowStock
                                ? "font-extrabold text-amber-700"
                                : "font-extrabold text-emerald-700"
                        }
                      >
                        {item.available}
                      </span>
                    </TableCell>
                  )}

                  {/* Pricing (Cost / Selling) */}
                  {visibleColumns.pricing && (
                    <TableCell className="text-xs tabular-nums">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#101114]">
                          {formatCurrency(item.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-[#101114]/50">
                          Cost: {formatCurrency(item.costPrice)}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Stock Health Status */}
                  {visibleColumns.health && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isLowStock ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                          </span>
                        ) : (
                          <span
                            className={`size-2 rounded-full ${
                              isNegative
                                ? "bg-red-700"
                                : isOutOfStock
                                  ? "bg-red-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            isNegative
                              ? "text-red-800"
                              : isOutOfStock
                                ? "text-red-700"
                                : isLowStock
                                  ? "text-amber-800"
                                  : "text-emerald-800"
                          }`}
                        >
                          {isNegative
                            ? "Negative Stock"
                            : isOutOfStock
                              ? "Out of Stock"
                              : isLowStock
                                ? "Low Stock"
                                : "In Stock"}
                        </span>
                        {isLowStock && (
                          <span className="rounded-2xs py-0.2 bg-amber-100 px-1 text-[9px] font-extrabold text-amber-800">
                            REORDER
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Quick Adjust Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                        title="Quick adjust stock for this variant"
                      >
                        <Plus className="size-3 text-emerald-600" />
                        <Minus className="-ml-1 size-3 text-red-600" />
                        <span>Adjust</span>
                      </button>

                      {/* Print Tag Button */}
                      <button
                        type="button"
                        onClick={() => setBarcodeModalItems([item])}
                        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                        title="Print barcode price tag for this variant"
                      >
                        <Printer className="size-3.5" />
                      </button>

                      {/* Add to PO / Reorder Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPoInitialItems([item]);
                          setShowPoModal(true);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2 text-xs font-semibold text-[#101114]/80 shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                        title="Add variant to Supplier Purchase Order / Reorder Sheet"
                      >
                        <Factory className="size-3.5 text-amber-700" />
                      </button>

                      {/* History Link */}
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="inline-flex h-8 items-center rounded-sm border border-[#101114]/20 bg-white px-2 text-xs text-[#101114]/70 shadow-2xs transition-colors hover:bg-[#F3F0E8] hover:text-[#101114]"
                        title="View complete transaction audit history"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── 4. Infinite Scroll Sentinel & Load More Controls ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={loadedVariants.length}
        totalCount={initialData.total}
        itemName="inventory variants"
      />

      {/* ── 5. Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-sm border border-white/15 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md duration-200 sm:gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
              {selectedIds.size}
            </span>
            <span className="hidden sm:inline">selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Bulk Restock Button */}
          <button
            type="button"
            disabled={isSubmittingBulkAdjust}
            onClick={() => setShowBulkAdjustModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            title="Bulk adjust or restock selected variants"
          >
            <Plus className="size-3.5" />
            <span>Bulk Restock</span>
          </button>

          {/* Bulk Print Barcode Tags */}
          <button
            type="button"
            disabled={isSubmittingBulkAdjust}
            onClick={() => {
              const selected = loadedVariants.filter((v) => selectedIds.has(v.id));
              setBarcodeModalItems(selected);
              setBarcodeItemOverrides({});
              setShowVariantTuning(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Print barcode tags for selected items"
          >
            <Printer className="size-3.5" />
            <span>Print Tags</span>
          </button>

          {/* Bulk Create Purchase Order (PO) */}
          <button
            type="button"
            disabled={isSubmittingBulkAdjust}
            onClick={() => {
              const selected = loadedVariants.filter((v) => selectedIds.has(v.id));
              setPoInitialItems(selected);
              setShowPoModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xs bg-white/10 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Create Supplier Purchase Order for selected variants"
          >
            <Factory className="size-3.5" />
            <span>Create PO ({selectedIds.size})</span>
          </button>

          <div className="h-4 w-px bg-white/20" />

          {/* Deselect All */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-white/60 transition-colors hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── 6. Quick Stock Adjust Modal ── */}
      {adjustingItem && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
          <div className="w-full max-w-lg rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Quick Stock Adjust: {adjustingItem.sku}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-5">
              {/* Product Info Snapshot */}
              <div className="flex items-center gap-3 rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-3">
                {adjustingItem.primaryImage ? (
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xs border border-[#101114]/15 bg-white">
                    <Image
                      src={adjustingItem.primaryImage}
                      alt={adjustingItem.product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#101114]">
                    {adjustingItem.product.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#101114]/60">
                    {adjustingItem.sku} •{" "}
                    {[
                      adjustingItem.size ? `Size: ${adjustingItem.size}` : null,
                      adjustingItem.color ? `Color: ${adjustingItem.color}` : null,
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
                  <p className="text-base font-bold text-[#101114]">{adjustingItem.totalStock}</p>
                </div>
                <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                  <p className="text-[10px] font-semibold text-[#101114]/60 uppercase">Reserved</p>
                  <p className="text-base font-bold text-amber-800">{adjustingItem.reserved}</p>
                </div>
                <div className="rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                  <p className="text-[10px] font-semibold text-[#101114]/60 uppercase">Available</p>
                  <p className="text-base font-bold text-emerald-800">{adjustingItem.available}</p>
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
                  const projectedTotal = adjustingItem.totalStock + q;
                  const projectedAvail = projectedTotal - adjustingItem.reserved;
                  const isViolation = projectedTotal < adjustingItem.reserved;

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
                          {adjustingItem.totalStock} → {projectedTotal}
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
                onClick={() => setAdjustingItem(null)}
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
      )}

      {/* ── 7. Bulk Stock Adjust Modal ── */}
      {showBulkAdjustModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
          <div className="w-full max-w-md rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-[#101114]">
                Bulk Restock ({selectedIds.size} variants selected)
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkAdjustModal(false)}
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
                onClick={() => setShowBulkAdjustModal(false)}
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
      )}

      {/* ── 8. Barcode & Price Tag Printing Modal ── */}
      {barcodeModalItems && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs duration-150">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-sm border border-[#101114]/20 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#101114]/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-[#101114]" />
                <h3 className="text-sm font-semibold text-[#101114]">
                  Print Barcodes & Price Tags ({barcodeModalItems.length}{" "}
                  {barcodeModalItems.length === 1 ? "variant" : "variants"})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeModalItems(null)}
                className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Settings Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 bg-[#FBF9F5] px-5 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Format:</span>
                  <select
                    value={barcodeLabelSize}
                    onChange={(e) =>
                      setBarcodeLabelSize(e.target.value as "standard" | "compact" | "sheet")
                    }
                    className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="standard">50mm × 30mm (Thermal Roll)</option>
                    <option value="compact">40mm × 25mm (Compact Tag)</option>
                    <option value="sheet">A4 Sheet (24 Grid)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#101114]/70">Quantity:</span>
                  <select
                    value={barcodeQuantityMode}
                    onChange={(e) => {
                      setBarcodeQuantityMode(
                        e.target.value as "one-per-variant" | "by-stock" | "custom"
                      );
                      setBarcodeItemOverrides({});
                    }}
                    className="h-8 rounded-sm border border-[#101114]/20 bg-white px-2 font-medium text-[#101114]"
                  >
                    <option value="one-per-variant">1 Label per Variant</option>
                    <option value="by-stock">Match Available Stock</option>
                    <option value="custom">Custom Quantity</option>
                  </select>
                </div>

                {/* Custom Quantity Stepper & Presets */}
                {barcodeQuantityMode === "custom" && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-2 py-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-[#101114]/70">Copies:</span>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setBarcodeCustomQuantity((prev) => Math.max(1, prev - 1))}
                        className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                        title="Decrease"
                      >
                        <Minus className="size-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={barcodeCustomQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setBarcodeCustomQuantity(Math.min(500, val));
                          }
                        }}
                        className="h-6 w-12 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setBarcodeCustomQuantity((prev) => Math.min(500, prev + 1))}
                        className="flex size-6 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/15"
                        title="Increase"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 border-l border-[#101114]/10 pl-1">
                      {[1, 2, 5, 10, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBarcodeCustomQuantity(preset)}
                          className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                            barcodeCustomQuantity === preset
                              ? "bg-[#101114] text-white"
                              : "bg-[#F3F0E8] text-[#101114]/80 hover:bg-[#101114]/15"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total & Print Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-sm bg-[#101114]/5 px-2.5 py-1 text-xs">
                  <span className="text-[#101114]/60">Total:</span>
                  <span className="font-bold text-[#101114]">
                    {barcodeModalItems.reduce((acc, item) => {
                      if (barcodeItemOverrides[item.id] !== undefined) {
                        return acc + Math.max(1, barcodeItemOverrides[item.id]);
                      }
                      if (barcodeQuantityMode === "by-stock") {
                        return acc + Math.max(1, item.available > 0 ? item.available : 1);
                      }
                      if (barcodeQuantityMode === "custom") {
                        return acc + Math.max(1, barcodeCustomQuantity);
                      }
                      return acc + 1;
                    }, 0)}
                  </span>
                  <span className="text-[#101114]/60">Labels</span>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#101114] px-4 font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85"
                >
                  <Printer className="size-3.5" />
                  <span>Print Labels Now</span>
                </button>
              </div>
            </div>

            {/* Individual Variant Fine-Tuning Drawer */}
            {barcodeModalItems.length > 1 && (
              <div className="border-b border-[#101114]/10 bg-white px-5 py-2">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setShowVariantTuning(!showVariantTuning)}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#101114] hover:underline"
                  >
                    <span>
                      {showVariantTuning ? "▲ Hide" : "▼ Fine-tune"} quantities by variant (
                      {barcodeModalItems.length})
                    </span>
                  </button>
                  {Object.keys(barcodeItemOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBarcodeItemOverrides({})}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Reset variant overrides
                    </button>
                  )}
                </div>

                {showVariantTuning && (
                  <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-sm border border-[#101114]/10 bg-[#FBF9F5] p-2">
                    {barcodeModalItems.map((item) => {
                      const count =
                        barcodeItemOverrides[item.id] !== undefined
                          ? barcodeItemOverrides[item.id]
                          : barcodeQuantityMode === "by-stock"
                            ? Math.max(1, item.available > 0 ? item.available : 1)
                            : barcodeQuantityMode === "custom"
                              ? barcodeCustomQuantity
                              : 1;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xs border border-[#101114]/5 bg-white px-2.5 py-1 text-xs"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-[#101114]">
                              {item.product.name}
                            </span>
                            <span className="ml-2 font-mono text-[10px] text-[#101114]/60">
                              {item.sku}
                            </span>
                            <span className="ml-2 text-[10px] text-[#101114]/50">
                              {[
                                item.size ? `Size: ${item.size}` : null,
                                item.color ? `Color: ${item.color}` : null,
                              ]
                                .filter(Boolean)
                                .join(" • ") || "Default"}
                            </span>
                            <span className="ml-2 text-[10px] text-zinc-400">
                              (Stock: {item.available})
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setBarcodeItemOverrides((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(1, count - 1),
                                }))
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                            >
                              <Minus className="size-2.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val > 0) {
                                  setBarcodeItemOverrides((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(500, val),
                                  }));
                                }
                              }}
                              className="h-5 w-10 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setBarcodeItemOverrides((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(500, count + 1),
                                }))
                              }
                              className="flex size-5 items-center justify-center rounded-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                            >
                              <Plus className="size-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Tag Preview Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div
                id="vibelock-inventory-printable-labels"
                className="flex flex-wrap justify-center gap-3"
              >
                {barcodeModalItems.flatMap((item) => {
                  const count =
                    barcodeItemOverrides[item.id] !== undefined
                      ? barcodeItemOverrides[item.id]
                      : barcodeQuantityMode === "by-stock"
                        ? Math.max(1, item.available > 0 ? item.available : 1)
                        : barcodeQuantityMode === "custom"
                          ? barcodeCustomQuantity
                          : 1;

                  return Array.from({ length: count }, (_, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`vibelock-inventory-label-card relative flex flex-col justify-between rounded-sm border border-dashed border-[#101114]/30 bg-white p-2 text-center text-[#101114] shadow-xs ${
                        barcodeLabelSize === "compact"
                          ? "h-[25mm] w-[40mm]"
                          : barcodeLabelSize === "sheet"
                            ? "h-[30mm] w-[48mm]"
                            : "h-[30mm] w-[50mm]"
                      }`}
                    >
                      {count > 1 && (
                        <span className="no-print absolute top-1 right-1 font-mono text-[8px] text-[#101114]/40">
                          #{idx + 1}
                        </span>
                      )}
                      <div className="border-b border-[#101114]/15 pb-0.5">
                        <span className="text-[9px] font-extrabold tracking-widest uppercase">
                          VIBELOCK
                        </span>
                      </div>
                      <p className="truncate px-0.5 text-[10px] leading-tight font-semibold">
                        {item.product.name}
                      </p>
                      <div className="flex items-center justify-between px-1 font-mono text-[9px]">
                        <span>{item.size ? `SIZE: ${item.size}` : ""}</span>
                        <span className="text-[11px] font-bold">
                          ৳{item.discountPrice ?? item.sellingPrice}
                        </span>
                      </div>
                      <div className="px-1 py-0.5">
                        <BarcodeSvg value={item.sku} height={20} />
                        <p className="font-mono text-[8px] tracking-wider text-[#101114]/80">
                          {item.sku}
                        </p>
                      </div>
                    </div>
                  ));
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#101114]/10 bg-white px-5 py-2.5 text-xs text-[#101114]/60">
              <span>
                Previewing labels before printing. Press Print Labels Now to send to printer.
              </span>
              <button
                type="button"
                onClick={() => setBarcodeModalItems(null)}
                className="font-semibold text-[#101114] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Rapid Barcode Stocktake & Physical Audit Modal ── */}
      {showStocktakeModal && (
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
                  onClick={() => setShowStocktakeModal(false)}
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
                    {loadedVariants.map((v) => (
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
                  onClick={() => setShowStocktakeModal(false)}
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
      )}

      {/* ── 9. Barcode Scanner Auto-Detection Toast Indicator ── */}
      {scannedIndicator && (
        <div className="animate-in slide-in-from-top-3 fade-in fixed top-6 right-6 z-50 flex items-center gap-2 rounded-sm border border-[#00D9FF]/40 bg-[#101114] px-4 py-2.5 text-xs text-white shadow-2xl duration-200">
          <span className="flex size-2 animate-ping rounded-full bg-[#00D9FF]" />
          <span className="font-semibold text-[#00D9FF]">⚡ Scanner Active:</span>
          <span>{scannedIndicator}</span>
        </div>
      )}

      {/* ── Supplier Purchase Order (PO) & Reorder Sheet Modal ── */}
      <AdminInventoryPoModal
        key={poInitialItems.map((i) => i.id).join(",") || "po-modal"}
        isOpen={showPoModal}
        onClose={() => setShowPoModal(false)}
        initialItems={poInitialItems}
        availableVariants={loadedVariants}
      />

      {/* ── Print Stylesheet for Labels ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #vibelock-inventory-printable-labels,
          #vibelock-inventory-printable-labels * {
            visibility: visible !important;
          }
          #vibelock-inventory-printable-labels {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 3mm !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            justify-content: flex-start !important;
            z-index: 999999 !important;
          }
          .vibelock-inventory-label-card {
            border: 1px solid #101114 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 2mm;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
