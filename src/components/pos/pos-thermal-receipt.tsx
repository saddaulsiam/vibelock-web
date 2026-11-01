"use client";

import { Printer, CheckCircle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-md bg-white p-6 shadow-2xl rounded-xl border border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Sale Complete - Cash Memo Ready
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Thermal Printable Memo Container */}
        <div className="print-area font-mono text-xs text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 select-text">
          {/* Header */}
          <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-400">
            <h2 className="text-base font-black tracking-wider uppercase">VIBELOCK BD</h2>
            <p className="text-[10px] text-slate-600">Streetwear & Modern Apparel</p>
            <p className="text-[10px] text-slate-500">Outlet 01, Dhaka, Bangladesh</p>
            <p className="text-[10px] text-slate-500">Hotline: +880 1700-000000</p>
          </div>

          {/* Meta Info */}
          <div className="text-[11px] py-1 border-b border-dashed border-slate-400 space-y-0.5">
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
          <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
            <div className="flex justify-between font-bold text-[11px] pb-0.5">
              <span>Item / SKU</span>
              <span>Amount</span>
            </div>

            {receipt.items.map((item, idx) => {
              const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.quantity} x ৳{item.unitPrice.toFixed(0)}{" "}
                      {variantDesc ? `(${variantDesc})` : ""}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      ৳{item.lineTotal.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Totals */}
          <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
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

            <div className="flex justify-between font-bold text-sm pt-0.5">
              <span>TOTAL DUE:</span>
              <span>৳{receipt.total.toFixed(0)}</span>
            </div>

            <div className="flex justify-between pt-1">
              <span>Paid ({receipt.paymentMethod}):</span>
              <span>৳{receipt.amountPaid.toFixed(0)}</span>
            </div>

            {receipt.changeDue > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change Returned:</span>
                <span>৳{receipt.changeDue.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 space-y-0.5 text-[10px] text-slate-500">
            <p>Exchange within 7 days with cash memo & tags intact.</p>
            <p className="font-bold text-slate-700">Thank you for vibing with us!</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onNewSale}
            className="w-1/2 h-11 text-xs text-slate-700"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            New Sale
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

