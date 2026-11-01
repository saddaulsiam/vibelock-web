"use client";

import { useState } from "react";
import {
  RotateCcw,
  Search,
  Loader2,
  Receipt,
  ArrowRightLeft,
  Banknote,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type {
  PosOrderLookupResult,
  PosReturnReason,
  PosItemCondition,
  PosReturnSelectedItem,
  PosExchangeReplacementItem,
  PosReturnReceiptData,
} from "@/lib/pos/pos-returns-types";
import type { PosProductSummary } from "@/lib/pos/pos-types";
import {
  lookupPosOrderForReturnAction,
  processPosReturnAction,
} from "@/lib/pos/pos-returns-actions";
import { toast } from "sonner";

interface PosReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: PosProductSummary[];
  onReturnCompleted: (receipt: PosReturnReceiptData) => void;
}

export function PosReturnModal({
  isOpen,
  onClose,
  catalogProducts,
  onReturnCompleted,
}: PosReturnModalProps) {
  // Search State
  const [orderQuery, setOrderQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [orderData, setOrderData] = useState<PosOrderLookupResult | null>(null);

  // Return Selection State
  const [selectedItems, setSelectedItems] = useState<PosReturnSelectedItem[]>([]);
  const [resolution, setResolution] = useState<"REFUND_CASH" | "EXCHANGE">("REFUND_CASH");
  const [exchangeItems, setExchangeItems] = useState<PosExchangeReplacementItem[]>([]);
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exchange Picker State
  const [exchangeSearch, setExchangeSearch] = useState("");

  const handleLookupOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = orderQuery.trim();
    if (!query || isSearching) return;

    setIsSearching(true);
    try {
      const res = await lookupPosOrderForReturnAction(query);
      if (!res.success || !res.data) {
        toast.error(res.error || "Order not found");
        return;
      }
      setOrderData(res.data);
      setSelectedItems([]);
      setExchangeItems([]);
      toast.success(`Found order #${res.data.orderNumber}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error searching order";
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleItemSelection = (orderItemId: string) => {
    const existing = selectedItems.find((i) => i.orderItemId === orderItemId);
    if (existing) {
      setSelectedItems((prev) => prev.filter((i) => i.orderItemId !== orderItemId));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          orderItemId,
          quantity: 1,
          reason: "SIZE_MISMATCH",
          condition: "RESELLABLE",
        },
      ]);
    }
  };

  const handleUpdateItemQty = (orderItemId: string, qty: number, maxQty: number) => {
    const safeQty = Math.max(1, Math.min(qty, maxQty));
    setSelectedItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, quantity: safeQty } : i))
    );
  };

  const handleUpdateItemReason = (orderItemId: string, reason: PosReturnReason) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, reason } : i))
    );
  };

  const handleUpdateItemCondition = (orderItemId: string, condition: PosItemCondition) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.orderItemId === orderItemId ? { ...i, condition } : i))
    );
  };

  // Add Replacement Variant for Exchange
  const handleAddReplacement = (prod: PosProductSummary, variantId: string) => {
    const v = prod.variants.find((item) => item.id === variantId);
    if (!v || v.availableStock <= 0) {
      toast.error("Variant is out of stock");
      return;
    }

    setExchangeItems((prev) => {
      const existing = prev.find((item) => item.variantId === variantId);
      if (existing) {
        if (existing.quantity >= v.availableStock) {
          toast.warning("Cannot add more than available stock");
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variantId: v.id,
          productName: prod.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          unitPrice: v.effectivePrice,
          quantity: 1,
        },
      ];
    });
  };

  // Calculations
  const totalReturnValue = selectedItems.reduce((acc, sel) => {
    const item = orderData?.items.find((i) => i.orderItemId === sel.orderItemId);
    return acc + (item ? item.unitPrice * sel.quantity : 0);
  }, 0);

  const totalExchangeValue = exchangeItems.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );

  const netDifference = resolution === "EXCHANGE" ? totalExchangeValue - totalReturnValue : -totalReturnValue;

  const handleSubmitReturn = async () => {
    if (!orderData || selectedItems.length === 0 || isSubmitting) return;

    if (resolution === "EXCHANGE" && exchangeItems.length === 0) {
      toast.error("Please add at least one replacement item for exchange.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await processPosReturnAction({
        orderId: orderData.orderId,
        returnedItems: selectedItems,
        resolution,
        exchangeItems: resolution === "EXCHANGE" ? exchangeItems : undefined,
        notes: returnNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to process return");
        return;
      }

      toast.success(`Return memo ${res.data.returnMemoNumber} created!`);
      onReturnCompleted(res.data);
      onClose();
      // Reset
      setOrderData(null);
      setSelectedItems([]);
      setExchangeItems([]);
      setOrderQuery("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error processing return";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl border border-[#e2ded2] shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#e2ded2]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-vl-black text-vl-cyan shadow-2xs">
              <RotateCcw className="h-4 w-4" />
            </div>
            <DialogTitle className="font-heading font-black text-lg text-slate-900 tracking-wide">
              In-Store Returns &amp; Exchanges
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-vl-grey">
            Look up original physical cash memo or order number to process returns, exchanges, and restock.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <form onSubmit={handleLookupOrder} className="flex items-center space-x-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-vl-grey" />
            <Input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Scan or enter invoice / order # (e.g. VL-POS-... or VL-ORD-...)"
              className="pl-9 h-11 text-xs font-mono bg-[#faf9f5] border-[#d6d2c4] rounded-xl focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20 uppercase"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !orderQuery.trim()}
            className="h-11 px-5 rounded-xl bg-vl-black hover:bg-black text-vl-white hover:text-vl-cyan font-heading font-black text-xs transition-colors shadow-xs"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin text-vl-cyan" /> : "Lookup"}
          </Button>
        </form>

        {/* Order Details Loaded */}
        {orderData && (
          <div className="space-y-4 pt-2">
            {/* Order Header Summary */}
            <div className="bg-[#faf9f5] p-3.5 rounded-xl border border-[#e2ded2] text-xs flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-heading font-black text-slate-900">{orderData.orderNumber}</span>
                  <Badge className="bg-[#e2ded2] text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-md hover:bg-[#dcd7cb]">
                    {orderData.salesChannel}
                  </Badge>
                  {orderData.isReturnablePeriodValid ? (
                    <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md hover:bg-emerald-500/20">
                      Within 7-day policy ({orderData.daysElapsed}d ago)
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Policy alert ({orderData.daysElapsed}d ago)
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-vl-grey mt-1">
                  Customer: <span className="font-medium text-slate-800">{orderData.customerName}</span> ({orderData.customerPhone}) | Original Total: <span className="font-mono font-bold text-slate-900">৳{orderData.total.toFixed(0)}</span>
                </p>
              </div>
            </div>

            {/* Selectable Return Items */}
            <div className="space-y-2">
              <Label className="text-xs font-heading font-black text-slate-800 uppercase tracking-wider block">
                Select Items to Return / Exchange:
              </Label>

              <div className="divide-y divide-[#e2ded2] border border-[#e2ded2] rounded-xl overflow-hidden">
                {orderData.items.map((item) => {
                  const isSelected = selectedItems.some((i) => i.orderItemId === item.orderItemId);
                  const selectedConfig = selectedItems.find((i) => i.orderItemId === item.orderItemId);
                  const isReturnable = item.returnableQuantity > 0;
                  const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");

                  return (
                    <div
                      key={item.orderItemId}
                      className={`p-3.5 text-xs transition-colors ${
                        isSelected ? "bg-amber-500/10 border-l-4 border-l-amber-500" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            disabled={!isReturnable}
                            checked={isSelected}
                            onChange={() =>
                              handleToggleItemSelection(item.orderItemId)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-[#d6d2c4] text-vl-black accent-vl-black focus:ring-vl-cyan"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 leading-snug">{item.productName}</p>
                            <div className="flex items-center space-x-1.5 mt-0.5 font-mono text-[10px] text-vl-grey">
                              <span className="font-bold text-slate-700">{item.sku}</span>
                              {variantDesc && <span>• {variantDesc}</span>}
                              <span>• ৳{item.unitPrice.toFixed(0)} each</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-vl-grey font-mono block">
                            Returnable: <strong className="text-slate-800">{item.returnableQuantity}</strong> of {item.originalQuantity}
                          </span>
                        </div>
                      </div>

                      {/* Return Configuration if Selected */}
                      {isSelected && selectedConfig && (
                        <div className="mt-2.5 pt-2 border-t border-amber-200/60 grid grid-cols-3 gap-2.5">
                          <div>
                            <Label className="text-[10px] font-heading font-black text-slate-700 uppercase">Qty to Return:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.returnableQuantity}
                              value={selectedConfig.quantity}
                              onChange={(e) =>
                                handleUpdateItemQty(
                                  item.orderItemId,
                                  Number(e.target.value) || 1,
                                  item.returnableQuantity
                                )
                              }
                              className="h-8.5 text-xs font-mono font-bold mt-1 bg-white border-[#d6d2c4] rounded-lg"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-heading font-black text-slate-700 uppercase">Reason:</Label>
                            <select
                              value={selectedConfig.reason}
                              onChange={(e) =>
                                handleUpdateItemReason(
                                  item.orderItemId,
                                  e.target.value as PosReturnReason
                                )
                              }
                              className="w-full h-8.5 text-xs rounded-lg border border-[#d6d2c4] bg-white px-2 mt-1 focus:ring-vl-cyan"
                            >
                              <option value="SIZE_MISMATCH">Size Mismatch</option>
                              <option value="DEFECTIVE_OR_DAMAGED">Defective / Damaged</option>
                              <option value="WRONG_ITEM">Wrong Item</option>
                              <option value="CUSTOMER_CHANGE_OF_MIND">Customer Change of Mind</option>
                              <option value="OTHER">Other Reason</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-heading font-black text-slate-700 uppercase">Condition:</Label>
                            <select
                              value={selectedConfig.condition}
                              onChange={(e) =>
                                handleUpdateItemCondition(
                                  item.orderItemId,
                                  e.target.value as PosItemCondition
                                )
                              }
                              className="w-full h-8.5 text-xs rounded-lg border border-[#d6d2c4] bg-white px-2 mt-1 font-medium focus:ring-vl-cyan"
                            >
                              <option value="RESELLABLE">Resellable (Stock +1)</option>
                              <option value="DAMAGED">Damaged (No Restock)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution Selector: Cash Refund vs In-Store Exchange */}
            {selectedItems.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResolution("REFUND_CASH")}
                    className={`p-3 rounded-xl border text-xs font-heading font-black flex items-center justify-center space-x-2 transition-all ${
                      resolution === "REFUND_CASH"
                        ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                        : "border-[#d6d2c4] bg-[#faf9f5] text-vl-grey hover:bg-[#ebe6d9]"
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span>Cash Refund from Drawer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution("EXCHANGE")}
                    className={`p-3 rounded-xl border text-xs font-heading font-black flex items-center justify-center space-x-2 transition-all ${
                      resolution === "EXCHANGE"
                        ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                        : "border-[#d6d2c4] bg-[#faf9f5] text-vl-grey hover:bg-[#ebe6d9]"
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4 text-vl-cyan" />
                    <span>Product Exchange (Swap)</span>
                  </button>
                </div>

                {/* Exchange Replacement Selection */}
                {resolution === "EXCHANGE" && (
                  <div className="space-y-2.5 bg-[#faf9f5] p-3.5 rounded-xl border border-[#e2ded2]">
                    <Label className="text-xs font-heading font-black text-slate-800 uppercase tracking-wider block">
                      Add Replacement Item(s) from Store:
                    </Label>

                    {/* Quick Filter */}
                    <Input
                      type="text"
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                      placeholder="Search store catalog for replacement size/item..."
                      className="h-9 text-xs bg-white border-[#d6d2c4] rounded-xl focus-visible:border-vl-cyan"
                    />

                    {/* Catalog Mini Suggestions */}
                    {exchangeSearch.trim() && (
                      <div className="max-h-36 overflow-y-auto bg-white border border-[#e2ded2] rounded-xl divide-y divide-[#e2ded2]">
                        {catalogProducts
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(exchangeSearch.toLowerCase()) ||
                              p.variants.some((v) =>
                                v.sku.toLowerCase().includes(exchangeSearch.toLowerCase())
                              )
                          )
                          .slice(0, 5)
                          .map((prod) => (
                            <div key={prod.id} className="p-2.5 text-xs">
                              <p className="font-semibold text-slate-900">{prod.name}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {prod.variants.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    disabled={v.availableStock <= 0}
                                    onClick={() => handleAddReplacement(prod, v.id)}
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-[#d6d2c4] bg-[#faf9f5] hover:bg-vl-cyan/20 hover:border-vl-cyan disabled:opacity-40 transition-colors"
                                  >
                                    {[v.size, v.color].filter(Boolean).join("/") || v.sku} (৳
                                    {v.effectivePrice})
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Selected Replacements List */}
                    {exchangeItems.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-vl-grey uppercase font-heading font-black">
                          Selected Replacements:
                        </span>
                        {exchangeItems.map((rep) => (
                          <div
                            key={rep.variantId}
                            className="bg-white p-2.5 rounded-xl border border-[#e2ded2] text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">{rep.productName}</span>
                              <span className="text-vl-grey font-mono text-[10px] ml-1">
                                ({[rep.size, rep.color].filter(Boolean).join("/") || rep.sku})
                              </span>
                              <span className="text-slate-800 font-mono font-bold ml-2">
                                {rep.quantity} x ৳{rep.unitPrice}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExchangeItems((prev) =>
                                  prev.filter((i) => i.variantId !== rep.variantId)
                                )
                              }
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Summary Callout */}
                <div className="rounded-xl border border-vl-border bg-vl-black p-4 text-vl-white shadow-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-vl-grey text-xs">
                    <span>Return Item Value:</span>
                    <span className="font-bold text-vl-white">৳{totalReturnValue.toFixed(0)}</span>
                  </div>

                  {resolution === "EXCHANGE" && (
                    <div className="flex justify-between text-vl-grey text-xs">
                      <span>Replacement Item Value:</span>
                      <span className="font-bold text-vl-white">৳{totalExchangeValue.toFixed(0)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline font-heading font-black text-sm">
                    <span className="tracking-wide">
                      {netDifference > 0
                        ? "CUSTOMER TO PAY:"
                        : netDifference < 0
                        ? "REFUND TO CUSTOMER:"
                        : "EVEN SWAP:"}
                    </span>
                    <span
                      className={`text-xl font-heading font-black ${
                        netDifference < 0 ? "text-amber-400" : "text-vl-cyan"
                      }`}
                    >
                      {netDifference === 0 ? "৳0.00" : `৳${Math.abs(netDifference).toFixed(0)}`}
                    </span>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <Label className="text-xs font-heading font-black text-slate-700">
                    Staff Notes / Reason Details (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="e.g. Customer brought tags intact, exchanged for size L"
                    className="text-xs h-10 border-[#d6d2c4] bg-[#faf9f5] rounded-xl mt-1 focus-visible:border-vl-cyan"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t border-[#e2ded2]">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="w-1/3 h-11 text-xs rounded-xl font-heading font-black border-[#d6d2c4] text-slate-700 hover:bg-[#faf9f5]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting || selectedItems.length === 0}
                    onClick={handleSubmitReturn}
                    className="w-2/3 h-11 bg-vl-cyan hover:bg-[#2ae0ff] text-vl-black font-heading font-black text-xs rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-vl-black" />
                        <span>Processing Return...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4" />
                        <span>Confirm &amp; Print Return Memo</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
