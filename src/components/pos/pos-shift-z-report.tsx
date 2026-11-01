"use client";

import { Printer, CheckCircle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PosZReportData } from "@/lib/pos/pos-shift-types";

interface PosShiftZReportProps {
  report: PosZReportData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PosShiftZReport({ report, isOpen, onClose }: PosShiftZReportProps) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
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
      <DialogContent className="max-w-md bg-white p-6 shadow-2xl rounded-xl border border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Shift Closed — Official Z-Report
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* 58mm / 80mm Thermal Printable Z-Report Container */}
        <div className="print-area font-mono text-xs text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 select-text">
          {/* Header */}
          <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-400">
            <h2 className="text-base font-black tracking-wider uppercase">VIBELOCK BD</h2>
            <p className="text-[10px] text-slate-600 font-bold uppercase">Official Shift Z-Report</p>
            <p className="text-[10px] text-slate-500">Outlet 01, Dhaka, Bangladesh</p>
          </div>

          {/* Meta Info */}
          <div className="text-[11px] py-1 border-b border-dashed border-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Report ID:</span>
              <span className="font-bold">{report.reportId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shift ID:</span>
              <span>{report.shiftId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span className="font-bold">{report.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Opened:</span>
              <span>{formattedOpened}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Closed:</span>
              <span>{formattedClosed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Orders Processed:</span>
              <span className="font-bold">{report.totalOrders}</span>
            </div>
          </div>

          {/* Drawer Cash Reconciliation */}
          <div className="py-1 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              --- Cash Drawer Reconciliation ---
            </p>
            <div className="flex justify-between">
              <span>Opening Cash Float:</span>
              <span>৳{report.openingFloat.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Sales Collected (+):</span>
              <span>+ ৳{report.cashSales.toFixed(0)}</span>
            </div>
            {report.cashDrops > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Cash Payouts / Drops (-):</span>
                <span>- ৳{report.cashDrops.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-0.5 border-t border-slate-200">
              <span>Expected Cash in Drawer:</span>
              <span>৳{report.expectedCash.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Actual Counted Cash:</span>
              <span>৳{report.countedCash.toFixed(0)}</span>
            </div>

            {/* Variance */}
            <div
              className={`flex justify-between font-bold text-xs pt-1 border-t border-dashed border-slate-300 ${
                report.variance === 0
                  ? "text-emerald-700"
                  : report.variance < 0
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
            >
              <span>Discrepancy / Variance:</span>
              <span>
                {report.variance === 0
                  ? "৳0.00 (EXACT)"
                  : report.variance < 0
                  ? `- ৳${Math.abs(report.variance).toFixed(0)} (SHORTAGE)`
                  : `+ ৳${report.variance.toFixed(0)} (SURPLUS)`}
              </span>
            </div>
          </div>

          {/* Digital & Non-Cash Revenue */}
          <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[11px]">
            <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              --- Non-Cash Settlements ---
            </p>
            <div className="flex justify-between">
              <span>bKash Merchant QR:</span>
              <span>৳{report.bkashSales.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card / POS Terminal:</span>
              <span>৳{report.cardSales.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-slate-900">
              <span>TOTAL SHIFT REVENUE:</span>
              <span>৳{report.totalSales.toFixed(0)}</span>
            </div>
          </div>

          {/* Notes */}
          {report.closingNotes && (
            <div className="py-1 text-[10px] text-slate-600 italic">
              <span>Note: {report.closingNotes}</span>
            </div>
          )}

          {/* Signature Verification Lines */}
          <div className="pt-4 pb-1 grid grid-cols-2 gap-4 text-[10px] text-slate-600 text-center">
            <div>
              <div className="border-t border-slate-400 pt-1">Cashier Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">Manager Signature</div>
            </div>
          </div>

          <div className="text-center pt-2 text-[9px] text-slate-400">
            System generated by VibeLock POS engine.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-1/2 h-11 text-xs text-slate-700"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Done &amp; Exit
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="w-1/2 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Z-Report</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

