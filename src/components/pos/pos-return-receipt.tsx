"use client";

import { Printer, CheckCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PosReturnReceiptData } from "@/lib/pos/pos-returns-types";

interface PosReturnReceiptProps {
  receipt: PosReturnReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PosReturnReceipt({ receipt, isOpen, onClose }: PosReturnReceiptProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.createdAt).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-[#e2ded2] pb-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-base font-black tracking-wide text-slate-900">
              Return &amp; Exchange Processed
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* 58mm / 80mm Thermal Printable Return Memo */}
        <div className="print-area space-y-2 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] p-4.5 font-mono text-xs text-slate-900 shadow-2xs select-text">
          {/* Header */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 text-center">
            <h2 className="text-base font-black tracking-wider uppercase">VIBELOCK BD</h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase">
              Return &amp; Exchange Memo
            </p>
            <p className="text-[10px] text-slate-500">Outlet 01, Dhaka, Bangladesh</p>
          </div>

          {/* Meta Info */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Return Memo #:</span>
              <span className="font-bold">{receipt.returnMemoNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Original Invoice:</span>
              <span className="font-bold">{receipt.originalOrderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span>
                {receipt.customerName} ({receipt.customerPhone})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Returned Items */}
          <div className="space-y-1 border-b border-dashed border-slate-400 py-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              --- Returned Items ---
            </p>
            {receipt.returnedItems.map((item, idx) => {
              const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
              return (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.quantity} x ৳{item.unitPrice.toFixed(0)}{" "}
                      {variantDesc ? `(${variantDesc})` : ""}
                      {item.condition === "DAMAGED" ? " [Damaged]" : " [Restocked]"}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      - ৳{item.lineTotal.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exchange Items (if any) */}
          {receipt.exchangeItems.length > 0 && (
            <div className="space-y-1 border-b border-dashed border-slate-400 py-1">
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                --- Replacement Items (Exchange) ---
              </p>
              {receipt.exchangeItems.map((item, idx) => {
                const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
                return (
                  <div key={idx} className="space-y-0.5 text-[11px]">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>
                        {item.quantity} x ৳{item.unitPrice.toFixed(0)}{" "}
                        {variantDesc ? `(${variantDesc})` : ""}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        + ৳{item.lineTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Financial Settlement */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <div className="flex justify-between">
              <span>Return Value:</span>
              <span>৳{receipt.totalReturnValue.toFixed(0)}</span>
            </div>

            {receipt.totalExchangeValue > 0 && (
              <div className="flex justify-between">
                <span>Replacement Value:</span>
                <span>৳{receipt.totalExchangeValue.toFixed(0)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-200 pt-1 text-xs font-bold">
              <span>
                {receipt.netAction === "REFUND_TO_CUSTOMER"
                  ? "REFUND PAID TO CUSTOMER:"
                  : receipt.netAction === "CHARGE_CUSTOMER"
                    ? "CUSTOMER PAID EXTRA:"
                    : "EVEN SWAP:"}
              </span>
              <span>
                {receipt.netAction === "EVEN_EXCHANGE"
                  ? "৳0.00"
                  : `৳${Math.abs(receipt.netDifference).toFixed(0)}`}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-4 pb-1 text-center text-[10px] text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-1">Customer Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">Cashier Signature</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2.5 border-t border-[#e2ded2] pt-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-heading h-11 w-1/2 rounded-xl border-[#d6d2c4] text-xs font-black text-slate-700 transition-all hover:bg-[#faf9f5]"
          >
            <RotateCcw className="text-vl-grey mr-1.5 h-4 w-4" />
            Done
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-vl-cyan text-vl-black font-heading flex h-11 w-1/2 items-center justify-center space-x-1.5 rounded-xl text-xs font-black shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-[#2ae0ff]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Return Memo</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
