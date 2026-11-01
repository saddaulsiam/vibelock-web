"use client";

import { useState } from "react";
import {
  Banknote,
  Lock,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Receipt,
  LogOut,
  Info,
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
import type { PosShiftSummary, PosZReportData } from "@/lib/pos/pos-shift-types";
import {
  openRegisterShiftAction,
  recordCashDropAction,
  closeRegisterShiftAction,
} from "@/lib/pos/pos-shift-actions";
import { toast } from "sonner";

interface PosShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: PosShiftSummary | null;
  onShiftUpdated: (shift: PosShiftSummary | null) => void;
  onZReportGenerated: (report: PosZReportData) => void;
}

type ShiftModalTab = "SUMMARY" | "CASH_DROP" | "CLOSE_SHIFT";

export function PosShiftModal({
  isOpen,
  onClose,
  shift,
  onShiftUpdated,
  onZReportGenerated,
}: PosShiftModalProps) {
  const [activeTab, setActiveTab] = useState<ShiftModalTab>("SUMMARY");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [openNotes, setOpenNotes] = useState<string>("");

  // Cash Drop State
  const [dropAmount, setDropAmount] = useState<number>(0);
  const [dropReason, setDropReason] = useState<string>("");

  // Close Register State
  const [countedCash, setCountedCash] = useState<number>(shift?.expectedCash || 0);
  const [closeNotes, setCloseNotes] = useState<string>("");

  // --- Handlers ---

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await openRegisterShiftAction({
        openingFloat,
        notes: openNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to open register shift");
        return;
      }

      toast.success(`Register shift opened with ৳${res.data.openingFloat.toFixed(0)} opening float!`);
      onShiftUpdated(res.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error opening shift";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !shift) return;

    if (dropAmount <= 0) {
      toast.error("Please enter a valid drop amount.");
      return;
    }

    if (!dropReason.trim()) {
      toast.error("Please enter a reason for the cash payout.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordCashDropAction({
        amount: dropAmount,
        reason: dropReason,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to record cash drop");
        return;
      }

      toast.success(`Cash payout of ৳${dropAmount.toFixed(0)} recorded.`);
      onShiftUpdated({
        ...shift,
        cashDrops: shift.cashDrops + dropAmount,
        expectedCash: res.data.newExpectedCash,
      });
      setDropAmount(0);
      setDropReason("");
      setActiveTab("SUMMARY");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error recording cash drop";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !shift) return;

    setIsSubmitting(true);
    try {
      const res = await closeRegisterShiftAction({
        countedCash,
        notes: closeNotes,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to close register shift");
        return;
      }

      toast.success("Register shift closed successfully! Z-Report ready.");
      onShiftUpdated(null);
      onClose();
      onZReportGenerated(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error closing shift";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If NO shift is currently open, show OPEN SHIFT dialog
  if (!shift || !shift.isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-amber-500">
              <Lock className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Open Register Shift
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Enter starting cash float to unlock POS counter and track drawer transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenShift} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Opening Cash Float (৳)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={openingFloat || ""}
                onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                placeholder="2000"
                className="text-xl font-mono font-bold h-12 border-2 border-slate-300 focus-visible:border-amber-500 mt-1"
              />
            </div>

            {/* Quick Float Presets */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
              {[1000, 2000, 3000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOpeningFloat(preset)}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold transition-colors"
                >
                  ৳{preset}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Shift Notes (Optional)
              </Label>
              <Input
                type="text"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="e.g. Morning counter shift"
                className="h-9 text-xs border-slate-300 mt-1"
              />
            </div>

            <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
                className="w-1/3 h-11 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Opening Shift...</span>
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    <span>Open Register & Start</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Active shift exists -> Drawer Management Modal
  const variance = countedCash - shift.expectedCash;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-600">
              <Banknote className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Cash Drawer & Shift Status
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
              ACTIVE
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Shift {shift.shiftId} | Opened:{" "}
            {new Date(shift.openedAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Tab 1: Live Drawer Summary */}
        {activeTab === "SUMMARY" && (
          <div className="space-y-4 pt-2">
            {/* Live Drawer Total Big Callout */}
            <div className="bg-slate-900 text-white rounded-lg p-4 shadow-inner flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Expected Cash in Drawer:
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  ৳{shift.expectedCash.toFixed(0)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-300">
                <span className="block font-semibold">Total Sales: ৳{shift.totalSales.toFixed(0)}</span>
                <span className="text-[10px] text-slate-400 font-mono">{shift.ordersCount} Orders</span>
              </div>
            </div>

            {/* Shift Breakdown Table */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Opening Cash Float:</span>
                <span className="font-semibold text-slate-900">৳{shift.openingFloat.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cash Sales Received (+):</span>
                <span className="font-semibold text-emerald-600">+ ৳{shift.cashSales.toFixed(0)}</span>
              </div>
              {shift.cashDrops > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Cash Payouts / Drops (-):</span>
                  <span className="font-semibold text-red-600">- ৳{shift.cashDrops.toFixed(0)}</span>
                </div>
              )}
              <div className="pt-1 border-t border-slate-200 flex justify-between text-slate-500 text-[11px]">
                <span>bKash Sales (Digital):</span>
                <span>৳{shift.bkashSales.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Card Sales (POS Machine):</span>
                <span>৳{shift.cardSales.toFixed(0)}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("CASH_DROP")}
                className="h-10 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ArrowDownCircle className="h-4 w-4 mr-1 text-amber-500" />
                Cash Drop / Payout
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setCountedCash(shift.expectedCash);
                  setActiveTab("CLOSE_SHIFT");
                }}
                className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Close Register
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Cash Drop / Paid-Out Form */}
        {activeTab === "CASH_DROP" && (
          <form onSubmit={handleCashDrop} className="space-y-3 pt-2">
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Drawer Cash Payout / Drop</p>
                <p className="text-[11px] text-amber-800">
                  Record petty cash removed from drawer for store supplies or mid-day safe deposit.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payout Amount (৳)</Label>
              <Input
                type="number"
                min={1}
                max={shift.expectedCash}
                step="any"
                autoFocus
                value={dropAmount || ""}
                onChange={(e) => setDropAmount(Number(e.target.value) || 0)}
                placeholder="500"
                className="font-mono text-base font-bold h-10 border-slate-300 mt-1"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Max available in drawer: ৳{shift.expectedCash.toFixed(0)}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Reason / Expense Description</Label>
              <Input
                type="text"
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="e.g. Tea & snacks for staff, delivery rider tips"
                className="text-xs h-9 border-slate-300 mt-1"
              />
            </div>

            <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setActiveTab("SUMMARY")}
                className="w-1/3 h-10 text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || dropAmount <= 0 || !dropReason.trim()}
                className="w-2/3 h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cash Drop"}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Close Shift & Z-Report Form */}
        {activeTab === "CLOSE_SHIFT" && (
          <form onSubmit={handleCloseShift} className="space-y-3 pt-2">
            {/* Expected vs Counted Comparison */}
            <div className="bg-slate-900 text-white rounded-lg p-3 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Expected Cash in Drawer:</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                ৳{shift.expectedCash.toFixed(0)}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Actual Counted Cash in Drawer (৳)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={countedCash || ""}
                onChange={(e) => setCountedCash(Number(e.target.value) || 0)}
                className="font-mono text-xl font-bold h-11 border-2 border-slate-300 focus-visible:border-amber-500 mt-1"
              />
            </div>

            {/* Live Variance Callout */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                variance === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : variance < 0
                  ? "bg-red-50 border-red-200 text-red-950 font-bold"
                  : "bg-amber-50 border-amber-200 text-amber-950 font-bold"
              }`}
            >
              <div className="flex items-center space-x-1.5">
                {variance === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span>
                  {variance === 0
                    ? "Drawer Perfectly Balanced:"
                    : variance < 0
                    ? "Cash Shortage (Discrepancy):"
                    : "Cash Surplus:"}
                </span>
              </div>
              <span className="font-mono text-base font-bold">
                {variance === 0 ? "৳0.00" : `৳${Math.abs(variance).toFixed(0)}`}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Closing Notes / Explanation (Optional)
              </Label>
              <Input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Shift balanced, all cash deposited to manager"
                className="text-xs h-9 border-slate-300 mt-1"
              />
            </div>

            <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setActiveTab("SUMMARY")}
                className="w-1/3 h-10 text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Closing Shift...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    <span>Close Shift &amp; Print Z-Report</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
