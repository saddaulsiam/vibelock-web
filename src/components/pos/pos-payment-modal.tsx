"use client";

import { useState } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Layers,
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
import type { PosPaymentMethod, PosPaymentSplitInput } from "@/lib/pos/pos-types";

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onConfirmPayment: (
    paymentMethod: PosPaymentMethod,
    amountPaid: number,
    notes?: string,
    splitPayments?: PosPaymentSplitInput[]
  ) => Promise<void>;
  isSubmitting: boolean;
}

function PosPaymentModalContent({
  onClose,
  grandTotal,
  onConfirmPayment,
  isSubmitting,
}: Omit<PosPaymentModalProps, "isOpen">) {
  const [method, setMethod] = useState<PosPaymentMethod>("CASH");
  const [tenderAmount, setTenderAmount] = useState<number>(grandTotal);
  const [referenceNotes, setReferenceNotes] = useState<string>("");

  // Split Tender State
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCashTender, setSplitCashTender] = useState<number>(0);
  const [splitBkash, setSplitBkash] = useState<number>(0);
  const [splitBkashRef, setSplitBkashRef] = useState<string>("");
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCardRef, setSplitCardRef] = useState<string>("");

  const changeDue = Math.max(0, tenderAmount - grandTotal);
  const isShortage = tenderAmount < grandTotal;

  // Split computations
  const splitTotalAllocated = splitCash + splitBkash + splitCard;
  const splitRemaining = Math.max(0, grandTotal - splitTotalAllocated);
  const splitCashChange = Math.max(0, splitCashTender - splitCash);
  const isSplitShortage = splitTotalAllocated < grandTotal;
  const isSplitCashTenderShortage = splitCash > 0 && splitCashTender < splitCash;

  // Quick denomination suggestions for Cash
  const getDenominationPresets = () => {
    const presets = [grandTotal];
    const next50 = Math.ceil(grandTotal / 50) * 50;
    if (!presets.includes(next50)) presets.push(next50);

    const next100 = Math.ceil(grandTotal / 100) * 100;
    if (!presets.includes(next100)) presets.push(next100);

    const next500 = Math.ceil(grandTotal / 500) * 500;
    if (!presets.includes(next500)) presets.push(next500);

    const next1000 = Math.ceil(grandTotal / 1000) * 1000;
    if (!presets.includes(next1000)) presets.push(next1000);

    return presets.slice(0, 4);
  };

  const allocateRemainingTo = (target: "CASH" | "BKASH" | "CARD") => {
    if (splitRemaining <= 0) return;
    if (target === "CASH") {
      setSplitCash((prev) => prev + splitRemaining);
      setSplitCashTender((prev) => prev + splitRemaining);
    } else if (target === "BKASH") {
      setSplitBkash((prev) => prev + splitRemaining);
    } else if (target === "CARD") {
      setSplitCard((prev) => prev + splitRemaining);
    }
  };

  const splitEvenlyCashBkash = () => {
    const half = Math.floor(grandTotal / 2);
    setSplitCash(half);
    setSplitCashTender(half);
    setSplitBkash(grandTotal - half);
    setSplitCard(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (method === "CASH" && isShortage) {
      return;
    }

    if (method === "SPLIT") {
      if (isSplitShortage || isSplitCashTenderShortage) {
        return;
      }
      const splits: PosPaymentSplitInput[] = [];
      if (splitCash > 0) {
        splits.push({
          method: "CASH",
          amount: splitCash,
          tenderAmount: splitCashTender || splitCash,
        });
      }
      if (splitBkash > 0) {
        splits.push({
          method: "BKASH",
          amount: splitBkash,
          reference: splitBkashRef.trim() || undefined,
        });
      }
      if (splitCard > 0) {
        splits.push({
          method: "CARD",
          amount: splitCard,
          reference: splitCardRef.trim() || undefined,
        });
      }
      const totalTendered = splits.reduce((sum, s) => sum + (s.tenderAmount ?? s.amount), 0);
      await onConfirmPayment("SPLIT", totalTendered, referenceNotes, splits);
      return;
    }

    const finalAmountPaid = method === "CASH" ? tenderAmount : grandTotal;
    await onConfirmPayment(method, finalAmountPaid, referenceNotes);
  };

  const isSubmitDisabled =
    isSubmitting ||
    (method === "CASH" && isShortage) ||
    (method === "SPLIT" && (isSplitShortage || isSplitCashTenderShortage));

  return (
    <DialogContent className="max-w-lg rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
      <DialogHeader className="pb-3 border-b border-[#f0ede6]">
        <div className="flex items-center justify-between">
          <DialogTitle className="font-heading font-black text-xl tracking-tight text-vl-black">
            Counter Payment & Settlement
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-vl-grey">
          Select customer tender method or split across multiple payments.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Total Amount Callout */}
        <div className="rounded-xl border border-vl-border bg-vl-black p-4 text-vl-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-heading font-black uppercase tracking-widest text-vl-grey block">
              Total Payable
            </span>
            <p className="text-[10px] text-vl-white/60">Final counter bill</p>
          </div>
          <span className="font-heading text-3xl font-black tracking-tight text-vl-cyan font-mono">
            ৳{grandTotal.toFixed(0)}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setMethod("CASH");
              setTenderAmount(grandTotal);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-150 ${
              method === "CASH"
                ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan font-heading font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "border border-[#e2ded2] bg-[#faf9f5] text-vl-black/80 hover:border-vl-cyan/60 hover:bg-white font-medium"
            }`}
          >
            <Banknote className="h-5 w-5 text-emerald-500" />
            <span className="text-xs">Cash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("BKASH");
              setTenderAmount(grandTotal);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-150 ${
              method === "BKASH"
                ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan font-heading font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "border border-[#e2ded2] bg-[#faf9f5] text-vl-black/80 hover:border-vl-cyan/60 hover:bg-white font-medium"
            }`}
          >
            <QrCode className="h-5 w-5 text-pink-500" />
            <span className="text-xs">bKash QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("CARD");
              setTenderAmount(grandTotal);
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-150 ${
              method === "CARD"
                ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan font-heading font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "border border-[#e2ded2] bg-[#faf9f5] text-vl-black/80 hover:border-vl-cyan/60 hover:bg-white font-medium"
            }`}
          >
            <CreditCard className="h-5 w-5 text-blue-500" />
            <span className="text-xs">Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("SPLIT");
              if (splitCash === 0 && splitBkash === 0 && splitCard === 0) {
                splitEvenlyCashBkash();
              }
            }}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all duration-150 ${
              method === "SPLIT"
                ? "border-2 border-vl-cyan bg-vl-black text-vl-cyan font-heading font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "border border-[#e2ded2] bg-[#faf9f5] text-vl-black/80 hover:border-vl-cyan/60 hover:bg-white font-medium"
            }`}
          >
            <Layers className="h-5 w-5 text-vl-cyan" />
            <span className="text-xs">Split</span>
          </button>
        </div>

        {/* Method Specific Fields */}
        {method === "CASH" && (
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-vl-grey">
                Cash Received (৳)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={tenderAmount || ""}
                onChange={(e) => setTenderAmount(Number(e.target.value) || 0)}
                className="mt-1 h-12 rounded-xl border border-[#d6d2c4] bg-[#faf9f5] font-mono text-2xl font-black text-vl-black shadow-xs focus-visible:bg-white focus-visible:border-vl-cyan focus-visible:ring-4 focus-visible:ring-vl-cyan/15"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vl-grey">
                Presets:
              </span>
              {getDenominationPresets().map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTenderAmount(preset)}
                  className="rounded-lg border border-[#d6d2c4] bg-white px-2.5 py-1 font-mono text-xs font-bold text-vl-black shadow-2xs transition-colors hover:border-vl-cyan hover:bg-vl-cyan/10"
                >
                  ৳{preset}
                </button>
              ))}
            </div>

            {/* Change Return Callout */}
            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                isShortage
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950"
              }`}
            >
              <div className="flex items-center space-x-2">
                {isShortage ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                <span className="text-xs font-bold">
                  {isShortage ? "Shortage Amount:" : "Change to Return:"}
                </span>
              </div>
              <span className="font-mono text-2xl font-black">
                ৳{isShortage ? (grandTotal - tenderAmount).toFixed(0) : changeDue.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {method === "BKASH" && (
          <div className="space-y-3 pt-1">
            <div className="bg-pink-50 border border-pink-200 p-3 rounded-lg text-xs text-pink-900">
              <p className="font-semibold">Counter Merchant Payment</p>
              <p className="text-[11px] mt-0.5">
                Ask customer to scan counter bKash QR code or make payment to merchant account.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                bKash TrxID (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. BL9A8X21"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                className="font-mono text-xs uppercase h-9 border-slate-300 mt-1"
              />
            </div>
          </div>
        )}

        {method === "CARD" && (
          <div className="space-y-3 pt-1">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900">
              <p className="font-semibold">POS Terminal Swipe / Tap</p>
              <p className="text-[11px] mt-0.5">
                Swipe customer Visa/Mastercard/Amex on counter POS machine.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Auth / Approval Code (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. 549120"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                className="font-mono text-xs uppercase h-9 border-slate-300 mt-1"
              />
            </div>
          </div>
        )}

        {/* Split Tender Allocation Mode */}
        {method === "SPLIT" && (
          <div className="space-y-3 pt-1">
            {/* Split Allocation Status Header */}
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                isSplitShortage
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-emerald-50 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-center space-x-2">
                {isSplitShortage ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <span className="font-semibold">
                  {isSplitShortage
                    ? `Remaining to allocate: ৳${splitRemaining}`
                    : "Total Allocated in Full ✓"}
                </span>
              </div>
              <span className="font-mono font-bold">
                Allocated: ৳{splitTotalAllocated} / ৳{grandTotal}
              </span>
            </div>

            {/* Quick Fill Helpers */}
            {splitRemaining > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold text-[10px] uppercase">Fill Remainder:</span>
                <button
                  type="button"
                  onClick={() => allocateRemainingTo("CASH")}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium"
                >
                  + Cash (৳{splitRemaining})
                </button>
                <button
                  type="button"
                  onClick={() => allocateRemainingTo("BKASH")}
                  className="px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 font-medium"
                >
                  + bKash (৳{splitRemaining})
                </button>
                <button
                  type="button"
                  onClick={() => allocateRemainingTo("CARD")}
                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium"
                >
                  + Card (৳{splitRemaining})
                </button>
              </div>
            )}

            {/* Split Row 1: Cash */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center text-slate-800">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600 mr-1.5" /> Cash Portion
                </span>
                {splitCashChange > 0 && (
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    Change: ৳{splitCashChange.toFixed(0)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">Portion (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCash || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSplitCash(val);
                      if (splitCashTender < val) setSplitCashTender(val);
                    }}
                    placeholder="0"
                    className="h-8 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">Tendered (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCashTender || ""}
                    onChange={(e) => setSplitCashTender(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Split Row 2: bKash QR */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-semibold text-xs flex items-center text-slate-800">
                <QrCode className="h-3.5 w-3.5 text-pink-600 mr-1.5" /> bKash Portion
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">Portion (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitBkash || ""}
                    onChange={(e) => setSplitBkash(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">TrxID (Optional)</Label>
                  <Input
                    type="text"
                    value={splitBkashRef}
                    onChange={(e) => setSplitBkashRef(e.target.value)}
                    placeholder="e.g. BL9A8..."
                    className="h-8 text-xs font-mono uppercase bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Split Row 3: Card */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-semibold text-xs flex items-center text-slate-800">
                <CreditCard className="h-3.5 w-3.5 text-blue-600 mr-1.5" /> Card Portion
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">Portion (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCard || ""}
                    onChange={(e) => setSplitCard(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500 uppercase font-medium">Auth / Ref (Optional)</Label>
                  <Input
                    type="text"
                    value={splitCardRef}
                    onChange={(e) => setSplitCardRef(e.target.value)}
                    placeholder="e.g. 5491..."
                    className="h-8 text-xs font-mono uppercase bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-3 border-t border-[#f0ede6]">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-1/3 h-12 rounded-xl border border-[#d6d2c4] text-xs font-bold text-vl-black hover:bg-[#faf9f5]"
          >
            Cancel [Esc]
          </Button>

          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-2/3 h-12 bg-vl-cyan hover:bg-[#2ae0ff] text-vl-black font-heading font-black text-xs tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_24px_rgba(0,217,255,0.35)] hover:shadow-[0_0_32px_rgba(0,217,255,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-vl-black" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Complete Sale &amp; Print</span>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function PosPaymentModal(props: PosPaymentModalProps) {
  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && !props.isSubmitting && props.onClose()}>
      {props.isOpen && (
        <PosPaymentModalContent
          key={`${props.isOpen}-${props.grandTotal}`}
          onClose={props.onClose}
          grandTotal={props.grandTotal}
          onConfirmPayment={props.onConfirmPayment}
          isSubmitting={props.isSubmitting}
        />
      )}
    </Dialog>
  );
}
