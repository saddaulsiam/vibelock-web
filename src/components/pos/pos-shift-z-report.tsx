"use client";

import { Printer, CheckCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { printThermalSlip } from "@/lib/pos/pos-print-utils";
import type { PosZReportData } from "@/lib/pos/pos-shift-types";

interface PosShiftZReportProps {
  report: PosZReportData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PosShiftZReport({ report, isOpen, onClose }: PosShiftZReportProps) {
  if (!report) return null;

  const handlePrint = () => {
    printThermalSlip("pos-shift-z-report-memo");
  };

  const formattedOpened = new Date(report.openedAt).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const formattedClosed = new Date(report.closedAt).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl sm:max-w-xl md:max-w-2xl">
        <DialogHeader className="border-b border-[#e2ded2] pb-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-base font-black tracking-wide text-slate-900">
              Shift Closed — Official Z-Report
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* 58mm / 80mm Thermal Printable Z-Report Container */}
        <div
          id="pos-shift-z-report-memo"
          className="print-area space-y-2 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] p-4.5 font-mono text-xs text-slate-900 shadow-2xs select-text"
        >
          {/* Header */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 pb-2 text-center">
            <h2 className="text-base font-black tracking-wider uppercase">VIBELOCK</h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase">
              Official Shift Z-Report
            </p>
            <p className="text-[10px] text-slate-500">Outlet 01, Dhaka, Bangladesh</p>
          </div>

          {/* Meta Info */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Report ID:</span>
              <span className="pl-2 text-right font-mono font-bold">{report.reportId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Shift ID:</span>
              <span className="pl-2 text-right font-mono">{report.shiftId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Cashier:</span>
              <span className="pl-2 text-right font-bold">{report.cashierName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Opened:</span>
              <span className="pl-2 text-right">{formattedOpened}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Closed:</span>
              <span className="pl-2 text-right">{formattedClosed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0 text-slate-500">Orders Processed:</span>
              <span className="pl-2 text-right font-mono font-bold">{report.totalOrders}</span>
            </div>
          </div>

          {/* Drawer Cash Reconciliation */}
          <div className="space-y-1 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              --- Cash Drawer Reconciliation ---
            </p>
            <div className="flex items-center justify-between">
              <span className="shrink-0">Opening Cash Float:</span>
              <span className="shrink-0 text-right font-mono">
                ৳{report.openingFloat.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0">Cash Sales Collected (+):</span>
              <span className="shrink-0 text-right font-mono">
                + ৳{report.cashSales.toFixed(0)}
              </span>
            </div>
            {report.cashDrops > 0 && (
              <div className="flex items-center justify-between text-red-600">
                <span className="shrink-0">Cash Payouts / Drops (-):</span>
                <span className="shrink-0 text-right font-mono">
                  - ৳{report.cashDrops.toFixed(0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-0.5 font-bold">
              <span className="shrink-0">Expected Cash in Drawer:</span>
              <span className="shrink-0 text-right font-mono">
                ৳{report.expectedCash.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="shrink-0">Actual Counted Cash:</span>
              <span className="shrink-0 text-right font-mono">
                ৳{report.countedCash.toFixed(0)}
              </span>
            </div>

            {/* Variance */}
            <div
              className={`flex items-center justify-between border-t border-dashed border-slate-300 pt-1 text-xs font-bold ${
                report.variance === 0
                  ? "text-emerald-700"
                  : report.variance < 0
                    ? "text-red-700"
                    : "text-amber-700"
              }`}
            >
              <span className="shrink-0">Discrepancy / Variance:</span>
              <span className="shrink-0 text-right font-mono">
                {report.variance === 0
                  ? "৳0.00 (EXACT)"
                  : report.variance < 0
                    ? `- ৳${Math.abs(report.variance).toFixed(0)} (SHORTAGE)`
                    : `+ ৳${report.variance.toFixed(0)} (SURPLUS)`}
              </span>
            </div>
          </div>

          {/* Digital & Non-Cash Revenue */}
          <div className="space-y-0.5 border-b border-dashed border-slate-400 py-1 text-[11px]">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              --- Non-Cash Settlements ---
            </p>
            <div className="flex items-center justify-between">
              <span className="shrink-0">bKash Merchant QR:</span>
              <span className="shrink-0 text-right font-mono">৳{report.bkashSales.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="shrink-0">Card / POS Terminal:</span>
              <span className="shrink-0 text-right font-mono">৳{report.cardSales.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
              <span className="shrink-0">TOTAL SHIFT REVENUE:</span>
              <span className="shrink-0 text-right font-mono font-black">
                ৳{report.totalSales.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {report.closingNotes && (
            <div className="py-1 text-[10px] text-slate-600 italic">
              <span>Note: {report.closingNotes}</span>
            </div>
          )}

          {/* Signature Verification Lines */}
          <div className="grid grid-cols-2 gap-4 pt-4 pb-1 text-center text-[10px] text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-1">Cashier Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">Manager Signature</div>
            </div>
          </div>

          <div className="pt-2 text-center text-[9px] text-slate-400">
            System generated by VibeLock POS engine.
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
            Done &amp; Exit
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-vl-cyan text-vl-black font-heading flex h-11 w-1/2 items-center justify-center space-x-1.5 rounded-xl text-xs font-black shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-[#2ae0ff]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Z-Report</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
