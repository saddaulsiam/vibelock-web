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

      toast.success(
        `Register shift opened with ৳${res.data.openingFloat.toFixed(0)} opening float!`
      );
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
        <DialogContent className="max-w-xl rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl sm:max-w-xl md:max-w-2xl">
          <DialogHeader className="border-b border-[#f0ede6] pb-3">
            <div className="text-vl-cyan flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <DialogTitle className="font-heading text-vl-black text-lg font-black tracking-tight">
                Open Register Shift
              </DialogTitle>
            </div>
            <DialogDescription className="text-vl-grey text-xs">
              Enter starting cash float to unlock POS counter and track drawer transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenShift} className="space-y-4 pt-2">
            <div>
              <Label className="text-vl-grey text-xs font-bold tracking-wider uppercase">
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
                className="text-vl-black focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/15 mt-1 h-12 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] font-mono text-2xl font-black shadow-xs focus-visible:bg-white focus-visible:ring-4"
              />
            </div>

            {/* Quick Float Presets */}
            <div className="flex items-center space-x-1.5">
              <span className="text-vl-grey text-[10px] font-bold tracking-wider uppercase">
                Presets:
              </span>
              {[1000, 2000, 3000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOpeningFloat(preset)}
                  className="text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 rounded-lg border border-[#d6d2c4] bg-white px-2.5 py-1 font-mono text-xs font-bold shadow-2xs transition-colors"
                >
                  ৳{preset}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-vl-grey text-xs font-bold tracking-wider uppercase">
                Shift Notes (Optional)
              </Label>
              <Input
                type="text"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="e.g. Morning counter shift"
                className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/15 mt-1 h-10 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] text-xs focus-visible:bg-white focus-visible:ring-4"
              />
            </div>

            <div className="flex items-center space-x-2 border-t border-[#f0ede6] pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
                className="text-vl-black h-11 w-1/3 rounded-xl border border-[#d6d2c4] text-xs font-bold hover:bg-[#faf9f5]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-vl-cyan font-heading text-vl-black flex h-11 w-2/3 items-center justify-center space-x-2 rounded-xl text-xs font-black tracking-wider shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-[#2ae0ff] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="text-vl-black h-4 w-4 animate-spin" />
                    <span>Opening Shift...</span>
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    <span>Open Register &amp; Start</span>
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
      <DialogContent className="w-full rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-[#f0ede6] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-600">
              <Banknote className="h-5 w-5" />
              <DialogTitle className="font-heading text-vl-black text-lg font-black tracking-tight">
                Cash Drawer & Shift Status
              </DialogTitle>
            </div>
            <Badge className="border border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-bold text-emerald-700">
              ACTIVE
            </Badge>
          </div>
          <DialogDescription className="text-vl-grey text-xs">
            Shift #{shift.shiftId.slice(-6)} &middot; Opened:{" "}
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
            <div className="border-vl-border bg-vl-black text-vl-white flex items-center justify-between rounded-xl border p-4 shadow-xs">
              <div>
                <span className="font-heading text-vl-grey block text-[10px] font-black tracking-widest uppercase">
                  Expected Cash in Drawer:
                </span>
                <span className="font-heading text-vl-cyan font-mono text-3xl font-black">
                  ৳{shift.expectedCash.toFixed(0)}
                </span>
              </div>
              <div className="text-vl-white/80 text-right text-xs">
                <span className="block font-semibold">Total: ৳{shift.totalSales.toFixed(0)}</span>
                <span className="text-vl-grey font-mono text-[10px]">
                  {shift.ordersCount} Orders
                </span>
              </div>
            </div>

            {/* Shift Breakdown Table */}
            <div className="space-y-1.5 rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3 font-mono text-xs">
              <div className="text-vl-grey flex justify-between">
                <span>Opening Cash Float:</span>
                <span className="text-vl-black font-bold">৳{shift.openingFloat.toFixed(0)}</span>
              </div>
              <div className="text-vl-grey flex justify-between">
                <span>Cash Sales Received (+):</span>
                <span className="font-bold text-emerald-600">+ ৳{shift.cashSales.toFixed(0)}</span>
              </div>
              {shift.cashDrops > 0 && (
                <div className="text-vl-grey flex justify-between">
                  <span>Cash Payouts / Drops (-):</span>
                  <span className="font-bold text-red-600">- ৳{shift.cashDrops.toFixed(0)}</span>
                </div>
              )}
              <div className="text-vl-grey flex justify-between border-t border-[#e2ded2] pt-1 text-[11px]">
                <span>bKash Sales (Digital):</span>
                <span className="text-vl-black font-medium">৳{shift.bkashSales.toFixed(0)}</span>
              </div>
              <div className="text-vl-grey flex justify-between text-[11px]">
                <span>Card Sales (POS Machine):</span>
                <span className="text-vl-black font-medium">৳{shift.cardSales.toFixed(0)}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("CASH_DROP")}
                className="text-vl-black hover:border-vl-cyan h-11 rounded-xl border-[#d6d2c4] text-xs font-bold hover:bg-[#faf9f5]"
              >
                <ArrowDownCircle className="mr-1.5 h-4 w-4 text-amber-500" />
                Cash Drop / Payout
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setCountedCash(shift.expectedCash);
                  setActiveTab("CLOSE_SHIFT");
                }}
                className="bg-vl-black font-heading text-vl-white hover:text-vl-cyan h-11 rounded-xl text-xs font-black tracking-wider shadow-xs hover:bg-black active:scale-[0.98]"
              >
                <LogOut className="text-vl-cyan mr-1.5 h-4 w-4" />
                Close Register
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Cash Drop / Paid-Out Form */}
        {activeTab === "CASH_DROP" && (
          <form onSubmit={handleCashDrop} className="space-y-3 pt-2">
            <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
                className="mt-1 h-10 border-slate-300 font-mono text-base font-bold"
              />
              <span className="mt-0.5 block text-[10px] text-slate-400">
                Max available in drawer: ৳{shift.expectedCash.toFixed(0)}
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Reason / Expense Description
              </Label>
              <Input
                type="text"
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="e.g. Tea & snacks for staff, delivery rider tips"
                className="mt-1 h-9 border-slate-300 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 border-t border-[#f0ede6] pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setActiveTab("SUMMARY")}
                className="text-vl-black h-11 w-1/3 rounded-xl border border-[#d6d2c4] text-xs font-bold hover:bg-[#faf9f5]"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || dropAmount <= 0 || !dropReason.trim()}
                className="bg-vl-black font-heading text-vl-white hover:text-vl-cyan h-11 w-2/3 rounded-xl text-xs font-black tracking-wider shadow-xs transition-all hover:bg-black active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="text-vl-cyan h-4 w-4 animate-spin" />
                ) : (
                  "Confirm Cash Drop"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Close Shift & Z-Report Form */}
        {activeTab === "CLOSE_SHIFT" && (
          <form onSubmit={handleCloseShift} className="space-y-3 pt-2">
            {/* Expected vs Counted Comparison */}
            <div className="border-vl-border bg-vl-black text-vl-white flex items-center justify-between rounded-xl border p-3.5 text-xs shadow-xs">
              <span className="font-heading text-vl-grey text-[10px] font-bold tracking-wider uppercase">
                Expected Drawer Cash:
              </span>
              <span className="text-vl-cyan font-mono text-xl font-black">
                ৳{shift.expectedCash.toFixed(0)}
              </span>
            </div>

            <div>
              <Label className="text-vl-grey text-xs font-bold tracking-wider uppercase">
                Actual Counted Cash in Drawer (৳)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={countedCash || ""}
                onChange={(e) => setCountedCash(Number(e.target.value) || 0)}
                className="text-vl-black focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/15 mt-1 h-12 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] font-mono text-2xl font-black shadow-xs focus-visible:bg-white focus-visible:ring-4"
              />
            </div>

            {/* Live Variance Callout */}
            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 text-xs ${
                variance === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : variance < 0
                    ? "border-red-200 bg-red-50 font-bold text-red-950"
                    : "border-amber-200 bg-amber-50 font-bold text-amber-950"
              }`}
            >
              <div className="flex items-center space-x-2">
                {variance === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-bold">
                  {variance === 0
                    ? "Drawer Perfectly Balanced:"
                    : variance < 0
                      ? "Cash Shortage (Discrepancy):"
                      : "Cash Surplus:"}
                </span>
              </div>
              <span className="font-mono text-xl font-black">
                {variance === 0 ? "৳0.00" : `৳${Math.abs(variance).toFixed(0)}`}
              </span>
            </div>

            <div>
              <Label className="text-vl-grey text-xs font-bold tracking-wider uppercase">
                Closing Notes / Explanation (Optional)
              </Label>
              <Input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. Shift balanced, cash handed to supervisor"
                className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/15 mt-1 h-10 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] text-xs focus-visible:bg-white focus-visible:ring-4"
              />
            </div>

            <div className="flex items-center space-x-2 border-t border-[#f0ede6] pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setActiveTab("SUMMARY")}
                className="text-vl-black h-11 w-1/3 rounded-xl border border-[#d6d2c4] text-xs font-bold hover:bg-[#faf9f5]"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-heading flex h-11 w-2/3 items-center justify-center space-x-1.5 rounded-xl bg-red-600 text-xs font-black tracking-wider text-white shadow-md transition-all hover:bg-red-700 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
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
