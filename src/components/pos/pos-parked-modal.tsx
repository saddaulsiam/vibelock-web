"use client";

import { PauseCircle, Play, Trash2, Clock, Phone, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PosParkedCart } from "@/lib/pos/pos-parked-types";

interface PosParkedModalProps {
  isOpen: boolean;
  onClose: () => void;
  parkedCarts: PosParkedCart[];
  onResumeCart: (cart: PosParkedCart) => void;
  onDiscardCart: (cartId: string) => void;
  currentCartHasItems: boolean;
}

export function PosParkedModal({
  isOpen,
  onClose,
  parkedCarts,
  onResumeCart,
  onDiscardCart,
  currentCartHasItems,
}: PosParkedModalProps) {
  const formatParkedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="text-vl-cyan flex items-center space-x-2">
            <PauseCircle className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Parked Sales / Held Carts
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Restore a suspended sale to the counter or discard carts whose customers didn&apos;t
            return.
          </DialogDescription>
        </DialogHeader>

        {currentCartHasItems && (
          <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed">
              <strong>Notice:</strong> Your counter currently has items. Resuming a parked cart will
              replace the current cart. (You can park the current cart first if needed).
            </p>
          </div>
        )}

        {/* List of Parked Carts */}
        <div className="space-y-3 pt-1">
          {parkedCarts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400">
              <PauseCircle className="mb-2 h-10 w-10 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No Carts on Hold</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Press [F4] or click &quot;Hold Cart&quot; on the active cart to park a
                customer&apos;s sale.
              </p>
            </div>
          ) : (
            parkedCarts.map((cart) => {
              const customerDisplay =
                cart.customerName && cart.customerName !== "Walk-in Customer"
                  ? cart.customerName
                  : cart.customerPhone
                    ? cart.customerPhone
                    : cart.label;

              return (
                <div
                  key={cart.id}
                  className="hover:border-vl-cyan space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-all hover:shadow-xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{customerDisplay}</span>
                        <Badge className="bg-slate-200 px-1.5 py-0 font-mono text-[10px] text-slate-800">
                          {cart.itemsCount} {cart.itemsCount === 1 ? "item" : "items"}
                        </Badge>
                      </div>

                      <div className="mt-0.5 flex items-center space-x-2 text-[11px] text-slate-500">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3 text-slate-400" />
                          {formatParkedTime(cart.parkedAt)}
                        </span>
                        {cart.customerPhone && (
                          <span className="flex items-center font-mono">
                            <Phone className="mr-1 h-3 w-3 text-slate-400" />
                            {cart.customerPhone}
                          </span>
                        )}
                        {cart.notes && (
                          <span className="text-slate-600 italic">&quot;{cart.notes}&quot;</span>
                        )}
                      </div>
                    </div>

                    {/* Total Amount Callout */}
                    <div className="text-right">
                      <span className="block font-mono text-sm font-bold text-slate-900">
                        ৳{cart.totalValue.toFixed(0)}
                      </span>
                      {cart.discount > 0 && (
                        <span className="block text-[10px] font-medium text-emerald-600">
                          -৳{cart.discount.toFixed(0)} off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Chips Preview */}
                  <div className="flex flex-wrap gap-1 border-t border-slate-200/80 pt-1">
                    {cart.items.map((item) => {
                      const variantDesc = [item.size, item.color].filter(Boolean).join("/");
                      return (
                        <span
                          key={item.variantId}
                          className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700"
                        >
                          {item.quantity}x {item.productName}{" "}
                          {variantDesc ? `(${variantDesc})` : ""}
                        </span>
                      );
                    })}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end space-x-2 border-t border-slate-200/60 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDiscardCart(cart.id)}
                      className="h-8 px-2.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Discard
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onResumeCart(cart)}
                      className="bg-vl-cyan text-vl-black font-heading h-8 space-x-1 px-3.5 text-xs font-black shadow-xs hover:bg-[#2ae0ff]"
                    >
                      <Play className="fill-vl-black mr-1 h-3 w-3" />
                      <span>Resume Sale</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
