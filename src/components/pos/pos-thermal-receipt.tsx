"use client";

import { Printer, CheckCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PosReceiptData } from "@/lib/pos/pos-types";

interface PosThermalReceiptProps {
  receipt: PosReceiptData | null;
  isOpen: boolean;
  onNewSale: () => void;
}

export function PosThermalReceipt({ receipt, isOpen, onNewSale }: PosThermalReceiptProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onNewSale()}>
      <DialogContent className="max-w-md rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-[#e2ded2] pb-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-base font-black tracking-wide text-slate-900">
              Sale Complete — Cash Memo Ready
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Thermal Printable Memo Container */}
        <div className="print-area space-y-2 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] p-4.5 font-mono text-xs text-slate-900 shadow-2xs select-text">
          {/* Header */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 text-center">
            <h2 className="text-base font-black tracking-wider uppercase">VIBELOCK BD</h2>
            <p className="text-[10px] text-slate-600">Streetwear & Modern Apparel</p>
            <p className="text-[10px] text-slate-500">Outlet 01, Dhaka, Bangladesh</p>
            <p className="text-[10px] text-slate-500">Hotline: +880 1700-000000</p>
          </div>

          {/* Meta Info */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-bold">{receipt.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span>
                {receipt.customerName}{" "}
                {receipt.customerPhone !== "N/A" ? `(${receipt.customerPhone})` : ""}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-1 border-b border-dashed border-slate-400 py-1">
            <div className="flex justify-between pb-0.5 text-[11px] font-bold">
              <span>Item / SKU</span>
              <span>Amount</span>
            </div>

            {receipt.items.map((item, idx) => {
              const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.quantity} x ৳{item.unitPrice.toFixed(0)}{" "}
                      {variantDesc ? `(${variantDesc})` : ""}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ৳{item.lineTotal.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Totals */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>৳{receipt.subtotal.toFixed(0)}</span>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Discount:</span>
                <span>- ৳{receipt.discount.toFixed(0)}</span>
              </div>
            )}

            <div className="flex justify-between pt-0.5 text-sm font-bold">
              <span>TOTAL DUE:</span>
              <span>৳{receipt.total.toFixed(0)}</span>
            </div>

            {receipt.splits && receipt.splits.length > 0 ? (
              <div className="space-y-0.5 border-t border-dotted border-slate-300 pt-1">
                <div className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                  Tender Breakdown (Split):
                </div>
                {receipt.splits.map((s, idx) => (
                  <div key={idx} className="flex justify-between pl-1">
                    <span>
                      {s.method}
                      {s.reference ? ` (${s.reference})` : ""}:
                    </span>
                    <span>৳{s.amount.toFixed(0)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-0.5 font-semibold">
                  <span>Total Tendered:</span>
                  <span>৳{receipt.amountPaid.toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between pt-1">
                <span>Paid ({receipt.paymentMethod}):</span>
                <span>৳{receipt.amountPaid.toFixed(0)}</span>
              </div>
            )}

            {receipt.changeDue > 0 && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>Change Returned:</span>
                <span>৳{receipt.changeDue.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="space-y-0.5 pt-2 text-center text-[10px] text-slate-500">
            <p>Exchange within 7 days with cash memo & tags intact.</p>
            <p className="font-bold text-slate-700">Thank you for vibing with us!</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 border-t border-[#e2ded2] pt-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onNewSale}
            className="font-heading h-11 w-1/2 rounded-xl border-[#d6d2c4] text-xs font-black text-slate-700 transition-all hover:bg-[#faf9f5]"
          >
            <RotateCcw className="text-vl-grey mr-1.5 h-4 w-4" />
            New Sale
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-vl-cyan text-vl-black font-heading flex h-11 w-1/2 items-center justify-center space-x-1.5 rounded-xl text-xs font-black shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-[#2ae0ff]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
