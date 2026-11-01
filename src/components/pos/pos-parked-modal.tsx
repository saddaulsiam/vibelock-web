"use client";

import {
  PauseCircle,
  Play,
  Trash2,
  Clock,
  Phone,
  AlertCircle,
} from "lucide-react";
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
      <DialogContent className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-amber-500">
            <PauseCircle className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Parked Sales / Held Carts
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Restore a suspended sale to the counter or discard carts whose customers didn&apos;t return.
          </DialogDescription>
        </DialogHeader>

        {currentCartHasItems && (
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Notice:</strong> Your counter currently has items. Resuming a parked cart will replace the current cart. (You can park the current cart first if needed).
            </p>
          </div>
        )}

        {/* List of Parked Carts */}
        <div className="space-y-3 pt-1">
          {parkedCarts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <PauseCircle className="h-10 w-10 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-700">No Carts on Hold</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Press [F4] or click &quot;Hold Cart&quot; on the active cart to park a customer&apos;s sale.
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
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-amber-400 transition-all space-y-2 text-xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {customerDisplay}
                        </span>
                        <Badge className="bg-slate-200 text-slate-800 text-[10px] font-mono px-1.5 py-0">
                          {cart.itemsCount} {cart.itemsCount === 1 ? "item" : "items"}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          {formatParkedTime(cart.parkedAt)}
                        </span>
                        {cart.customerPhone && (
                          <span className="flex items-center font-mono">
                            <Phone className="h-3 w-3 mr-1 text-slate-400" />
                            {cart.customerPhone}
                          </span>
                        )}
                        {cart.notes && (
                          <span className="italic text-slate-600">
                            &quot;{cart.notes}&quot;
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total Amount Callout */}
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-slate-900 block">
                        ৳{cart.totalValue.toFixed(0)}
                      </span>
                      {cart.discount > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium block">
                          -৳{cart.discount.toFixed(0)} off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Chips Preview */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/80">
                    {cart.items.map((item) => {
                      const variantDesc = [item.size, item.color].filter(Boolean).join("/");
                      return (
                        <span
                          key={item.variantId}
                          className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700"
                        >
                          {item.quantity}x {item.productName}{" "}
                          {variantDesc ? `(${variantDesc})` : ""}
                        </span>
                      );
                    })}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDiscardCart(cart.id)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs h-8 px-2.5"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Discard
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onResumeCart(cart)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-3 font-semibold space-x-1"
                    >
                      <Play className="h-3 w-3 mr-1" />
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

