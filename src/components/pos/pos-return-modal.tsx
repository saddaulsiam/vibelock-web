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

  const netDifference =
    resolution === "EXCHANGE" ? totalExchangeValue - totalReturnValue : -totalReturnValue;

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
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl sm:max-w-xl">
        <DialogHeader className="border-b border-[#e2ded2] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="bg-vl-black text-vl-cyan flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs">
              <RotateCcw className="h-4 w-4" />
            </div>
            <DialogTitle className="font-heading text-lg font-black tracking-wide text-slate-900">
              In-Store Returns &amp; Exchanges
            </DialogTitle>
          </div>
          <DialogDescription className="text-vl-grey text-xs">
            Look up original physical cash memo or order number to process returns, exchanges, and
            restock.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <form onSubmit={handleLookupOrder} className="flex items-center space-x-2 pt-2">
          <div className="relative flex-1">
            <Search className="text-vl-grey absolute top-3.5 left-3 h-4 w-4" />
            <Input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Scan or enter invoice / order # (e.g. VL-POS-... or VL-ORD-...)"
              className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20 h-11 rounded-xl border-[#d6d2c4] bg-[#faf9f5] pl-9 font-mono text-xs uppercase"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !orderQuery.trim()}
            className="bg-vl-black text-vl-white hover:text-vl-cyan font-heading h-11 rounded-xl px-5 text-xs font-black shadow-xs transition-colors hover:bg-black"
          >
            {isSearching ? <Loader2 className="text-vl-cyan h-4 w-4 animate-spin" /> : "Lookup"}
          </Button>
        </form>

        {/* Order Details Loaded */}
        {orderData && (
          <div className="space-y-4 pt-2">
            {/* Order Header Summary */}
            <div className="flex items-center justify-between rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3.5 text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-heading font-black text-slate-900">
                    {orderData.orderNumber}
                  </span>
                  <Badge className="rounded-md bg-[#e2ded2] px-2 py-0.5 font-mono text-[10px] text-slate-800 hover:bg-[#dcd7cb]">
                    {orderData.salesChannel}
                  </Badge>
                  {orderData.isReturnablePeriodValid ? (
                    <Badge className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-500/20">
                      Within 7-day policy ({orderData.daysElapsed}d ago)
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                    >
                      Policy alert ({orderData.daysElapsed}d ago)
                    </Badge>
                  )}
                </div>
                <p className="text-vl-grey mt-1 text-[11px]">
                  Customer:{" "}
                  <span className="font-medium text-slate-800">{orderData.customerName}</span> (
                  {orderData.customerPhone}) | Original Total:{" "}
                  <span className="font-mono font-bold text-slate-900">
                    ৳{orderData.total.toFixed(0)}
                  </span>
                </p>
              </div>
            </div>

            {/* Selectable Return Items */}
            <div className="space-y-2">
              <Label className="font-heading block text-xs font-black tracking-wider text-slate-800 uppercase">
                Select Items to Return / Exchange:
              </Label>

              <div className="divide-y divide-[#e2ded2] overflow-hidden rounded-xl border border-[#e2ded2]">
                {orderData.items.map((item) => {
                  const isSelected = selectedItems.some((i) => i.orderItemId === item.orderItemId);
                  const selectedConfig = selectedItems.find(
                    (i) => i.orderItemId === item.orderItemId
                  );
                  const isReturnable = item.returnableQuantity > 0;
                  const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");

                  return (
                    <div
                      key={item.orderItemId}
                      className={`p-3.5 text-xs transition-colors ${
                        isSelected ? "border-l-4 border-l-amber-500 bg-amber-500/10" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            disabled={!isReturnable}
                            checked={isSelected}
                            onChange={() => handleToggleItemSelection(item.orderItemId)}
                            className="text-vl-black accent-vl-black focus:ring-vl-cyan mt-0.5 h-4 w-4 rounded border-[#d6d2c4]"
                          />
                          <div>
                            <p className="leading-snug font-semibold text-slate-900">
                              {item.productName}
                            </p>
                            <div className="text-vl-grey mt-0.5 flex items-center space-x-1.5 font-mono text-[10px]">
                              <span className="font-bold text-slate-700">{item.sku}</span>
                              {variantDesc && <span>• {variantDesc}</span>}
                              <span>• ৳{item.unitPrice.toFixed(0)} each</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-vl-grey block font-mono text-[10px]">
                            Returnable:{" "}
                            <strong className="text-slate-800">{item.returnableQuantity}</strong> of{" "}
                            {item.originalQuantity}
                          </span>
                        </div>
                      </div>

                      {/* Return Configuration if Selected */}
                      {isSelected && selectedConfig && (
                        <div className="mt-2.5 grid grid-cols-3 gap-2.5 border-t border-amber-200/60 pt-2">
                          <div>
                            <Label className="font-heading text-[10px] font-black text-slate-700 uppercase">
                              Qty to Return:
                            </Label>
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
                              className="mt-1 h-8.5 rounded-lg border-[#d6d2c4] bg-white font-mono text-xs font-bold"
                            />
                          </div>

                          <div>
                            <Label className="font-heading text-[10px] font-black text-slate-700 uppercase">
                              Reason:
                            </Label>
                            <select
                              value={selectedConfig.reason}
                              onChange={(e) =>
                                handleUpdateItemReason(
                                  item.orderItemId,
                                  e.target.value as PosReturnReason
                                )
                              }
                              className="focus:ring-vl-cyan mt-1 h-8.5 w-full rounded-lg border border-[#d6d2c4] bg-white px-2 text-xs"
                            >
                              <option value="SIZE_MISMATCH">Size Mismatch</option>
                              <option value="DEFECTIVE_OR_DAMAGED">Defective / Damaged</option>
                              <option value="WRONG_ITEM">Wrong Item</option>
                              <option value="CUSTOMER_CHANGE_OF_MIND">
                                Customer Change of Mind
                              </option>
                              <option value="OTHER">Other Reason</option>
                            </select>
                          </div>

                          <div>
                            <Label className="font-heading text-[10px] font-black text-slate-700 uppercase">
                              Condition:
                            </Label>
                            <select
                              value={selectedConfig.condition}
                              onChange={(e) =>
                                handleUpdateItemCondition(
                                  item.orderItemId,
                                  e.target.value as PosItemCondition
                                )
                              }
                              className="focus:ring-vl-cyan mt-1 h-8.5 w-full rounded-lg border border-[#d6d2c4] bg-white px-2 text-xs font-medium"
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
                    className={`font-heading flex items-center justify-center space-x-2 rounded-xl border p-3 text-xs font-black transition-all ${
                      resolution === "REFUND_CASH"
                        ? "border-vl-cyan bg-vl-black text-vl-cyan border-2 shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                        : "text-vl-grey border-[#d6d2c4] bg-[#faf9f5] hover:bg-[#ebe6d9]"
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span>Cash Refund from Drawer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution("EXCHANGE")}
                    className={`font-heading flex items-center justify-center space-x-2 rounded-xl border p-3 text-xs font-black transition-all ${
                      resolution === "EXCHANGE"
                        ? "border-vl-cyan bg-vl-black text-vl-cyan border-2 shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                        : "text-vl-grey border-[#d6d2c4] bg-[#faf9f5] hover:bg-[#ebe6d9]"
                    }`}
                  >
                    <ArrowRightLeft className="text-vl-cyan h-4 w-4" />
                    <span>Product Exchange (Swap)</span>
                  </button>
                </div>

                {/* Exchange Replacement Selection */}
                {resolution === "EXCHANGE" && (
                  <div className="space-y-2.5 rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3.5">
                    <Label className="font-heading block text-xs font-black tracking-wider text-slate-800 uppercase">
                      Add Replacement Item(s) from Store:
                    </Label>

                    {/* Quick Filter */}
                    <Input
                      type="text"
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                      placeholder="Search store catalog for replacement size/item..."
                      className="focus-visible:border-vl-cyan h-9 rounded-xl border-[#d6d2c4] bg-white text-xs"
                    />

                    {/* Catalog Mini Suggestions */}
                    {exchangeSearch.trim() && (
                      <div className="max-h-36 divide-y divide-[#e2ded2] overflow-y-auto rounded-xl border border-[#e2ded2] bg-white">
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
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {prod.variants.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    disabled={v.availableStock <= 0}
                                    onClick={() => handleAddReplacement(prod, v.id)}
                                    className="hover:bg-vl-cyan/20 hover:border-vl-cyan rounded-lg border border-[#d6d2c4] bg-[#faf9f5] px-2 py-0.5 font-mono text-[10px] transition-colors disabled:opacity-40"
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
                        <span className="text-vl-grey font-heading text-[10px] font-black uppercase">
                          Selected Replacements:
                        </span>
                        {exchangeItems.map((rep) => (
                          <div
                            key={rep.variantId}
                            className="flex items-center justify-between rounded-xl border border-[#e2ded2] bg-white p-2.5 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">
                                {rep.productName}
                              </span>
                              <span className="text-vl-grey ml-1 font-mono text-[10px]">
                                ({[rep.size, rep.color].filter(Boolean).join("/") || rep.sku})
                              </span>
                              <span className="ml-2 font-mono font-bold text-slate-800">
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
                              className="text-slate-400 transition-colors hover:text-red-500"
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
                <div className="border-vl-border bg-vl-black text-vl-white space-y-1.5 rounded-xl border p-4 font-mono shadow-xs">
                  <div className="text-vl-grey flex justify-between text-xs">
                    <span>Return Item Value:</span>
                    <span className="text-vl-white font-bold">৳{totalReturnValue.toFixed(0)}</span>
                  </div>

                  {resolution === "EXCHANGE" && (
                    <div className="text-vl-grey flex justify-between text-xs">
                      <span>Replacement Item Value:</span>
                      <span className="text-vl-white font-bold">
                        ৳{totalExchangeValue.toFixed(0)}
                      </span>
                    </div>
                  )}

                  <div className="font-heading flex items-baseline justify-between border-t border-white/10 pt-2 text-sm font-black">
                    <span className="tracking-wide">
                      {netDifference > 0
                        ? "CUSTOMER TO PAY:"
                        : netDifference < 0
                          ? "REFUND TO CUSTOMER:"
                          : "EVEN SWAP:"}
                    </span>
                    <span
                      className={`font-heading text-xl font-black ${
                        netDifference < 0 ? "text-amber-400" : "text-vl-cyan"
                      }`}
                    >
                      {netDifference === 0 ? "৳0.00" : `৳${Math.abs(netDifference).toFixed(0)}`}
                    </span>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <Label className="font-heading text-xs font-black text-slate-700">
                    Staff Notes / Reason Details (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="e.g. Customer brought tags intact, exchanged for size L"
                    className="focus-visible:border-vl-cyan mt-1 h-10 rounded-xl border-[#d6d2c4] bg-[#faf9f5] text-xs"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 border-t border-[#e2ded2] pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="font-heading h-11 w-1/3 rounded-xl border-[#d6d2c4] text-xs font-black text-slate-700 hover:bg-[#faf9f5]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting || selectedItems.length === 0}
                    onClick={handleSubmitReturn}
                    className="bg-vl-cyan text-vl-black font-heading flex h-11 w-2/3 items-center justify-center space-x-2 rounded-xl text-xs font-black shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-[#2ae0ff]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="text-vl-black h-4 w-4 animate-spin" />
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
