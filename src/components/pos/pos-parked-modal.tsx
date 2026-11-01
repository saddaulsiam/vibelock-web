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
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-[#f0ede6] pb-3">
          <div className="flex items-center space-x-2 text-vl-black">
            <div className="rounded-xl border border-vl-cyan/40 bg-vl-black p-2 text-vl-cyan shadow-[0_0_12px_rgba(0,217,255,0.25)]">
              <PauseCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-heading font-black text-lg tracking-tight text-vl-black">
                Parked Sales / Held Carts
              </DialogTitle>
              <DialogDescription className="text-xs text-vl-grey">
                Restore a suspended sale to the counter or discard carts whose customers didn&apos;t
                return.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {currentCartHasItems && (
          <div className="flex items-start space-x-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
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
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e2ded2] bg-[#faf9f5]">
                <PauseCircle className="h-7 w-7 stroke-1 text-slate-400" />
              </div>
              <p className="font-heading text-xs font-bold text-vl-black">No Carts on Hold</p>
              <p className="mt-1 text-[11px] text-vl-grey">
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
                  className="space-y-2.5 rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3.5 text-xs transition-all duration-150 hover:border-vl-cyan hover:bg-white hover:shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-heading text-sm font-bold text-vl-black">{customerDisplay}</span>
                        <Badge className="border border-[#d6d2c4] bg-white px-1.5 py-0 font-mono text-[10px] text-vl-grey">
                          {cart.itemsCount} {cart.itemsCount === 1 ? "item" : "items"}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center space-x-2 text-[11px] text-vl-grey">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3 text-vl-cyan" />
                          {formatParkedTime(cart.parkedAt)}
                        </span>
                        {cart.customerPhone && (
                          <span className="flex items-center font-mono">
                            <Phone className="mr-1 h-3 w-3 text-vl-grey" />
                            {cart.customerPhone}
                          </span>
                        )}
                        {cart.notes && (
                          <span className="text-vl-grey italic">&quot;{cart.notes}&quot;</span>
                        )}
                      </div>
                    </div>

                    {/* Total Amount Callout */}
                    <div className="text-right">
                      <span className="block font-mono text-base font-black text-vl-black">
                        ৳{cart.totalValue.toFixed(0)}
                      </span>
                      {cart.discount > 0 && (
                        <span className="block font-mono text-[10px] font-medium text-emerald-600">
                          -৳{cart.discount.toFixed(0)} off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Chips Preview */}
                  <div className="flex flex-wrap gap-1 border-t border-[#e2ded2] pt-2">
                    {cart.items.map((item) => {
                      const variantDesc = [item.size, item.color].filter(Boolean).join("/");
                      return (
                        <span
                          key={item.variantId}
                          className="rounded-md border border-[#d6d2c4] bg-white px-2 py-0.5 text-[10px] text-vl-black"
                        >
                          {item.quantity}x {item.productName}{" "}
                          {variantDesc ? `(${variantDesc})` : ""}
                        </span>
                      );
                    })}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end space-x-2 border-t border-[#e2ded2] pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDiscardCart(cart.id)}
                      className="h-8.5 rounded-lg px-2.5 text-xs text-vl-grey hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Discard
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onResumeCart(cart)}
                      className="h-8.5 space-x-1 rounded-lg bg-vl-cyan px-3.5 font-heading text-xs font-black text-vl-black shadow-xs transition-all hover:bg-[#2ae0ff] active:scale-95"
                    >
                      <Play className="mr-1 h-3 w-3 fill-vl-black" />
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
