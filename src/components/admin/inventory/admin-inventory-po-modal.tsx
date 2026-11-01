"use client";

import {
  getReorderSuggestionsAction,
  type ReorderSuggestionItem,
} from "@/lib/admin/inventory/inventory-actions";
import type { AdminInventoryItem } from "@/lib/admin/inventory/inventory-queries";
import {
  Calendar,
  Check,
  Copy,
  Factory,
  FileSpreadsheet,
  MessageSquare,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

function currency(val: number) {
  return `৳${Number(val || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const DEFAULT_SUPPLIERS = [
  "Apex Knitting & Dyeing Mills",
  "Ha-Meem Fabrics & Garments Ltd",
  "VibeLock Central Manufacturing",
  "Standard Apparel Workshop",
  "In-House Custom Sampling Studio",
];

export interface PoOrderItem {
  id: string;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  primaryImage: string | null;
  currentStock: number;
  available: number;
  costPrice: number;
  orderQuantity: number;
  unitCost: number;
}

export interface AdminInventoryPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: AdminInventoryItem[];
  availableVariants?: AdminInventoryItem[];
}

export function AdminInventoryPoModal({
  isOpen,
  onClose,
  initialItems = [],
  availableVariants = [],
}: AdminInventoryPoModalProps) {
  // PO Meta State
  const [poNumber, setPoNumber] = React.useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${today}-${rand}`;
  });

  const [supplierName, setSupplierName] = React.useState<string>(DEFAULT_SUPPLIERS[0]);
  const [orderDate, setOrderDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [deliveryDeadline, setDeliveryDeadline] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21); // Default 3 weeks production cycle
    return d.toISOString().slice(0, 10);
  });
  const [targetBuffer, setTargetBuffer] = React.useState<number>(30);
  const [productionNotes, setProductionNotes] = React.useState<string>(
    "Export standard high-density stitching, pre-shrunk combed cotton (260-280 GSM), custom brand neck labels, individual polybag packaging."
  );

  // Items in current PO initialized with initialItems
  const [poItems, setPoItems] = React.useState<PoOrderItem[]>(() =>
    initialItems.map((v) => ({
      id: v.id,
      sku: v.sku,
      productName: v.product.name,
      size: v.size,
      color: v.color,
      primaryImage: v.primaryImage,
      currentStock: v.totalStock,
      available: v.available,
      costPrice: v.costPrice,
      orderQuantity: Math.max(1, 30 - v.available),
      unitCost: v.costPrice,
    }))
  );
  const [isLoadingAutoFill, setIsLoadingAutoFill] = React.useState(false);
  const [autoFillFeedback, setAutoFillFeedback] = React.useState<string | null>(null);

  // Search to add manual variants
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Clipboard memo states
  const [copiedMemo, setCopiedMemo] = React.useState(false);
  const [copiedPoNumber, setCopiedPoNumber] = React.useState(false);

  // Aggregate Calculations
  const totalPieces = poItems.reduce((acc, it) => acc + (it.orderQuantity || 0), 0);
  const totalCost = poItems.reduce(
    (acc, it) => acc + (it.orderQuantity || 0) * (it.unitCost || 0),
    0
  );
  const avgCostPerPiece = totalPieces > 0 ? totalCost / totalPieces : 0;

  // Auto-fill low & out-of-stock items across catalog
  const handleAutoFill = async (threshold = 5) => {
    setIsLoadingAutoFill(true);
    setAutoFillFeedback(null);
    try {
      const res = await getReorderSuggestionsAction(threshold);
      if (res.error) {
        setAutoFillFeedback(`Error: ${res.error}`);
      } else if (res.items.length === 0) {
        setAutoFillFeedback("All variants have healthy stock levels above threshold.");
      } else {
        const existingIds = new Set(poItems.map((i) => i.id));
        const newItems: PoOrderItem[] = [];

        res.items.forEach((item: ReorderSuggestionItem) => {
          if (!existingIds.has(item.id)) {
            newItems.push({
              id: item.id,
              sku: item.sku,
              productName: item.productName,
              size: item.size,
              color: item.color,
              primaryImage: item.primaryImage,
              currentStock: item.totalStock,
              available: item.available,
              costPrice: item.costPrice,
              orderQuantity: Math.max(1, targetBuffer - item.available),
              unitCost: item.costPrice,
            });
          }
        });

        if (newItems.length > 0) {
          setPoItems((prev) => [...prev, ...newItems]);
          setAutoFillFeedback(`Added ${newItems.length} low/out-of-stock variant(s) to order.`);
        } else {
          setAutoFillFeedback("All suggested low stock variants are already in this PO.");
        }
      }
    } catch {
      setAutoFillFeedback("Could not load reorder suggestions.");
    } finally {
      setIsLoadingAutoFill(false);
      setTimeout(() => setAutoFillFeedback(null), 4000);
    }
  };

  // Add individual variant from search
  const handleAddVariant = (v: AdminInventoryItem) => {
    if (poItems.some((i) => i.id === v.id)) return;
    const newItem: PoOrderItem = {
      id: v.id,
      sku: v.sku,
      productName: v.product.name,
      size: v.size,
      color: v.color,
      primaryImage: v.primaryImage,
      currentStock: v.totalStock,
      available: v.available,
      costPrice: v.costPrice,
      orderQuantity: Math.max(1, targetBuffer - v.available),
      unitCost: v.costPrice,
    };
    setPoItems((prev) => [newItem, ...prev]);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  // Item Update Handlers
  const handleUpdateQty = (id: string, qty: number) => {
    const cleanQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setPoItems((prev) => prev.map((i) => (i.id === id ? { ...i, orderQuantity: cleanQty } : i)));
  };

  const handleUpdateUnitCost = (id: string, cost: number) => {
    const cleanCost = Math.max(0, isNaN(cost) ? 0 : cost);
    setPoItems((prev) => prev.map((i) => (i.id === id ? { ...i, unitCost: cleanCost } : i)));
  };

  const handleRemoveItem = (id: string) => {
    setPoItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      "PO Number",
      "Supplier Name",
      "Order Date",
      "Delivery Deadline",
      "SKU",
      "Product Name",
      "Size",
      "Color",
      "Current Available",
      "Order Quantity (Pcs)",
      "Unit Cost (BDT)",
      "Line Total (BDT)",
      "Production Notes",
    ];

    const rows = poItems.map((item) => [
      poNumber,
      supplierName,
      orderDate,
      deliveryDeadline,
      item.sku,
      item.productName,
      item.size || "Standard",
      item.color || "Standard",
      item.available,
      item.orderQuantity,
      item.unitCost,
      item.orderQuantity * item.unitCost,
      // Defend against formula injection
      productionNotes.replace(/^[=+\-@\t\r]/, "'$&"),
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
      `Purchase-Order-${poNumber}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy WhatsApp / Email plain-text memo
  const handleCopyMemo = () => {
    const lines = [
      `📋 *VIBELOCK PURCHASE ORDER: ${poNumber}*`,
      `🏢 Supplier: ${supplierName}`,
      `📅 Order Date: ${orderDate}`,
      `⏳ Expected Delivery: ${deliveryDeadline}`,
      `------------------------------------------`,
      `*ORDER ITEMS (${poItems.length} styles, ${totalPieces} pcs):*`,
      ...poItems.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} (${it.sku})\n   Size: ${it.size || "Std"} | Color: ${it.color || "Std"} | Qty: *${it.orderQuantity} pcs* | Rate: ৳${it.unitCost} | Total: ৳${it.orderQuantity * it.unitCost}`
      ),
      `------------------------------------------`,
      `👕 *TOTAL GARMENTS:* ${totalPieces} pcs`,
      `💰 *ESTIMATED TOTAL COST:* ৳${totalCost.toLocaleString("en-BD")}`,
      `📝 *Notes:* ${productionNotes}`,
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  // Filtered variants for manual addition
  const filteredSearchVariants = searchQuery.trim()
    ? availableVariants
        .filter(
          (v) =>
            v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-xs sm:p-4">
      <div className="animate-in fade-in-0 zoom-in-95 relative flex max-h-[94vh] w-full max-w-5xl flex-col rounded-md border border-[#101114]/15 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-sm bg-[#101114] text-white">
              <Factory className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#101114]">
                  Supplier Purchase Order (PO) & Reorder Sheet
                </h2>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="rounded-xs border border-[#101114]/15 bg-[#F3F0E8] px-2 py-0.5 font-mono text-xs font-semibold text-[#101114] outline-none"
                  title="Click to edit PO Number"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(poNumber);
                    setCopiedPoNumber(true);
                    setTimeout(() => setCopiedPoNumber(false), 2000);
                  }}
                  className="text-[#101114]/50 hover:text-[#101114]"
                  title="Copy PO Number"
                >
                  {copiedPoNumber ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
              <p className="text-xs text-[#101114]/60">
                Generate, review, and print apparel manufacturing work orders for factory
                replenishment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[#101114]/40 hover:text-[#101114]"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Supplier & Meta Parameters Form */}
          <div className="grid gap-4 rounded-md border border-[#101114]/10 bg-[#FBF9F5] p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            {/* Supplier / Factory */}
            <div className="space-y-1">
              <label className="font-semibold text-[#101114]">Supplier / Factory Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-8 w-full rounded-xs border border-[#101114]/20 bg-white px-2.5 font-medium text-[#101114] outline-none"
                  placeholder="Enter or select factory"
                />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {DEFAULT_SUPPLIERS.slice(0, 2).map((sup) => (
                  <button
                    key={sup}
                    type="button"
                    onClick={() => setSupplierName(sup)}
                    className="rounded-2xs py-0.2 max-w-[140px] truncate bg-[#F3F0E8] px-1.5 text-[10px] text-[#101114]/70 hover:bg-[#101114]/10"
                  >
                    {sup.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Date */}
            <div className="space-y-1">
              <label className="font-semibold text-[#101114]">Order Issue Date</label>
              <div className="flex h-8 items-center gap-1.5 rounded-xs border border-[#101114]/20 bg-white px-2">
                <Calendar className="size-3.5 text-[#101114]/50" />
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#101114] outline-none"
                />
              </div>
            </div>

            {/* Delivery Deadline */}
            <div className="space-y-1">
              <label className="font-semibold text-[#101114]">Delivery Deadline</label>
              <div className="flex h-8 items-center gap-1.5 rounded-xs border border-[#101114]/20 bg-white px-2">
                <Calendar className="size-3.5 text-amber-600" />
                <input
                  type="date"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#101114] outline-none"
                />
              </div>
            </div>

            {/* Target Stock Buffer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#101114]">Target Par Stock Buffer</label>
                <span className="font-mono text-[11px] font-bold text-[#101114]">
                  {targetBuffer} pcs
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[10, 20, 30, 50, 100].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setTargetBuffer(level)}
                    className={`flex-1 rounded-xs py-1 text-center text-[10px] font-bold transition-colors ${
                      targetBuffer === level
                        ? "bg-[#101114] text-white"
                        : "border border-[#101114]/15 bg-white text-[#101114] hover:bg-[#F3F0E8]"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Production Specifications */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <label className="font-semibold text-[#101114]">
                Production & Quality Specifications
              </label>
              <input
                type="text"
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                className="h-8 w-full rounded-xs border border-[#101114]/20 bg-white px-2.5 text-xs text-[#101114] outline-none"
                placeholder="Stitching requirements, GSM, wash notes, packaging requirements..."
              />
            </div>
          </div>

          {/* Action Strip: Auto-fill & Search Variant */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-fill Low & Out-of-Stock */}
              <button
                type="button"
                onClick={() => handleAutoFill(5)}
                disabled={isLoadingAutoFill}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-800 disabled:opacity-50"
              >
                <Sparkles className="size-3.5" />
                <span>
                  {isLoadingAutoFill ? "Scanning Catalog..." : "⚡ Auto-fill Low & Out-of-Stock"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoFill(0)}
                disabled={isLoadingAutoFill}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <span>Out-of-Stock Only</span>
              </button>

              {poItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPoItems([])}
                  className="inline-flex h-9 items-center gap-1 rounded-sm border border-[#101114]/20 bg-white px-2.5 text-xs font-medium text-[#101114]/70 hover:text-red-700"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Manual Variant Search & Add */}
            <div className="relative min-w-[260px]">
              <div className="flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-2.5 shadow-2xs">
                <Search className="size-3.5 text-[#101114]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search SKU or style to add..."
                  className="w-full text-xs text-[#101114] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="text-[#101114]/40 hover:text-[#101114]"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && filteredSearchVariants.length > 0 && (
                <div className="absolute top-10 right-0 left-0 z-50 max-h-56 overflow-y-auto rounded-sm border border-[#101114]/15 bg-white p-1 shadow-lg">
                  {filteredSearchVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleAddVariant(v)}
                      className="flex w-full items-center justify-between gap-2 rounded-xs px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#F3F0E8]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#101114]">{v.product.name}</p>
                        <p className="font-mono text-[10px] text-[#101114]/60">
                          {v.sku} • {[v.size, v.color].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-amber-700">
                        Stock: {v.available}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {autoFillFeedback && (
            <div className="rounded-xs border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              {autoFillFeedback}
            </div>
          )}

          {/* Items Breakdown Table */}
          <div className="overflow-hidden rounded-md border border-[#101114]/10 bg-white shadow-2xs">
            {poItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Factory className="size-9 text-[#101114]/25" />
                <h3 className="mt-3 text-sm font-bold text-[#101114]">No Garment Variants in PO</h3>
                <p className="mt-1 max-w-sm text-xs text-[#101114]/60">
                  Click <strong>&quot;⚡ Auto-fill Low &amp; Out-of-Stock&quot;</strong> to
                  automatically pull variants needing restock, or search by SKU above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#101114]/10 bg-[#F3F0E8]/50 text-[11px] font-semibold text-[#101114]/70">
                    <tr>
                      <th className="py-3 pr-2 pl-4">Garment Style</th>
                      <th className="px-2 py-3">Attributes</th>
                      <th className="px-2 py-3 text-center">Available Stock</th>
                      <th className="px-2 py-3 text-center">Order Qty (Pcs)</th>
                      <th className="px-2 py-3 text-right">Unit Rate (৳)</th>
                      <th className="px-2 py-3 text-right">Line Total</th>
                      <th className="py-3 pr-4 pl-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#101114]/5">
                    {poItems.map((item) => {
                      const lineTotal = (item.orderQuantity || 0) * (item.unitCost || 0);
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-[#F3F0E8]/30">
                          {/* Garment Style */}
                          <td className="py-2.5 pr-2 pl-4">
                            <div className="flex items-center gap-2.5">
                              <div className="relative size-10 shrink-0 overflow-hidden rounded-xs border border-[#101114]/10 bg-[#F3F0E8]">
                                {item.primaryImage ? (
                                  <Image
                                    src={item.primaryImage}
                                    alt={item.productName}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-[#101114]/30">
                                    <Package className="size-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#101114]">
                                  {item.productName}
                                </p>
                                <p className="font-mono text-[10px] text-[#101114]/60">
                                  {item.sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Attributes */}
                          <td className="px-2 py-2.5">
                            <span className="rounded-2xs inline-flex items-center border border-[#101114]/15 bg-[#FBF9F5] px-1.5 py-0.5 text-[10px] font-medium text-[#101114]">
                              {[
                                item.size ? `Size: ${item.size}` : null,
                                item.color ? `Color: ${item.color}` : null,
                              ]
                                .filter(Boolean)
                                .join(" • ") || "Default"}
                            </span>
                          </td>

                          {/* Available Stock */}
                          <td className="px-2 py-2.5 text-center">
                            <span
                              className={`font-mono text-xs font-bold ${
                                item.available <= 0
                                  ? "text-rose-700"
                                  : item.available <= 5
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                              }`}
                            >
                              {item.available}
                            </span>
                          </td>

                          {/* Order Quantity Stepper */}
                          <td className="px-2 py-2.5 text-center">
                            <div className="inline-flex items-center rounded-xs border border-[#101114]/20 bg-white">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.orderQuantity - 1)}
                                className="flex size-7 items-center justify-center rounded-l-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                              >
                                <Minus className="size-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={item.orderQuantity}
                                onChange={(e) =>
                                  handleUpdateQty(item.id, parseInt(e.target.value, 10))
                                }
                                className="h-7 w-14 text-center font-mono text-xs font-bold text-[#101114] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.orderQuantity + 1)}
                                className="flex size-7 items-center justify-center rounded-r-xs bg-[#F3F0E8] text-[#101114] hover:bg-[#101114]/15"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          </td>

                          {/* Unit Rate (BDT) */}
                          <td className="px-2 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-[10px] text-[#101114]/50">৳</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateUnitCost(item.id, parseFloat(e.target.value))
                                }
                                className="h-7 w-16 rounded-xs border border-[#101114]/20 bg-white px-1.5 text-right font-mono text-xs font-semibold text-[#101114] outline-none"
                              />
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="px-2 py-2.5 text-right">
                            <span className="font-mono text-xs font-bold text-[#101114]">
                              {currency(lineTotal)}
                            </span>
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 pr-4 pl-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded p-1 text-[#101114]/40 hover:bg-red-50 hover:text-red-700"
                              title="Remove item"
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

          {/* Real-time Order Financial Summary */}
          {poItems.length > 0 && (
            <div className="grid gap-4 rounded-md border border-[#101114]/10 bg-[#FBF9F5] p-4 sm:grid-cols-4">
              <div>
                <span className="text-xs text-[#101114]/60">Total Styles / SKUs:</span>
                <p className="mt-0.5 text-lg font-black text-[#101114]">{poItems.length} items</p>
              </div>
              <div>
                <span className="text-xs text-[#101114]/60">Total Garments to Produce:</span>
                <p className="mt-0.5 text-lg font-black text-emerald-800">{totalPieces} pcs</p>
              </div>
              <div>
                <span className="text-xs text-[#101114]/60">Avg. Rate per Piece:</span>
                <p className="mt-0.5 text-lg font-black text-[#101114]">
                  {currency(avgCostPerPiece)}
                </p>
              </div>
              <div>
                <span className="text-xs text-[#101114]/60">Total Estimated PO Value:</span>
                <p className="mt-0.5 text-xl font-black text-[#101114]">{currency(totalCost)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#101114]/10 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy WhatsApp Memo */}
            <button
              type="button"
              onClick={handleCopyMemo}
              disabled={poItems.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
            >
              {copiedMemo ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Memo Copied!</span>
                </>
              ) : (
                <>
                  <MessageSquare className="size-3.5 text-emerald-700" />
                  <span>Copy WhatsApp / Email Memo</span>
                </>
              )}
            </button>

            {/* Export PO CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={poItems.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] transition-colors hover:bg-[#F3F0E8] disabled:opacity-40"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-700" />
              <span>Export PO CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-sm border border-[#101114]/20 bg-white px-4 text-xs font-semibold text-[#101114] hover:bg-[#F3F0E8]"
            >
              Close
            </button>

            {/* Print Official Factory PO Sheet */}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={poItems.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-[#101114] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#101114]/85 disabled:opacity-40"
            >
              <Printer className="size-3.5" />
              <span>Print Factory PO (A4)</span>
            </button>
          </div>
        </div>

        {/* ── HIDDEN CORPORATE A4 PRINTABLE PO SHEET ── */}
        <div id="vibelock-po-printable-sheet" className="hidden">
          <div className="mx-auto max-w-4xl bg-white p-8 font-sans text-[#101114]">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#101114] pb-5">
              <div>
                <h1 className="text-2xl font-black tracking-wider uppercase">VIBELOCK APPAREL</h1>
                <p className="text-xs text-gray-600">Premium Streetwear & Contemporary Garments</p>
                <p className="text-xs text-gray-500">Dhaka, Bangladesh • info@vibelock.com</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded border border-[#101114] bg-gray-50 px-3 py-1 text-sm font-black tracking-wider uppercase">
                  PURCHASE ORDER
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-[#101114]">{poNumber}</p>
                <p className="text-xs text-gray-600">Date: {orderDate}</p>
              </div>
            </div>

            {/* Vendor & Delivery Details */}
            <div className="my-6 grid grid-cols-2 gap-6 border-b border-gray-300 pb-5 text-xs">
              <div>
                <h3 className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  MANUFACTURER / SUPPLIER:
                </h3>
                <p className="mt-1 text-sm font-bold text-[#101114]">{supplierName}</p>
                <p className="text-gray-600">Authorized Apparel Production Partner</p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  ORDER DETAILS & DEADLINE:
                </h3>
                <p className="mt-1">
                  <strong>Expected Delivery:</strong> {deliveryDeadline}
                </p>
                <p>
                  <strong>Payment Terms:</strong> Per Manufacturing Agreement
                </p>
                <p>
                  <strong>Currency:</strong> BDT (৳)
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="mb-6 w-full border border-gray-300 text-left text-xs">
              <thead className="border-b border-gray-300 bg-gray-100 text-[11px] font-bold">
                <tr>
                  <th className="w-10 border-r border-gray-300 p-2 text-center">#</th>
                  <th className="border-r border-gray-300 p-2">Garment Description</th>
                  <th className="border-r border-gray-300 p-2">SKU</th>
                  <th className="border-r border-gray-300 p-2 text-center">Size</th>
                  <th className="border-r border-gray-300 p-2 text-center">Color</th>
                  <th className="border-r border-gray-300 p-2 text-center">Qty (Pcs)</th>
                  <th className="border-r border-gray-300 p-2 text-right">Rate (৳)</th>
                  <th className="p-2 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {poItems.map((item, idx) => (
                  <tr key={item.id} className="page-break-avoid">
                    <td className="border-r border-gray-300 p-2 text-center font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="border-r border-gray-300 p-2 font-medium">{item.productName}</td>
                    <td className="border-r border-gray-300 p-2 font-mono text-[10px]">
                      {item.sku}
                    </td>
                    <td className="border-r border-gray-300 p-2 text-center font-bold">
                      {item.size || "-"}
                    </td>
                    <td className="border-r border-gray-300 p-2 text-center">
                      {item.color || "-"}
                    </td>
                    <td className="border-r border-gray-300 p-2 text-center font-bold">
                      {item.orderQuantity}
                    </td>
                    <td className="border-r border-gray-300 p-2 text-right font-mono">
                      {currency(item.unitCost)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {currency(item.orderQuantity * item.unitCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#101114] bg-gray-50 font-bold">
                <tr>
                  <td colSpan={5} className="p-2 text-right text-[11px] tracking-wider uppercase">
                    Total Order Volume & Cost:
                  </td>
                  <td className="border-r border-gray-300 p-2 text-center text-sm font-black">
                    {totalPieces} pcs
                  </td>
                  <td className="border-r border-gray-300 p-2 text-right text-xs">
                    ৳{avgCostPerPiece.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-sm font-black">{currency(totalCost)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Quality & Production Notes */}
            <div className="mb-8 rounded border border-gray-300 bg-gray-50/50 p-3 text-xs">
              <h4 className="mb-1 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                PRODUCTION INSTRUCTIONS & ACCEPTANCE CRITERIA:
              </h4>
              <p className="text-gray-700">{productionNotes}</p>
            </div>

            {/* Sign-off Blocks */}
            <div className="grid grid-cols-2 gap-12 pt-8 text-xs">
              <div className="border-t border-gray-400 pt-2 text-center">
                <p className="font-bold text-[#101114]">Authorized Merchandiser</p>
                <p className="text-[10px] text-gray-500">VibeLock Head Office</p>
              </div>
              <div className="border-t border-gray-400 pt-2 text-center">
                <p className="font-bold text-[#101114]">Factory Acceptance & Stamp</p>
                <p className="text-[10px] text-gray-500">{supplierName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #vibelock-po-printable-sheet,
            #vibelock-po-printable-sheet * {
              visibility: visible;
            }
            #vibelock-po-printable-sheet {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
            }
            .page-break-avoid {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
