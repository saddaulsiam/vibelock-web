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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <div className="animate-in fade-in-0 zoom-in-95 border-vl-dark-900/15 relative flex max-h-[94vh] w-full max-w-5xl flex-col rounded-md border bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-vl-dark-900 flex size-9 items-center justify-center rounded-sm text-white">
              <Factory className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-vl-dark-900 text-base font-bold">
                  Supplier Purchase Order (PO) & Reorder Sheet
                </h2>
                <Input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  size="sm"
                  className="w-44 font-mono text-xs font-semibold"
                  title="Click to edit PO Number"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(poNumber);
                    setCopiedPoNumber(true);
                    setTimeout(() => setCopiedPoNumber(false), 2000);
                  }}
                  className="text-vl-dark-900/50 hover:text-vl-dark-900 size-5"
                  title="Copy PO Number"
                >
                  {copiedPoNumber ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
              </div>
              <p className="text-vl-dark-900/60 text-xs">
                Generate, review, and print apparel manufacturing work orders for factory
                replenishment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-vl-dark-900/40 hover:text-vl-dark-900 size-8"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Supplier & Meta Parameters Form */}
          <div className="border-vl-dark-900/10 bg-vl-white-200 grid gap-4 rounded-md border p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            {/* Supplier / Factory */}
            <div className="space-y-1">
              <label className="text-vl-dark-900 font-semibold">Supplier / Factory Name</label>
              <div>
                <Input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  size="sm"
                  placeholder="Enter or select factory"
                />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {DEFAULT_SUPPLIERS.slice(0, 2).map((sup) => (
                  <Button
                    key={sup}
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => setSupplierName(sup)}
                    className="h-5 max-w-[140px] truncate px-1.5 text-[10px]"
                  >
                    {sup.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Order Date */}
            <div className="space-y-1">
              <label className="text-vl-dark-900 font-semibold">Order Issue Date</label>
              <div className="relative flex items-center">
                <Calendar className="text-vl-dark-900/50 pointer-events-none absolute left-2.5 z-10 size-3.5" />
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  size="sm"
                  className="pl-8"
                />
              </div>
            </div>

            {/* Delivery Deadline */}
            <div className="space-y-1">
              <label className="text-vl-dark-900 font-semibold">Delivery Deadline</label>
              <div className="relative flex items-center">
                <Calendar className="pointer-events-none absolute left-2.5 z-10 size-3.5 text-amber-600" />
                <Input
                  type="date"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  size="sm"
                  className="pl-8"
                />
              </div>
            </div>

            {/* Target Stock Buffer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-vl-dark-900 font-semibold">Target Par Stock Buffer</label>
                <span className="text-vl-dark-900 font-mono text-[11px] font-bold">
                  {targetBuffer} pcs
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[10, 20, 30, 50, 100].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={targetBuffer === level ? "primary" : "outline"}
                    size="xs"
                    onClick={() => setTargetBuffer(level)}
                    className="h-6 flex-1 px-1 text-[10px] font-bold"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Production Specifications */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <label className="text-vl-dark-900 font-semibold">
                Production & Quality Specifications
              </label>
              <Input
                type="text"
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                size="sm"
                placeholder="Stitching requirements, GSM, wash notes, packaging requirements..."
              />
            </div>
          </div>

          {/* Action Strip: Auto-fill & Search Variant */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-fill Low & Out-of-Stock */}
              <Button
                type="button"
                size="sm"
                variant="brand"
                onClick={() => handleAutoFill(5)}
                disabled={isLoadingAutoFill}
                loading={isLoadingAutoFill}
                className="h-9 gap-1.5 px-3.5 text-xs font-bold"
              >
                {!isLoadingAutoFill && <Sparkles className="size-3.5" />}
                <span>
                  {isLoadingAutoFill ? "Scanning Catalog..." : "⚡ Auto-fill Low & Out-of-Stock"}
                </span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAutoFill(0)}
                disabled={isLoadingAutoFill}
                className="h-9 border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
              >
                <span>Out-of-Stock Only</span>
              </Button>

              {poItems.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPoItems([])}
                  className="text-vl-dark-900/70 h-9 gap-1 px-2.5 text-xs font-medium hover:text-red-700"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear All</span>
                </Button>
              )}
            </div>

            {/* Manual Variant Search & Add */}
            <div className="relative min-w-[260px]">
              <div className="relative flex items-center">
                <Search className="text-vl-dark-900/40 pointer-events-none absolute left-2.5 z-10 size-3.5" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search SKU or style to add..."
                  size="default"
                  className="pr-8 pl-8"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="text-vl-dark-900/40 hover:text-vl-dark-900 absolute right-2.5 z-10 size-5"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && filteredSearchVariants.length > 0 && (
                <div className="border-vl-dark-900/15 absolute top-10 right-0 left-0 z-50 max-h-56 overflow-y-auto rounded-sm border bg-white p-1 shadow-lg">
                  {filteredSearchVariants.map((v) => (
                    <Button
                      key={v.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddVariant(v)}
                      className="hover:bg-vl-white-300 h-auto w-full items-center justify-between gap-2 rounded-xs px-2.5 py-1.5 text-left text-xs font-normal"
                    >
                      <div className="min-w-0">
                        <p className="text-vl-dark-900 truncate font-semibold">{v.product.name}</p>
                        <p className="text-vl-dark-900/60 font-mono text-[10px]">
                          {v.sku} • {[v.size, v.color].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-amber-700">
                        Stock: {v.available}
                      </span>
                    </Button>
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
          <div className="border-vl-dark-900/10 overflow-hidden rounded-md border bg-white shadow-2xs">
            {poItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Factory className="text-vl-dark-900/25 size-9" />
                <h3 className="text-vl-dark-900 mt-3 text-sm font-bold">
                  No Garment Variants in PO
                </h3>
                <p className="text-vl-dark-900/60 mt-1 max-w-sm text-xs">
                  Click <strong>&quot;⚡ Auto-fill Low &amp; Out-of-Stock&quot;</strong> to
                  automatically pull variants needing restock, or search by SKU above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-vl-dark-900/10 bg-vl-white-300/50 text-vl-dark-900/70 border-b text-[11px] font-semibold">
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
                  <tbody className="divide-vl-dark-900/5 divide-y">
                    {poItems.map((item) => {
                      const lineTotal = (item.orderQuantity || 0) * (item.unitCost || 0);
                      return (
                        <tr key={item.id} className="hover:bg-vl-white-300/30 transition-colors">
                          {/* Garment Style */}
                          <td className="py-2.5 pr-2 pl-4">
                            <div className="flex items-center gap-2.5">
                              <div className="border-vl-dark-900/10 bg-vl-white-300 relative size-10 shrink-0 overflow-hidden rounded-xs border">
                                {item.primaryImage ? (
                                  <Image
                                    src={item.primaryImage}
                                    alt={item.productName}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <div className="text-vl-dark-900/30 flex size-full items-center justify-center">
                                    <Package className="size-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-vl-dark-900 truncate font-semibold">
                                  {item.productName}
                                </p>
                                <p className="text-vl-dark-900/60 font-mono text-[10px]">
                                  {item.sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Attributes */}
                          <td className="px-2 py-2.5">
                            <span className="rounded-2xs border-vl-dark-900/15 bg-vl-white-200 text-vl-dark-900 inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium">
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
                            <div className="border-vl-dark-900/20 inline-flex items-center rounded-xs border bg-white">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={() => handleUpdateQty(item.id, item.orderQuantity - 1)}
                                className="size-7 rounded-none rounded-l-xs"
                              >
                                <Minus className="size-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                max="10000"
                                value={item.orderQuantity}
                                onChange={(e) =>
                                  handleUpdateQty(item.id, parseInt(e.target.value, 10))
                                }
                                size="sm"
                                className="h-7 w-16 text-center font-mono text-xs font-bold"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={() => handleUpdateQty(item.id, item.orderQuantity + 1)}
                                className="size-7 rounded-none rounded-r-xs"
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                          </td>

                          {/* Unit Rate (BDT) */}
                          <td className="px-2 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-vl-dark-900/50 text-[10px]">৳</span>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateUnitCost(item.id, parseFloat(e.target.value))
                                }
                                size="sm"
                                className="h-7 w-20 text-right font-mono text-xs font-semibold"
                              />
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="px-2 py-2.5 text-right">
                            <span className="text-vl-dark-900 font-mono text-xs font-bold">
                              {currency(lineTotal)}
                            </span>
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 pr-4 pl-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-vl-dark-900/40 size-7 hover:bg-red-50 hover:text-red-700"
                              title="Remove item"
                            >
                              <X className="size-3.5" />
                            </Button>
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
            <div className="border-vl-dark-900/10 bg-vl-white-200 grid gap-4 rounded-md border p-4 sm:grid-cols-4">
              <div>
                <span className="text-vl-dark-900/60 text-xs">Total Styles / SKUs:</span>
                <p className="text-vl-dark-900 mt-0.5 text-lg font-black">{poItems.length} items</p>
              </div>
              <div>
                <span className="text-vl-dark-900/60 text-xs">Total Garments to Produce:</span>
                <p className="mt-0.5 text-lg font-black text-emerald-800">{totalPieces} pcs</p>
              </div>
              <div>
                <span className="text-vl-dark-900/60 text-xs">Avg. Rate per Piece:</span>
                <p className="text-vl-dark-900 mt-0.5 text-lg font-black">
                  {currency(avgCostPerPiece)}
                </p>
              </div>
              <div>
                <span className="text-vl-dark-900/60 text-xs">Total Estimated PO Value:</span>
                <p className="text-vl-dark-900 mt-0.5 text-xl font-black">{currency(totalCost)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="border-vl-dark-900/10 flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Copy WhatsApp Memo */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyMemo}
              disabled={poItems.length === 0}
              className="h-9 gap-1.5 px-3 text-xs font-semibold"
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
            </Button>

            {/* Export PO CSV */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={poItems.length === 0}
              className="h-9 gap-1.5 px-3 text-xs font-semibold"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-700" />
              <span>Export PO CSV</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold"
            >
              Close
            </Button>

            {/* Print Official Factory PO Sheet */}
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => window.print()}
              disabled={poItems.length === 0}
              className="h-9 gap-1.5 px-5 text-xs font-bold"
            >
              <Printer className="size-3.5" />
              <span>Print Factory PO (A4)</span>
            </Button>
          </div>
        </div>

        {/* ── HIDDEN CORPORATE A4 PRINTABLE PO SHEET ── */}
        <div id="vibelock-po-printable-sheet" className="hidden">
          <div className="text-vl-dark-900 mx-auto max-w-4xl bg-white p-8 font-sans">
            {/* Header */}
            <div className="border-vl-dark-900 flex items-start justify-between border-b-2 pb-5">
              <div>
                <h1 className="text-2xl font-black tracking-wider uppercase">VIBELOCK APPAREL</h1>
                <p className="text-xs text-gray-600">Premium Streetwear & Contemporary Garments</p>
                <p className="text-xs text-gray-500">Dhaka, Bangladesh • info@vibelock.com</p>
              </div>
              <div className="text-right">
                <span className="border-vl-dark-900 inline-block rounded border bg-gray-50 px-3 py-1 text-sm font-black tracking-wider uppercase">
                  PURCHASE ORDER
                </span>
                <p className="text-vl-dark-900 mt-1 font-mono text-sm font-bold">{poNumber}</p>
                <p className="text-xs text-gray-600">Date: {orderDate}</p>
              </div>
            </div>

            {/* Vendor & Delivery Details */}
            <div className="my-6 grid grid-cols-2 gap-6 border-b border-gray-300 pb-5 text-xs">
              <div>
                <h3 className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  MANUFACTURER / SUPPLIER:
                </h3>
                <p className="text-vl-dark-900 mt-1 text-sm font-bold">{supplierName}</p>
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
              <tfoot className="border-vl-dark-900 border-t-2 bg-gray-50 font-bold">
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
                <p className="text-vl-dark-900 font-bold">Authorized Merchandiser</p>
                <p className="text-[10px] text-gray-500">VibeLock Head Office</p>
              </div>
              <div className="border-t border-gray-400 pt-2 text-center">
                <p className="text-vl-dark-900 font-bold">Factory Acceptance & Stamp</p>
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
